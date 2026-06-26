/**
 * Build neet-2015-final.csv and neet-2016-final.csv from the raw extractor
 * output, applying all human-reviewed fixes:
 *   - Drop figure/parse/unanswerable rows
 *   - Override answers for Q76 (B) and Q115 (C)
 *   - Assign chapters to the 21 unclassified rows
 *   - Apply 23 chapter corrections to low-confidence rows
 *   - Classify difficulty: Easy/Medium/Hard per the rule
 *     (recall = Easy, one step = Medium, multi-step = Hard)
 *   - Report difficulty distribution per subject so we can verify it
 *     is NOT 79%-Medium like the old import.
 *
 * No DB writes. Run, inspect the distribution, then proceed to dry-run.
 */

import fs from "node:fs";
const Papa = (await import("papaparse")).default;
const parse = f => Papa.parse(fs.readFileSync(f, "utf8"), {
  header: true, skipEmptyLines: "greedy",
  transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, "_"),
}).data;

// ── Chapter corrections for LOW-CONFIDENCE rows (year-qno key) ───────────────
const CHAPTER_CORRECTIONS = new Map([
  ["2015-23",  "Coordination Compounds"],
  ["2015-40",  "Hydrocarbons"],
  ["2015-49",  "Body Fluids and Circulation"],
  ["2015-102", "Human Reproduction"],
  ["2015-124", "Molecular Basis of Inheritance"],
  ["2015-159", "Current Electricity"],
  ["2016-39",  "Work, Energy and Power"],
  ["2016-43",  "Alternating Current"],
  ["2016-63",  "Alcohols Phenols and Ethers"],
  ["2016-66",  "The p-Block Elements"],
  ["2016-68",  "States of Matter"],
  ["2016-80",  "Solutions"],
  ["2016-88",  "Amines"],
  ["2016-90",  "Organic Chemistry - Some Basic Principles and Techniques"],
  ["2016-96",  "Principles of Inheritance and Variation"],
  ["2016-103", "Photosynthesis in Higher Plants"],
  ["2016-130", "Morphology of Flowering Plants"],
  ["2016-133", "Human Reproduction"],
  ["2016-157", "Organisms and Populations"],
  ["2016-159", "Animal Kingdom"],
  ["2016-164", "Environmental Issues"],
  ["2016-168", "Sexual Reproduction in Flowering Plants"],
  ["2016-170", "Principles of Inheritance and Variation"],
]);

// ── Chapter assignments for UNCLASSIFIED rows ────────────────────────────────
const UNCLASSIFIED_CHAPTERS = new Map([
  ["2015-30",  "Organic Chemistry - Some Basic Principles and Techniques"],
  ["2015-140", "Mechanical Properties of Solids"],
  ["2016-47",  "Hydrocarbons"],
  ["2016-52",  "The s-Block Elements"],
  ["2016-58",  "General Principles of Isolation of Elements"],
  ["2016-59",  "Redox Reactions"],
  ["2016-70",  "Chemical Bonding and Molecular Structure"],
  ["2016-78",  "The p-Block Elements"],
  ["2016-81",  "Organic Chemistry - Some Basic Principles and Techniques"],
  ["2016-85",  "Haloalkanes and Haloarenes"],
  ["2016-106", "Biodiversity and Conservation"],
  ["2016-124", "Structural Organisation in Animals"],
  ["2016-127", "Biodiversity and Conservation"],
  ["2016-134", "Biotechnology and its Applications"],
  ["2016-137", "Locomotion and Movement"],
  ["2016-147", "Chemical Coordination and Integration"],
  ["2016-148", "Evolution"],
  ["2016-149", "Breathing and Exchange of Gases"],
  ["2016-167", "Excretory Products and their Elimination"],
  ["2016-169", "Microbes in Human Welfare"],
  ["2016-171", "Organisms and Populations"],
]);

