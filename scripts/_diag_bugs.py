"""Diagnostic: understand BUG 2 (false OCR gaps) and BUG 3 (figure over-detection)."""
import sys, io, fitz, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from pathlib import Path

ROOT    = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "docs" / "english_PREVIOUS_YEAR"

QNUM_PAT     = re.compile(r'(?:^|\n)\s*(\d{1,3})\.?\s', re.MULTILINE)
ANSWER_PAT   = re.compile(r'(?:Sol\.|Answer)\s*\(([1-4])[^)]*\)', re.I)
FIGURE_HINTS = ["figure","shown in","as shown","diagram","graph","circuit",
                "following structure","structure of the","given below","in the figure"]

def load_text(pdf_name):
    doc = fitz.open(str(PDF_DIR / pdf_name))
    full = "".join(doc[pi].get_text() for pi in range(len(doc)))
    doc.close()
    return full

def bounded_candidates(full, max_q):
    all_pos = [(int(m.group(1)), m.start(), m.end())
               for m in QNUM_PAT.finditer(full) if 1 <= int(m.group(1)) <= max_q]
    out = []
    for i,(n,qs,qe) in enumerate(all_pos):
        nxt = all_pos[i+1][1] if i+1 < len(all_pos) else len(full)
        ans = ANSWER_PAT.search(full[qe:nxt])
        if ans:
            out.append((n, qs, qe))
    return out

def longest_run(cands):
    best = []
    for i,(n,qs,qe) in enumerate(cands):
        if n != 1: continue
        run = [(n,qs,qe)]; last = 1
        for j in range(i+1, len(cands)):
            nj,qsj,qej = cands[j]
            if nj == last+1: run.append((nj,qsj,qej)); last=nj
        if len(run) > len(best): best = run
    return best

# ── BUG 2: For 2017/2018/2019 — for each "missing" Q#, check if text exists ──
CONFIGS = {
    2017: ("NEET 2017 question paper - Code A with Answers and Solutions.pdf", 180),
    2018: ("Question Paper Solutions and Answer Keys for NEET 2018 - Code - WW.pdf", 180),
    2019: ("NEET-2019 (Code-R1)_Solutions.pdf", 180),
}

print("="*64)
print("BUG 2 DIAGNOSTIC — MISSING Q#s IN 2017/2018/2019")

for year, (pdf_name, total_q) in CONFIGS.items():
    full = load_text(pdf_name)
    cands = bounded_candidates(full, total_q)
    run = longest_run(cands)
    if not run: continue
    real_start = run[0][1]
    sub_full = full[real_start:]

    # Q#s WITH Answer(k) in bounded block
    with_answer = set()
    for n,qs,qe in bounded_candidates(sub_full, total_q):
        with_answer.add(n)

    # Q#s found by QNUM_PAT but NO Answer(k) in bounded block
    all_pos = [(int(m.group(1)), m.start(), m.end())
               for m in QNUM_PAT.finditer(sub_full) if 1 <= int(m.group(1)) <= total_q]
    qnum_set = set(n for n,_,_ in all_pos)

    missing_with_text = qnum_set - with_answer
    missing_no_text   = set(range(1,total_q+1)) - qnum_set - with_answer

    print(f"\n{year}: {len(with_answer)} have Answer(k), "
          f"{len(missing_with_text)} Q# in text but no Answer(k), "
          f"{len(missing_no_text)} Q# not in text at all")
    print(f"  Missing with text (first 10): {sorted(missing_with_text)[:10]}")
    print(f"  Truly absent from text:       {sorted(missing_no_text)[:10]}")

    # For each Q# in-text-but-no-answer, show the block text (truncated)
    # Build a positional index for first-occurrence of each Q#
    first_pos = {}
    for n,qs,qe in all_pos:
        if n not in first_pos: first_pos[n] = (qs,qe)
    all_pos_sorted = sorted(first_pos.items())
    pos_lookup = {n:(qs,qe) for n,(qs,qe) in all_pos_sorted}

    print(f"\n  --- Sample blocks for 'in text but no Answer(k)' ---")
    shown = 0
    for n in sorted(missing_with_text)[:5]:
        if n not in pos_lookup: continue
        qs, qe = pos_lookup[n]
        # Find next Q#
        nxt_positions = [(nn,qs2) for nn,qs2,_ in all_pos if qs2 > qs]
        nxt = nxt_positions[0][1] if nxt_positions else qs+2000
        blk = sub_full[qe:min(qe+600, nxt)]
        print(f"\n  Q{n} block:\n  {repr(blk[:400])}")
        shown += 1

# ── BUG 3: For 2024 — show which FIGURE_HINTS triggers and on what text ──
print("\n" + "="*64)
print("BUG 3 DIAGNOSTIC — 2024 FIGURE TRIGGER ANALYSIS")

import csv
review_2024 = list(csv.DictReader(
    open(ROOT/"docs"/"english_PREVIOUS_YEAR"/"output"/"2024_review.csv", encoding="utf-8")))
fig_rows = [r for r in review_2024 if r.get("review_status") == "fixable_figure"]
print(f"Total fixable_figure in 2024: {len(fig_rows)}")

hint_counts = {}
for r in fig_rows:
    t = (r.get("question_text","") + " " + r.get("option_a","") + " " +
         r.get("option_b","") + " " + r.get("option_c","") + " " + r.get("option_d","")).lower()
    for h in FIGURE_HINTS:
        if h in t:
            hint_counts[h] = hint_counts.get(h,0) + 1

print("FIGURE_HINTS trigger counts:")
for h, c in sorted(hint_counts.items(), key=lambda x: -x[1]):
    print(f"  '{h}': {c}")

print("\n10 sample fixable_figure questions with triggers:")
for r in fig_rows[:10]:
    t = (r.get("question_text","") + " " + r.get("option_a","") + " " +
         r.get("option_b","") + " " + r.get("option_c","") + " " + r.get("option_d","")).lower()
    triggers = [h for h in FIGURE_HINTS if h in t]
    print(f"\n  Q{r['q_no']} [{r['subject']}] triggers={triggers}")
    print(f"  Text: {r.get('question_text','')[:100]}")
