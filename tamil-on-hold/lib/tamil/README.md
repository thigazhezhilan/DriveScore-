# Tamil Translation Brain

Server-side translation worker that converts English NEET questions into Tamil drafts using RAG retrieval, a forced terminology glossary, Claude Sonnet, and objective validation. No Tamil content reaches students until a human reviewer approves it.

---

## Architecture — pipeline per question

```
English question (text + options + explanation)
        │
        ▼
[1] generateEmbedding()       embed.ts
        │  OpenAI text-embedding-3-small (1536 dims)
        ▼
[2] retrieveTamilContext()    retrieval.ts
        │  pgvector cosine similarity → top-5 Tamil passages
        │  from tamil_knowledge_chunks (filtered by subject/chapter)
        │  Smart seed exclusion: ai_generated_seed rows excluded
        │  automatically once real textbook content exists for that subject
        ▼
[3] lookupGlossaryTerms()     glossary.ts
        │  Normalized phrase matching against tamil_glossary
        │  (lowercase, depluralise, dehyphenate, word-boundary regex)
        │  Returns: [{english_term, tamil_term}] — HARD RULES for Claude
        ▼
[4] translateQuestion()       translate.ts
        │  Claude Sonnet 4.6 via tool_use (structured output — not free-form JSON)
        │  System prompt: glossary block + reference passages + 6 translation rules
        │  Returns: tamil_question_text, tamil_options[4], tamil_explanation,
        │           model_observations, used_glossary_terms, missing_expected_terms
        ▼
[5] validateTranslation()     validate.ts  ← PURE FUNCTION (no API/DB)
        │  Objective checks (all term lists from validation-config.ts):
        │    risk_words_preserved   (30%)  — NOT/EXCEPT/LEAST/etc. → Tamil marker
        │    glossary_match_rate    (25%)  — forced terms appear in output
        │    option_count_match     (20%)  — Tamil has exactly 4 options
        │    number_count_match     (10%)  — digit count unchanged
        │    unit_preserved         (10%)  — m/s, kg, pH, etc. survive verbatim
        │    chemical_formula       ( 5%)  — H₂O, ATP, DNA, etc. survive verbatim
        │    math_notation          ( 5%)  — ^2, √, ⇌, Greek letters survive
        │
        │  score 0–100 (weighted sum)
        │  auto_review_required = score < 80 OR risk_words_preserved = false
        ▼
[6] storeTamilDraft()         store.ts
        │  UPDATE questions SET
        │    tamil_question_text, tamil_options, tamil_explanation,
        │    tamil_status ('ai_drafted' | 'review_required'),
        │    tamil_confidence_notes  ← model's own self-report
        │    tamil_validation_result ← objective validator output (authoritative)
        │    tamil_drafted_at = now()
        ▼
[7] Return summary
        questionId, status, score, failedChecks, criticalFailures
```

---

## Files

| File | Purpose |
|------|---------|
| `validation-config.ts` | **Single source of truth** for all config arrays. Edit here to extend term lists. |
| `embed.ts` | OpenAI embedding generation (`text-embedding-3-small`) |
| `glossary.ts` | DB-backed glossary lookup with normalized phrase matching |
| `retrieval.ts` | pgvector RAG retrieval from `tamil_knowledge_chunks` |
| `translate.ts` | Claude Sonnet 4.6 call — tool_use forces structured JSON output |
| `validate.ts` | Pure objective validation — no API, no DB, fully unit-testable |
| `guard.ts` | Pure `getTamilContent()` — enforces the approved-only student rule |
| `store.ts` | DB writes — `storeTamilDraft()` and `storeTamilError()` |
| `agent.ts` | Orchestrator — `translateQuestionById()` + `translateBatch()` |
| `seed-knowledge.ts` | `addTamilChunk()` helper + 18 AI-generated seed passages |
| `agent.test.ts` | 8 tests (3 pure unit, 5 integration — see Testing section) |

---

## Database tables (migration 0017)

### `tamil_knowledge_chunks`
Tamil reference passages used for RAG context retrieval.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| source_type | text | `samacheer_textbook` \| `neet_paper` \| `board_paper` \| `coaching_material` \| `ai_generated_seed` |
| subject | text | `physics` \| `chemistry` \| `biology` |
| chapter | text | NCERT chapter name (optional) |
| class_level | text | `'11'` or `'12'` (optional) |
| tamil_text | text | The actual Tamil content |
| english_reference | text | Parallel English (optional, used for embedding if present) |
| embedding | vector(1536) | OpenAI text-embedding-3-small |