// ── Q-numbers to drop entirely (figures, empty options, bonus) ────────────────
const DROPS_2015 = new Set([
  1, 3, 14, 32, 33, 41, 42, 48, 138, 144, 150, 162, 175, // figure/parse
  168, 179,                                                 // empty options
]);
const DROPS_2016 = new Set([
  5, 17, 34, 40, 84, 144, // figure/parse
  29, 71,                  // empty options / bonus
]);

// ── Difficulty classifier ─────────────────────────────────────────────────────
// Rule: recall/one-fact = Easy | one step/formula = Medium | multi-step = Hard
//
// Design notes:
//   Physics: length is NOT a Hard signal — long setup + single formula = Medium.
//     Hard requires genuine multi-step (two-formula chain, integration, or
//     multi-statement assertion).
//   Chemistry: most NEET Chem is Medium (product/mechanism) or Easy (recall).
//     Hard reserved for multi-statement (i)(ii)(iii) or coupled calculations.
//   Biology: mostly Easy (recall) with Medium for "select wrong/correct" and
//     match questions. Hard for multi-statement assertions or genetics calculations.
function classifyDifficulty(subject, q, a, b, c, d) {
  const all  = [q, a, b, c, d].join(" ");
  const low  = all.toLowerCase();
  const qLow = q.toLowerCase();

  // ── HARD — shared across subjects ─────────────────────────────────────────
  // Multi-statement (i)…(ii)…(iii): evaluating ≥3 independent claims
  if (/\(i\)[\s\S]{8,}\(ii\)[\s\S]{8,}\(iii\)/.test(all)) return "Hard";
  // Pedigree analysis
  if (/pedigree/.test(qLow)) return "Hard";

  // ── HARD — subject-specific ────────────────────────────────────────────────
  if (subject === "Physics") {
    // Two-stage chain: "find X… then find Y" or "hence find" or "and then"
    if (/hence.*find|then.*find|find.*and.*find|obtain.*and.*hence/i.test(qLow)) return "Hard";
    // Calculus/integration implied: "rate of change", "at time t = ", power of time-varying force
    if (/rate of change|dp\/dt|d[vx]\/dt|time.dependent force|varies.*as.*t\^/i.test(qLow)) return "Hard";
    // Assertion–reason format
    if (/assertion|reason/i.test(qLow)) return "Hard";
  }
  if (subject === "Chemistry") {
    // Thermo combining ΔG, ΔH, ΔS
    if (/delta.*[gh]|gibbs/i.test(low) && /enthalpy|entropy/i.test(low)) return "Hard";
  }
  if (subject === "Biology") {
    // Genetics ratio/probability calculation
    if (/\bratio\b|\bprobability\b|\bdihybrid\b|\btest.?cross.*offspring/i.test(qLow)) return "Hard";
  }

  // ── EASY recall signals ───────────────────────────────────────────────────
  const easyPhrases = [
    "is called", "is known as", "was coined by", "refers to", "is defined as",
    "was discovered by", "was first described", "was introduced in", "is named",
    "is the term for", "national aquatic", "is used in the production",
    "is a type of", "pioneer organisms",
  ];
  const hasEasyPhrase = easyPhrases.some(p => low.includes(p));

  // Numerical content in the question stem (specific measured quantities)
  const measuredNum =
    /\d+\.?\d*\s*(m\/s|kg|nm|hz|mhz|mol|°c|°k|\bk\b|kpa|atm|cm|mm|km|j\b|kj|kcal|cal|n\b|w\b|\ba\b|\bc\b|ev|mev|ms\b)\b/i.test(q)
    || /\d+\s*[×x]\s*10/i.test(q)
    || /\d+\.\d{2,}/.test(q);

  // Symbolic calculation: options contain fractions, exponents, or multi-term
  // math expressions (catches questions posed with variables like α, L, v₁).
  const optsMath = [a, b, c, d].some(opt =>
    /\d\s*[\/÷]\s*\d|sqrt|√|\^\d|[²³⁴]|\b[a-zA-Z]\d+[\/+\-]\d|\d[\/+\-][a-zA-Z]/.test(opt),
  );

  // Symbolic question stem: asks to "find", "calculate", "determine" an expression
  const symbolicQ = /\bfind\b|\bcalculate\b|\bdetermine\b|\bwhat is the value\b|\bexpress\b/i.test(qLow)
    || /ratio of|the speed of|the velocity of|the force on|the energy of/i.test(qLow);

  // ── Subject rules ─────────────────────────────────────────────────────────
  if (subject === "Physics") {
    // Any numerical, symbolic calculation, or math-heavy options → Medium
    if (measuredNum || optsMath || symbolicQ) return "Medium";
    if (hasEasyPhrase) return "Easy";
    // Conceptual "which of the following" without any calculation
    if (/which.*following.*correct|correct.*statement|best.*describ/i.test(qLow)) return "Medium";
    return "Easy";
  }

  if (subject === "Chemistry") {
    if (hasEasyPhrase) return "Easy";
    if (measuredNum) return "Medium";
    if (/product|hybridiz|order.*react|rate\b|ksp|solubility|molar|mechanism|isomer|configuration|conformation/i.test(qLow)) return "Medium";
    if (/wrong statement|incorrect|select.*correct|choose.*wrong|which.*following.*is\b/i.test(qLow)) return "Medium";
    return "Easy";
  }

  if (subject === "Biology") {
    if (hasEasyPhrase) return "Easy";
    if (/match|column i|column ii/i.test(qLow)) return "Medium";
    if (/wrong statement|incorrect statement|select.*correct|choose.*wrong|which.*following.*is.*correct|not.*correct|which.*following.*is.*not/i.test(qLow)) return "Medium";
    if (/describe|mechanism of|process of|steps|how does/i.test(qLow)) return "Medium";
    return "Easy";
  }

  return "Medium";
}

