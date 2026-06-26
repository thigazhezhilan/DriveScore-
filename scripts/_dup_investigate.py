"""Investigate the 12 body[:120]+year duplicate pairs — are they real or stem collisions?"""
import sys, io, re, json, requests
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

# Fetch all 1433 rows
rows, page, size = [], 0, 500
while True:
    resp = requests.get(
        f"{URL}/rest/v1/questions",
        headers={**H, "Range-Unit": "items", "Range": f"{page*size}-{(page+1)*size-1}"},
        params={"select": "id,subject,chapter,year,body,options,answer_index,source,language",
                "source": "eq.pyq", "language": "eq.en", "centre_id": "is.null"},
    )
    batch = resp.json()
    if not batch: break
    rows.extend(batch)
    cr    = resp.headers.get("content-range", "0/0").split("/")[-1]
    total = int(cr) if cr.isdigit() else 9999
    if len(rows) >= total: break
    page += 1

print(f"Fetched {len(rows)} rows.\n")

# Find all pairs with same (year, body[:120])
seen = {}
dupes = []
for r in rows:
    key = (r["year"], (r.get("body") or "")[:120].strip())
    if key in seen:
        dupes.append((seen[key], r))
    else:
        seen[key] = r

# For each dupe pair, show FULL body and options to judge real vs false-positive
print(f"Found {len(dupes)} duplicate pairs (by year + body[:120]).\n")
real_dupes = []
for i, (a, b) in enumerate(dupes, 1):
    body_a = (a.get("body") or "").strip()
    body_b = (b.get("body") or "").strip()
    opts_a = a.get("options") or []
    opts_b = b.get("options") or []
    ans_a  = a.get("answer_index")
    ans_b  = b.get("answer_index")

    is_real = (body_a == body_b and opts_a == opts_b and ans_a == ans_b)
    is_stem_collision = not is_real

    verdict = "REAL DUPLICATE" if is_real else "STEM COLLISION (different content)"
    print(f"── Pair {i}: year={a['year']}  [{verdict}]")
    print(f"   Row A: id={a['id'][:12]}  subj={a['subject']}  ch={a['chapter'][:40]}")
    print(f"   Row B: id={b['id'][:12]}  subj={b['subject']}  ch={b['chapter'][:40]}")

    if is_real:
        real_dupes.append((a, b))
        print(f"   BODY (identical): {body_a[:150]}")
        print(f"   Options A: {[str(o)[:40] for o in opts_a]}")
        print(f"   answer_index: {ans_a}")
    else:
        # Show where they diverge
        if body_a != body_b:
            print(f"   Body A: {body_a[:120]}")
            print(f"   Body B: {body_b[:120]}")
        else:
            print(f"   Body: {body_a[:100]} [identical]")
            print(f"   Opts A: {[str(o)[:30] for o in opts_a[:2]]}")
            print(f"   Opts B: {[str(o)[:30] for o in opts_b[:2]]}")
    print()

print("="*60)
print(f"SUMMARY: {len(real_dupes)} real duplicates, {len(dupes)-len(real_dupes)} stem collisions")
if real_dupes:
    print("\nReal duplicate IDs to DELETE (keep orig, remove dup):")
    for a, b in real_dupes:
        print(f"  DELETE id={b['id']}  (year={b['year']} subj={b['subject']} ch={b['chapter'][:50]})")
    print("\nSQL to clean up real dupes (READ CAREFULLY before running):")
    for a, b in real_dupes:
        print(f"  DELETE FROM questions WHERE id = '{b['id']}';  -- dup of {a['id'][:12]}")
else:
    print("No action needed — all pairs are stem collisions, not true duplicates.")
