/**
 * NEET paper -> question-bank CSV extractor (offline, zero chat tokens).
 *
 * Reads a Vedantu-style "Answers & Solutions" NEET PDF (question + options +
 * "Solution: (n)" / "Answer Key: (n)" inline) and produces a CSV in the exact
 * /admin/bank import format. It auto-detects subject sections, parses the four
 * options, reads the correct answer from the solution marker, and guesses the
 * NCERT chapter from keywords.
 *
 * Diagram/structure questions and anything it can't parse cleanly are written to
 * a separate <out>.review.csv so the clean CSV only contains import-ready rows.
 *
 * Usage:
 *   node scripts/extract-neet.mjs docs/papers/neet-2016.pdf
 *   node scripts/extract-neet.mjs docs/papers/neet-2016.pdf docs/neet-2016.csv
 *
 * Then upload the resulting .csv via Admin -> Question Bank -> Bulk import.
 * Spot-check chapters/difficulty after import (the importer also re-validates).
 */

import fs from "node:fs";
import path from "node:path";

const { PDFParse } = await import("pdf-parse");
const { classifyChapterWithScore } = await import("./ncert-classify.mjs");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const wantImages = process.argv.includes("--images");
const keyArg = process.argv.find((a) => a.startsWith("--key="))?.slice(6) ?? null;
const file = args[0];
if (!file) {
  console.error("usage: node scripts/extract-neet.mjs <paper.pdf> [out.csv] [--key=answers.txt] [--images]");
  process.exit(1);
}
const out = args[1] || file.replace(/\.pdf$/i, "") + ".csv";
const reviewOut = out.replace(/\.csv$/i, "") + ".review.csv";
const needsImageOut = out.replace(/\.csv$/i, "") + ".needs-image.csv";
const imageDir = out.replace(/\.csv$/i, "") + "-pages";

/**
 * Parse an external answer key file into Map<questionNumber, "A"|"B"|"C"|"D">.
 * Accepts any line format: "1 A", "1. A", "1:A", "1,A", "q1 → A" etc.
 * Also handles CSV with header row "q_no,answer".
 */
function parseKeyFile(keyPath) {
  const map = new Map();
  const lines = fs.readFileSync(keyPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\D*(\d+)\D+([A-Da-d])\s*$/);
    if (m) map.set(Number(m[1]), m[2].toUpperCase());
  }
  return map;
}
const externalKey = keyArg ? parseKeyFile(keyArg) : new Map();

// ─── Key alignment pre-check (runs before PDF parsing) ───────────────────────
// A gap mid-sequence is the off-by-one signature: key skipped Q_n, so every
// answer after that point is attributed to the wrong question. Fatal — exit
// before writing any files rather than silently poisoning the output.
if (externalKey.size > 0) {
  const keyNums = [...externalKey.keys()].sort((a, b) => a - b);
  const kMin = keyNums[0], kMax = keyNums[keyNums.length - 1];
  const gaps = [];
  for (let i = kMin; i <= kMax; i++) {
    if (!externalKey.has(i)) gaps.push(i);
  }
  if (gaps.length > 0) {
    console.error(`\nFATAL — external key has ${gaps.length} gap(s) in Q${kMin}–Q${kMax}:`);
    console.error(`  Missing Q#: ${gaps.join(", ")}`);
    console.error(`  Every answer after the first gap is attributed to the wrong question.`);
    console.error(`  Fix the key file (add the missing entries) then re-run.\n`);
    process.exit(1);
  }
  console.log(`Key: ${externalKey.size} entries, Q${kMin}–Q${kMax} (no gaps)\n`);
}