// ── Build final rows for one paper ───────────────────────────────────────────
function buildFinal(year, cleanFile, reviewFile, drops) {
  const clean  = parse(cleanFile);
  const review = parse(reviewFile);

  // Survivors from review: not dropped, have non-empty options + answer
  const keepFromReview = review.filter(r => {
    const n = Number(r.q_no);
    if (drops.has(n)) return false;
    const opts = [r.option_a, r.option_b, r.option_c, r.option_d];
    if (opts.some(o => !String(o || "").trim())) return false;
    if (!r.correct_option || !r.correct_option.trim()) return false;
    return true;
  });

  return [...clean, ...keepFromReview].map(r => {
    const n   = Number(r.q_no || 0);
    const key = `${year}-${n}`;

    let ans     = (r.correct_option || "").trim().toUpperCase();
    if (key === "2015-76")  ans = "B";
    if (key === "2015-115") ans = "C";

    let chapter = (r.chapter || "").trim();
    if (CHAPTER_CORRECTIONS.has(key))   chapter = CHAPTER_CORRECTIONS.get(key);
    if (UNCLASSIFIED_CHAPTERS.has(key)) chapter = UNCLASSIFIED_CHAPTERS.get(key);
    if (!chapter || chapter === "Unclassified") chapter = "UNKNOWN";

    const diff = classifyDifficulty(
      r.subject,
      r.question_text || "",
      r.option_a || "", r.option_b || "", r.option_c || "", r.option_d || "",
    );

    return {
      subject:       r.subject,
      chapter,
      concept:       chapter,
      difficulty:    diff,
      par_time_sec:  diff === "Easy" ? 45 : diff === "Hard" ? 90 : 60,
      question_text: r.question_text,
      option_a:      r.option_a,
      option_b:      r.option_b,
      option_c:      r.option_c,
      option_d:      r.option_d,
      correct_option: ans,
    };
  });
}

