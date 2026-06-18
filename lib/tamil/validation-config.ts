// Config arrays that drive the Tamil translation validator.
// ALL term lists live here — never hardcoded inside validation functions.
// Extend these arrays as the human reviewer encounters new patterns in production.

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMS  = 1536;

// Flip to true once real Samacheer/NEET textbook content is loaded.
// Smart rule in retrieval.ts: if any non-seed chunks exist for the same
// subject, seeds are excluded automatically even when this is false.
export const EXCLUDE_AI_SEEDS = false;

// ─── Tamil negation / extremity markers ──────────────────────────────────────
// When an English risk word is present, at least one of these must appear
// in the Tamil translation for risk_words_preserved = true.
export const TAMIL_NEGATION_MARKERS = [
  'இல்லை',    // not / does not exist
  'அல்ல',     // is not
  'தவிர',     // except
  'கூடாது',   // must not / should not
  'மட்டும்',  // only (used in "not X, only Y" constructions)
  'அல்லாத',   // not (adjective form)
  'இல்லாத',   // without / lacking
  'தவிர்த்து', // excluding
  'மாறாக',    // contrary to / instead
  'குறைந்தபட்சம்', // minimum / least
  'அதிகபட்சம்',    // maximum / most
  'தவறானது',  // incorrect / wrong
  'சரியில்லை', // not correct
  'இல்லாமல்', // without
  'கிடையாது', // does not exist / never
  'இல்லாது',  // without (literary)
  'முறையற்ற', // improper / incorrect
  'பொருத்தமற்ற', // inappropriate / wrong
];

// ─── English risk words ───────────────────────────────────────────────────────
// Words that signal question inversion. When any of these appear in the English
// question text, the Tamil translation must carry the equivalent emphasis.
// Grouped by category for future weighted scoring extension.
export const ENGLISH_RISK_WORDS = {
  negation:    ['NOT', 'EXCEPT', 'INCORRECT', 'FALSE', 'DOES NOT', 'IS NOT',
                'ARE NOT', 'CANNOT', 'NEITHER', 'NOR', 'NEVER'],
  extremity:   ['LEAST', 'MOST', 'MINIMUM', 'MAXIMUM', 'SMALLEST', 'LARGEST',
                'LOWEST', 'HIGHEST', 'FEWEST', 'GREATEST'],
  correctness: ['CORRECT', 'INCORRECT', 'TRUE', 'FALSE', 'RIGHT', 'WRONG'],
  absolutes:   ['ALWAYS', 'NEVER', 'MUST', 'SHOULD NOT', 'NONE', 'ALL', 'ONLY'],
};

// ─── Units that must survive translation unchanged ────────────────────────────
// If a question mentions a unit NOT in this list, the validator logs a warning
// for future addition. Add new entries as they appear.
export const PRESERVED_UNITS = [
  // Mechanics
  'm/s', 'm/s²', 'km/h', 'km/s', 'cm/s', 'ms⁻¹', 'ms⁻²',
  // Mass / amount
  'kg', 'g', 'mg', 'μg', 'mol', 'mmol', 'kmol',
  // Volume
  'L', 'mL', 'μL', 'dm³', 'cm³', 'm³',
  // Electricity
  'V', 'mV', 'kV', 'A', 'mA', 'μA', 'Ω', 'kΩ', 'MΩ',
  'W', 'kW', 'MW', 'F', 'μF', 'pF', 'H', 'mH',
  // Energy
  'J', 'kJ', 'MJ', 'eV', 'keV', 'MeV', 'cal', 'kcal',
  // Force / pressure
  'N', 'kN', 'Pa', 'kPa', 'MPa', 'GPa', 'atm', 'bar', 'mmHg', 'torr',
  // Temperature
  'K', '°C', '°F',
  // Length
  'nm', 'μm', 'mm', 'cm', 'm', 'km', 'Å', 'pm', 'fm',
  // Time
  's', 'ms', 'μs', 'ns', 'min', 'hr', 'h',
  // Light / wave
  'Hz', 'kHz', 'MHz', 'GHz', 'THz', 'dB', 'lux', 'cd',
  // Magnetic / flux
  'T', 'Wb', 'G',
  // Angles
  'rad', 'sr', '°',
  // Chemistry-specific
  'pH', 'mol/L', 'M', 'mM', 'g/mol', 'g/L', 'mol/dm³', 'rpm', 'rps',
];

