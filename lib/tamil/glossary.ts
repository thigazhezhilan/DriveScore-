import { getServiceClient } from "@/lib/db/client";

export type GlossaryMatch = {
  id: string;
  english_term: string;
  tamil_term: string;
  subject: string | null;
};

// Normalize English text for fuzzy glossary matching:
//   lowercase → remove punctuation → collapse spaces → de-pluralize → de-hyphenate
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")   // remove punctuation
    .replace(/\s+/g, " ")
    .trim()
    // common plurals
    .replace(/\bions\b/g, "ion")
    .replace(/\bbonds\b/g, "bond")
    .replace(/\batoms\b/g, "atom")
    .replace(/\bmolecules\b/g, "molecule")
    .replace(/\belectrons\b/g, "electron")
    .replace(/\bprotons\b/g, "proton")
    .replace(/\bneutrons\b/g, "neutron")
    .replace(/\benzymes\b/g, "enzyme")
    .replace(/\bgenes\b/g, "gene")
    .replace(/\bcells\b/g, "cell")
    .replace(/\bwaves\b/g, "wave")
    .replace(/\bforces\b/g, "force")
    // hyphenated → single word
    .replace(/-/g, "");
}

export async function lookupGlossaryTerms(
  englishText: string,
  subject?: string,
): Promise<GlossaryMatch[]> {
  const supabase = getServiceClient();

  let query = supabase.from("tamil_glossary").select("id, english_term, tamil_term, subject");
  if (subject) {
    query = query.or(`subject.eq.${subject.toLowerCase()},subject.is.null`);
  }
  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const normalizedInput = normalizeText(englishText);

  // Match on normalized term — prefer longer (more specific) matches first.
  const matches: GlossaryMatch[] = [];
  for (const row of data) {
    const normalizedTerm = normalizeText(row.english_term as string);
    // Phrase match: term appears as a word-boundary match in the input
    const wordBoundaryRe = new RegExp(`(?<![a-z])${normalizedTerm.replace(/\s+/g, "\\s+")}(?![a-z])`, "i");
    if (wordBoundaryRe.test(normalizedInput)) {
      matches.push({
        id: row.id as string,
        english_term: row.english_term as string,
        tamil_term: row.tamil_term as string,
        subject: (row.subject as string | null) ?? null,
      });
    }
  }

  // Sort: longer terms first (more specific matches take priority)
  matches.sort((a, b) => b.english_term.length - a.english_term.length);

  return matches;
}