// DEPRECATED / UNUSED — chapter classification now lives in ncert-classify.mjs
// (the single source of truth used by extract, diagrams, and reclassify). Kept
// only to avoid a large diff; do not edit. See classifyChapter() above.
const CHAPTERS_DEPRECATED_UNUSED = {
  Physics: [
    [["dimension", "significant figure", "unit of"], "Units and Measurements"],
    [["projectile", "vector", "relative velocity"], "Motion in a Plane"],
    [["friction", "inclin", "newton's", "block of mass"], "Laws of Motion"],
    [["work done", "kinetic energy", "collision", "power"], "Work Energy and Power"],
    [["torque", "moment of inertia", "angular", "rotational", "centre of mass"], "System of Particles and Rotational Motion"],
    [["satellite", "orbit", "gravitation", "escape velocity"], "Gravitation"],
    [["young's modulus", "elastic", "stress", "strain"], "Mechanical Properties of Solids"],
    [["capillary", "viscosity", "bernoulli", "surface tension", "fluid", "pressure of"], "Mechanical Properties of Fluids"],
    [["expansion", "calorimetr", "thermal"], "Thermal Properties of Matter"],
    [["carnot", "refrigerator", "adiabatic", "isothermal", "thermodynamic"], "Thermodynamics"],
    [["speed of sound", "mean free path", "kinetic theory", "degrees of freedom"], "Kinetic Theory"],
    [["simple harmonic", "oscillat", "pendulum"], "Oscillations"],
    [["resonant", "string", "doppler", "wave"], "Waves"],
    [["capacitor", "electric field", "potential", "charge"], "Electrostatic Potential and Capacitance"],
    [["potentiometer", "ammeter", "resistance", "current", "conductivit"], "Current Electricity"],
    [["magnetic field", "moving charge", "cyclotron", "solenoid"], "Moving Charges and Magnetism"],
    [["induced", "emf", "inductance", "flux"], "Electromagnetic Induction"],
    [["alternating", "reactance", "rms", "a.c", "ac source"], "Alternating Current"],
    [["em wave", "electromagnetic wave", "spectrum"], "Electromagnetic Waves"],
    [["telescope", "microscope", "lens", "prism", "mirror", "refraction"], "Ray Optics and Optical Instruments"],
    [["diffraction", "interference", "young's experiment", "polaris"], "Wave Optics"],
    [["photoelectric", "de broglie", "work function"], "Dual Nature of Radiation and Matter"],
    [["bohr", "hydrogen spectrum", "lyman", "balmer"], "Atoms"],
    [["nucleus", "radioactive", "decay", "binding energy"], "Nuclei"],
    [["diode", "transistor", "semiconductor", "amplifier", "logic gate"], "Semiconductor Electronics"],
  ],
  Chemistry: [
    [["mole", "avogadro", "stoichiometr", "empirical", "molarity", "molality"], "Some Basic Concepts of Chemistry"],
    [["orbital", "quantum number", "electronic configuration", "atomic"], "Structure of Atom"],
    [["periodic", "electronegativ", "ionization enthalpy", "electron gain"], "Classification of Elements and Periodicity"],
    [["hybridi", "bond order", "vsepr", "dipole", "isostructural", "molecular orbital"], "Chemical Bonding and Molecular Structure"],
    [["ideal gas", "real gas", "van der waals", "state of matter"], "States of Matter"],
    [["buffer", "equilibrium constant", "ph of", "le chatelier", "ksp", "solubility product"], "Equilibrium"],
    [["oxidation number", "redox", "kmno4", "oxidising"], "Redox Reactions"],
    [["s-block", "alkali metal", "alkaline earth"], "The s-Block Elements"],
    [["p-block", "oxoacid", "interhalogen", "noble gas", "allotrop"], "The p-Block Elements"],
    [["d-block", "f-block", "lanthan", "transition element"], "The d- and f-Block Elements"],
    [["coordination", "ligand", "complex ion", "[", "ethylenediamine"], "Coordination Compounds"],
    [["solid state", "bcc", "fcc", "unit cell", "packing", "crystal"], "The Solid State"],
    [["mole fraction", "raoult", "colligative", "osmotic", "solution"], "Solutions"],
    [["electrochem", "electrode potential", "nernst", "galvanic"], "Electrochemistry"],
    [["rate constant", "order of reaction", "kinetics", "activation energy"], "Chemical Kinetics"],
    [["haloalkane", "haloarene", "sn1", "sn2", "alkyl halide"], "Haloalkanes and Haloarenes"],
    [["phenol", "alcohol", "ether", "reimer"], "Alcohols Phenols and Ethers"],
    [["aldehyde", "ketone", "carboxylic", "carbonyl"], "Aldehydes Ketones and Carboxylic Acids"],
    [["amine", "diazonium", "aniline"], "Amines"],
    [["nucleophile", "electrophile", "isomer", "hyperconjugation", "carbocation", "resonance"], "Organic Chemistry - Some Basic Principles and Techniques"],
    [["alkene", "alkyne", "benzene", "markovnikov", "hydrocarbon"], "Hydrocarbons"],
    [["polymer", "nylon", "teflon", "rubber", "caprolactam"], "Polymers"],
    [["enzyme", "carbohydrate", "protein", "vitamin", "nucleic acid"], "Biomolecules"],
    [["enthalpy", "entropy", "gibbs", "thermodynamic", "heat of"], "Thermodynamics"],
  ],
  Biology: [
    [["five kingdom", "monera", "protista", "bacteria", "fungi", "lichen", "virus", "viroid", "chrysophyte"], "Biological Classification"],
    [["algae", "bryophyt", "pteridophyt", "gymnosperm", "plant kingdom"], "Plant Kingdom"],
    [["phylum", "porifera", "coelenterat", "arthropod", "chordat", "jawless", "animal kingdom"], "Animal Kingdom"],
    [["placentation", "inflorescence", "ovary", "cotyledon", "morphology", "flower"], "Morphology of Flowering Plants"],
    [["meristem", "vascular bundle", "secondary growth", "dicot stem", "anatomy"], "Anatomy of Flowering Plants"],
    [["cockroach", "earthworm", "frog", "haemolymph"], "Structural Organisation in Animals"],
    [["organelle", "mitochond", "ribosome", "prokaryot", "cell wall", "membrane-bound", "thylakoid"], "Cell: The Unit of Life"],
    [["chitin", "phosphodiester", "amino acid", "polysaccharide", "biomolecule"], "Biomolecules"],
    [["meiosis", "mitosis", "cell cycle", "chiasmata", "balbiani"], "Cell Cycle and Cell Division"],
    [["transpiration", "root pressure", "xylem", "ascent of sap", "water absorption"], "Transport in Plants"],
    [["nitrogen fixation", "mineral nutrition", "leghaemoglobin"], "Mineral Nutrition"],
    [["photosynthesis", "calvin", "light reaction", "photolysis", "stroma"], "Photosynthesis in Higher Plants"],
    [["respiration", "glycolysis", "krebs", "rq"], "Respiration in Plants"],
    [["auxin", "gibberellin", "plant growth", "coleoptile", "phytochrome"], "Plant Growth and Development"],
    [["digestion", "succus", "dentition", "enzyme of"], "Digestion and Absorption"],
    [["alveoli", "breathing", "emphysema", "respiratory"], "Breathing and Exchange of Gases"],
    [["heart", "blood", "circulation", "cardiac", "immunoglobulin in"], "Body Fluids and Circulation"],
    [["nephron", "urine", "excret", "kidney"], "Excretory Products and their Elimination"],
    [["muscle", "joint", "skeletal", "bone", "locomotion"], "Locomotion and Movement"],
    [["neuron", "fovea", "spinal cord", "reflex", "brain"], "Neural Control and Coordination"],
    [["hormone", "pituitary", "thyroid", "insulin", "adrenal"], "Chemical Coordination and Integration"],
    [["gametophyte", "endosperm", "pollen", "embryo sac", "synergid", "parthenocarp", "sporogenesis", "double fertilization"], "Sexual Reproduction in Flowering Plants"],
    [["ovulation", "menstrual", "graafian", "spermatogenesis", "meiosis-ii", "zona pellucida"], "Human Reproduction"],
    [["ectopic", "gift", "contraceptive", "ivf", "reproductive health"], "Reproductive Health"],
    [["linkage", "codominance", "pleiotropic", "mendel", "pedigree", "inheritance", "colour blind"], "Principles of Inheritance and Variation"],
    [["dna", "rna", "chargaff", "satellite dna", "genetic material", "transcription"], "Molecular Basis of Inheritance"],
    [["evolution", "natural selection", "homolog", "analog", "melanism", "darwin"], "Evolution"],
    [["antibod", "immune", "protozoan", "disease", "cancer", "drug"], "Human Health and Disease"],
    [["outbreeding", "animal husbandry", "apiculture", "food production"], "Strategies for Enhancement in Food Production"],
    [["microbe", "biogas", "antibiotic", "fermentation"], "Microbes in Human Welfare"],
    [["vector", "restriction enzyme", "cloning", "pcr", "t-dna", "agrobacterium"], "Biotechnology - Principles and Processes"],
    [["golden rice", "bt cotton", "gene therapy", "transgenic", "insulin produc"], "Biotechnology and its Applications"],
    [["niche", "population", "community", "biotic", "succession", "carrying capacity"], "Organisms and Populations"],
    [["trophic", "ecosystem", "food chain", "productivity", "nutrient cycle"], "Ecosystem"],
    [["endemic", "biodiversity", "endanger", "hotspot", "conservation"], "Biodiversity and Conservation"],
    [["acid rain", "eutrophication", "pollution", "ozone", "biomagnification", "greenhouse", "climate change"], "Environmental Issues"],
  ],
};

