/**
 * NCERT chapter classifier — the single source of truth for question → chapter.
 *
 * Subject is decided upstream (by paper section), so this only picks the correct
 * NCERT chapter WITHIN a subject. Scoring (not first-match): a chapter's score =
 * sum of its keyword hits (multi-word keywords weighted x2, since they're more
 * specific). Highest score wins; ties resolve to the earlier (more specific)
 * chapter. Returns null when nothing matches, so the caller can flag it rather
 * than invent a junk chapter like "General"/"Diagram".
 *
 * Runs fully offline → no tokens. Used by extract-neet, extract-diagrams and the
 * one-off reclassify pass, so existing + all future questions file identically.
 */

export const CHAPTERS = {
  Physics: [
    "Units and Measurements", "Motion in a Straight Line", "Motion in a Plane",
    "Laws of Motion", "Work, Energy and Power", "System of Particles and Rotational Motion",
    "Gravitation", "Mechanical Properties of Solids", "Mechanical Properties of Fluids",
    "Thermal Properties of Matter", "Thermodynamics", "Kinetic Theory", "Oscillations",
    "Waves", "Electric Charges and Fields", "Electrostatic Potential and Capacitance",
    "Current Electricity", "Moving Charges and Magnetism", "Magnetism and Matter",
    "Electromagnetic Induction", "Alternating Current", "Electromagnetic Waves",
    "Ray Optics and Optical Instruments", "Wave Optics", "Dual Nature of Radiation and Matter",
    "Atoms", "Nuclei", "Semiconductor Electronics",
  ],
  Chemistry: [
    "Some Basic Concepts of Chemistry", "Structure of Atom",
    "Classification of Elements and Periodicity", "Chemical Bonding and Molecular Structure",
    "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions", "Hydrogen",
    "The s-Block Elements", "The p-Block Elements", "Organic Chemistry - Some Basic Principles and Techniques",
    "Hydrocarbons", "Environmental Chemistry", "The Solid State", "Solutions", "Electrochemistry",
    "Chemical Kinetics", "Surface Chemistry", "General Principles of Isolation of Elements",
    "The d- and f-Block Elements", "Coordination Compounds", "Haloalkanes and Haloarenes",
    "Alcohols Phenols and Ethers", "Aldehydes Ketones and Carboxylic Acids", "Amines",
    "Biomolecules", "Polymers", "Chemistry in Everyday Life",
  ],
  Biology: [
    "The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom",
    "Morphology of Flowering Plants", "Anatomy of Flowering Plants",
    "Structural Organisation in Animals", "Cell: The Unit of Life", "Biomolecules",
    "Cell Cycle and Cell Division", "Transport in Plants", "Mineral Nutrition",
    "Photosynthesis in Higher Plants", "Respiration in Plants", "Plant Growth and Development",
    "Digestion and Absorption", "Breathing and Exchange of Gases", "Body Fluids and Circulation",
    "Excretory Products and their Elimination", "Locomotion and Movement",
    "Neural Control and Coordination", "Chemical Coordination and Integration",
    "Reproduction in Organisms", "Sexual Reproduction in Flowering Plants", "Human Reproduction",
    "Reproductive Health", "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance", "Evolution", "Human Health and Disease",
    "Strategies for Enhancement in Food Production", "Microbes in Human Welfare",
    "Biotechnology - Principles and Processes", "Biotechnology and its Applications",
    "Organisms and Populations", "Ecosystem", "Biodiversity and Conservation",
    "Environmental Issues",
  ],
};

