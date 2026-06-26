"""
Gate 5 calibration batch: ~20 clearly-hard questions to test whether the
difficulty judge can reach 'Hard' at all, or is compressing toward Medium.

Selection strategy:
  - Row 29 and Row 35 from the sample (prism angle, wire parallel/series) — forced
  - Multi-step numerical Physics: look for numeric constants, multi-formula stems
  - Mechanism / multi-concept Organic Chem: look for named reactions, mechanisms

No DB write. Shows each stem + assigned difficulty + final distribution.
"""

import sys, io, re, json, time, random
import requests
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

ROOT = Path(__file__).resolve().parent.parent
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z0-9_]+)=(.*)', line.strip())
    if m: env[m.group(1)] = m.group(2).strip()

SUPA_URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SUPA_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
ANTH_KEY = env["ANTHROPIC_API_KEY"]
HEADERS  = {"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}", "Content-Type": "application/json"}

import anthropic
llm   = anthropic.Anthropic(api_key=ANTH_KEY)
MODEL = "claude-haiku-4-5-20251001"
VALID = {"Easy", "Medium", "Hard"}
YEARS = (2017, 2018, 2019, 2020, 2021, 2024, 2025)

# ── fetch all 1104 rows ───────────────────────────────────────────────────────
def fetch_rows():
    rows, page, size = [], 0, 500
    while True:
        resp = requests.get(
            f"{SUPA_URL}/rest/v1/questions",
            headers={**HEADERS, "Range-Unit": "items",
                     "Range": f"{page*size}-{(page+1)*size-1}"},
            params={"select": "id,subject,chapter,year,body,options",
                    "source": "eq.pyq", "language": "eq.en", "centre_id": "is.null",
                    "year": f"in.({','.join(str(y) for y in YEARS)})"},
        )
        batch = resp.json()
        if not batch: break
        rows.extend(batch)
        cr    = resp.headers.get("content-range","0/0").split("/")[-1]
        total = int(cr) if cr.isdigit() else 9999
        if len(rows) >= total: break
        page += 1
    return rows

# ── heuristics to score a row's "hardness" ───────────────────────────────────
# Physics hard signals: multiple numeric values, unit combinations, named laws
PHYS_HARD = re.compile(
    r'\d+[\.\d]*\s*[×x]\s*10|'           # scientific notation
    r'\d+\s*(Ω|ohm|eV|kJ|J/mol|N/m|nm|μ|mH|μF|nF|T\b)|'  # units
    r'(refractive index|focal length|magnification|Young.s modulus|'
    r'coefficient of|wavelength|frequency|electric field|magnetic field|'
    r'potential energy|kinetic energy|moment of inertia|angular momentum).*\d|'
    r'\d.*(refractive index|focal length|magnification|Young.s modulus|'
    r'coefficient of|wavelength|frequency)',
    re.I
)
# Chem hard signals: named reactions, mechanisms, multi-concept organic
CHEM_HARD = re.compile(
    r'Hell.Volhard|Clemmensen|Wolff.Kishner|Baeyer|Sandmeyer|Reimer.Tiemann|'
    r'mechanism|intermediate|rate.determining|activation energy|'
    r'rate constant.*order|order.*rate constant|'
    r'hybridis[ae]|VSEPR|MO theory|molecular orbital|'
    r'Kp.*Kc|Kc.*Kp|degree of dissociation|van.t Hoff|'
    r'cell potential|E.*nernst|nernst.*E|oxidation state.*calculat',
    re.I
)

def hardness_score(row):
    body = row.get("body", "")
    opts = " ".join(row.get("options") or [])
    text = body + " " + opts
    subj = row.get("subject", "")
    if subj == "Physics":
        return len(PHYS_HARD.findall(text))
    if subj == "Chemistry":
        return len(CHEM_HARD.findall(text))
    return 0  # Biology rarely hits Hard via text patterns

# ── forced rows from sample (Row 29 / Row 35) ────────────────────────────────
ROW29_STEM = "Find the value of the angle of emergence from the prism"
ROW35_STEM = "A wire of length"

