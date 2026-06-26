"""
Gate 5: LLM difficulty judging for the 1,104 newly imported PYQ rows.

Target: source='pyq', language='en', year IN (2017,2018,2019,2020,2021,2024,2025)
Model:  claude-haiku-4-5-20251001
Output: Easy | Medium | Hard  (exact schema values)

Blank-on-failure: if response doesn't parse to a valid label, row is left
unchanged and logged. No guessing, no force-Medium on error.

Usage:
    python scripts/gate5_judge_difficulty.py --sample   # 40-row sample, no DB write
    python scripts/gate5_judge_difficulty.py --full     # judge all 1104, write to DB
"""

import sys, io, re, json, time, random
import requests
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

MODE = "sample" if "--sample" in sys.argv else "full" if "--full" in sys.argv else None
if MODE is None:
    print("Usage: python scripts/gate5_judge_difficulty.py --sample | --full")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent

# ── env ───────────────────────────────────────────────────────────────────────
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z0-9_]+)=(.*)', line.strip())
    if m: env[m.group(1)] = m.group(2).strip()

SUPA_URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SUPA_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
ANTH_KEY = env["ANTHROPIC_API_KEY"]
HEADERS  = {"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}", "Content-Type": "application/json"}

import anthropic
llm    = anthropic.Anthropic(api_key=ANTH_KEY)
MODEL  = "claude-haiku-4-5-20251001"
VALID  = {"Easy", "Medium", "Hard"}
YEARS  = (2017, 2018, 2019, 2020, 2021, 2024, 2025)

# ── fetch target rows from Supabase ──────────────────────────────────────────
def fetch_rows():
    print("Fetching target rows from Supabase…")
    rows = []
    page, size = 0, 500
    while True:
        resp = requests.get(
            f"{SUPA_URL}/rest/v1/questions",
            headers={**HEADERS, "Prefer": "count=exact", "Range-Unit": "items",
                     "Range": f"{page*size}-{(page+1)*size-1}"},
            params={
                "select":     "id,subject,chapter,year,body,options,difficulty",
                "source":     "eq.pyq",
                "language":   "eq.en",
                "centre_id":  "is.null",
                "year":       f"in.({','.join(str(y) for y in YEARS)})",
            },
        )
        batch = resp.json()
        if not batch: break
        rows.extend(batch)
        cr    = resp.headers.get("content-range", "0/0").split("/")[-1]
        total = int(cr) if cr.isdigit() else 9999
        if len(rows) >= total: break
        page += 1
    return rows

# ── LLM call ─────────────────────────────────────────────────────────────────
def judge_one(row):
    """Returns (difficulty: str|None, latency_ms: int). None = parse failure."""
    subj = row.get("subject", "")
    body = (row.get("body") or "")[:240]
    opts = row.get("options") or []
    if isinstance(opts, str):
        try: opts = json.loads(opts)
        except: opts = []
    a = (opts[0] if len(opts) > 0 else "")[:80]
    b = (opts[1] if len(opts) > 1 else "")[:80]
    c = (opts[2] if len(opts) > 2 else "")[:80]
    d = (opts[3] if len(opts) > 3 else "")[:80]

    prompt = (
        f"You are a NEET exam expert. Rate the difficulty of the following NEET {subj} question.\n\n"
        f"Question: {body}\n"
        f"Options: (A) {a}  (B) {b}  (C) {c}  (D) {d}\n\n"
        f"Difficulty guide:\n"
        f"  Easy   — single fact recall, one-step formula substitution, or a definition.\n"
        f"            Well-prepared student solves in <40 s.\n"
        f"  Medium — 1-2 reasoning steps, standard single-formula application, moderate\n"
        f"            calculation, or connecting two related concepts. Typical NEET level.\n"
        f"  Hard   — mark Hard if ANY ONE of these applies:\n"
        f"            * 3+ step calculation or formula chain\n"
        f"            * Must combine two or more distinct formulas / physical laws\n"
        f"            * Non-obvious setup: thermal expansion of two materials, AC circuit\n"
        f"              analysis, Newton's law of cooling integration, escape velocity\n"
        f"            * Organic: counting hybridisation + bonds in complex structure,\n"
        f"              multi-step mechanism, or 2+ named reactions in one question\n"
        f"            * Equilibrium/kinetics: Kp<->Kc conversion, two-temperature rate\n"
        f"              constant, or degree of dissociation calculation\n"
        f"            * Even a well-prepared student would need >90 s\n\n"
        f"          About 5-10% of NEET questions are Hard -- do not over-assign, but do\n"
        f"          not shy away from the label when the criteria are met.\n\n"
        f"Output ONLY one word: Easy, Medium, or Hard."
    )
    t0 = time.time()
    try:
        resp = llm.messages.create(
            model=MODEL, max_tokens=10, temperature=0.0,
            messages=[{"role": "user", "content": prompt}],
        )
        raw     = resp.content[0].text.strip()
        latency = int((time.time() - t0) * 1000)
        # Normalise: accept any capitalisation
        canon = raw.capitalize()
        if canon in VALID:
            return canon, latency
        # Try extracting from embedded response
        for v in VALID:
            if v.lower() in raw.lower():
                return v, latency
        return None, latency   # parse failure
    except Exception as e:
        print(f"  [LLM error] {e}", file=sys.stderr)
        return None, int((time.time() - t0) * 1000)