// Question words that almost always need a figure/structure -> route to review.
const FIGURE_HINTS = [
  "figure", "shown in", "as shown", "diagram", "graph", "circuit",
  "following structure", "structure of the", "given below the", "in the figure",
];

// Minimum keyword score to accept a chapter assignment without human review.
// score 0 = no keyword hit (unclassified); score 1 = single weak hit (low-confidence).
// Only score >= CONFIDENT_MIN goes straight to the clean CSV.
const CONFIDENT_MIN = 2;

/** Strip recurring page furniture that bleeds into options across page breaks.
 *  Keeps the standalone subject headings — they mark the section boundaries. */
function stripNoise(text) {
  return text
    .replace(/www\.vedantu\.com\s*\d*/gi, " ")
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, " ")
    .replace(/NATIONAL ELIGIBILITY CUM ENTRANCE TEST/gi, " ")
    .replace(/NEET\s*\(UG\)\s*,?\s*\d{4}\s*\(CODE-[A-D]\)/gi, " ")
    .replace(/Answers?\s*&\s*Solutions/gi, " ");
}

function clean(s) {
  return s.replace(/\s+/g, " ").replace(/\s+([.,?])/g, "$1").trim();
}

function csvField(s) {
  s = String(s ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const ANSWER_LETTER = { "1": "A", "2": "B", "3": "C", "4": "D" };

const buf = fs.readFileSync(file);
const parser = new PDFParse({ data: new Uint8Array(buf) });
const textResult = await parser.getText();
const text = stripNoise(textResult.text ?? "");
// Raw per-page text (un-stripped) — used to locate which page each question is on.
const rawPages = (textResult.pages ?? []).map((p) => ({
  num: p.num ?? p.pageNumber ?? 0,
  text: p.text ?? "",
}));
const normMatch = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
function pageOf(stem) {
  const key = normMatch(stem);
  if (!key) return null;
  for (const pg of rawPages) {
    if (normMatch(pg.text).length && pg.text.toLowerCase().replace(/[^a-z0-9]/g, "").includes(key)) {
      return pg.num;
    }
  }
  return null;
}

async function judgeAllDifficulty(rows) {
  if (!process.env.ANTHROPIC_API_KEY) {
    try {
      const envText = fs.readFileSync(".env.local", "utf8");
      const keyMatch = envText.match(/^ANTHROPIC_API_KEY=(.+)$/m);
      if (keyMatch) process.env.ANTHROPIC_API_KEY = keyMatch[1].trim();
    } catch {}
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    process.stderr.write(
      "⚠ ANTHROPIC_API_KEY not set — difficulty will be blank for all rows (routes to review).\n",
    );
    return;
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const BATCH = 30;
  const SYSTEM =
    "You are a NEET exam expert. For each question, judge its difficulty:\n" +
    "Easy = direct recall or definition, no calculation needed.\n" +
    "Medium = concept application, one step of reasoning.\n" +
    "Hard = multi-step reasoning, formula derivation, or tricky numerics.\n" +
    'Return ONLY a JSON array: [{"n": <q_no>, "d": "Easy"|"Medium"|"Hard"}, ...]';

  let totalIn = 0, totalOut = 0, batchNum = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    batchNum++;
    const batch = rows.slice(i, i + BATCH);
    const userContent = batch
      .map((r) => `Q${r.n}:\n${r.q}\n(A) ${r.a}\n(B) ${r.b}\n(C) ${r.c}\n(D) ${r.d}`)
      .join("\n\n");

    try {
      const resp = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: "user", content: userContent }],
      });
      totalIn  += resp.usage?.input_tokens  ?? 0;
      totalOut += resp.usage?.output_tokens ?? 0;

      const text = (resp.content ?? [])
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      const arrMatch = text.match(/\[[\s\S]*\]/);
      if (!arrMatch) {
        process.stderr.write(
          `⚠ difficulty batch ${batchNum}: no JSON array in response — rows stay blank\n`,
        );
        continue;
      }
      const judged = JSON.parse(arrMatch[0]);
      const byN = new Map(judged.map((e) => [Number(e.n), String(e.d)]));
      for (const r of batch) {
        const d = byN.get(r.n);
        if (d === "Easy" || d === "Medium" || d === "Hard") {
          r.difficulty = d;
        }
        // If d is absent or unrecognised, r.difficulty stays "" — deliberate.
        // A blank difficulty is rejected by import-pyq-csv.mjs and routes the row
        // to review, making the model-judgment failure VISIBLE. Do NOT add a
        // fallback default (no || "Medium", no || "Hard") — a silent wrong level
        // corrupts the difficulty distribution across the bank.
      }
    } catch (e) {
      // Batch API call failed — all rows in this batch keep difficulty="".
      // Same deliberate-blank policy: importer rejection is the failure signal.
      process.stderr.write(`⚠ difficulty batch ${batchNum} failed: ${e.message}\n`);
    }
  }

  const cost = (totalIn * 3 + totalOut * 15) / 1_000_000;
  console.log(
    `  Difficulty judging : ${batchNum} batch(es), ${totalIn} in + ${totalOut} out tokens → $${cost.toFixed(4)}`,
  );
}

