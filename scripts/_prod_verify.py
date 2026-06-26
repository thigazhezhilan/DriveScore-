"""
Production read-only verification before treating PYQ import as live to students.
No writes. All checks are SELECT only.
"""
import sys, io, re, json, requests
from collections import Counter, defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

ROOT = Path(__file__).resolve().parent.parent
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z0-9_]+)=(.*)', line.strip())
    if m: env[m.group(1)] = m.group(2).strip()

URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
H   = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

EXPECTED = {
    2015: 161, 2016: 168,
    2017: 142, 2018: 139, 2019: 167,
    2020: 165, 2021: 178,
    2024: 162, 2025: 151,
}
EXPECTED_TOTAL = 1433

def sep(title):
    print(f"\n{'='*60}")
    print(f"  CHECK {title}")
    print(f"{'='*60}")

# ─────────────────────────────────────────────────────────────────
# CHECK 1: counts per year for live/pyq/en rows
# ─────────────────────────────────────────────────────────────────
sep("1 — ROW COUNTS PER YEAR (status=live, source=pyq, language=en)")

rows, page, size = [], 0, 500
while True:
    resp = requests.get(
        f"{URL}/rest/v1/questions",
        headers={**H, "Range-Unit": "items", "Range": f"{page*size}-{(page+1)*size-1}"},
        params={"select": "year", "source": "eq.pyq", "language": "eq.en",
                "status": "eq.live", "centre_id": "is.null"},
    )
    batch = resp.json()
    if not batch: break
    rows.extend(batch)
    cr    = resp.headers.get("content-range", "0/0").split("/")[-1]
    total = int(cr) if cr.isdigit() else 9999
    if len(rows) >= total: break
    page += 1

by_year = Counter(r["year"] for r in rows)
total_live = sum(by_year.values())
all_years_correct = True

print(f"\n  {'Year':<6} {'Count':>6} {'Expected':>10} {'Match':>7}")
print(f"  {'─'*34}")
for year in sorted(EXPECTED):
    got = by_year.get(year, 0)
    exp = EXPECTED[year]
    ok  = got == exp
    if not ok: all_years_correct = False
    flag = "✓" if ok else "✗ MISMATCH"
    print(f"  {year:<6} {got:>6} {exp:>10} {flag:>7}")
print(f"  {'─'*34}")
print(f"  {'TOTAL':<6} {total_live:>6} {EXPECTED_TOTAL:>10} {'✓' if total_live == EXPECTED_TOTAL else '✗ MISMATCH':>7}")

null_year = by_year.get(None, 0)
print(f"\n  NULL year rows (status=live pyq/en): {null_year}")

result1 = all_years_correct and total_live == EXPECTED_TOTAL
print(f"\n  RESULT: {'PASS ✓' if result1 else 'FAIL ✗'}")

# ─────────────────────────────────────────────────────────────────
# CHECK 2: ORPHAN CHECK — source=pyq, language=en, centre_id IS NULL, year IS NULL
# ─────────────────────────────────────────────────────────────────
sep("2 — ORPHAN CHECK (year IS NULL, source=pyq, language=en, centre_id IS NULL)")

orphan_resp = requests.get(
    f"{URL}/rest/v1/questions",
    headers={**H, "Prefer": "count=exact"},
    params={"select": "id,body,status,difficulty",
            "source": "eq.pyq", "language": "eq.en",
            "centre_id": "is.null", "year": "is.null"},
)
orphans = orphan_resp.json()
n_orphan = len(orphans)
print(f"\n  Orphan rows found: {n_orphan}")
if n_orphan > 0:
    print(f"  First 5 orphans:")
    for r in orphans[:5]:
        print(f"    id={r['id'][:8]}… status={r['status']} body={str(r.get('body',''))[:60]}")
result2 = n_orphan == 0
print(f"\n  RESULT: {'PASS ✓ — zero orphans' if result2 else f'FAIL ✗ — {n_orphan} orphans found'}")

