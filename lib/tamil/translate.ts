import Anthropic from "@anthropic-ai/sdk";
import type { GlossaryMatch } from "./glossary";
import type { KnowledgeChunk } from "./retrieval";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  _client = new Anthropic({ apiKey });
  return _client;
}

export type ModelObservations = {
  glossary_match_rate: number;
  retrieval_matches: number;
  contains_negation: boolean;
  option_count_match: boolean;
  number_count_match: boolean;
  unit_preserved: boolean;
  chemical_formula_preserved: boolean;
  math_notation_preserved: boolean;
  context_relevance: "high" | "medium" | "low";
  glossary_coverage: string;
};

export type TranslationOutput = {
  tamil_question_text: string;
  tamil_options: string[];
  tamil_explanation: string;
  model_observations: ModelObservations;
  used_glossary_terms: { english: string; tamil: string }[];
  missing_expected_terms: string[];
};

const TRANSLATION_TOOL: Anthropic.Tool = {
  name: "submit_translation",
  description: "Submit the completed Tamil translation with all required metadata fields.",
  input_schema: {
    type: "object",
    properties: {
      tamil_question_text: {
        type: "string",
        description: "The full Tamil translation of the question text.",
      },
      tamil_options: {
        type: "array",
        items: { type: "string" },
        minItems: 4,
        maxItems: 4,
        description: "Tamil translations of all 4 options, in the same order (A=A, B=B, C=C, D=D).",
      },
      tamil_explanation: {
        type: "string",
        description: "Tamil translation of the explanation.",
      },
      model_observations: {
        type: "object",
        properties: {
          glossary_match_rate: {
            type: "number",
            description: "0–100. % of provided glossary terms you actually used in the Tamil output.",
          },
          retrieval_matches: {
            type: "integer",
            description: "Number of reference passages provided.",
          },
          contains_negation: {
            type: "boolean",
            description: "True if the English question contains NOT/EXCEPT/INCORRECT/NEVER/etc.",
          },
          option_count_match: {
            type: "boolean",
            description: "True if your Tamil output has exactly 4 options.",
          },
          number_count_match: {
            type: "boolean",
            description: "True if numeric count in Tamil matches English.",
          },
          unit_preserved: {
            type: "boolean",
            description: "True if all physical units appear unchanged in the Tamil.",
          },
          chemical_formula_preserved: {
            type: "boolean",
            description: "True if all chemical formulas appear unchanged in the Tamil.",
          },
          math_notation_preserved: {
            type: "boolean",
            description: "True if all mathematical notation appears unchanged in the Tamil.",
          },
          context_relevance: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "How relevant the retrieved Tamil passages were to this question.",
          },
          glossary_coverage: {
            type: "string",
            description: "One sentence: which glossary terms were easy/hard to use.",
          },
        },
        required: [
          "glossary_match_rate", "retrieval_matches", "contains_negation",
          "option_count_match", "context_relevance", "glossary_coverage",
        ],
      },
      used_glossary_terms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            english: { type: "string" },
            tamil:   { type: "string" },
          },
          required: ["english", "tamil"],
        },
        description: "Glossary terms you actually used in the Tamil output.",
      },
      missing_expected_terms: {
        type: "array",
        items: { type: "string" },
        description: "English glossary terms provided but NOT used in output (should be empty).",
      },
    },
    required: [
      "tamil_question_text", "tamil_options", "tamil_explanation",
      "model_observations", "used_glossary_terms", "missing_expected_terms",
    ],
  },
};

export async function translateQuestion(params: {
  question_text: string;
  options: string[];
  explanation: string;
  subject: string;
  glossaryMatches: GlossaryMatch[];
  retrievedChunks: KnowledgeChunk[];
}): Promise<TranslationOutput> {
  const { question_text, options, explanation, subject, glossaryMatches, retrievedChunks } = params;

  const glossaryBlock =
    glossaryMatches.length > 0
      ? glossaryMatches.map((m) => `  ${m.english_term} → ${m.tamil_term}`).join("\n")
      : "  (no glossary matches for this question)";

  const contextBlock =
    retrievedChunks.length > 0
      ? retrievedChunks.map((c, i) => `[${i + 1}] ${c.tamil_text}`).join("\n\n")
      : "(no reference material available — translate from first principles)";

  const optionsText = options
    .map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`)
    .join("\n");

  const systemPrompt = `You are an expert English-to-Tamil translator specialising in NEET exam content for Tamil Nadu students.

RULES:
1. Translate MEANING, not words. The Tamil must convey exactly the same thing as the English, phrased the way a Tamil-medium ${subject} student would naturally read it.

2. MANDATORY GLOSSARY — use these exact Tamil terms wherever the English term appears. Do not substitute alternatives:
${glossaryBlock}

3. REFERENCE MATERIAL — use these Tamil passages as your guide for terminology, tone, and register. Match their style:
${contextBlock}

4. PRESERVE QUESTION CORRECTNESS EXACTLY:
   - "NOT", "EXCEPT", "INCORRECT", "FALSE", "LEAST", "MOST", "NEVER", "ALWAYS", "CORRECT" must be translated AND visually emphasised. In Tamil, use strong negation markers like "இல்லை", "அல்ல", "தவிர", "கூடாது" and make them prominent.
   - Option order must stay identical (A=A, B=B, C=C, D=D).
   - Numbers, units, chemical formulas, and mathematical notation stay as-is (do not transliterate "m/s²" or "H₂O").
   - The correct answer index must not change.

5. Write naturally — a Tamil-medium NEET student should read this and feel it was written in Tamil originally, not translated.

6. Do NOT transliterate English words into Tamil script unless there is genuinely no Tamil equivalent and Tamil-medium students commonly use the English word (e.g. "DNA", "RNA", "pH" stay in English).

Call the submit_translation tool with your complete translation.`;

  const userMessage = `Translate this ${subject} question to Tamil.

Question:
${question_text}

Options:
${optionsText}

Explanation:
${explanation || "(no explanation provided)"}`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    tools: [TRANSLATION_TOOL],
    tool_choice: { type: "tool", name: "submit_translation" },
    messages: [{ role: "user", content: userMessage }],
  });

  // Extract the tool use block (tool_choice forces exactly one)
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not call submit_translation tool.");
  }

  const raw = toolUse.input as Record<string, unknown>;

  // Validate option count immediately — hard requirement
  const tamilOptions = raw.tamil_options as string[];
  if (!Array.isArray(tamilOptions) || tamilOptions.length !== 4) {
    throw new Error(`Claude returned ${tamilOptions?.length ?? 0} options instead of 4.`);
  }

  return {
    tamil_question_text:  raw.tamil_question_text as string,
    tamil_options:        tamilOptions,
    tamil_explanation:    raw.tamil_explanation as string,
    model_observations:   raw.model_observations as ModelObservations,
    used_glossary_terms:  (raw.used_glossary_terms as { english: string; tamil: string }[]) ?? [],
    missing_expected_terms: (raw.missing_expected_terms as string[]) ?? [],
  };
}
