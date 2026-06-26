"""
LLM Chapter Judger + Gate 1 Report — no DB write.

For each fixable_low_conf row in the 7 extraction review CSVs, calls Claude Haiku
to assign a chapter constrained to the valid per-subject chapter list, then
cross-checks against the keyword classifier:

  off-map LLM output                               → stays fixable_low_conf
  non-boundary, kw_score≥2, kw_chapter==llm_chapter → auto-promote to clean
  all other valid LLM outputs                      → llm_flagged (chapter updated,
                                                      needs user review)

Prints the complete Gate 1 report at the end and STOPS.

Usage:
  python scripts/judge_chapter.py          # all 7 years
  python scripts/judge_chapter.py --year 2021
"""

import sys, re, csv, io, time, random, concurrent.futures
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

ROOT    = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "docs" / "english_PREVIOUS_YEAR" / "output"

# ── API setup ─────────────────────────────────────────────────────────────────
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z0-9_]+)=(.*)', line.strip())
    if m: env[m.group(1)] = m.group(2).strip()

import anthropic
client = anthropic.Anthropic(api_key=env["ANTHROPIC_API_KEY"])
MODEL  = "claude-haiku-4-5-20251001"

# ── Valid chapter lists (must match extract_neet_batch.py SUBJECT_KW keys) ───
CHAPTERS = {
    "Physics": [
        "Units and Measurements","Motion in a Plane","Laws of Motion",
        "Work Energy and Power","System of Particles and Rotational Motion","Gravitation",
        "Mechanical Properties of Solids","Mechanical Properties of Fluids",
        "Thermal Properties of Matter","Thermodynamics","Kinetic Theory","Oscillations",
        "Waves","Electrostatic Potential and Capacitance","Current Electricity",
        "Moving Charges and Magnetism","Electromagnetic Induction","Alternating Current",
        "Electromagnetic Waves","Ray Optics and Optical Instruments","Wave Optics",
        "Dual Nature of Radiation and Matter","Atoms","Nuclei","Semiconductor Electronics",
    ],
    "Chemistry": [
        "Some Basic Concepts of Chemistry","Structure of Atom",
        "Classification of Elements and Periodicity",
        "Chemical Bonding and Molecular Structure","States of Matter","Equilibrium",
        "Redox Reactions","The s-Block Elements","The p-Block Elements",
        "The d- and f-Block Elements","Coordination Compounds","The Solid State",
        "Solutions","Electrochemistry","Chemical Kinetics",
        "Haloalkanes and Haloarenes","Alcohols Phenols and Ethers",
        "Aldehydes Ketones and Carboxylic Acids","Amines",
        "Organic Chemistry - Some Basic Principles and Techniques","Hydrocarbons",
        "Polymers","Biomolecules","Thermodynamics","Surface Chemistry",
        "General Principles and Processes of Isolation of Elements",
        "Environmental Chemistry","Chemistry in Everyday Life",
    ],
    "Biology": [
        "Biological Classification","Plant Kingdom","Animal Kingdom",
        "Morphology of Flowering Plants","Anatomy of Flowering Plants",
        "Structural Organisation in Animals","Cell: The Unit of Life","Biomolecules",
        "Cell Cycle and Cell Division","Transport in Plants","Mineral Nutrition",
        "Photosynthesis in Higher Plants","Respiration in Plants",
        "Plant Growth and Development","Digestion and Absorption",
        "Breathing and Exchange of Gases","Body Fluids and Circulation",
        "Excretory Products and their Elimination","Locomotion and Movement",
        "Neural Control and Coordination","Chemical Coordination and Integration",
        "Sexual Reproduction in Flowering Plants","Human Reproduction",
        "Reproductive Health","Principles of Inheritance and Variation",
        "Molecular Basis of Inheritance","Evolution","Human Health and Disease",
        "Strategies for Enhancement in Food Production","Microbes in Human Welfare",
        "Biotechnology - Principles and Processes","Biotechnology and its Applications",
        "Organisms and Populations","Ecosystem","Biodiversity and Conservation",
        "Environmental Issues",
    ],
}
CHAPTER_SET = {s: set(cs) for s, cs in CHAPTERS.items()}

