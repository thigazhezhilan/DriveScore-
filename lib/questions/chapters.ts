/**
 * Canonical NCERT chapter order (Class 11 → Class 12) per subject.
 *
 * This is the DISPLAY ORDER used to sort chapters in the student practice list
 * so they read top-to-bottom like the NCERT syllabus, not alphabetically.
 *
 * Keep in sync with the chapter names in `scripts/ncert-classify.mjs`
 * (the classifier's source of truth). Both are derived from the NCERT index.
 */

export const NCERT_CHAPTERS: Record<string, string[]> = {
  Physics: [
    // Class 11
    "Units and Measurements", "Motion in a Straight Line", "Motion in a Plane",
    "Laws of Motion", "Work, Energy and Power", "System of Particles and Rotational Motion",
    "Gravitation", "Mechanical Properties of Solids", "Mechanical Properties of Fluids",
    "Thermal Properties of Matter", "Thermodynamics", "Kinetic Theory", "Oscillations", "Waves",
    // Class 12
    "Electric Charges and Fields", "Electrostatic Potential and Capacitance", "Current Electricity",
    "Moving Charges and Magnetism", "Magnetism and Matter", "Electromagnetic Induction",
    "Alternating Current", "Electromagnetic Waves", "Ray Optics and Optical Instruments",
    "Wave Optics", "Dual Nature of Radiation and Matter", "Atoms", "Nuclei", "Semiconductor Electronics",
  ],
  Chemistry: [
    // Class 11
    "Some Basic Concepts of Chemistry", "Structure of Atom",
    "Classification of Elements and Periodicity", "Chemical Bonding and Molecular Structure",
    "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions", "Hydrogen",
    "The s-Block Elements", "The p-Block Elements",
    "Organic Chemistry - Some Basic Principles and Techniques", "Hydrocarbons", "Environmental Chemistry",
    // Class 12
    "The Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry",
    "General Principles of Isolation of Elements", "The d- and f-Block Elements", "Coordination Compounds",
    "Haloalkanes and Haloarenes", "Alcohols Phenols and Ethers", "Aldehydes Ketones and Carboxylic Acids",
    "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life",
  ],
  Biology: [
    // Class 11
    "The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom",
    "Morphology of Flowering Plants", "Anatomy of Flowering Plants",
    "Structural Organisation in Animals", "Cell: The Unit of Life", "Biomolecules",
    "Cell Cycle and Cell Division", "Transport in Plants", "Mineral Nutrition",
    "Photosynthesis in Higher Plants", "Respiration in Plants", "Plant Growth and Development",
    "Digestion and Absorption", "Breathing and Exchange of Gases", "Body Fluids and Circulation",
    "Excretory Products and their Elimination", "Locomotion and Movement",
    "Neural Control and Coordination", "Chemical Coordination and Integration",
    // Class 12
    "Reproduction in Organisms", "Sexual Reproduction in Flowering Plants", "Human Reproduction",
    "Reproductive Health", "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance", "Evolution", "Human Health and Disease",
    "Strategies for Enhancement in Food Production", "Microbes in Human Welfare",
    "Biotechnology - Principles and Processes", "Biotechnology and its Applications",
    "Organisms and Populations", "Ecosystem", "Biodiversity and Conservation", "Environmental Issues",
  ],
};

/** Sort rank for a chapter within its subject (NCERT order). Unknowns sort last. */
export function chapterRank(subject: string, chapter: string): number {
  const i = (NCERT_CHAPTERS[subject] ?? []).indexOf(chapter);
  return i === -1 ? 999 : i;
}