let m;

// Subject sections, by the FIRST appearance of each subject heading. NEET
// papers are contiguous by subject, so a question's subject = the latest
// section heading at or before it. (First-occurrence handles the title-block
// "Chemistry" that isn't on its own line.)
const sectionStarts = ["Physics", "Chemistry", "Biology"]
  .map((name) => ({ name, at: text.search(new RegExp("\\b" + name + "\\b", "i")) }))
  .filter((s) => s.at >= 0)
  .sort((a, b) => a.at - b.at);
function subjectAt(pos) {
  let s = sectionStarts[0] ? sectionStarts[0].name : "Biology";
  for (const x of sectionStarts) if (x.at <= pos) s = x.name;
  return s;
}

// Split into question blocks at "N. " starting a line (N = 1..200).
const boundRe = /(?:^|\n)\s*(\d{1,3})\.\s/g;
const bounds = [];
while ((m = boundRe.exec(text))) {
  const n = Number(m[1]);
  if (n >= 1 && n <= 200) bounds.push({ n, start: m.index + m[0].length, head: m.index });
}

const rows = [];
const review = [];
const needsImage = [];
let lastN = 0;
for (let i = 0; i < bounds.length; i++) {
  const { n, start, head } = bounds[i];
  if (n !== lastN + 1) continue; // keep only the monotonic main sequence
  lastN = n;
  const end = i + 1 < bounds.length ? bounds[i + 1].head : text.length;
  const block = text.slice(start, end);

  // Split question part from solution part.
  const solMatch = block.match(/(Solution|Answer\s*Key|Answer)\s*:?\s*\(?\s*([1-4])\s*\)?/i);
  const inlineAnswer = solMatch ? ANSWER_LETTER[solMatch[2]] : null;
  // External key takes priority over inline; fall back to inline if key has no entry.
  const answer = externalKey.size > 0 ? (externalKey.get(n) ?? inlineAnswer) : inlineAnswer;
  const qPart = solMatch ? block.slice(0, solMatch.index) : block;

  // Options labelled (1)(2)(3)(4).
  const oRe = /\((1|2|3|4)\)\s*/g;
  const opts = [];
  let om;
  const idxs = [];
  while ((om = oRe.exec(qPart))) idxs.push({ k: Number(om[1]), at: om.index, end: oRe.lastIndex });
  // Take the first ascending 1,2,3,4 run.
  let qText = qPart, oA, oB, oC, oD;
  const run = [];
  for (const it of idxs) {
    if (run.length === 0 && it.k === 1) run.push(it);
    else if (run.length && it.k === run[run.length - 1].k + 1) run.push(it);
    if (run.length === 4) break;
  }
  if (run.length === 4) {
    qText = qPart.slice(0, run[0].at);
    oA = qPart.slice(run[0].end, run[1].at);
    oB = qPart.slice(run[1].end, run[2].at);
    oC = qPart.slice(run[2].end, run[3].at);
    oD = qPart.slice(run[3].end);
  }

  const q = clean(qText);
  const a = clean(oA || ""), b = clean(oB || ""), c = clean(oC || ""), d = clean(oD || "");
  const looksFigure = FIGURE_HINTS.some((h) => q.toLowerCase().includes(h));

  // answerOk and parseOk are kept separate so the review reason is unambiguous
  // and the alignment report can count each failure mode independently.
  //
  // answerOk=false → "no answer key": question goes to review regardless of
  // parse quality. Nothing with a blank/guessed answer ever reaches rows[].
  const answerOk = Boolean(answer);
  const parseOk = Boolean(
    q && a && b && c && d && q.length > 8 && !looksFigure &&
    [a, b, c, d].every((x) => x.length >= 1 && x.length < 220),
  );

  const subject = subjectAt(head);
  const haystack = q + " " + a + " " + b + " " + c + " " + d;
  const { chapter: rawChapter, score } = classifyChapterWithScore(subject, haystack);

  const chapter = rawChapter || "Unclassified";

  // Figure questions with a known answer go to the diagram lane (status='draft'
  // until a human confirms the image). They are never imported as text questions.
  if (looksFigure && answerOk) {
    needsImage.push({
      n, subject, chapter, concept: chapter, difficulty: "", par: 90,
      q, a, b, c, d, answer,
      page: pageOf(q),
    });
    continue;
  }

  // Determine why a row is flagged (null = clean).
  // Priority: answer missing → parse error → classification.
  let reason = null;
  if (!answerOk) {
    reason = "no answer key";
  } else if (!parseOk) {
    reason = "parse";
  } else if (score === 0) {
    reason = "unclassified";
  } else if (score < CONFIDENT_MIN) {
    reason = `low-confidence: ${rawChapter}`;
  }

  (reason ? review : rows).push({
    n, subject, chapter, concept: chapter, difficulty: "", par: 60,
    q, a, b, c, d, answer: answer || "",
    page: pageOf(q), reason,
  });
}

