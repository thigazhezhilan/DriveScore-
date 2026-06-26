"""Check if Climb chapters have questions with body filled in the DB."""
import sys, io, re, requests
from pathlib import Path
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

ROOT = Path(__file__).resolve().parent.parent
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z0-9_]+)=(.*)', line.strip())
    if m: env[m.group(1)] = m.group(2).strip()

URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
H   = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

# Check questions table columns actually present
resp = requests.get(
    f"{URL}/rest/v1/questions",
    headers={**H, "Range-Unit": "items", "Range": "0-0"},
    params={"select": "id,status,language,body,options,hidden", "centre_id": "is.null"},
)
print("Column check (first row):")
if resp.status_code == 200:
    row = resp.json()[0] if resp.json() else {}
    for k,v in row.items():
        print(f"  {k}: {repr(str(v)[:60])}")
else:
    print(f"  HTTP {resp.status_code}: {resp.text[:200]}")

print()

# Count rows per chapter for status=live,language=en,source=pyq  (new path)
resp2 = requests.get(
    f"{URL}/rest/v1/questions",
    headers={**H, "Range-Unit": "items", "Range": "0-999"},
    params={"select": "subject,chapter,body",
            "source": "eq.pyq", "language": "eq.en",
            "status": "eq.live", "centre_id": "is.null",
            "subject": "eq.Physics"},
)
rows = resp2.json() if resp2.status_code == 200 else []
by_ch = defaultdict(lambda: {"total": 0, "body_filled": 0})
for r in rows:
    ch = r.get("chapter","?")
    by_ch[ch]["total"] += 1
    if r.get("body"):
        by_ch[ch]["body_filled"] += 1

print(f"Physics chapters via new path (status=live, language=en): {len(rows)} rows total")
print(f"\n{'Chapter':<45} {'total':>6} {'body_ok':>8} {'body_null':>10}")
print("-"*72)
for ch, d in sorted(by_ch.items(), key=lambda x: -x[1]["total"]):
    null = d["total"] - d["body_filled"]
    print(f"{ch:<45} {d['total']:>6} {d['body_filled']:>8} {null:>10}")

# Also check hidden column exists + count hidden=false
resp3 = requests.get(
    f"{URL}/rest/v1/questions",
    headers={**H, "Prefer": "count=exact"},
    params={"select": "id", "source": "eq.pyq", "language": "eq.en",
            "hidden": "eq.false", "centre_id": "is.null",
            "subject": "eq.Physics"},
)
cr = resp3.headers.get("content-range","?")
print(f"\nOLD path (hidden=false): HTTP {resp3.status_code}, content-range: {cr}")
if resp3.status_code == 400:
    print("  => hidden column likely does not exist (or no rows)")
