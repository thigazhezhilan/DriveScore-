"""
Gate 3: Import 1,104 NEET PYQ rows (clean + llm_flagged) into Supabase.

Usage:
    python scripts/gate3_import_pyq.py --dry-run   # counts only, no DB write
    python scripts/gate3_import_pyq.py              # live import

Sources:
    docs/english_PREVIOUS_YEAR/output/{year}_clean.csv   -- all rows
    docs/english_PREVIOUS_YEAR/output/{year}_review.csv  -- llm_flagged rows only

DB mapping:
    body          <- question_text
    options       <- [option_a, option_b, option_c, option_d]  (JSON array)
    answer_index  <- correct_option A/B/C/D -> 0/1/2/3
    par_time_sec  <- par_time_sec (int)
    par_seconds   <- par_time_sec (same value; par_seconds in CSV is always blank)
    year          <- year (int)
    has_diagram   <- false  (fixable_figure rows excluded)
    source        <- 'pyq'
    language      <- 'en'
    centre_id     <- null
    status        <- 'live'
"""

import sys, io, csv, json, re, os
import requests
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DRY_RUN = "--dry-run" in sys.argv
BATCH   = 100
YEARS   = [2017, 2018, 2019, 2020, 2021, 2024, 2025]
LETTER  = {"A": 0, "B": 1, "C": 2, "D": 3}

ROOT   = Path(__file__).resolve().parent.parent
OUTDIR = ROOT / "docs" / "english_PREVIOUS_YEAR" / "output"

# ── load .env.local ──────────────────────────────────────────────────────────
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
    if m:
        env[m.group(1)] = m.group(2).strip()

SUPA_URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SUPA_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS  = {
    "apikey":        SUPA_KEY,
    "Authorization": f"Bearer {SUPA_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
}

# ── collect rows ──────────────────────────────────────────────────────────────
rows = []
for year in YEARS:
    # All clean rows
    cf = OUTDIR / f"{year}_clean.csv"
    if cf.exists():
        for r in csv.DictReader(cf.open(encoding="utf-8")):
            r["_src_status"] = "clean"
            rows.append(r)

    # Only llm_flagged from review CSV
    rf = OUTDIR / f"{year}_review.csv"
    if rf.exists():
        for r in csv.DictReader(rf.open(encoding="utf-8")):
            if r.get("review_status") == "llm_flagged":
                r["_src_status"] = "llm_flagged"
                rows.append(r)

print(f"Loaded {len(rows)} rows from CSVs")

# ── year breakdown ────────────────────────────────────────────────────────────
by_year = {}
for r in rows:
    y = r.get("year", "?")
    by_year[y] = by_year.get(y, 0) + 1
for y, n in sorted(by_year.items()):
    print(f"  {y}: {n} rows")

# ── map to DB schema ──────────────────────────────────────────────────────────
db_rows = []
bad = []
for i, r in enumerate(rows):
    opts = [
        r.get("option_a", "").strip(),
        r.get("option_b", "").strip(),
        r.get("option_c", "").strip(),
        r.get("option_d", "").strip(),
    ]
    ans_letter = r.get("correct_option", "").strip().upper()
    par_raw    = r.get("par_time_sec", "").strip()
    year_raw   = r.get("year", "").strip()

    # Validate
    issues = []
    if not r.get("question_text", "").strip(): issues.append("empty body")
    if any(not o for o in opts):               issues.append("missing option")
    if ans_letter not in LETTER:               issues.append(f"bad answer '{ans_letter}'")
    if not year_raw:                            issues.append("missing year")
    if issues:
        bad.append((i, r.get("year"), r.get("q_no"), issues))
        continue

    try:    par_sec = int(float(par_raw)) if par_raw else 60
    except: par_sec = 60
    concept    = (r.get("concept") or r.get("chapter") or "").strip()[:120]
    difficulty = r.get("difficulty", "").strip()
    if difficulty not in ("Easy", "Medium", "Hard"):
        difficulty = "Medium"  # PYQ difficulty unset; default to Medium

    db_rows.append({
        "centre_id":    None,
        "language":     "en",
        "source":       "pyq",
        "status":       "live",
        "subject":      r["subject"].strip(),
        "chapter":      r["chapter"].strip(),
        "concept":      concept,
        "difficulty":   difficulty,
        "par_time_sec": par_sec,
        "par_seconds":  par_sec,
        "year":         int(year_raw),
        "has_diagram":  False,
        "body":         r["question_text"].strip(),
        "options":      opts,
        "answer_index": LETTER[ans_letter],
    })

if bad:
    print(f"\nWARNING: {len(bad)} invalid rows skipped:")
    for i, yr, qno, issues in bad[:10]:
        print(f"  row {i} year={yr} Q{qno}: {issues}")

print(f"\n{len(db_rows)} rows ready for import")

if DRY_RUN:
    print("\n[DRY RUN] No DB writes. Pass without --dry-run to import.")
    sys.exit(0)

# ── live import ───────────────────────────────────────────────────────────────
print(f"\nInserting in batches of {BATCH}...")
inserted = 0
for i in range(0, len(db_rows), BATCH):
    batch = db_rows[i : i + BATCH]
    resp  = requests.post(
        f"{SUPA_URL}/rest/v1/questions",
        headers=HEADERS,
        data=json.dumps(batch),
    )
    if resp.status_code not in (200, 201):
        print(f"ERROR at batch {i//BATCH + 1}: HTTP {resp.status_code}")
        print(resp.text[:500])
        sys.exit(1)
    n = len(resp.json()) if resp.text else len(batch)
    inserted += n
    print(f"  batch {i//BATCH + 1}: +{n} (total {inserted})")

print(f"\nInserted {inserted} rows.")

# ── post-import verify ────────────────────────────────────────────────────────
print("\n── Post-import verify ──")
resp = requests.get(
    f"{SUPA_URL}/rest/v1/questions",
    headers={**HEADERS, "Prefer": "count=exact"},
    params={
        "select":     "year",
        "source":     "eq.pyq",
        "language":   "eq.en",
        "centre_id":  "is.null",
    },
)
# Group by year from response
if resp.status_code == 200:
    data = resp.json()
    tally = {}
    for row in data:
        y = row.get("year")
        tally[y] = tally.get(y, 0) + 1
    for y, n in sorted(tally.items(), key=lambda x: (x[0] is None, x[0])):
        label = str(y) if y is not None else "NULL"
        print(f"  year={label}  n={n}")
else:
    print(f"  Verify query failed: HTTP {resp.status_code}")

print("\nGate 3 complete.")