// Judge difficulty of all clean (import-ready) rows via model before writing CSV.
await judgeAllDifficulty(rows);

const header = "subject,chapter,concept,difficulty,par_time_sec,question_text,option_a,option_b,option_c,option_d,correct_option";
const toLine = (r) =>
  [r.subject, r.chapter, r.concept, r.difficulty, r.par, r.q, r.a, r.b, r.c, r.d, r.answer]
    .map(csvField).join(",");

fs.writeFileSync(out, [header, ...rows.map(toLine)].join("\n") + "\n");
if (review.length) {
  fs.writeFileSync(
    reviewOut,
    [header + ",reason,q_no,page", ...review.map((r) =>
      toLine(r) + "," + csvField(r.reason) + "," + r.n + "," + (r.page ?? ""))]
      .join("\n") + "\n",
  );
}
if (needsImage.length) {
  fs.writeFileSync(
    needsImageOut,
    [header + ",q_no,page", ...needsImage.map((r) =>
      toLine(r) + "," + r.n + "," + (r.page ?? ""))]
      .join("\n") + "\n",
  );
}

// Optional: render the PDF pages that hold review (diagram) questions, so you
// can crop the figure and upload it to the question via Admin -> Question Bank.
if (wantImages) {
  const pages = [...new Set(review.map((r) => r.page).filter(Boolean))].sort((a, b) => a - b);
  if (pages.length) {
    fs.mkdirSync(imageDir, { recursive: true });
    const shot = await parser.getScreenshot({ pages: pages.join(",") });
    for (const pg of shot.pages ?? []) {
      let data = pg.data;
      if (!data && pg.dataUrl) data = Buffer.from(pg.dataUrl.split(",")[1], "base64");
      const png = Buffer.isBuffer(data) ? data : Buffer.from(data);
      fs.writeFileSync(path.join(imageDir, `page-${pg.pageNumber}.png`), png);
    }
    console.log(`  Diagram page images  : ${pages.length} pages -> ${imageDir}/`);
  }
}