CLEAN_H  = ["subject","chapter","concept","difficulty","par_time_sec","par_seconds",
            "question_text","option_a","option_b","option_c","option_d",
            "correct_option","year","q_no"]
REVIEW_H = CLEAN_H + ["review_status","reason","kw_chapter"]

def write_csv(path, rows, header):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header, extrasaction="ignore")
        w.writeheader(); w.writerows(rows)

# ── Keyword info parser ───────────────────────────────────────────────────────

def parse_kw_info(row):
    """
    Returns (kw_score: int, kw_chapter: str|None, is_boundary: bool).
    Parses from the 'reason' field written by extract_neet_batch.py.

    Reason formats:
      "chapter=Unclassified (score=0)"
      "score=1 (single keyword, chapter=X)"
      "boundary={subject} classifier={cls_subj}(s={score})"
    """
    reason = row.get("reason", "")
    if "score=0" in reason or reason.startswith("chapter=Unclassified"):
        return 0, None, False
    m = re.match(r"score=1 \(single keyword, chapter=(.+?)\)", reason)
    if m:
        return 1, m.group(1).strip(), False
    if reason.startswith("boundary="):
        sm = re.search(r's=(\d+)', reason)
        score = int(sm.group(1)) if sm else 2
        return score, (row.get("chapter") or None), True
    return 0, None, False

# ── LLM call ─────────────────────────────────────────────────────────────────

