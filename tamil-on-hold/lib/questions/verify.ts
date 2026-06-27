/**
 * Independent question verifier — quality gate for AI-generated questions.
 *
 * verifyQuestion() submits the question to Claude without revealing the
 * generated answer, asking it to re-solve from scratch. The raw response
 * feeds gateStatus(), which feeds publishStatus():
 *
 *   pass  + en  →  "live"      English questions auto-promoted to practice pool.
 *   pass  + ta  →  "verified"  Tamil pilot: held for a bilingual reviewer.
 *   fail        →  "draft"     Verifier disagreed. Quarantined; never served.
 *   uncertain   →  "draft"     Verifier solved but flagged low confidence.
 *
 * Used exclusively by lib/questions/generate.ts.
 * Do NOT import into UI code or anywhere answer_index might leak to the client.
 */

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

// ── Public types ───────────────────────────────────────────────────────────────

export type Language = "en" | "ta";

export type VerifierResult = {
  /** Raw JSON the model returned. */
  raw: { answer: string; confident: boolean };
  /** 0-indexed answer the verifier chose (−1 if the response was unparseable). */
  verifierIndex: number;
  /** Verifier's answer matches the generated answer. */
  agreed: boolean;
  /** Model flagged itself as confident. */
  confident: boolean;
};

export type GateStatus = "pass" | "fail" | "uncertain";

// ── Internals ──────────────────────────────────────────────────────────────────

const LETTER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

/** Language-aware system prompt for the verifier. */
const VERIFY_SYSTEM: Record<Language, string> = {
  en: 'You are a NEET expert. Solve the MCQ. Reply ONLY JSON: {"answer":"A"|"B"|"C"|"D","confident":true|false}.',
  ta: 'நீங்கள் NEET தேர்வு நிபுணர். MCQ-ஐ தீர்க்கவும். JSON மட்டும் திரும்பவும்: {"answer":"A"|"B"|"C"|"D","confident":true|false}.',
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Re-solve the question cold — the generated answer is NOT passed to the model.
 * Throws only on network failure; parse failures return a "fail" result.
 */
export async function verifyQuestion(params: {
  body: string;
  options: string[];
  answerIndex: number;
  language: Language;
}): Promise<VerifierResult> {
  const { body, options, answerIndex, language } = params;

  const optLines = options
    .map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`)
    .join("\n");

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 128,
    system: VERIFY_SYSTEM[language],
    messages: [{ role: "user", content: `${body}\n${optLines}` }],
  });

  const text = (response.content ?? [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  let raw: { answer: string; confident: boolean };
  try {
    const m = text.match(/\{[\s\S]*?\}/);
    raw = JSON.parse(m ? m[0] : text) as { answer: string; confident: boolean };
  } catch {
    return {
      raw: { answer: "", confident: false },
      verifierIndex: -1,
      agreed: false,
      confident: false,
    };
  }

  const verifierIndex = LETTER[String(raw.answer ?? "").toUpperCase()] ?? -1;

  return {
    raw,
    verifierIndex,
    agreed: verifierIndex === answerIndex,
    confident: raw.confident === true,
  };
}

/** Map a VerifierResult to a pass / fail / uncertain outcome. */
export function gateStatus(result: VerifierResult): GateStatus {
  if (!result.agreed) return "fail";
  if (!result.confident) return "uncertain";
  return "pass";
}

/**
 * Map a gate outcome + language to a question lifecycle status.
 *   pass  + en  →  live      (auto-published to English practice pool)
 *   pass  + ta  →  verified  (Tamil pilot: awaits human reviewer before live)
 *                  unless TAMIL_AUTO_PUBLISH=true (staging / beta override)
 *   fail / uncertain  →  draft  (quarantined, never served to students)
 */
export function publishStatus(
  gate: GateStatus,
  language: Language,
): "draft" | "verified" | "live" {
  if (gate !== "pass") return "draft";
  if (language === "ta") {
    return process.env.TAMIL_AUTO_PUBLISH === "true" ? "live" : "verified";
  }
  return "live";
}