const rows2015 = buildFinal("2015",
  "docs/papers/neet-2015.csv", "docs/papers/neet-2015.review.csv", DROPS_2015);
const rows2016 = buildFinal("2016",
  "docs/papers/neet-2016.csv", "docs/papers/neet-2016.review.csv", DROPS_2016);

// ── Write CSVs ───────────────────────────────────────────────────────────────
const HDR = "subject,chapter,concept,difficulty,par_time_sec,question_text,option_a,option_b,option_c,option_d,correct_option";
const csvField = s => {
  s = String(s ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const toLine = r => [
  r.subject, r.chapter, r.concept, r.difficulty, r.par_time_sec,
  r.question_text, r.option_a, r.option_b, r.option_c, r.option_d, r.correct_option,
].map(csvField).join(",");

fs.writeFileSync("docs/papers/neet-2015-final.csv",
  [HDR, ...rows2015.map(toLine)].join("\n") + "\n");
fs.writeFileSync("docs/papers/neet-2016-final.csv",
  [HDR, ...rows2016.map(toLine)].join("\n") + "\n");

// ── Difficulty distribution ───────────────────────────────────────────────────
function dist(rows, label) {
  console.log(`\n${label} — ${rows.length} rows`);
  for (const subj of ["Physics", "Chemistry", "Biology"]) {
    const sr = rows.filter(r => r.subject === subj);
    const E = sr.filter(r => r.difficulty === "Easy").length;
    const M = sr.filter(r => r.difficulty === "Medium").length;
    const H = sr.filter(r => r.difficulty === "Hard").length;
    const pct = n => Math.round(100 * n / (sr.length || 1));
    console.log(`  ${subj.padEnd(11)} ${String(sr.length).padStart(3)} rows | Easy ${String(E).padStart(3)} (${pct(E)}%) | Medium ${String(M).padStart(3)} (${pct(M)}%) | Hard ${String(H).padStart(3)} (${pct(H)}%)`);
  }
  const all = rows;
  const E = all.filter(r => r.difficulty === "Easy").length;
  const M = all.filter(r => r.difficulty === "Medium").length;
  const H = all.filter(r => r.difficulty === "Hard").length;
  const p = n => Math.round(100 * n / (all.length || 1));
  console.log(`  ${"TOTAL".padEnd(11)} ${String(all.length).padStart(3)} rows | Easy ${String(E).padStart(3)} (${p(E)}%) | Medium ${String(M).padStart(3)} (${p(M)}%) | Hard ${String(H).padStart(3)} (${p(H)}%)`);
}
dist(rows2015, "NEET 2015 final");
dist(rows2016, "NEET 2016 final");
dist([...rows2015, ...rows2016], "COMBINED");

// ── Sanity checks ─────────────────────────────────────────────────────────────
const all = [...rows2015, ...rows2016];
const badChapter = all.filter(r => !r.chapter || r.chapter === "UNKNOWN" || r.chapter === "Unclassified");
const blankAns   = all.filter(r => !r.correct_option);
const blankDiff  = all.filter(r => !["Easy","Medium","Hard"].includes(r.difficulty));

console.log(`\nSanity checks:`);
console.log(`  Bad/unknown chapter : ${badChapter.length} ${badChapter.length === 0 ? "✓" : "← FIX"}`);
console.log(`  Blank correct_option: ${blankAns.length}   ${blankAns.length   === 0 ? "✓" : "← FIX"}`);
console.log(`  Invalid difficulty  : ${blankDiff.length}   ${blankDiff.length  === 0 ? "✓" : "← FIX"}`);

if (badChapter.length) {
  for (const r of badChapter) {
    console.log(`    [${r.subject}] "${(r.question_text || "").slice(0, 70)}"`);
  }
}

console.log(`\nFiles written:`);
console.log(`  docs/papers/neet-2015-final.csv  (${rows2015.length} rows)`);
console.log(`  docs/papers/neet-2016-final.csv  (${rows2016.length} rows)`);