# ── judge_one (same as gate5) ─────────────────────────────────────────────────
def judge_one(row):
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
        f"            • 3+ step calculation or formula chain\n"
        f"            • Must combine two or more distinct formulas / physical laws\n"
        f"            • Non-obvious setup: thermal expansion of two materials, AC circuit\n"
        f"              analysis, Newton's law of cooling integration, escape velocity\n"
        f"            • Organic: counting hybridisation + bonds in complex structure,\n"
        f"              multi-step mechanism, or 2+ named reactions in one question\n"
        f"            • Equilibrium/kinetics: Kp<->Kc conversion, two-temperature rate\n"
        f"              constant, or degree of dissociation calculation\n"
        f"            • Even a well-prepared student would need >90 s\n\n"
        f"          About 5-10% of NEET questions are Hard — do not over-assign, but do\n"
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
        canon   = raw.capitalize()
        if canon in VALID: return canon, latency
        for v in VALID:
            if v.lower() in raw.lower(): return v, latency
        return None, latency
    except Exception as e:
        print(f"  [LLM error] {e}", file=sys.stderr)
        return None, int((time.time() - t0) * 1000)

# ── main ──────────────────────────────────────────────────────────────────────
print("Fetching 1,104 rows…")
all_rows = fetch_rows()
print(f"Fetched {len(all_rows)}\n")

# Forced: Row 29 and Row 35
forced = []
for r in all_rows:
    b = r.get("body", "")
    if ROW29_STEM.lower() in b.lower() or ROW35_STEM.lower() in b.lower():
        forced.append(r)
forced = forced[:2]  # at most the two we know
print(f"Forced rows found: {len(forced)} ({[r['year'] for r in forced]})")

# Score all Physics and Chemistry rows by hardness heuristic
scored = []
forced_ids = {r["id"] for r in forced}
for r in all_rows:
    if r["id"] in forced_ids: continue
    s = hardness_score(r)
    if s > 0:
        scored.append((s, r))

scored.sort(key=lambda x: -x[0])

# Take top candidates: ~10 Physics, ~8 Chemistry
phys_cands = [(s, r) for s, r in scored if r["subject"] == "Physics"]
chem_cands = [(s, r) for s, r in scored if r["subject"] == "Chemistry"]

random.seed(7)
# Sample from top-third of each to keep genuinely hard ones
p_top = phys_cands[:max(20, len(phys_cands)//3)]
c_top = chem_cands[:max(20, len(chem_cands)//3)]
selected_p = random.sample(p_top, min(10, len(p_top)))
selected_c = random.sample(c_top, min(8,  len(c_top)))

calib = forced + [r for _, r in selected_p] + [r for _, r in selected_c]
# Dedupe in case of overlap
seen = set()
calib_deduped = []
for r in calib:
    if r["id"] not in seen:
        seen.add(r["id"])
        calib_deduped.append(r)

print(f"Calibration batch: {len(calib_deduped)} rows "
      f"({sum(1 for r in calib_deduped if r['subject']=='Physics')} Physics, "
      f"{sum(1 for r in calib_deduped if r['subject']=='Chemistry')} Chemistry)\n")

# ── run ───────────────────────────────────────────────────────────────────────
print(f"{'#':<3} {'Year':<5} {'Subj':<10} {'Difficulty':<10}  Question stem")
print("-"*80)
results = []
for i, row in enumerate(calib_deduped, 1):
    diff, ms = judge_one(row)
    label = diff if diff else "FAIL"
    stem  = (row.get("body") or "").replace("\n", " ")[:90]
    print(f"{i:<3} {row.get('year'):<5} {row['subject'][:9]:<10} {label:<10}  {stem}")
    results.append((row, diff or "Medium"))

from collections import Counter
counts = Counter(diff for _, diff in results)
total  = len(results)
print("\n── Calibration distribution ──")
for d in ("Easy", "Medium", "Hard"):
    n   = counts.get(d, 0)
    pct = 100 * n / total if total else 0
    bar = "█" * int(pct / 3)
    print(f"  {d:6s}  {n:3d}  ({pct:5.1f}%)  {bar}")

hard_n = counts.get("Hard", 0)
print(f"\nHard count: {hard_n}/{total}")
if hard_n == 0:
    print("=> Model NEVER said Hard on hand-picked hard questions.")
    print("   Current prompt is compressing toward Medium.")
    print("   Recommendation: tighten Hard criteria before full run.")
elif hard_n >= 3:
    print("=> Model CAN reach Hard. Earlier 0% was rarity, not compression.")
    print("   Safe to approve full run.")
else:
    print("=> Borderline. Review stems marked Hard vs Medium to judge if prompt needs tuning.")