# ─────────────────────────────────────────────────────────────────
# CHECK 3: DEDUP CONFIRM — check for exact duplicate (body, year, language) pairs
# ─────────────────────────────────────────────────────────────────
sep("3 — DEDUP CONFIRM (body+year exact duplicates within source=pyq, language=en)")

# Fetch body+year for all 1433 rows
dup_rows, page = [], 0
while True:
    resp = requests.get(
        f"{URL}/rest/v1/questions",
        headers={**H, "Range-Unit": "items", "Range": f"{page*size}-{(page+1)*size-1}"},
        params={"select": "id,body,year,answer_index",
                "source": "eq.pyq", "language": "eq.en", "centre_id": "is.null"},
    )
    batch = resp.json()
    if not batch: break
    dup_rows.extend(batch)
    cr    = resp.headers.get("content-range", "0/0").split("/")[-1]
    total = int(cr) if cr.isdigit() else 9999
    if len(dup_rows) >= total: break
    page += 1

seen, dupes = {}, []
for r in dup_rows:
    key = (r["year"], (r.get("body") or "")[:120].strip())
    if key in seen:
        dupes.append((seen[key], r["id"], r["year"], r.get("body","")[:60]))
    else:
        seen[key] = r["id"]

print(f"\n  Total rows checked: {len(dup_rows)}")
print(f"  Duplicate (body[:120]+year) pairs: {len(dupes)}")
if dupes:
    print(f"  First 5 dupes:")
    for orig, dup_id, year, stem in dupes[:5]:
        print(f"    year={year}  orig={orig[:8]}…  dup={dup_id[:8]}…  body={stem}")
result3 = len(dupes) == 0
print(f"\n  RESULT: {'PASS ✓ — no duplicates' if result3 else f'FAIL ✗ — {len(dupes)} duplicates detected'}")

# ─────────────────────────────────────────────────────────────────
# CHECK 5: Spot-check 2024 and 2019 rows (body, options, answer_index)
# (Done before CHECK 4 so we have concrete rows for the path trace)
# ─────────────────────────────────────────────────────────────────
sep("5 — SPOT CHECK: one 2024 and one 2019 row (body, 4 options, answer_index)")

for year in (2024, 2019):
    resp = requests.get(
        f"{URL}/rest/v1/questions",
        headers={**H, "Range-Unit": "items", "Range": "0-0"},
        params={"select": "id,subject,chapter,body,options,answer_index,difficulty,par_time_sec,year,has_diagram",
                "source": "eq.pyq", "language": "eq.en", "centre_id": "is.null",
                "year": f"eq.{year}", "status": "eq.live"},
    )
    rows_y = resp.json()
    if not rows_y:
        print(f"\n  year={year}: NO ROWS RETURNED — check filter")
        continue
    r = rows_y[0]
    opts = r.get("options") or []
    if isinstance(opts, str):
        try: opts = json.loads(opts)
        except: opts = []
    print(f"\n  ── year={year} (id={r['id'][:12]}…) ──")
    print(f"  subject     : {r.get('subject')}")
    print(f"  chapter     : {r.get('chapter')}")
    print(f"  difficulty  : {r.get('difficulty')}")
    print(f"  par_time_sec: {r.get('par_time_sec')}")
    print(f"  has_diagram : {r.get('has_diagram')}")
    print(f"  answer_index: {r.get('answer_index')}  (→ option {['A','B','C','D'][r.get('answer_index',0)]})")
    print(f"  body        : {(r.get('body') or '')[:120]}")
    for i, opt in enumerate(opts):
        marker = " ← CORRECT" if i == r.get("answer_index") else ""
        print(f"  option {['A','B','C','D'][i]}    : {str(opt)[:80]}{marker}")
    issues = []
    if not r.get("body"): issues.append("EMPTY BODY")
    if len(opts) != 4: issues.append(f"OPTIONS COUNT={len(opts)} (expected 4)")
    if r.get("answer_index") not in (0,1,2,3): issues.append("BAD ANSWER_INDEX")
    print(f"  Integrity   : {'OK ✓' if not issues else 'ISSUES: ' + ', '.join(issues)}")

print()