const KEYWORDS = {
  Physics: {
    "Units and Measurements": ["dimension", "dimensional", "significant figure", "vernier", "screw gauge", "least count", "error in measurement"],
    "Motion in a Plane": ["projectile", "relative velocity", "vector", "river", "components of"],
    "Laws of Motion": ["friction", "coefficient of friction", "inclined plane", "free body", "tension in", "pseudo force", "banking", "newton's second", "impulse"],
    "Work, Energy and Power": ["work done", "kinetic energy", "potential energy", "elastic collision", "inelastic collision", "conservation of energy", "power delivered"],
    "System of Particles and Rotational Motion": ["moment of inertia", "torque", "angular momentum", "centre of mass", "rotational", "radius of gyration", "rolling", "angular velocity"],
    "Gravitation": ["gravitation", "gravitational", "escape velocity", "orbital velocity", "satellite", "kepler", "geostationary", "acceleration due to gravity"],
    "Mechanical Properties of Solids": ["young's modulus", "elastic", "stress", "strain", "bulk modulus", "hooke", "shear modulus"],
    "Mechanical Properties of Fluids": ["viscosity", "surface tension", "bernoulli", "capillary", "terminal velocity", "reynolds", "pascal", "archimedes", "fluid", "stokes", "spray pump"],
    "Thermal Properties of Matter": ["thermal expansion", "specific heat", "calorimetry", "latent heat", "newton's law of cooling", "stefan", "coefficient of linear", "coefficient of volume expansion", "conduction of heat"],
    "Thermodynamics": ["first law of thermodynamics", "isothermal", "adiabatic", "carnot", "heat engine", "refrigerator", "coefficient of performance", "internal energy", "work done by the gas"],
    "Kinetic Theory": ["kinetic theory", "mean free path", "degrees of freedom", "rms speed", "speed of sound", "molar specific heat", "molar mass of the gas"],
    "Oscillations": ["simple harmonic", "oscillat", "pendulum", "spring constant", "time period of vibration", "amplitude"],
    "Waves": ["doppler", "resonance", "beats", "standing wave", "organ pipe", "wavelength of sound", "string is stretched", "apparent frequency", "longitudinal wave"],
    "Electric Charges and Fields": ["coulomb", "electric flux", "gauss", "electric dipole", "charge density", "electric field due to"],
    "Electrostatic Potential and Capacitance": ["capacitor", "capacitance", "dielectric", "equipotential", "parallel plate", "electric potential"],
    "Current Electricity": ["resistance", "kirchhoff", "wheatstone", "potentiometer", "ammeter", "drift velocity", "resistivity", "conductivity", "ohm", "emf and a resistance", "internal resistance", "shunt"],
    "Moving Charges and Magnetism": ["magnetic field", "lorentz", "cyclotron", "solenoid", "biot", "ampere", "moving charge", "current loop", "magnetic force", "perpendicular to the field"],
    "Magnetism and Matter": ["diamagnetic", "paramagnetic", "ferromagnetic", "hysteresis", "magnetic dipole moment", "earth's magnetic"],
    "Electromagnetic Induction": ["induced", "faraday", "lenz", "magnetic flux", "self induction", "mutual induction", "eddy current", "induced emf"],
    "Alternating Current": ["alternating", "reactance", "impedance", "lcr", "power factor", "transformer", "ac source", "rms value", "resonant frequency"],
    "Electromagnetic Waves": ["electromagnetic wave", "em wave", "displacement current", "em spectrum"],
    "Ray Optics and Optical Instruments": ["concave mirror", "convex", "refraction", "prism", "total internal reflection", "telescope", "microscope", "focal length", "refractive index", "lens"],
    "Wave Optics": ["interference", "diffraction", "young's double slit", "young's experiment", "fringe", "polaris", "huygens", "single slit", "coherent"],
    "Dual Nature of Radiation and Matter": ["photoelectric", "work function", "de broglie", "stopping potential", "threshold frequency", "photon"],
    "Atoms": ["bohr", "hydrogen spectrum", "lyman", "balmer", "rydberg", "rutherford", "energy level", "spectral series"],
    "Nuclei": ["radioactive", "half life", "binding energy", "mass defect", "nuclear", "decay", "isotope", "fission", "fusion", "nucleus of"],
    "Semiconductor Electronics": ["diode", "transistor", "semiconductor", "p-n junction", "logic gate", "rectifier", "amplifier", "zener", "npn", "pnp", "truth table", "barrier potential"],
  },
  Chemistry: {
    "Some Basic Concepts of Chemistry": ["mole", "avogadro", "molarity", "stoichiometr", "empirical formula", "limiting reagent", "percentage purity", "mass of the precipitate", "number of molecules", "equivalent weight"],
    "Structure of Atom": ["quantum number", "electronic configuration", "aufbau", "hund", "pauli", "azimuthal", "heisenberg", "orbital", "increasing energy of the listed orbitals"],
    "Classification of Elements and Periodicity": ["periodicity", "ionization enthalpy", "electronegativ", "electron gain enthalpy", "atomic radius", "periodic table", "isoelectronic"],
    "Chemical Bonding and Molecular Structure": ["hybridi", "vsepr", "bond order", "dipole moment", "molecular orbital", "isostructural", "bond angle", "sigma and pi", "shape of"],
    "States of Matter": ["ideal gas", "real gas", "van der waals", "boyle", "charles", "critical temperature", "compressibility", "obey the ideal gas"],
    "Thermodynamics": ["enthalpy", "entropy", "gibbs", "hess", "heat of combustion", "heat of formation", "bond enthalpy", "spontaneous"],
    "Equilibrium": ["equilibrium constant", "le chatelier", "buffer", "ph of", "solubility product", "ksp", "common ion", "acidic buffer", "kp", "degree of dissociation"],
    "Redox Reactions": ["oxidation number", "redox", "oxidising agent", "reducing agent", "kmno4", "disproportionation", "change in oxidation"],
    "Hydrogen": ["hydrogen peroxide", "heavy water", "hardness of water", "hydride"],
    "The s-Block Elements": ["alkali metal", "alkaline earth", "plaster of paris", "washing soda", "diagonal relationship", "releases co2 most easily"],
    "The p-Block Elements": ["boron", "borax", "diborane", "catenation", "interhalogen", "noble gas", "oxoacid", "ozone", "p – h bond", "p-h bond", "anhydride", "allotrope", "of fluorine", "stability of +1 oxidation"],
    "Organic Chemistry - Some Basic Principles and Techniques": ["nucleophile", "electrophile", "carbocation", "inductive effect", "hyperconjugation", "structural isomers", "iupac name of", "optically active", "enantiomer", "stereo"],
    "Hydrocarbons": ["alkane", "alkene", "alkyne", "benzene", "markovnikov", "aromatic", "wurtz", "ozonolysis", "dehydration of", "1-chloro", "butene"],
    "Environmental Chemistry": ["smog", "bod", "ozone depletion", "green chemistry"],
    "The Solid State": ["unit cell", "bcc", "fcc", "packing efficiency", "crystal lattice", "frenkel", "schottky", "coordination number"],
    "Solutions": ["mole fraction", "raoult", "colligative", "osmotic pressure", "molal", "depression in freezing", "van't hoff factor", "henry's law", "molality"],
    "Electrochemistry": ["electrode potential", "nernst", "galvanic", "electrolysis", "conductance", "salt bridge", "electrochemical cell", "standard hydrogen electrode"],
    "Chemical Kinetics": ["rate constant", "order of reaction", "rate of reaction", "activation energy", "arrhenius", "zero order", "first order reaction", "concentration of b after"],
    "Surface Chemistry": ["adsorption", "catalysis", "colloid", "tyndall", "emulsion", "freundlich", "micelle"],
    "General Principles of Isolation of Elements": ["metallurgy", "froth flotation", "roasting", "calcination", "smelting", "extraction of copper", "reduction of cuprous", "self reduction"],
    "The d- and f-Block Elements": ["transition element", "lanthanoid", "actinoid", "gadolinium", "d-block", "f-block", "4f series", "variable oxidation"],
    "Coordination Compounds": ["coordination", "ligand", "complex ion", "crystal field", "ethylenediamine", "oxalato", "hexacyanido", "[co(", "[ni(", "[fe(", "[m(en)"],
    "Haloalkanes and Haloarenes": ["alkyl halide", "haloalkane", "haloarene", "sn1", "sn2", "chlorobenzene", "grignard"],
    "Alcohols Phenols and Ethers": ["phenol", "reimer", "kolbe", "williamson", "alcohol with", "ethers"],
    "Aldehydes Ketones and Carboxylic Acids": ["aldehyde", "ketone", "carbonyl compound", "carboxylic", "aldol", "cannizzaro", "tollens", "fehling", "esterificat"],
    "Amines": ["amine", "aniline", "diazonium", "hofmann", "gabriel", "carbylamine"],
    "Biomolecules": ["carbohydrate", "glucose", "amino acid", "vitamin", "nucleotide", "disaccharide", "monosaccharide", "anomer"],
    "Polymers": ["polymer", "nylon", "teflon", "bakelite", "rubber", "caprolactam", "polythene", "terylene"],
    "Chemistry in Everyday Life": ["antibiotic", "antacid", "antiseptic", "analgesic", "antihistamine", "detergent", "sweetening agent"],
  },
  Biology: {
    "The Living World": ["binomial nomenclature", "taxonomic hierarchy", "taxon", "systematics", "species concept"],
    "Biological Classification": ["monera", "protista", "viroid", "archaebacteria", "lichen", "slime mould", "dinoflagellate", "chrysophyte", "mycoplasma", "kingdom", "five kingdom", "chromatophore", "deuteromycete", "fungi"],
    "Plant Kingdom": ["algae", "bryophyt", "pteridophyt", "gymnosperm", "thallophyte", "brown algae", "red algae", "fucoxanthin"],
    "Animal Kingdom": ["porifera", "coelenterata", "arthropod", "mollusca", "chordata", "notochord", "jawless", "ammocoetes", "triploblastic", "metagenesis", "phylum", "choanocyte"],
    "Morphology of Flowering Plants": ["inflorescence", "placentation", "aestivation", "phyllotaxy", "venation", "superior ovary", "cotyledon", "axile", "unisexual"],
    "Anatomy of Flowering Plants": ["meristem", "vascular bundle", "secondary growth", "cambium", "woody dicot", "phellem", "secondary phloem"],
    "Structural Organisation in Animals": ["epithelial tissue", "cockroach", "earthworm", "connective tissue", "haemolymph", "frog"],
    "Cell: The Unit of Life": ["organelle", "mitochondria", "ribosome", "prokaryotic", "eukaryotic", "plasma membrane", "mesosome", "golgi", "endoplasmic", "cell wall", "thylakoid", "cristae", "cisternae", "membrane-bound", "membrane bound"],
    "Biomolecules": ["phosphodiester", "chitin", "n-acetyl glucosamine", "polysaccharide", "enzyme kinetics", "protein structure"],
    "Cell Cycle and Cell Division": ["meiosis", "mitosis", "cell cycle", "chiasmata", "synapsis", "crossing over", "polytene", "balbiani", "terminalisation"],
    "Transport in Plants": ["transpiration", "root pressure", "ascent of sap", "guttation", "water potential", "tensile strength of water", "mass flow"],
    "Mineral Nutrition": ["nitrogen fixation", "leghaemoglobin", "macronutrient", "micronutrient", "deficiency symptom", "nitrogenase"],
    "Photosynthesis in Higher Plants": ["photosynthesis", "calvin", "light-independent", "photolysis", "chlorophyll", "c4", "photosystem", "kranz", "light reaction"],
    "Respiration in Plants": ["glycolysis", "krebs", "respiratory quotient", "fermentation", "electron transport chain", "anaerobic respiration"],
    "Plant Growth and Development": ["auxin", "gibberellin", "cytokinin", "abscisic", "ethylene", "photoperiodism", "vernalization", "coleoptile", "bioassay"],
    "Digestion and Absorption": ["succus entericus", "dentition", "peristalsis", "bile", "villi", "digestive enzyme", "nucleosidase"],
    "Breathing and Exchange of Gases": ["alveoli", "emphysema", "tidal volume", "breathing", "respiratory volume", "spirometry"],
    "Body Fluids and Circulation": ["cardiac cycle", "double circulatory", "heart sound", "blood pressure", "lymph", "semilunar valve", "atria"],
    "Excretory Products and their Elimination": ["nephron", "urine", "ureotelic", "uricotelic", "glomerular", "tubular secretion", "malpighian"],
    "Locomotion and Movement": ["sarcomere", "actin", "myosin", "sliding filament", "skeletal system", "joint would allow", "fibrous joint"],
    "Neural Control and Coordination": ["neuron", "synapse", "reflex", "spinal cord", "fovea", "action potential", "nerve impulse", "anterior horn"],
    "Chemical Coordination and Integration": ["pituitary", "thyroid", "insulin", "adrenal", "endocrine", "aldosterone", "glucagon", "antidiuretic", "master gland", "hormone"],
    "Reproduction in Organisms": ["vegetative propagation", "binary fission", "budding", "offset", "rhizome", "parthenogenesis", "asexual reproduction"],
    "Sexual Reproduction in Flowering Plants": ["pollen", "embryo sac", "double fertilization", "microsporogenesis", "megasporogenesis", "synergid", "endosperm", "pollination", "filiform", "parthenocarp", "male gametophyte"],
    "Human Reproduction": ["spermatogenesis", "oogenesis", "menstrual", "ovulation", "graafian", "zona pellucida", "placenta", "secondary oocyte", "meiosis-ii"],
    "Reproductive Health": ["contraceptive", "gift", "ivf", "zift", "amniocentesis", "infertility", "fallopian transfer", "ectopic"],
    "Principles of Inheritance and Variation": ["mendel", "codominance", "linkage", "pedigree", "colour blind", "dihybrid", "pleiotropic", "sex determination", "allele", "dominant on the other", "inheritance"],
    "Molecular Basis of Inheritance": ["dna replication", "transcription", "translation", "genetic code", "operon", "chargaff", "satellite dna", "applicable to rna", "genetic material", "phosphodiester bond"],
    "Evolution": ["natural selection", "darwin", "lamarck", "hardy weinberg", "homologous", "analogous", "industrial melanism", "adaptive radiation", "convergent evolution"],
    "Human Health and Disease": ["antibody", "immune", "vaccine", "malaria", "typhoid", "cancer", "aids", "drug abuse", "allergy", "babesiosis", "immunoglobulin", "pathogen", "graft"],
    "Strategies for Enhancement in Food Production": ["animal husbandry", "outbreeding", "inbreeding", "apiculture", "plant breeding", "biofortification", "green revolution"],
    "Microbes in Human Welfare": ["biogas", "sewage treatment", "biofertilizer", "production of immunosuppressive", "fermentation of", "swiss cheese"],
    "Biotechnology - Principles and Processes": ["recombinant dna", "restriction enzyme", "cloning", "plasmid", "pcr", "gel electrophoresis", "agrobacterium", "t-dna", "vector", "cutting of dna"],
    "Biotechnology and its Applications": ["golden rice", "bt cotton", "gene therapy", "transgenic", "gmo", "molecular diagnosis", "rnai", "biosynthesis of vitamin"],
    "Organisms and Populations": ["niche", "age pyramid", "carrying capacity", "biotic community", "mutualism", "commensalism", "predation", "competition", "different species living"],
    "Ecosystem": ["trophic level", "food chain", "food web", "ecological pyramid", "productivity", "nutrient cycle", "energy flow", "decomposer", "ecological succession", "deep oceanic", "detritivore"],
    "Biodiversity and Conservation": ["biodiversity", "endemic", "endangered", "hotspot", "extinction", "conservation", "sacred grove"],
    "Environmental Issues": ["eutrophication", "ozone depletion", "greenhouse", "global warming", "acid rain", "biomagnification", "pollution", "climate change", "indicator of so2", "toxicant at successive"],
  },
};