// ─── Chemical formulas and bio-abbreviations ──────────────────────────────────
// These must appear verbatim in the Tamil output — never transliterated.
export const PRESERVED_CHEMICAL_FORMULAS = [
  // Common inorganic
  'H₂O', 'CO₂', 'O₂', 'N₂', 'NaCl', 'CH₄', 'NH₃', 'HCl',
  'H₂SO₄', 'HNO₃', 'H₃PO₄', 'NaOH', 'KOH', 'Ca(OH)₂',
  'CaCO₃', 'KMnO₄', 'FeSO₄', 'CuSO₄', 'ZnSO₄', 'Na₂SO₄',
  'Fe₂O₃', 'Al₂O₃', 'MgO', 'CaO', 'ZnO',
  'H₂O₂', 'SO₂', 'SO₃', 'NO₂', 'NO', 'CO', 'HF', 'HBr', 'HI', 'H₂S',
  'Na₂CO₃', 'NaHCO₃', 'K₂Cr₂O₇', 'KClO₃',
  // Common organic
  'CH₃OH', 'C₂H₅OH', 'HCHO', 'CH₃COOH', 'HCOOH',
  'C₆H₆', 'C₆H₁₂O₆', 'C₁₂H₂₂O₁₁',
  // Bio-abbreviations — always kept as-is in Tamil-medium
  'ATP', 'ADP', 'AMP', 'NAD', 'NADH', 'NADP', 'NADPH',
  'FAD', 'FADH₂', 'GTP', 'UTP', 'CTP', 'CoA', 'cAMP', 'cGMP',
  'DNA', 'RNA', 'mRNA', 'tRNA', 'rRNA', 'snRNA', 'hnRNA', 'dsRNA',
  // Common biomolecule names used as-is in Tamil-medium
  'glucose', 'sucrose', 'fructose', 'lactose', 'maltose', 'starch', 'glycogen',
  'hemoglobin', 'myoglobin', 'insulin', 'glucagon', 'adrenaline',
  // Notation
  'pH', 'NTP', 'STP', 'RTP',
];

// ─── Math notation patterns ───────────────────────────────────────────────────
// Regex patterns for mathematical notation that must survive translation.
export const PRESERVED_MATH_PATTERNS: RegExp[] = [
  /\^[0-9]/,               // superscripts like x^2
  /\^{[^}]+}/,             // LaTeX-style ^{...}
  /[₀₁₂₃₄₅₆₇₈₉]/,       // subscript digits
  /[⁰¹²³⁴⁵⁶⁷⁸⁹]/,       // superscript digits
  /√/,                     // square root
  /∑/,                     // summation
  /∫/,                     // integral
  /∂/,                     // partial derivative
  /→/,                     // reaction arrow
  /←/,                     // reverse arrow
  /⇌/,                     // equilibrium arrow
  /⇒/,                     // implies
  /↑/,                     // gas evolved
  /↓/,                     // precipitate
  /≈/,                     // approximately
  /≠/,                     // not equal
  /≤/,                     // less than or equal
  /≥/,                     // greater than or equal
  /±/,                     // plus-minus
  /\d+\.\d+/,              // decimal numbers like 9.8
  /\d+\/\d+/,              // fractions like 1/2
  /\d+:\d+/,               // ratios like 2:1
  /\d+\s*[×x]\s*10/,      // scientific notation 2×10^3
  /[αβγδεζηθλμνξπρστφχψω]/, // lowercase Greek
  /[ΑΒΓΔΕΖΗΘΛΜΝΞΠΡΣΤΦΧΨΩ]/, // uppercase Greek
];