Index: HNSW (`m=16, ef_construction=100`) on `embedding vector_cosine_ops`.

### `tamil_glossary`
Forced terminology — Claude **must** use these exact Tamil terms.

| Column | Type | Notes |
|--------|------|-------|
| english_term | text | Unique. Normalized for matching. |
| tamil_term | text | Exact Tamil term to use |
| subject | text | `physics` \| `chemistry` \| `biology` \| NULL (cross-subject) |
| notes | text | `'Samacheer Class 11'`, `'NEEDS_REVIEW'`, etc. |

### Questions table (new columns)

| Column | Purpose |
|--------|---------|
| `tamil_question_text` | Tamil translation of the question |
| `tamil_options` | jsonb array of 4 Tamil option strings |
| `tamil_explanation` | Tamil translation of the explanation |
| `tamil_status` | `none` → `ai_drafted` / `review_required` → `review_pending` → `approved` \| `rejected` |
| `tamil_confidence_notes` | jsonb — model's self-reported metadata (not trusted for logic) |
| `tamil_validation_result` | jsonb — **authoritative** objective validator output + chunk/glossary IDs |
| `tamil_error_log` | text — parse/API failures |
| `tamil_drafted_at` | When the draft was created |
| `tamil_approved_at` | When a reviewer approved |
| `tamil_approved_by` | UUID of the reviewer (profiles FK) |

**Reviewer queue sort** (for the future reviewer screen):
```sql
WHERE tamil_status IN ('review_required', 'ai_drafted')
ORDER BY
  CASE tamil_status WHEN 'review_required' THEN 0 ELSE 1 END,
  (tamil_validation_result->>'score')::int ASC
```

---

## Student-facing guard

**Rule:** Tamil content is served to a student **only when**:
- `tamil_status = 'approved'` AND
- `preferred_language = 'ta'`

All other combinations fall back to English silently.

Enforced in `guard.ts` via `getTamilContent(question, studentLocale)`. When the Tamil UI is built, every question loader must call this function — never serve Tamil fields directly.

---

## Config arrays (`validation-config.ts`)

All term lists live here. Extend them as the reviewer flags new patterns.

| Export | Count | Purpose |
|--------|-------|---------|
| `EMBEDDING_MODEL` | — | `'text-embedding-3-small'` — must match chunk storage |
| `EMBEDDING_DIMS` | — | `1536` |
| `EXCLUDE_AI_SEEDS` | — | `false` — flip to `true` when real textbook content is loaded |
| `TAMIL_NEGATION_MARKERS` | 18 | Tamil equivalents of NOT/EXCEPT/LEAST/MOST/etc. |
| `ENGLISH_RISK_WORDS` | 31 | 4 categories: negation, extremity, correctness, absolutes |
| `PRESERVED_UNITS` | 55 | m/s, kg, mol, V, A, J, Pa, Hz, pH... |
| `PRESERVED_CHEMICAL_FORMULAS` | 56 | H₂O, CO₂, ATP, DNA, glucose... |
| `PRESERVED_MATH_PATTERNS` | 20 | regex: superscripts, √, ⇌, Greek letters, decimals... |

When a question contains a unit not in `PRESERVED_UNITS`, the validator logs:
```
[Tamil Validator] Unknown units encountered: <unit> — consider adding to PRESERVED_UNITS
```

---

## Glossary seed (100 terms)

Run `npm run db:seed-glossary`. Idempotent (upsert on `english_term`).

| Subject | Count | NEEDS_REVIEW |
|---------|-------|-------------|
| Physics | 30 | 1 (torque) |
| Chemistry | 30 | 6 (molarity, electronegativity, isomer, enthalpy, titration, electron configuration) |
| Biology | 30 | 7 (antigen, allele, genotype, phenotype, chromatid, nucleotide, receptor) |
| Cross-subject | 10 | 1 (equilibrium constant) |

Terms marked `NEEDS_REVIEW` should be verified against current Samacheer Tamil textbooks before going to production.

---

## Knowledge base seed (18 passages)

Run `npm run db:seed-knowledge`. Generates embeddings via OpenAI for each passage.