await parser.destroy();

const bySub = (arr, s) => arr.filter((r) => r.subject === s).length;

const noKey    = review.filter((r) => r.reason === "no answer key");
const parseErr = review.filter((r) => r.reason === "parse");
const unclass  = review.filter((r) => r.reason === "unclassified");
const lowConf  = review.filter((r) => r.reason?.startsWith("low-confidence"));

console.log(`\nParsed ${rows.length + review.length + needsImage.length} questions from ${file}`);
console.log(`  Clean (import-ready)   : ${rows.length}  ->  ${out}`);
console.log(`    Physics ${bySub(rows, "Physics")} | Chemistry ${bySub(rows, "Chemistry")} | Biology ${bySub(rows, "Biology")}`);
if (needsImage.length) {
  console.log(`  Diagram lane           : ${needsImage.length}  ->  ${needsImageOut}`);
  console.log(`    Q# ${needsImage.map((r) => r.n).join(", ")}`);
}
if (review.length) {
  console.log(`  Flagged (needs review) : ${review.length}  ->  ${reviewOut}`);
  if (noKey.length)    console.log(`    No answer key  : ${noKey.length}  (q# ${noKey.map((r) => r.n).join(", ")})`);
  if (parseErr.length) console.log(`    Parse error    : ${parseErr.length}  (q# ${parseErr.map((r) => r.n).join(", ")})`);
  if (unclass.length)  console.log(`    Unclassified   : ${unclass.length}  (q# ${unclass.map((r) => r.n).join(", ")})`);
  if (lowConf.length)  console.log(`    Low-confidence : ${lowConf.length}  (q# ${lowConf.map((r) => `${r.n}→${r.reason.slice("low-confidence: ".length)}`).join(", ")})`);
}
if (externalKey.size > 0) {
  const allExtracted = rows.concat(review, needsImage);
  const extractedNums = new Set(allExtracted.map((r) => r.n));
  const keyNums = [...externalKey.keys()];
  const kMin = Math.min(...keyNums), kMax = Math.max(...keyNums);
  const eMin = Math.min(...extractedNums), eMax = Math.max(...extractedNums);

  // Questions whose key answer was NOT used (no matching extracted question).
  const keyWithoutQ = keyNums.filter((k) => !extractedNums.has(k));
  // Extracted questions with no key entry (fell back to inline or went to review).
  const qWithoutKey = allExtracted.filter((r) => !externalKey.has(r.n));

  console.log(`\nKey alignment:`);
  console.log(`  Key range      : Q${kMin}–Q${kMax}  (${externalKey.size} entries)`);
  console.log(`  Extracted      : Q${eMin}–Q${eMax}  (${allExtracted.length} questions)`);

  if (keyWithoutQ.length === 0 && qWithoutKey.length === 0) {
    console.log(`  Alignment      : ✓ perfect — every extracted Q has a key entry`);
  } else {
    if (qWithoutKey.length > 0) {
      // These questions had no key entry; they fell back to inline answer or
      // were routed to review with reason="no answer key".
      const noKeyReview = qWithoutKey.filter((r) => r.reason === "no answer key");
      const noKeyInline = qWithoutKey.filter((r) => r.reason !== "no answer key");
      if (noKeyReview.length > 0) {
        console.log(`  ⚠ ${noKeyReview.length} question(s) have NO answer from key or inline → review:`);
        console.log(`    Q#: ${noKeyReview.map((r) => r.n).join(", ")}`);
      }
      if (noKeyInline.length > 0) {
        console.log(`  ℹ ${noKeyInline.length} question(s) used inline fallback (no key entry):`);
        console.log(`    Q#: ${noKeyInline.map((r) => r.n).join(", ")}`);
      }
    }
    if (keyWithoutQ.length > 0) {
      // Key entries that matched nothing — likely diagram/figure questions the
      // parser didn't extract. Listing them so you can confirm they're expected.
      const show = keyWithoutQ.slice(0, 15);
      const tail = keyWithoutQ.length > 15 ? ` … +${keyWithoutQ.length - 15} more` : "";
      console.log(`  ℹ ${keyWithoutQ.length} key entry/entries matched no extracted question:`);
      console.log(`    Q#: ${show.join(", ")}${tail}`);
      console.log(`    (Expected if those are figure/diagram questions not parseable from text.)`);
    }
  }
}
console.log(`\nNext steps:`);
console.log(`  1. Open ${out} and spot-check chapters (all should be valid NCERT names).`);
if (review.length) {
  console.log(`  2. Fix issues in ${reviewOut}: fill missing answers, correct chapters, remove figures.`);
  console.log(`     Re-add any fixed rows to ${out} before importing.`);
}
console.log(`  ${review.length ? "3" : "2"}. Import: node scripts/import-pyq-csv.mjs ${out}`);
if (!wantImages && needsImage.length) {
  console.log(`  Tip: re-run with --images to render diagram pages for figure questions.`);
}
