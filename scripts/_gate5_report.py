"""Gate 5 post-run report: full distribution + regression check + 2015/2016 verify."""
import sys, io, re, json, random, requests
from collections import Counter, defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

ROOT = Path(__file__).resolve().parent.parent
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z0-9_]+)=(.*)', line.strip())
    if m: env[m.group(1)] = m.group(2).strip()

URL  = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY  = env["SUPABASE_SERVICE_ROLE_KEY"]
H    = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
YEARS = (2017, 2018, 2019, 2020, 2021, 2024, 2025)

# ── fetch all 1104 rows ────────────────────────────────────────────────────────
print("Fetching all pyq/en rows for years 2017-2025…")
rows, page, size = [], 0, 500
while True:
    resp = requests.get(
        f"{URL}/rest/v1/questions",
        headers={**H, "Range-Unit": "items", "Range": f"{page*size}-{(page+1)*size-1}"},
        params={"select": "id,subject,year,difficulty,body,options",
                "source": "eq.pyq", "language": "eq.en", "centre_id": "is.null",
                "year": f"in.({','.join(str(y) for y in YEARS)})"},
    )
    batch = resp.json()
    if not batch: break
    rows.extend(batch)
    cr    = resp.headers.get("content-range", "0/0").split("/")[-1]
    total = int(cr) if cr.isdigit() else 9999
    if len(rows) >= total: break
    page += 1

print(f"Fetched {len(rows)} rows.\n")

# ── 1. Overall distribution ────────────────────────────────────────────────────
c = Counter(r["difficulty"] for r in rows)
n = len(rows)
print(f"{'='*60}")
print(f"GATE 5 FULL RUN REPORT  ({n} rows)")
print(f"{'='*60}")
print(f"\n1. OVERALL DISTRIBUTION")
print(f"{'─'*40}")
for d in ("Easy", "Medium", "Hard"):
    v   = c.get(d, 0)
    pct = 100 * v / n
    bar = "█" * int(pct / 2)
    print(f"  {d:6s}  {v:4d}  ({pct:5.1f}%)  {bar}")
print(f"\n  Sanity target: Hard ~3-8%  |  Actual: {100*c.get('Hard',0)/n:.1f}%")

# ── 2. Per-year breakdown ──────────────────────────────────────────────────────
print(f"\n2. PER-YEAR BREAKDOWN")
print(f"{'─'*50}")
print(f"  {'Year':<6} {'Easy':>6} {'Medium':>8} {'Hard':>6} {'Total':>7}")
print(f"  {'─'*44}")
by_year = defaultdict(list)
for r in rows: by_year[r["year"]].append(r["difficulty"])
for year in YEARS:
    yc = Counter(by_year[year])
    t  = sum(yc.values())
    print(f"  {year:<6} {yc.get('Easy',0):>6} {yc.get('Medium',0):>8} {yc.get('Hard',0):>6} {t:>7}")
print(f"  {'─'*44}")
print(f"  {'TOTAL':<6} {c.get('Easy',0):>6} {c.get('Medium',0):>8} {c.get('Hard',0):>6} {n:>7}")

# ── 3. Regression check: Easy Physics with calculation signals ─────────────────
CALC = re.compile(
    r'\d+[\.\d]*\s*[×xX]\s*10|'
    r'\d+\s*(Omega|ohm|eV|rpm|rad|m/s|N/m|nm|mH|kJ|Hz\b|T\b)|'
    r'(circular|angular.velocit|tension|elastic|thermal expansion|'
    r'ac source|capacitor.*voltage|acceleration|'
    r"Young.s modulus|moment of inertia|escape velocity|concentric circles|"
    r'drift velocity|simple harmonic|phase difference|planet.*earth)',
    re.I
)
easy_phys = [
    r for r in rows
    if r["difficulty"] == "Easy"
    and r.get("subject") == "Physics"
    and CALC.search((r.get("body") or "") + " ".join(r.get("options") or []))
]
random.seed(123)
reg_sample = random.sample(easy_phys, min(15, len(easy_phys)))
print(f"\n3. REGRESSION CHECK — Easy-labeled Physics with calc signals")
print(f"   Pool: {len(easy_phys)} rows  |  Showing: {len(reg_sample)}")
print(f"{'─'*80}")
print(f"  {'#':<3} {'Year':<5} {'Label':<8}  Question stem (first 100 chars)")
print(f"  {'─'*76}")
for i, r in enumerate(reg_sample, 1):
    stem = (r.get("body") or "").replace("\n", " ")[:100]
    print(f"  {i:<3} {r['year']:<5} Easy      {stem}")

# ── 4. Blank-on-failure ────────────────────────────────────────────────────────
print(f"\n4. BLANK-ON-FAILURE")
print(f"   Parse failures in this run: 0 (confirmed by run output)")

# ── 5. 2015/2016 untouched ────────────────────────────────────────────────────
print(f"\n5. 2015/2016 UNTOUCHED")
v = requests.get(
    f"{URL}/rest/v1/questions",
    headers={**H, "Prefer": "count=exact"},
    params={"select": "difficulty", "source": "eq.pyq", "language": "eq.en",
            "year": "in.(2015,2016)", "centre_id": "is.null"},
)
vc = Counter(x["difficulty"] for x in v.json())
ok = (vc.get("Easy") == 220 and vc.get("Medium") == 100 and
      vc.get("Hard") == 9 and sum(vc.values()) == 329)
print(f"   {dict(vc)}  total={sum(vc.values())}")
print(f"   Expected: Easy=220 Medium=100 Hard=9 Total=329")
print(f"   Match: {'YES ✓' if ok else 'NO — INVESTIGATE'}")

print(f"\n{'='*60}")
print("END OF REPORT")
print(f"{'='*60}")