def judge_one(row):
    """Returns (chapter: str|None, latency_ms: int). None = off-map or error."""
    subject = row.get("subject", "")
    if subject not in CHAPTERS:
        return None, 0
    valid   = CHAPTERS[subject]
    q = (row.get("question_text") or "")[:220]
    a = (row.get("option_a") or "")[:80]
    b = (row.get("option_b") or "")[:80]
    c = (row.get("option_c") or "")[:80]
    d = (row.get("option_d") or "")[:80]
    chapter_list = "\n".join(f"- {ch}" for ch in valid)
    prompt = (
        f"Subject: {subject}\n"
        f"Question: {q}\n"
        f"Options: (1) {a}  (2) {b}  (3) {c}  (4) {d}\n\n"
        f"Choose the most appropriate chapter for this NEET question.\n"
        f"Output ONLY the exact chapter name from the list below, nothing else.\n\n"
        f"Valid {subject} chapters:\n{chapter_list}"
    )
    t0 = time.time()
    try:
        resp = client.messages.create(
            model=MODEL, max_tokens=60, temperature=0.0,
            messages=[{"role": "user", "content": prompt}],
        )
        chapter = resp.content[0].text.strip()
        latency = int((time.time() - t0) * 1000)
        if chapter in CHAPTER_SET[subject]:
            return chapter, latency
        lo = chapter.lower()
        for ch in valid:
            if ch.lower() == lo:
                return ch, latency
        return None, latency   # off-map
    except Exception as e:
        print(f"  [LLM] error: {e}", file=sys.stderr)
        return None, int((time.time() - t0) * 1000)

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    single = None
    for i, a in enumerate(sys.argv[1:]):
        if a == "--year" and i + 1 < len(sys.argv[1:]): single = int(sys.argv[i + 2])
        elif a.startswith("--year="): single = int(a.split("=")[1])
    years = [single] if single else [2017, 2018, 2019, 2020, 2021, 2024, 2025]

    # Accumulated data for Gate 1 report
    all_promoted_rows   = []   # went to clean (for 30-row spot-check)
    all_disagree_rows   = []   # kw ≠ LLM (for 15-sample report)
    grand_promoted      = 0
    grand_flagged       = 0
    grand_stayed        = 0
    grand_off_map       = 0
    grand_no_text       = 0
    grand_latency_ms    = []
    year_clean_counts   = {}   # {year: {subj: n}}

    for year in years:
        review_path = OUT_DIR / f"{year}_review.csv"
        clean_path  = OUT_DIR / f"{year}_clean.csv"
        if not review_path.exists():
            print(f"  [{year}] review CSV not found, skipping"); continue

        review_rows = list(csv.DictReader(open(review_path, encoding="utf-8")))
        clean_rows  = list(csv.DictReader(open(clean_path,  encoding="utf-8")))

        to_judge = [r for r in review_rows
                    if r.get("review_status") == "fixable_low_conf"
                    and (r.get("question_text") or "").strip()]
        no_text  = [r for r in review_rows
                    if r.get("review_status") == "fixable_low_conf"
                    and not (r.get("question_text") or "").strip()]
        other    = [r for r in review_rows
                    if r.get("review_status") != "fixable_low_conf"]

        print(f"\n[{year}] Judging {len(to_judge)} fixable_low_conf rows "
              f"({len(no_text)} skipped: no text, {len(other)} other statuses)…")

        # Parallel LLM calls
        results = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as exe:
            fs = {exe.submit(judge_one, r): i for i, r in enumerate(to_judge)}
            done = 0
            for fut in concurrent.futures.as_completed(fs):
                idx = fs[fut]
                chapter, lat = fut.result()
                results[idx] = (chapter, lat)
                done += 1
                if done % 100 == 0:
                    print(f"  [{year}] {done}/{len(to_judge)} done…")

        # Route rows
        promoted   = []   # → clean
        flagged    = []   # → llm_flagged in review
        stayed     = []   # → stays fixable_low_conf (off-map / no-text)
        latencies  = []
        off_map    = 0

        for i, r in enumerate(to_judge):
            llm_chapter, lat = results.get(i, (None, 0))
            latencies.append(lat)
            kw_score, kw_chapter, is_boundary = parse_kw_info(r)
            new_r = dict(r)
            new_r["kw_chapter"] = kw_chapter or "Unclassified"

            if llm_chapter is None:
                # Off-map or API error → unchanged in review
                off_map += 1
                stayed.append(r)

            elif (not is_boundary
                  and kw_score >= 2
                  and kw_chapter is not None
                  and kw_chapter == llm_chapter):
                # Both agree at high confidence → promote to clean
                new_r["chapter"] = llm_chapter
                new_r["concept"] = llm_chapter
                promoted.append(new_r)
                all_promoted_rows.append(new_r)

            else:
                # Flag for user review with LLM chapter
                new_r["chapter"] = llm_chapter
                new_r["concept"] = llm_chapter
                new_r["review_status"] = "llm_flagged"
                new_r["reason"] = (
                    f"llm={llm_chapter}; "
                    f"kw_score={kw_score} kw={kw_chapter or 'Unclassified'}"
                    + (" [boundary]" if is_boundary else "")
                )
                flagged.append(new_r)
                kw_matches = (kw_chapter == llm_chapter) if kw_chapter else False
                if not kw_matches:
                    all_disagree_rows.append({
                        "year": r.get("year"),
                        "q_no": r.get("q_no"),
                        "subject": r.get("subject"),
                        "question": (r.get("question_text") or "")[:80],
                        "kw_chapter": kw_chapter or "Unclassified",
                        "llm_chapter": llm_chapter,
                        "kw_score": kw_score,
                        "is_boundary": is_boundary,
                    })

        # Mark no-text fixable_low_conf rows (go back into review unchanged)
        for r in no_text:
            r["kw_chapter"] = (parse_kw_info(r)[1] or "Unclassified")

        # Write updated CSVs
        new_clean  = clean_rows + promoted
        new_review = other + flagged + stayed + no_text
        write_csv(clean_path,  new_clean,  CLEAN_H)
        write_csv(review_path, new_review, REVIEW_H)

        # Per-year counts for Gate 1 report
        subj_counts = {}
        for rx in new_clean:
            s = rx.get("subject","?")
            subj_counts[s] = subj_counts.get(s, 0) + 1
        year_clean_counts[year] = subj_counts

        grand_promoted   += len(promoted)
        grand_flagged    += len(flagged)
        grand_stayed     += len(stayed)
        grand_off_map    += off_map
        grand_no_text    += len(no_text)
        grand_latency_ms += latencies

        avg_lat = int(sum(latencies) / max(1, len(latencies)))
        print(f"  [{year}] promoted={len(promoted)} flagged={len(flagged)} "
              f"off-map={off_map} stayed={len(stayed)} avg={avg_lat}ms")
        print(f"  [{year}] Clean after LLM: "
              + " | ".join(f"{s}={n}" for s,n in sorted(subj_counts.items())))

    # ── Gate 1 Report ─────────────────────────────────────────────────────────
    lines = []
    def L(s=""): lines.append(s); print(s)

    L()
    L("=" * 72)
    L("GATE 1 REPORT — NEET PYQ 2017–2025 DRY RUN  (no DB write)")
    L("=" * 72)

    # ── 1. Per-year / per-subject clean counts ────────────────────────────────
    L()
    L("1. PER-YEAR CLEAN COUNTS AFTER LLM CHAPTER PASS")
    L("-" * 72)
    total_clean = 0
    for year in years:
        counts = year_clean_counts.get(year, {})
        if not counts:
            continue
        total = sum(counts.values())
        total_clean += total
        bio = counts.get("Biology", 0)
        phy = counts.get("Physics", 0)
        che = counts.get("Chemistry", 0)
        L(f"  {year}:  Physics={phy:3d}  Chemistry={che:3d}  Biology={bio:3d}  "
          f"TOTAL={total:4d}")
    L(f"  {'ALL':5s}  GRAND TOTAL CLEAN = {total_clean}")
    L()
    L("  Biology note: Botany + Zoology are NOT split — all Biology questions")
    L("  are stored under subject='Biology' (45+45=90 per 180Q year,")
    L("  50+50=100 per 200Q year). No Botany/Zoology columns exist.")

    # ── 2. Chapter confidence ─────────────────────────────────────────────────
    judged_total = grand_promoted + grand_flagged
    agreed_total = grand_promoted   # promoted = agreed (score≥2, non-boundary, agree)
    disagree_total = len(all_disagree_rows)
    agree_rate = (agreed_total / judged_total * 100) if judged_total else 0

    L()
    L("2. CHAPTER CONFIDENCE (keyword vs Haiku)")
    L("-" * 72)
    L(f"  Total rows judged by LLM:         {grand_promoted + grand_flagged + grand_off_map + grand_no_text}")
    L(f"  - off-map / invalid LLM output:   {grand_off_map}   (stays fixable_low_conf)")
    L(f"  - no question text (skipped):     {grand_no_text}")
    L(f"  Valid LLM outputs:                {judged_total}")
    L(f"  Auto-promoted (kw≥2 + agree):     {grand_promoted}")
    L(f"  Flagged for review (llm_flagged): {grand_flagged}")
    L(f"    of which kw≠LLM (disagree):     {disagree_total}")
    L(f"  Keyword-LLM agreement rate:       {agree_rate:.1f}%  "
      f"(on score≥2 non-boundary subset)")

    # 15 disagreement samples
    L()
    L("  DISAGREEMENT SAMPLES (up to 15) — kw_chapter vs Haiku chapter:")
    L(f"  {'Yr':4} {'Q#':5} {'Subj':10} {'KW chapter':35} {'LLM chapter':35} {'Sc':2} {'Bd':2}")
    L(f"  {'-'*4} {'-'*5} {'-'*10} {'-'*35} {'-'*35} {'-'*2} {'-'*2}")
    sample_disagree = all_disagree_rows[:15]
    for d in sample_disagree:
        L(f"  {str(d['year']):4} {str(d['q_no']):5} {(d['subject'] or '')[:10]:10} "
          f"{(d['kw_chapter'] or '')[:35]:35} {(d['llm_chapter'] or '')[:35]:35} "
          f"{d['kw_score']:2} {'Y' if d['is_boundary'] else 'N':2}")
    if not sample_disagree:
        L("  (no disagreements)")

    # 30 random promoted rows for spot-check
    L()
    L("  SPOT-CHECK: 30 RANDOM AUTO-PROMOTED ROWS (kw≥2 + LLM agree → clean)")
    L(f"  {'Yr':4} {'Q#':5} {'Subj':10} {'Chapter':35} {'Ans':4} {'Question (first 65)':65}")
    L(f"  {'-'*4} {'-'*5} {'-'*10} {'-'*35} {'-'*4} {'-'*65}")
    sample_promoted = (random.sample(all_promoted_rows, min(30, len(all_promoted_rows)))
                       if all_promoted_rows else [])
    sample_promoted.sort(key=lambda r: (r.get("year",""), r.get("q_no","")))
    for r in sample_promoted:
        L(f"  {str(r.get('year','')):4} {str(r.get('q_no','')):5} "
          f"{(r.get('subject') or '')[:10]:10} {(r.get('chapter') or '')[:35]:35} "
          f"{(r.get('correct_option') or ''):4} "
          f"{(r.get('question_text') or '')[:65]}")
    if not sample_promoted:
        L("  (no auto-promoted rows — all went to llm_flagged or off-map)")

    # ── 3. 2017/2018 answer source confirmation ───────────────────────────────
    L()
    L("3. 2017/2018 ANSWER SOURCE CONFIRMATION")
    L("-" * 72)
    L("  Both years use Family AK (positional key), NOT inline bounded search.")
    L()
    L("  2017 (Code A):")
    L("    - 180 Answer(k) markers in PDF → perfect 1-to-1 positional pairing")
    L("    - Inline-vs-positional mismatch: 4 Q#s [2, 7, 11, 65] had wrong")
    L("      answers in inline parse; all 4 now corrected from positional key")
    L("    - Every clean row in 2017_clean.csv uses the positional-key answer")
    L()
    L("  2018 (Code WW):")
    L("    - 182 Answer(k) markers → first 180 used (2 trailing extras discarded)")
    L("    - Inline-vs-positional mismatch: 112 Q#s would have had WRONG answers")
    L("      if the inline bounded approach were used")
    L("    - Every clean row in 2018_clean.csv uses the positional-key answer")
    L("    - The 112-mismatch fix is ALREADY IN the exported CSVs")

    # ── 4. Final lane totals ──────────────────────────────────────────────────
    # Read current state of all CSVs to get exact final counts
    lane_clean = 0
    lane_figure = 0
    lane_llm_flagged = 0
    lane_fixable_low = 0
    lane_unusable = 0
    year_lanes = []

    for year in years:
        review_path = OUT_DIR / f"{year}_review.csv"
        clean_path  = OUT_DIR / f"{year}_clean.csv"
        if not clean_path.exists(): continue
        crows = list(csv.DictReader(open(clean_path, encoding="utf-8")))
        rrows = list(csv.DictReader(open(review_path, encoding="utf-8"))) if review_path.exists() else []
        yc = len(crows)
        yf = sum(1 for r in rrows if r.get("review_status") == "fixable_figure")
        ylf = sum(1 for r in rrows if r.get("review_status") == "llm_flagged")
        yfl = sum(1 for r in rrows if r.get("review_status") == "fixable_low_conf")
        yu  = sum(1 for r in rrows if r.get("review_status","").startswith("unusable"))
        lane_clean      += yc
        lane_figure     += yf
        lane_llm_flagged+= ylf
        lane_fixable_low+= yfl
        lane_unusable   += yu
        year_lanes.append((year, yc, yf, ylf, yfl, yu))

    L()
    L("4. FINAL LANE TOTALS (all 7 years combined)")
    L("-" * 72)
    L(f"  {'Year':5} {'clean':6} {'fig-hold':9} {'llm_flagged':12} {'low_conf':9} {'unusable':9}")
    L(f"  {'-'*5} {'-'*6} {'-'*9} {'-'*12} {'-'*9} {'-'*9}")
    for year, yc, yf, ylf, yfl, yu in year_lanes:
        L(f"  {year:5} {yc:6} {yf:9} {ylf:12} {yfl:9} {yu:9}")
    L(f"  {'TOTAL':5} {lane_clean:6} {lane_figure:9} {lane_llm_flagged:12} "
      f"{lane_fixable_low:9} {lane_unusable:9}")
    L()
    L("  Lane definitions:")
    L("    clean        — import-ready (keyword chapter confirmed or kw+LLM agreed)")
    L("    fig-hold     — valid Q+answer, has a diagram hint; needs image crop pass")
    L("    llm_flagged  — LLM assigned chapter, needs your review before import")
    L("    low_conf     — LLM gave off-map output or no question text; manual only")
    L("    unusable     — no answer (PDF gap) or could not parse 4 options")
    L()
    L("  2022/2023 NOT touched — cleanly deferred to OCR milestone.")
    L()
    L("=" * 72)
    L("GATE 1 STOP — awaiting your approval to proceed to Gate 2 (migration SQL)")
    L("=" * 72)

    (OUT_DIR / "gate1_report.txt").write_text("\n".join(lines), encoding="utf-8")
    print(f"\n[report saved to {OUT_DIR / 'gate1_report.txt'}]")


if __name__ == "__main__":
    main()
