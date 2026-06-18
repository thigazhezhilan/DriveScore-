/**
 * Seed the tamil_glossary table with ~100 common NEET scientific terms.
 *
 * Usage:
 *   npx tsx scripts/seed-tamil-glossary.ts
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Idempotent: uses upsert on english_term (unique constraint).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// ─── Glossary data (~100 terms) ────────────────────────────────────────────────
// Samacheer Tamil textbook conventions where known. 'NEEDS_REVIEW' = uncertain.

const GLOSSARY: {
  english_term: string;
  tamil_term: string;
  subject: string | null;
  notes: string | null;
}[] = [
  // ─── Physics ─────────────────────────────────────────────────────────────
  { english_term: "velocity",           tamil_term: "வேகம்",                subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "acceleration",       tamil_term: "முடுக்கம்",             subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "force",              tamil_term: "விசை",                  subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "momentum",           tamil_term: "உந்தம்",                subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "wavelength",         tamil_term: "அலைநீளம்",             subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "frequency",          tamil_term: "அதிர்வெண்",            subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "energy",             tamil_term: "ஆற்றல்",               subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "power",              tamil_term: "திறன்",                 subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "voltage",            tamil_term: "மின்னழுத்தம்",          subject: "physics",   notes: "Samacheer Class 12" },
  { english_term: "current",            tamil_term: "மின்னோட்டம்",           subject: "physics",   notes: "Samacheer Class 12" },
  { english_term: "resistance",         tamil_term: "மின்தடை",              subject: "physics",   notes: "Samacheer Class 12" },
  { english_term: "capacitance",        tamil_term: "மின்தேக்குத்திறன்",    subject: "physics",   notes: "Samacheer Class 12" },
  { english_term: "magnetic field",     tamil_term: "காந்தப்புலம்",          subject: "physics",   notes: "Samacheer Class 12" },
  { english_term: "electric field",     tamil_term: "மின்புலம்",             subject: "physics",   notes: "Samacheer Class 12" },
  { english_term: "work",               tamil_term: "வேலை",                  subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "torque",             tamil_term: "திருப்பு விசை",         subject: "physics",   notes: "NEEDS_REVIEW" },
  { english_term: "pressure",           tamil_term: "அழுத்தம்",             subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "density",            tamil_term: "அடர்த்தி",             subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "displacement",       tamil_term: "இடப்பெயர்ச்சி",        subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "kinetic energy",     tamil_term: "இயக்க ஆற்றல்",         subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "potential energy",   tamil_term: "நிலை ஆற்றல்",          subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "refraction",         tamil_term: "ஒளிவிலகல்",            subject: "physics",   notes: "Samacheer Class 12" },
  { english_term: "reflection",         tamil_term: "ஒளிப்பிரதிபலிப்பு",  subject: "physics",   notes: "Samacheer Class 12" },
  { english_term: "wave",               tamil_term: "அலை",                   subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "inertia",            tamil_term: "செயலின்மை",            subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "friction",           tamil_term: "உராய்வு",               subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "gravity",            tamil_term: "புவியீர்ப்பு",          subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "temperature",        tamil_term: "வெப்பநிலை",            subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "conduction",         tamil_term: "வெப்பக்கடத்தல்",      subject: "physics",   notes: "Samacheer Class 11" },
  { english_term: "radiation",          tamil_term: "கதிர்வீச்சு",           subject: "physics",   notes: "Samacheer Class 12" },

  // ─── Chemistry ───────────────────────────────────────────────────────────
  { english_term: "covalent bond",      tamil_term: "சகப்பிணைப்பு",         subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "oxidation",          tamil_term: "ஆக்சிகரணம்",           subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "reduction",          tamil_term: "ஒடுக்கம்",              subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "molarity",           tamil_term: "மோலாரிட்டி",           subject: "chemistry", notes: "NEEDS_REVIEW" },
  { english_term: "mole",               tamil_term: "மோல்",                  subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "electronegativity",  tamil_term: "மின்னெதிர்மை",         subject: "chemistry", notes: "NEEDS_REVIEW" },
  { english_term: "isomer",             tamil_term: "ஐசோமர்",               subject: "chemistry", notes: "NEEDS_REVIEW" },
  { english_term: "catalyst",           tamil_term: "வினையூக்கி",            subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "valence",            tamil_term: "இணைதிறன்",             subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "ionic bond",         tamil_term: "அயனிப்பிணைப்பு",      subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "acid",               tamil_term: "அமிலம்",                subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "base",               tamil_term: "காரம்",                  subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "equilibrium",        tamil_term: "சமநிலை",               subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "enthalpy",           tamil_term: "என்தால்பி",             subject: "chemistry", notes: "NEEDS_REVIEW" },
  { english_term: "electrolysis",       tamil_term: "மின்னாற்பகுப்பு",      subject: "chemistry", notes: "Samacheer Class 12" },
  { english_term: "solution",           tamil_term: "கரைசல்",                subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "solvent",            tamil_term: "கரைப்பான்",             subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "solute",             tamil_term: "கரைபொருள்",             subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "precipitate",        tamil_term: "வீழ்படிவு",             subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "titration",          tamil_term: "திட்டமளவீடு",          subject: "chemistry", notes: "NEEDS_REVIEW" },
  { english_term: "oxidation state",    tamil_term: "ஆக்சிகரண நிலை",        subject: "chemistry", notes: "Samacheer Class 12" },
  { english_term: "periodic table",     tamil_term: "தனிமவரிசை அட்டவணை",   subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "atomic number",      tamil_term: "அணு எண்",               subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "electron configuration", tamil_term: "மின்னணு அமைப்பு",  subject: "chemistry", notes: "NEEDS_REVIEW" },
  { english_term: "bond length",        tamil_term: "பிணைப்பு நீளம்",        subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "hydrolysis",         tamil_term: "நீராற்பகுப்பு",         subject: "chemistry", notes: "Samacheer Class 12" },
  { english_term: "polymer",            tamil_term: "பல்லிணைவு",             subject: "chemistry", notes: "Samacheer Class 12" },
  { english_term: "activation energy",  tamil_term: "செயல்படு ஆற்றல்",      subject: "chemistry", notes: "Samacheer Class 12" },
  { english_term: "concentration",      tamil_term: "செறிவு",                 subject: "chemistry", notes: "Samacheer Class 11" },
  { english_term: "buffer solution",    tamil_term: "தாங்கு கரைசல்",         subject: "chemistry", notes: "NEEDS_REVIEW" },

  // ─── Biology ─────────────────────────────────────────────────────────────
  { english_term: "mitochondria",       tamil_term: "மைட்டோகாண்ட்ரியா",     subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "meiosis",            tamil_term: "ஒடுக்கப்பிரிவு",       subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "photosynthesis",     tamil_term: "ஒளிச்சேர்க்கை",        subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "chromosome",         tamil_term: "நிறமூர்த்தி",           subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "ribosome",           tamil_term: "ரைபோசோம்",             subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "enzyme",             tamil_term: "நொதி",                   subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "antigen",            tamil_term: "ஆன்டிஜென்",             subject: "biology",   notes: "NEEDS_REVIEW" },
  { english_term: "antibody",           tamil_term: "எதிர்ப்பொருள்",          subject: "biology",   notes: "Samacheer Class 12" },
  { english_term: "allele",             tamil_term: "அல்லீல்",               subject: "biology",   notes: "NEEDS_REVIEW" },
  { english_term: "genotype",           tamil_term: "மரபணு வடிவம்",          subject: "biology",   notes: "NEEDS_REVIEW" },
  { english_term: "phenotype",          tamil_term: "வெளிப்படு வடிவம்",      subject: "biology",   notes: "NEEDS_REVIEW" },
  { english_term: "chromatid",          tamil_term: "குரோமட்டிட்",           subject: "biology",   notes: "NEEDS_REVIEW" },
  { english_term: "nucleotide",         tamil_term: "நியூக்ளியோட்டைடு",      subject: "biology",   notes: "NEEDS_REVIEW" },
  { english_term: "transcription",      tamil_term: "படியெடுத்தல்",          subject: "biology",   notes: "Samacheer Class 12" },
  { english_term: "translation",        tamil_term: "மொழிபெயர்த்தல்",       subject: "biology",   notes: "Samacheer Class 12" },
  { english_term: "mitosis",            tamil_term: "சம பிரிவு",              subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "diffusion",          tamil_term: "பரவல்",                  subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "osmosis",            tamil_term: "சவ்வூடு பரவல்",         subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "respiration",        tamil_term: "சுவாசம்",               subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "cell membrane",      tamil_term: "உயிரணு சவ்வு",          subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "nucleus",            tamil_term: "கருவம்",                 subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "chloroplast",        tamil_term: "பச்சையம்",              subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "ecosystem",          tamil_term: "சூழல் தொகுப்பு",        subject: "biology",   notes: "Samacheer Class 12" },
  { english_term: "mutation",           tamil_term: "மாற்றம்",               subject: "biology",   notes: "Samacheer Class 12" },
  { english_term: "gene",               tamil_term: "மரபணு",                  subject: "biology",   notes: "Samacheer Class 12" },
  { english_term: "hormone",            tamil_term: "சுரப்பி இயக்குபொருள்",  subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "receptor",           tamil_term: "ஏற்பி",                  subject: "biology",   notes: "NEEDS_REVIEW" },
  { english_term: "natural selection",  tamil_term: "இயற்கைத் தேர்வு",       subject: "biology",   notes: "Samacheer Class 12" },
  { english_term: "cell division",      tamil_term: "உயிரணுப் பிரிவு",        subject: "biology",   notes: "Samacheer Class 11" },
  { english_term: "DNA replication",    tamil_term: "DNA இரட்டிப்பாதல்",     subject: "biology",   notes: "Samacheer Class 12" },

  // ─── Cross-subject ────────────────────────────────────────────────────────
  { english_term: "hypothesis",         tamil_term: "கருதுகோள்",             subject: null,        notes: null },
  { english_term: "theory",             tamil_term: "கோட்பாடு",              subject: null,        notes: null },
  { english_term: "experiment",         tamil_term: "சோதனை",                 subject: null,        notes: null },
  { english_term: "observation",        tamil_term: "கண்காணிப்பு",            subject: null,        notes: null },
  { english_term: "conclusion",         tamil_term: "முடிவு",                 subject: null,        notes: null },
  { english_term: "variable",           tamil_term: "மாறியம்",               subject: null,        notes: null },
  { english_term: "control group",      tamil_term: "கட்டுப்பாட்டு குழு",    subject: null,        notes: null },
  { english_term: "sample size",        tamil_term: "மாதிரி அளவு",           subject: null,        notes: null },
  { english_term: "reaction rate",      tamil_term: "வினை வேகம்",            subject: null,        notes: "Samacheer Class 12" },
  { english_term: "equilibrium constant", tamil_term: "சமநிலை மாறிலி",       subject: null,        notes: "NEEDS_REVIEW" },
];

async function main() {
  console.log(`\nSeeding ${GLOSSARY.length} glossary terms...`);
  let seeded = 0;
  let needsReview = 0;

  for (const term of GLOSSARY) {
    const { error } = await supabase
      .from("tamil_glossary")
      .upsert(term, { onConflict: "english_term" });

    if (error) {
      console.error(`  ✗ ${term.english_term}: ${error.message}`);
    } else {
      seeded++;
      if (term.notes === "NEEDS_REVIEW") needsReview++;
    }
  }

  console.log(`\n✅ Seeded ${seeded}/${GLOSSARY.length} terms`);
  console.log(`⚠️  ${needsReview} terms marked NEEDS_REVIEW for human verification`);
}

main().catch((e) => { console.error(e); process.exit(1); });