# ── patch one row in Supabase (retry on network error) ───────────────────────
def patch_difficulty(row_id, difficulty, retries=4):
    for attempt in range(retries):
        try:
            resp = requests.patch(
                f"{SUPA_URL}/rest/v1/questions",
                headers={**HEADERS, "Prefer": "return=minimal"},
                params={"id": f"eq.{row_id}"},
                data=json.dumps({"difficulty": difficulty}),
                timeout=20,
            )
            return resp.status_code in (200, 204)
        except Exception as e:
            wait = 2 ** attempt
            print(f"    [PATCH retry {attempt+1}/{retries}] {e} — waiting {wait}s",
                  file=sys.stderr)
            time.sleep(wait)
    return False

# ── build 40-row sample (≥1 per year, balanced across subjects) ──────────────
def build_sample(rows):
    from collections import defaultdict
    by_year_subj = defaultdict(list)
    for r in rows:
        by_year_subj[(r["year"], r["subject"])].append(r)

    selected = []
    # Target: ~5-6 per year = 40 across 7 years, try to hit all 3 subjects per year
    per_year = {y: [] for y in YEARS}
    for (year, subj), bucket in sorted(by_year_subj.items()):
        random.seed(42)
        per_year[year].extend(random.sample(bucket, min(2, len(bucket))))

    for year in YEARS:
        pool = per_year[year]
        # Aim for ~6 per year but take what we have; cap at 6
        take = min(6, len(pool))
        # Make deterministic
        random.seed(year)
        selected.extend(random.sample(pool, take))

    # If short of 40, top up from any year
    if len(selected) < 40:
        ids_sel = {r["id"] for r in selected}
        extras  = [r for r in rows if r["id"] not in ids_sel]
        random.seed(99)
        selected.extend(random.sample(extras, min(40 - len(selected), len(extras))))

    return selected[:40]

# ── run ───────────────────────────────────────────────────────────────────────
def run_judge(rows, write_db=False):
    results    = []   # (row, assigned_difficulty)
    blank_fail = []   # rows where LLM failed to parse
    latencies  = []

    total = len(rows)
    for i, row in enumerate(rows):
        diff, ms = judge_one(row)
        latencies.append(ms)
        if diff is None:
            blank_fail.append(row)
            results.append((row, row.get("difficulty", "Medium")))  # unchanged
            print(f"  [{i+1}/{total}] Q{row.get('year')} {row['subject'][:4]} "
                  f"PARSE-FAIL ({ms}ms) — left unchanged")
        else:
            results.append((row, diff))
            print(f"  [{i+1}/{total}] Q{row.get('year')} {row['subject'][:4]} "
                  f"→ {diff} ({ms}ms)")
        if write_db and diff is not None:
            ok = patch_difficulty(row["id"], diff)
            if not ok:
                print(f"    [WARN] DB patch failed for {row['id']}", file=sys.stderr)

    return results, blank_fail, latencies

def print_distribution(results):
    from collections import Counter
    counts = Counter(diff for _, diff in results)
    total  = len(results)
    print(f"\n  Distribution ({total} rows):")
    for d in ("Easy", "Medium", "Hard"):
        n = counts.get(d, 0)
        pct = 100 * n / total if total else 0
        bar = "█" * int(pct / 3)
        print(f"    {d:6s}  {n:4d}  ({pct:5.1f}%)  {bar}")

# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    all_rows = fetch_rows()
    print(f"Fetched {len(all_rows)} target rows\n")

    # Quick sanity: confirm existing 2015/2016 NOT in target
    contamination = [r for r in all_rows if r.get("year") in (2015, 2016)]
    if contamination:
        print(f"ERROR: {len(contamination)} rows from 2015/2016 in fetch — aborting.")
        sys.exit(1)
    print(f"Scope check: 0 rows from 2015/2016 (correct)\n")

    if MODE == "sample":
        sample = build_sample(all_rows)
        print(f"Running 40-row sample across {len({r['year'] for r in sample})} years "
              f"and {len({r['subject'] for r in sample})} subjects…\n")

        results, blank_fail, latencies = run_judge(sample, write_db=False)

        print("\n" + "="*72)
        print("GATE 5 SAMPLE REPORT — 40 rows, no DB write")
        print("="*72)
        print(f"\n{'#':<3} {'Year':<5} {'Subj':<10} {'Difficulty':<10}  Question stem")
        print("-"*72)
        for idx, (row, diff) in enumerate(results, 1):
            stem = (row.get("body") or "")[:90].replace("\n", " ")
            print(f"{idx:<3} {row.get('year'):<5} {row['subject'][:9]:<10} {diff:<10}  {stem}")

        print_distribution(results)

        avg_ms = int(sum(latencies) / len(latencies)) if latencies else 0
        print(f"\n  Parse failures : {len(blank_fail)}")
        print(f"  Avg latency    : {avg_ms} ms")
        print(f"\n[STOPPED] Approve this sample, then run with --full to judge all {len(all_rows)} rows.")

    elif MODE == "full":
        # --start N: skip first N rows (resume after partial run with seed=0 order)
        start_at = 0
        for arg in sys.argv:
            if arg.startswith("--start="):
                start_at = int(arg.split("=")[1])
        random.seed(0)
        random.shuffle(all_rows)
        todo = all_rows[start_at:]
        print(f"Full run: judging {len(todo)} rows (skipping first {start_at}) "
              f"and writing to DB…\n")

        results, blank_fail, latencies = run_judge(todo, write_db=True)

        print("\n" + "="*72)
        print("GATE 5 FULL RUN COMPLETE")
        print("="*72)

        # Per-year breakdown
        from collections import defaultdict, Counter
        by_year = defaultdict(list)
        for row, diff in results:
            by_year[row.get("year")].append(diff)

        print(f"\n{'Year':<6} {'Easy':>6} {'Medium':>8} {'Hard':>6} {'Total':>7}")
        print("-"*40)
        for year in YEARS:
            c = Counter(by_year.get(year, []))
            t = sum(c.values())
            print(f"{year:<6} {c.get('Easy',0):>6} {c.get('Medium',0):>8} {c.get('Hard',0):>6} {t:>7}")
        all_diff = [d for diffs in by_year.values() for d in diffs]
        ac = Counter(all_diff)
        print("-"*40)
        print(f"{'TOTAL':<6} {ac.get('Easy',0):>6} {ac.get('Medium',0):>8} {ac.get('Hard',0):>6} {len(all_diff):>7}")

        print_distribution(results)

        avg_ms = int(sum(latencies) / len(latencies)) if latencies else 0
        print(f"\n  Parse failures (unchanged): {len(blank_fail)}")
        print(f"  Avg latency               : {avg_ms} ms")

        if blank_fail:
            print(f"\n  Blank-fail rows (left at Medium):")
            for r in blank_fail:
                print(f"    year={r.get('year')} id={r['id'][:8]}… {(r.get('body') or '')[:60]}")

        # ── Regression check: 15 Easy-labeled Physics rows with calc signals ──
        CALC_PAT = re.compile(
            r'\d+[\.\d]*\s*[×xX]\s*10|'
            r'\d+\s*(Ω|ohm|eV|rpm|rad|m/s|N/m|nm|μ|mH|μF|nF|kJ|J/mol|T\b|Hz\b)|'
            r'(circular|angular|tension|elastic|thermal expansion|coefficient of|'
            r'ac source|capacitor.*voltage|voltage.*capacitor|acceleration|'
            r'Young.s modulus|moment of inertia|escape velocity)',
            re.I
        )
        easy_phys = [
            row for row, diff in results
            if diff == "Easy" and row.get("subject") == "Physics"
            and CALC_PAT.search(row.get("body","") + " ".join(row.get("options") or []))
        ]
        random.seed(123)
        reg_sample = random.sample(easy_phys, min(15, len(easy_phys)))

        print(f"\n── Regression check: Easy-labeled Physics rows with calculation signals ──")
        print(f"   Pool: {len(easy_phys)} rows | Showing: {len(reg_sample)}\n")
        print(f"{'#':<3} {'Year':<5} {'Label':<8}  Question stem")
        print("-"*80)
        for idx, row in enumerate(reg_sample, 1):
            stem = (row.get("body") or "").replace("\n"," ")[:100]
            print(f"{idx:<3} {row.get('year'):<5} {'Easy':<8}  {stem}")

        # Verify 2015/2016 untouched
        print("\n── Confirming 2015/2016 untouched ──")
        verify = requests.get(
            f"{SUPA_URL}/rest/v1/questions",
            headers={**HEADERS, "Prefer": "count=exact"},
            params={"select": "difficulty", "source": "eq.pyq", "language": "eq.en",
                    "year": "in.(2015,2016)", "centre_id": "is.null"},
        )
        vdata = verify.json()
        vc = Counter(r["difficulty"] for r in vdata)
        print(f"  2015/2016 distribution: {dict(vc)} (total {sum(vc.values())})")
        print(f"  Expected: Easy=220 Medium=100 Hard=9 Total=329")
        match = (vc.get("Easy") == 220 and vc.get("Medium") == 100 and
                 vc.get("Hard") == 9 and sum(vc.values()) == 329)
        print(f"  Match: {'YES ✓' if match else 'NO — INVESTIGATE'}")
        print("\nGate 5 complete.")