// Supplementary keywords filling gaps seen in real 2015/2016 papers.
const EXTRA = {
  Physics: {
    "Motion in a Straight Line": ["starts from rest", "uniformly accelerated", "uniform acceleration", "freely falling", "average velocity", "velocity of a particle is", "velocity of the particle"],
    "Motion in a Plane": ["orthogonal", "constant velocities", "collide", "cos(wt", "cos ωt", "two particles a and b"],
    "Laws of Motion": ["centripetal", "whirled", "horizontal circle", "uniform rope"],
    "Work, Energy and Power": ["rebound", "thrown vertically downward", "loses 50", "minimum velocity with which"],
    "System of Particles and Rotational Motion": ["point masses", "rigid rod"],
    "Moving Charges and Magnetism": ["square loop", "loop carrying a current"],
    "Electric Charges and Fields": ["charged spheres", "identical charges"],
    "Kinetic Theory": ["r.m.s", "rms speed", "ideal gases a and b", "ratio of molecular weight"],
    "Waves": ["siren", "air column", "closed at one end", "intensity at the maximum"],
    "Thermal Properties of Matter": ["black body", "wien"],
    "Electrostatic Potential and Capacitance": ["potential in a region", "electric field (in", "v = 6xy"],
    "Mechanical Properties of Fluids": ["heart pumps", "pumps 5", "non-mixing liquids"],
    "Semiconductor Electronics": ["to get output", "output 1 for the following"],
    "Alternating Current": ["inductor", "a capacitor 50"],
  },
  Chemistry: {
    "Structure of Atom": ["number of electrons", "n=3 shell"],
    "Equilibrium": ["best conductor of electric current", "make the potential"],
    "Chemical Bonding and Molecular Structure": ["order of stability of o", "decreasing order of stability"],
    "The p-Block Elements": ["+1 oxidation state", "conc. hno3", "conc hno3"],
    "Solutions": ["vapour pressure of a solution", "relative lowering", "liquid – vapour equilibrium"],
    "Chemical Kinetics": ["first-order reaction", "first order reaction"],
    "Aldehydes Ketones and Carboxylic Acids": ["order of acidity", "ester", "hydrolyzed under alkaline"],
    "Biomolecules": ["rna and dna"],
  },
  Biology: {
    "The Living World": ["nomenclature is governed", "universal rules of nomenclature"],
    "Principles of Inheritance and Variation": ["true breeding", "garden pea"],
    "Biomolecules": ["fat molecule", "triglyceride"],
    "Human Health and Disease": ["antibod", "haemophilia", "hemophilia", "asthma"],
    "Structural Organisation in Animals": ["gap junction", "tissue correctly matches"],
    "Transport in Plants": ["absorption of water", "roots play"],
    "Molecular Basis of Inheritance": ["starter codon", "restriction endonuclease", "origin of replication", "correct statement regarding rna and dna"],
    "Cell Cycle and Cell Division": ["spindle fibre", "telophase", "microtubules are the constituents"],
    "Cell: The Unit of Life": ["microtubule", "centriole"],
    "Morphology of Flowering Plants": ["stem modification", "syncarpous", "gynoecium", "papilionaceous", "phylloclade", "guard cell"],
    "Strategies for Enhancement in Food Production": ["rotating crops", "crop rotation", "legume"],
    "Neural Control and Coordination": ["photosensitive compound", "rhodopsin"],
    "Digestion and Absorption": ["gastric acid"],
    "Ecosystem": ["term ecosystem", "ecosystem was coined"],
    "Biotechnology - Principles and Processes": ["taq polymerase"],
    "Human Reproduction": ["gnrh pulse", "fertilization in humans"],
  },
};
for (const subj of Object.keys(EXTRA)) {
  for (const ch of Object.keys(EXTRA[subj])) {
    KEYWORDS[subj][ch] = [...(KEYWORDS[subj][ch] || []), ...EXTRA[subj][ch]];
  }
}

/** Best NCERT chapter for a question within its subject, or null if no match. */
export function classifyChapter(subject, text) {
  const map = KEYWORDS[subject];
  if (!map) return null;
  const hay = " " + String(text || "").toLowerCase() + " ";
  let best = null, bestScore = 0;
  for (const chapter of CHAPTERS[subject]) {
    const kws = map[chapter] || [];
    let score = 0;
    for (const kw of kws) {
      if (hay.includes(kw)) score += kw.includes(" ") ? 2 : 1;
    }
    if (score > bestScore) { bestScore = score; best = chapter; }
  }
  return best;
}