| Subject | Passages | Chapters covered |
|---------|----------|-----------------|
| Physics | 6 | Laws of Motion, Work/Energy/Power, Oscillations, Electric Charges, Current Electricity, Ray Optics |
| Chemistry | 6 | Chemical Bonding, Equilibrium, Electrochemistry, Acids/Bases, Organic Chemistry, Solutions |
| Biology | 6 | Cell Unit of Life, Cell Division, Photosynthesis, Molecular Basis (2×), Respiration |

All 18 are `source_type = 'ai_generated_seed'`. Once real Samacheer/NEET PDFs are ingested, the smart seed exclusion in `retrieval.ts` will automatically stop using these for subjects where real content exists.

---

## Setup

```bash
# 1. Apply migration in Supabase SQL editor
#    supabase/migrations/0017_tamil_translation.sql

# 2. Add to .env.local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# 3. Seed glossary (100 terms)
npm run db:seed-glossary

# 4. Seed knowledge base (18 passages — calls OpenAI for embeddings)
npm run db:seed-knowledge

# 5. Translate (start small to check quality)
npm run translate:tamil -- --subject Physics --status none --limit 10

# 6. Full batch
npm run translate:tamil -- --subject Biology --limit 50
npm run translate:tamil -- --status none --limit 200
```

### CLI options

```bash
# Single question
npm run translate:tamil -- --id <uuid>

# Batch by filter
npm run translate:tamil -- --subject Physics --status none --limit 50

# Batch specific IDs
npm run translate:tamil -- --ids uuid1,uuid2,uuid3
```

---

## Testing

```bash
npm run test:tamil
```

| # | Test | Type | Requires |
|---|------|------|---------|
| 5 | Student guard: `ai_drafted` → English, `approved` → Tamil | Pure unit | Nothing |
| 7 | Missing negation → `review_required`, score < 80 | Pure unit | Nothing |
| 8 | Unknown unit triggers `[Tamil Validator]` console warning | Pure unit | Nothing |
| 1 | Easy question: valid Tamil, 4 options, score ≥ 90 | Integration | API keys + `--conditions react-server` |
| 2 | NOT question: negation in Tamil, `risk_words_preserved = true` | Integration | API keys + `--conditions react-server` |
| 3 | Empty knowledge base: translates, `context_relevance = 'low'` | Integration | Anthropic credits |
| 4 | Glossary match rate = 100, exact terms in output | Integration | Anthropic credits |
| 6 | Batch: error in question 3 doesn't stop 4–5 | Integration | API keys + `--conditions react-server` |

Integration tests skip gracefully when API keys are absent or the `server-only` barrier from `lib/db/client.ts` is active. To run them fully:
```bash
npx tsx --conditions react-server lib/tamil/agent.test.ts
```

---

## Validation score weights

| Check | Weight | Critical? |
|-------|--------|-----------|
| `risk_words_preserved` | 30% | Yes — alone forces `review_required` if false |
| `glossary_match_rate` | 25% | No |
| `option_count_match` | 20% | No |
| `number_count_match` | 10% | No |
| `unit_preserved` | 10% | No |
| `chemical_formula_preserved` | 5% | No |
| `math_notation_preserved` | 5% | No |

`auto_review_required = true` when: **score < 80** OR **`risk_words_preserved = false`** (regardless of score).

---

## Security guardrails

- `answer_index` is **never passed to the translation prompt** — the agent translates text only
- All API keys are server-side env vars (no `NEXT_PUBLIC_` prefix)
- Tamil drafts are **never served to students** unless `tamil_status = 'approved'` (enforced in `guard.ts`)
- Translation prompt contains only question content — no student data, attempt data, or PII
- `tamil_validation_result` stores `retrieved_chunk_ids` and `glossary_match_ids` for full reviewer audit trail

---

## Adding real textbook content

When Samacheer/NEET PDFs are available, use `addTamilChunk()` from `seed-knowledge.ts`:

```typescript
import { addTamilChunk } from "@/lib/tamil/seed-knowledge";

await addTamilChunk({
  source_type: "samacheer_textbook",
  subject: "physics",
  chapter: "Laws of Motion",
  class_level: "11",
  tamil_text: "...(passage from textbook)...",
  english_reference: "...(parallel English if available)...",
});
```

Once real content is added for a subject, set `EXCLUDE_AI_SEEDS = true` in `validation-config.ts`, or let the smart exclusion in `retrieval.ts` handle it automatically (it excludes seeds whenever non-seed content exists for that subject).
