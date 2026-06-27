import { getServiceClient } from "@/lib/db/client";

export type ChunkSource =
  | "samacheer_textbook"
  | "neet_paper"
  | "board_paper"
  | "coaching_material"
  | "ai_generated_seed";

export async function addTamilChunk(params: {
  source_type: ChunkSource;
  subject: "physics" | "chemistry" | "biology";
  chapter?: string;
  class_level?: string;
  tamil_text: string;
  english_reference?: string;
}): Promise<string> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("tamil_knowledge_chunks")
    .insert({
      source_type:       params.source_type,
      subject:           params.subject,
      chapter:           params.chapter ?? null,
      class_level:       params.class_level ?? null,
      tamil_text:        params.tamil_text,
      english_reference: params.english_reference ?? null,
      embedding:         null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

// ─── Seed data — 18 AI-generated example chunks ───────────────────────────────
// source_type = 'ai_generated_seed' so they are excluded once real textbook
// content is loaded for that subject (smart seed exclusion in retrieval.ts).

export const SEED_CHUNKS: Omit<Parameters<typeof addTamilChunk>[0], never>[] = [
  // ─── Physics ─────────────────────────────────────────────────────────────
  {
    source_type: "ai_generated_seed",
    subject: "physics",
    chapter: "Laws of Motion",
    class_level: "11",
    tamil_text:
      "நியூட்டனின் இரண்டாம் இயக்க விதி: ஒரு பொருளின் மீது செயல்படும் அலைவு விசை (F) அதன் திணிவு (m) மற்றும் முடுக்கம் (a) ஆகியவற்றின் பெருக்கற்பலனுக்கு சமம். F = ma.",
    english_reference: "Newton's second law: net force F equals mass m times acceleration a. F = ma.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "physics",
    chapter: "Work, Energy and Power",
    class_level: "11",
    tamil_text:
      "வேலை ஆற்றலின் கோட்பாடு: ஒரு பொருளின் மீது செய்யப்படும் வேலை அதன் இயக்க ஆற்றலில் ஏற்படும் மாற்றத்துக்கு சமம். W = ΔKE = ½mv² − ½mu².",
    english_reference: "Work-energy theorem: work done on an object equals the change in its kinetic energy. W = ΔKE.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "physics",
    chapter: "Oscillations",
    class_level: "11",
    tamil_text:
      "எளிய ஆர்மோனிக் இயக்கத்தில் அதிர்வெண் (f) மற்றும் காலம் (T) ஆகியவை தொடர்புடையவை: f = 1/T. அலைவெண்ணுக்கும் ஆர்மோனிக் இயக்கத்தின் கோண அதிர்வெண்ணுக்கும் தொடர்பு: ω = 2πf.",
    english_reference: "In simple harmonic motion, frequency f = 1/T. Angular frequency ω = 2πf.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "physics",
    chapter: "Electric Charges and Fields",
    class_level: "12",
    tamil_text:
      "கூலும்பின் விதி: இரண்டு புள்ளி மின்னூட்டங்களுக்கிடையேயான மின்னியல் விசை அவற்றின் மின்னூட்டங்களின் பெருக்கற்பலனுக்கு நேர்விகிதத்திலும் அவற்றுக்கிடையேயான தூரத்தின் வர்க்கத்துக்கு எதிர்விகிதத்திலும் உள்ளது. F = kq₁q₂/r².",
    english_reference: "Coulomb's law: force between two point charges is proportional to the product of charges and inversely proportional to square of distance. F = kq₁q₂/r².",
  },
  {
    source_type: "ai_generated_seed",
    subject: "physics",
    chapter: "Current Electricity",
    class_level: "12",
    tamil_text:
      "ஓமின் விதி: ஒரு கடத்தியில் ஓடும் மின்னோட்டம் (I) மின்னழுத்த வேறுபாட்டுக்கு (V) நேர்விகிதத்திலும் மின்தடைக்கு (R) எதிர்விகிதத்திலும் உள்ளது. V = IR.",
    english_reference: "Ohm's law: current I through a conductor is proportional to voltage V and inversely proportional to resistance R. V = IR.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "physics",
    chapter: "Ray Optics",
    class_level: "12",
    tamil_text:
      "ஸ்னெல்லின் விதி (ஒளிவிலகல் விதி): ஒளி ஒரு ஊடகத்திலிருந்து மற்றொரு ஊடகத்திற்கு செல்லும்போது n₁sinθ₁ = n₂sinθ₂ என்ற சமன்பாடு கடைப்பிடிக்கப்படுகிறது.",
    english_reference: "Snell's law of refraction: n₁sinθ₁ = n₂sinθ₂ when light passes between two media.",
  },
  // ─── Chemistry ────────────────────────────────────────────────────────────
  {
    source_type: "ai_generated_seed",
    subject: "chemistry",
    chapter: "Chemical Bonding",
    class_level: "11",
    tamil_text:
      "சகப்பிணைப்பு (Covalent bond): இரண்டு அணுக்கள் இடையே ஒன்று அல்லது அதிக மின்னணு இணைகளை பகிர்ந்து கொள்வதால் ஏற்படும் இணைப்பு. உதாரணம்: H₂O, CO₂, CH₄.",
    english_reference: "Covalent bond: formed by sharing of one or more electron pairs between atoms. Examples: H₂O, CO₂, CH₄.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "chemistry",
    chapter: "Equilibrium",
    class_level: "11",
    tamil_text:
      "வேதியியல் சமநிலை: ஒரு வினையில் முன்னோக்கிய வினை வேகம் பின்னோக்கிய வினை வேகத்திற்கு சமம் ஆகும்போது சமநிலை ஏற்படுகிறது. இது ஒரு மாறும் சமநிலை ஆகும். ⇌ அடையாளத்தால் குறிக்கப்படுகிறது.",
    english_reference: "Chemical equilibrium: forward reaction rate equals reverse rate. Represented by ⇌.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "chemistry",
    chapter: "Electrochemistry",
    class_level: "12",
    tamil_text:
      "மின்னாற்பகுப்பில் கேதோடில் ஒடுக்கமும் ஆனோடில் ஆக்சிகரணமும் நடைபெறுகிறது. மின்னாற்பகுப்பு மூலம் NaCl கரைசலில் இருந்து NaOH, H₂, Cl₂ ஆகியவை உற்பத்தி செய்யப்படுகின்றன.",
    english_reference: "In electrolysis, reduction occurs at cathode and oxidation at anode. Electrolysis of NaCl gives NaOH, H₂, Cl₂.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "chemistry",
    chapter: "Acids, Bases and Salts",
    class_level: "11",
    tamil_text:
      "pH அளவீடு: pH = -log₁₀[H⁺]. தூய நீரின் pH = 7 (நடுநிலை). அமிலக் கரைசல்களுக்கு pH < 7, காரக் கரைசல்களுக்கு pH > 7.",
    english_reference: "pH = -log₁₀[H⁺]. Pure water pH = 7. Acidic solution pH < 7, basic solution pH > 7.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "chemistry",
    chapter: "Organic Chemistry",
    class_level: "11",
    tamil_text:
      "ஐசோமரிசம்: ஒரே மூலக்கூட்டு சூத்திரத்தை கொண்டு வெவ்வேறு அமைப்பு அல்லது பண்புகளைக் கொண்ட சேர்மங்கள் ஐசோமர்கள் எனப்படும். கட்டமைப்பு ஐசோமரிசம், நிலை ஐசோமரிசம், வகை ஐசோமரிசம் என பல வகைகள் உள்ளன.",
    english_reference: "Isomerism: compounds with same molecular formula but different structures or properties are isomers. Types: structural, positional, functional group isomerism.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "chemistry",
    chapter: "Solutions",
    class_level: "12",
    tamil_text:
      "மோலாரிட்டி (Molarity): ஒரு லிட்டர் கரைசலில் உள்ள கரைபொருளின் மோல்களின் எண்ணிக்கை. M = n/V (mol/L). மோலாலிட்டி என்பது 1 கிலோகிராம் கரைப்பானில் உள்ள கரைபொருளின் மோல்கள்.",
    english_reference: "Molarity: moles of solute per litre of solution. M = n/V (mol/L). Molality = moles of solute per kg of solvent.",
  },
  // ─── Biology ─────────────────────────────────────────────────────────────
  {
    source_type: "ai_generated_seed",
    subject: "biology",
    chapter: "Cell: The Unit of Life",
    class_level: "11",
    tamil_text:
      "மைட்டோகாண்ட்ரியா: உயிரணுவின் ஆற்றல் மையம் எனப்படுகிறது. இங்கு ATP தொகுப்பகம் (ATP synthase) மூலம் ஆக்சிஜனேற்ற பாஸ்பரிலேஷன் மூலம் ATP உற்பத்தி ஆகிறது. இதற்கு இரட்டை சவ்வு உண்டு.",
    english_reference: "Mitochondria: powerhouse of the cell. ATP is produced here via oxidative phosphorylation. Has double membrane.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "biology",
    chapter: "Cell Division",
    class_level: "11",
    tamil_text:
      "ஒடுக்கப்பிரிவு (Meiosis): இரு தொடர்ச்சியான பிரிவுகளால் (Meiosis I மற்றும் Meiosis II) நான்கு ஒருமடிய (haploid) கலங்கள் உருவாகும். இது இனப்பெருக்க உயிரணுக்களில் நடைபெறுகிறது. குரோமட்டிட் பரிமாற்றம் (crossing over) மூலம் மரபணு மாறுபாடு ஏற்படுகிறது.",
    english_reference: "Meiosis: two successive divisions producing four haploid cells. Occurs in reproductive cells. Crossing over creates genetic variation.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "biology",
    chapter: "Photosynthesis",
    class_level: "11",
    tamil_text:
      "ஒளிச்சேர்க்கை: பச்சை தாவரங்கள் ஒளி ஆற்றலை உணவாக மாற்றும் செயல்முறை. பொதுவான சமன்பாடு: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. நிலவரமற்ற படிகளில் ATP மற்றும் NADPH உற்பத்தியாகும்; நிலவரமுள்ள படிகளில் கால்வின் சுழற்சி நடைபெறும்.",
    english_reference: "Photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. Light reactions produce ATP and NADPH; Calvin cycle fixes CO₂.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "biology",
    chapter: "Molecular Basis of Inheritance",
    class_level: "12",
    tamil_text:
      "படியெடுத்தல் (Transcription): DNA வரிசையிலிருந்து mRNA உருவாகும் செயல்முறை. இது மூன்று நிலைகளில் நடைபெறுகிறது: தொடக்கம் (initiation), நீட்சி (elongation), முடிவு (termination). RNA பாலிமரேஸ் இந்த செயல்முறையை நடத்துகிறது.",
    english_reference: "Transcription: synthesis of mRNA from DNA template. Stages: initiation, elongation, termination. RNA polymerase catalyses this.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "biology",
    chapter: "Molecular Basis of Inheritance",
    class_level: "12",
    tamil_text:
      "மொழிபெயர்த்தல் (Translation): mRNA வரிசையிலிருந்து புரதம் தொகுக்கப்படும் செயல்முறை. ரைபோசோம் மற்றும் tRNA ஆகியவை முக்கிய பங்கு வகிக்கின்றன. ஒவ்வொரு codon-உம் ஒரு குறிப்பிட்ட அமினோ அமிலத்தை குறிக்கிறது. AUG தொடக்க codon; UAA, UAG, UGA நிறுத்த codons.",
    english_reference: "Translation: protein synthesis from mRNA. Ribosome and tRNA play key roles. AUG is start codon; UAA, UAG, UGA are stop codons.",
  },
  {
    source_type: "ai_generated_seed",
    subject: "biology",
    chapter: "Respiration in Plants",
    class_level: "11",
    tamil_text:
      "செல்சுவாசம்: கிரெப்ஸ் சுழற்சியில் ஒவ்வொரு அசிடைல்-CoA மூலக்கூறுக்கும் 3 NADH, 1 FADH₂, 1 GTP மற்றும் 2 CO₂ உற்பத்தியாகும். ஒட்டுமொத்தமாக ஒரு குளுக்கோஸ் மூலக்கூறிலிருந்து 36–38 ATP கிடைக்கிறது.",
    english_reference: "Cellular respiration: Krebs cycle produces 3 NADH, 1 FADH₂, 1 GTP, 2 CO₂ per acetyl-CoA. Overall: 36-38 ATP per glucose.",
  },
];
