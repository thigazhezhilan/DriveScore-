import sys, io, csv
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
for year in [2017, 2020, 2021, 2024]:
    path = f"docs/english_PREVIOUS_YEAR/output/{year}_clean.csv"
    rows = list(csv.DictReader(open(path, encoding="utf-8")))
    print(f"=== {year} CLEAN ({len(rows)} rows) - 5 samples ===")
    step = max(1, len(rows)//5)
    for r in rows[::step][:5]:
        lo = r["correct_option"].lower()
        ans_opt = r["option_" + lo]
        print(f"  Q{r['q_no']} [{r['subject']}|{r['chapter']}] ans={r['correct_option']} par_s={r['par_seconds']}")
        print(f"    Q: {r['question_text'][:80]}")
        print(f"    A: {ans_opt[:60]}")
    print()
