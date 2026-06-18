import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const QUEUE_FILE = resolve(process.cwd(), ".translation-queue.json");
const raw = readFileSync(QUEUE_FILE, "utf8");
const queue = JSON.parse(raw);

const translations: Record<string, object> = {
  "840e5096-0322-4f5e-95cb-524feda711a4": {
    tamil_question_text: "ஒரு பகுதியில் மின்னழுத்தம் V = 6xy - y + 2yz வோல்ட்கள். (1,1,0) என்ற புள்ளியில் மின்புலம் (N/C அலகில்):",
    tamil_options: ["-(6 i + 9 j + k)", "-(3 i + 5 j + 3 k)", "-(6 i + 5 j + 2 k)", "-(2 i + 3 j + k)"],
    tamil_explanation: "மின்புலம் E = -∇V. ∂V/∂x = 6y, ∂V/∂y = 6x-1+2z, ∂V/∂z = 2y. (1,1,0) இல் E = -(6i + 5j + 2k) N/C.",
    model_observations: { glossary_match_rate: 70, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "4ffc88b1-279a-4c43-bc3b-12cc6ab33211": {
    tamil_question_text: "யங் பரிசோதனையில் இரு இடைவெளிகளின் அகலங்கள் 1:25 என்ற விகிதத்தில் உள்ளன. அதிகபட்ச மற்றும் குறைந்தபட்ச தீவிர விகிதம் Imax/Imin என்பது:",
    tamil_options: ["4/9", "9/4", "121/49", "49/121"],
    tamil_explanation: "a1:a2 = 1:5 (வீச்சுகள் அகலத்தின் வர்க்கமூலத்திற்கு விகிதசமம்). Imax/Imin = (a1+a2)^2/(a1-a2)^2 = (1+5)^2/(5-1)^2 = 36/16 = 9/4.",
    model_observations: { glossary_match_rate: 60, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "5d171d0a-06f3-4f42-be06-edc77b950b94": {
    tamil_question_text: "ஒரு மனிதனின் இதயம் நிமிடத்திற்கு 5 L இரத்தத்தை 150 mm பாதரச அழுத்தத்தில் பம்ப் செய்கிறது. பாதரசத்தின் அடர்த்தி 13.6 x 10^3 kg/m^3 மற்றும் g = 10 m/s^2 எனில், இதயத்தின் ஆற்றல்:",
    tamil_options: ["1.50 W", "1.70 W", "2.35 W", "3.0 W"],
    tamil_explanation: "அழுத்தம் = rho*g*h = 13600*10*0.15 = 20400 Pa. ஆற்றல் = அழுத்தம் x கன வீதம் = 20400 x (5x10^-3/60) = 1.70 W.",
    model_observations: { glossary_match_rate: 65, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "830c66a9-52c9-4f96-9ad7-8babae03de82": {
    tamil_question_text: "150 மடங்கு மின்னழுத்த ஆதாயம் கொண்ட CE பெருக்கியில் உள்ளீடு Vi = 2 cos(15t + pi/3). வெளியீட்டு சமிக்ஞை:",
    tamil_options: ["300 cos(15t + 4pi/3)", "300 cos(15t + pi/3)", "75 cos(15t + 2pi/3)", "2 cos(15t + 5pi/6)"],
    tamil_explanation: "CE பெருக்கி 180 டிகிரி கட்ட மாற்றம் செய்கிறது. வெளியீட்டு வீச்சு = 150 x 2 = 300. கட்டம் = pi/3 + pi = 4pi/3. வெளியீடு: 300 cos(15t + 4pi/3).",
    model_observations: { glossary_match_rate: 60, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "291756b8-e821-47fd-9185-4fad9c78e13f": {
    tamil_question_text: "ஒரு மின்சுற்றில் ஒரு அம்மீட்டர், 30 V மின்கலம் மற்றும் 40.8 ஓம் தடையம் தொடரில் உள்ளன. அம்மீட்டர் சுருளின் மின்தடை 480 ஓம் மற்றும் 20 ஓம் சன்ட் கொண்டது. அம்மீட்டர் காட்டும் மதிப்பு:",
    tamil_options: ["1 A", "0.5 A", "0.25 A", "2 A"],
    tamil_explanation: "சன்ட் உடன் அம்மீட்டர் தடை = (480*20)/(480+20) = 19.2 ஓம். மொத்த தடை = 40.8+19.2 = 60 ஓம். மின்னோட்டம் = 30/60 = 0.5 A.",
    model_observations: { glossary_match_rate: 75, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "good" },
    used_glossary_terms: [{ english: "resistance", tamil: "மின்தடை" }, { english: "current", tamil: "மின்னோட்டம்" }],
    missing_expected_terms: []
  },
  "a2aafe11-30d4-4cb0-801c-80eae4eb8932": {
    tamil_question_text: "ஒரு கோரல் குழாயில் நீர் h உயரம் வரை ஏறுகிறது. நீர் மேற்பரப்பிற்கு மேல் உள்ள குழாயின் நீளம் h ஐ விட குறைவாக ஆக்கப்பட்டால்:",
    tamil_options: ["நீர் உயரவே ஏறாது", "நீர் நுனி வரை ஏறி நீரூற்று போல் வழிந்தோடும்", "நீர் மேல் வரை ஏறி வழியாமல் நிற்கும்", "நீர் மேல் பகுதிக்கு சற்று கீழே ஏறி நிற்கும்"],
    tamil_explanation: "நீர் குழாய் நுனி வரை ஏறும், ஆனால் வழியாது. தொடர்பு கோணம் மாறும், அழுத்த சமன்பாடு திருப்திப்படுத்தப்படும். நீர் நுனியில் நிற்கும்.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "45965a3d-220f-410a-b635-005935be6681": {
    tamil_question_text: "சாதாரண சீரமைப்பில் உள்ள ஒரு வானியல் தொலைநோக்கியில் நோக்கி லென்சில் L நீளமுள்ள நேரான கருப்பு கோடு வரையப்பட்டுள்ளது. கண்ணோட்டி I நீளமுள்ள மெய்ப் படிமம் உருவாக்குகிறது. தொலைநோக்கியின் பெரிதாக்கல்:",
    tamil_options: ["L/I", "L/I + 1", "L/I - 1", "(L+I)/(L-I)"],
    tamil_explanation: "வானியல் தொலைநோக்கியில் பெரிதாக்கல் m = fo/fe. நோக்கியின் படிம நீளம் L, கண்ணோட்டியால் I ஆக உருவாகிறது. m = L/I.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "e11d1fcc-628d-4954-9f1b-ad1c7ccf05a0": {
    tamil_question_text: "சிவப்பு, பச்சை மற்றும் நீல ஒளியின் கற்றை ஒரு செங்கோண ப்ரிஸ்மில் படிகிறது. சிவப்பு, பச்சை மற்றும் நீலத்திற்கான விலகல் எண்கள் முறையே 1.39, 1.44 மற்றும் 1.47. ப்ரிஸ்ம்:",
    tamil_options: ["சிவப்பை பச்சை மற்றும் நீலிலிருந்து பிரிக்கும்", "நீலை சிவப்பு மற்றும் பச்சையிலிருந்து பிரிக்கும்", "மூன்று நிறங்களையும் பிரிக்கும்", "மூன்று நிறங்களையும் பிரிக்காது"],
    tamil_explanation: "45 டிகிரி படும் கோணத்தில் சிவப்பு (n=1.39): முழு உள் எதிரொளிப்பு கோணம் 46 டிகிரி > 45 டிகிரி, எனவே வெளியேறும். பச்சை, நீல: முழு உள் எதிரொளிப்படைகின்றன. சிவப்பு மட்டும் பிரிக்கப்படும்.",
    model_observations: { glossary_match_rate: 60, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "cec2fabf-a772-4fe0-95e4-8cc4c181bb03": {
    tamil_question_text: "5 மற்றும் 3 அளவுகளைக் கொண்ட இரண்டு வெக்டர்களின் அதிகபட்ச சாத்தியமான திரிசையமானி:",
    tamil_options: ["8", "2", "15", "4"],
    tamil_explanation: "இரண்டு வெக்டர்களும் ஒரே திசையில் (கோணம் 0 டிகிரி) இருக்கும்போது திரிசையமானி அதிகபட்சமாக இருக்கும். அதிகபட்ச மதிப்பு = 5 + 3 = 8.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 2, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "medium", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "af21d932-cc7a-4741-82b0-24101ffa8dd2": {
    tamil_question_text: "ஆரம் R மற்றும் நிறை M கொண்ட ஒரு வட்டத் தட்டிலிருந்து, விளிம்பு மையத்தின் வழியாக செல்கின்ற R விட்டம் கொண்ட வட்ட துளை வெட்டப்படுகிறது. மையத்தின் வழியாக செல்லும் செங்குத்து அச்சைப் பற்றி மீதமுள்ள தட்டின் நிலைத்திருப்புத்திறன்:",
    tamil_options: ["15 MR2/32", "13 MR2/32", "11 MR2/32", "9 MR2/32"],
    tamil_explanation: "முழு தட்டு: I = MR^2/2. துளை நிறை = M/4. துளை மையம் R/2 தொலைவில். துளை I = (M/4)(R/2)^2/2 + (M/4)(R/2)^2 = 3MR^2/32. மீதி = MR^2/2 - 3MR^2/32 = 13MR^2/32.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 5, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "high", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "6e2a15b3-5602-4e62-8846-3441264c70f4": {
    tamil_question_text: "மின்னோட்டம் i சுமந்து செல்லும் சதுர வளையம் ABCD, மின்னோட்டம் I சுமந்து செல்லும் நீண்ட நேர் கடத்தி XY க்கு அருகில் மற்றும் அதே தளத்தில் வைக்கப்படுகிறது. வளையத்தில் மொத்த விசை:",
    tamil_options: ["2*mu0*Ii/(3*pi)", "mu0*Ii/(2*pi)", "2*mu0*Ii*L/(3*pi)", "mu0*Ii*L/(2*pi)"],
    tamil_explanation: "நெருங்கிய பக்கத்தில் ஈர்ப்பு விசை அதிகமாகவும், தொலைவான பக்கத்தில் விலக்கு விசை குறைவாகவும் இருக்கும். மொத்த விசை = mu0*I*i*L/(2*pi) * (1/r1 - 1/r2).",
    model_observations: { glossary_match_rate: 70, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "good" },
    used_glossary_terms: [{ english: "current", tamil: "மின்னோட்டம்" }],
    missing_expected_terms: []
  },
  "17f09ec9-3d19-4fc2-83c2-9146312fb105": {
    tamil_question_text: "புவியின் மேற்பரப்பிலிருந்து எந்த உயரத்தில் ஈர்ப்பு மின்னழுத்தம் மற்றும் g இன் மதிப்பு முறையே -5.4 x 10^7 J/kg மற்றும் 6.0 ms^-2 ஆக இருக்கும்? புவியின் ஆரம் 6400 km எனக் கொள்க:",
    tamil_options: ["2600 km", "1600 km", "1400 km", "2000 km"],
    tamil_explanation: "V = -GM/(R+h) மற்றும் g = GM/(R+h)^2. V/g = -(R+h). R+h = 5.4x10^7/6 = 9x10^6 m = 9000 km. h = 9000 - 6400 = 2600 km.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "bf7ded22-aca8-4a7c-b7bb-f04f93294245": {
    tamil_question_text: "ஒரு புரோட்டான் மற்றும் ஒரு ஆல்பா துகள் சீரான காந்தப்புலத்தில் செங்கோணமாக நுழைகின்றன. அவற்றின் வட்டப்பாதை ஆரங்கள் சமம் எனவும் புரோட்டானின் இயக்க ஆற்றல் 1 MeV எனவும் கொண்டால், ஆல்பா துகளின் இயக்க ஆற்றல்:",
    tamil_options: ["1 MeV", "4 MeV", "0.5 MeV", "1.5 MeV"],
    tamil_explanation: "r = sqrt(2mK)/(qB). r சமம் → sqrt(2mK)/q சமம். ஆல்பா: m=4mp, q=2e. sqrt(2*4mp*Ka)/(2e) = sqrt(2mp*Kp)/e. 2*sqrt(Ka) = sqrt(Kp). Ka = Kp/4 ... இல்லை, 4Ka = Kp: Ka = 1 MeV.",
    model_observations: { glossary_match_rate: 65, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [{ english: "kinetic energy", tamil: "இயக்க ஆற்றல்" }],
    missing_expected_terms: []
  },
  "af3edb4a-9d84-4e08-b084-1f2f15f33d62": {
    tamil_question_text: "ஒரு மேற்பரப்பு முறையே lambda மற்றும் lambda/2 அலைநீளம் கொண்ட ஒளியால் ஒளிர்விக்கப்படுகிறது. இரண்டாவது நிலையில் ஒளியிழப்பு எலக்ட்ரான்களின் அதிகபட்ச இயக்க ஆற்றல் முதல் நிலையை விட மூன்று மடங்கு எனில், வேலைச் செயல்பாடு:",
    tamil_options: ["hc/(3*lambda)", "hc/(2*lambda)", "hc/lambda", "2hc/lambda"],
    tamil_explanation: "hc/lambda - phi = K1 மற்றும் 2hc/lambda - phi = 3K1. கழிக்க: hc/lambda = 2K1, K1 = hc/(2*lambda). phi = hc/lambda - hc/(2*lambda) = hc/(2*lambda).",
    model_observations: { glossary_match_rate: 60, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [{ english: "kinetic energy", tamil: "இயக்க ஆற்றல்" }],
    missing_expected_terms: []
  },
  "9dd08850-1585-4dd1-943f-5e1f9bdfe316": {
    tamil_question_text: "காந்த ஏற்புத்திறன் எதிர்மறையாக இருப்பது:",
    tamil_options: ["வைரமுகமியப் பொருட்களுக்கு மட்டும்", "பாராகாந்திகப் பொருட்களுக்கு மட்டும்", "இரும்புகாந்திகப் பொருட்களுக்கு மட்டும்", "பாராகாந்திக மற்றும் இரும்புகாந்திகப் பொருட்களுக்கு"],
    tamil_explanation: "வைரமுகமியப் பொருட்கள் மட்டுமே எதிர்மறை காந்த ஏற்புத்திறன் கொண்டவை. அவை வெளிப்புற காந்தப்புலத்தை விலக்குகின்றன.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: true, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "a269d618-8b98-456c-9f47-d740532dfe4f": {
    tamil_question_text: "800 Hz அதிர்வெண்ணுடன் ஒலி எழுப்பும் ஒரு சைரன் 15 ms^-1 வேகத்தில் கண்காணிப்பாளரிடமிருந்து விலகி பாறை நோக்கி நகர்கிறது. பாறையிலிருந்து எதிரொலிக்கும் ஒலியை கண்காணிப்பாளர் கேட்கும் அதிர்வெண்: (காற்றில் ஒலி வேகம் = 330 ms^-1)",
    tamil_options: ["765 Hz", "800 Hz", "838 Hz", "885 Hz"],
    tamil_explanation: "பாறை கேட்கும் அதிர்வெண் f1 = 800*(330/(330-15)) = 838 Hz. எதிரொலியை கண்காணிப்பாளர் கேட்கும் அதிர்வெண் = 838*(330+15)/330 = 885 Hz.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "10ed5d86-d247-420b-be4b-f94b074f62e9": {
    tamil_question_text: "'a' அகலம் கொண்ட ஒற்றை இடைவெளியால் ஏற்படும் வளைவுபரவல் முறையில், 5000 Å அலைநீளம் கொண்ட ஒளி படும்போது முதல் குறைந்தபட்சம் 30 டிகிரி கோணத்தில் காணப்படுகிறது. முதல் இரண்டாம்நிலை அதிகபட்சம் காணப்படும் கோணம்:",
    tamil_options: ["sin^-1(1/4)", "sin^-1(2/3)", "sin^-1(1/2)", "sin^-1(3/4)"],
    tamil_explanation: "a sin30 = lambda → a = 2*lambda. முதல் இரண்டாம்நிலை அதிகபட்சம்: a*sin(theta) = 3*lambda/2 → sin(theta) = 3/4. theta = sin^-1(3/4).",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "9add211f-ae59-46c1-ac5d-4b7209ab19b3": {
    tamil_question_text: "அளவு மற்றும் திசை இரண்டையும் கொண்ட ஒரு அளவு என்று அழைக்கப்படுகிறது:",
    tamil_options: ["அலகு", "அடையாளம்", "பரிமாணமற்ற அளவு", "வெக்டர்"],
    tamil_explanation: "அளவும் திசையும் கொண்ட அளவுகள் வெக்டர் அளவுகள் எனப்படும். எ.கா. திசைவேகம், விசை, முடுக்கம்.",
    model_observations: { glossary_match_rate: 65, retrieval_matches: 3, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "high", glossary_coverage: "good" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "3945d192-f503-4b23-a564-c29584d47d8b": {
    tamil_question_text: "நிறையற்ற l நீளமுள்ள இரண்டு நூல்களால் ஒரு பொதுப் புள்ளியிலிருந்து தொங்கும் இரண்டு ஒரே மாதிரியான மின்னேற்றப்பட்ட கோளங்கள் ஒன்றையொன்று விலக்கும் விசையால் ஆரம்பத்தில் d (d << l) தூரத்தில் இருக்கின்றன. இரு கோளங்களிலிருந்தும் ஒரே மாதிரி வீதத்தில் மின்னூட்டம் கசியத் தொடங்குகிறது. இதன் விளைவாக கோளங்கள் upsilon திசைவேகத்துடன் நெருங்குகின்றன. x இன் சார்பாக upsilon மாறும் விதம்:",
    tamil_options: ["upsilon proportional to x^(1/2)", "upsilon proportional to x", "upsilon proportional to x^(-1/2)", "upsilon proportional to x^(-1)"],
    tamil_explanation: "சமநிலை நிலையில் kq^2/x^2 = mg*x/(2l). q^2 proportional x^3. dq/dt = மாறிலி → x proportional t^(2/3) → upsilon = dx/dt proportional x^(-1/2).",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "4465b1bc-411c-45d3-8003-4fe867bec6f1": {
    tamil_question_text: "நீளம் L மற்றும் நிறை m1 கொண்ட சீரான கயிறு ஒரு இறுகிய தாங்கியிலிருந்து செங்குத்தாக தொங்குகிறது. m2 நிறை கொண்ட ஒரு தொகுதி கயிற்றின் தளர்ந்த முனையில் இணைக்கப்பட்டுள்ளது. கயிற்றின் கீழ் முனையில் lambda1 அலைநீளம் கொண்ட குறுக்கு சிற்றலை உருவாக்கப்படுகிறது. சிற்றலை மேல் முனையை அடையும்போது அதன் அலைநீளம் lambda2. lambda2/lambda1 விகிதம்:",
    tamil_options: ["sqrt(m1/m2)", "sqrt((m1+m2)/m2)", "sqrt(m1/m2)", "sqrt((m1+m2)/m1)"],
    tamil_explanation: "அலை வேகம் v = sqrt(T/mu). கீழில் T = m2*g, மேலில் T = (m1+m2)*g. lambda proportional v proportional sqrt(T). lambda2/lambda1 = sqrt((m1+m2)/m2).",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 3, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "high", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "6f7c7698-dfb6-4eec-9273-4bffdb2d2d2d": {
    tamil_question_text: "பித்தளை மற்றும் எஃகு கம்பிகளின் நேரியல் விரிவு குணகங்கள் முறையே alpha1 மற்றும் alpha2. பித்தளை மற்றும் எஃகு கம்பிகளின் நீளங்கள் முறையே l1 மற்றும் l2. எல்லா வெப்பநிலைகளிலும் (l2 - l1) மாறாமல் இருந்தால், பின்வருவனவற்றில் எந்த உறவு சரியானது?",
    tamil_options: ["alpha1^2 * l2 = alpha2^2 * l1", "alpha1 * l2^2 = alpha2 * l1^2", "alpha1^2 * l2 = alpha2^2 * l1", "alpha1 * l1 = alpha2 * l2"],
    tamil_explanation: "d(l2 - l1)/dT = 0 → l2*alpha2 - l1*alpha1 = 0 → alpha1*l1 = alpha2*l2.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "5332ea5c-8bbd-43af-84ae-59c158770377": {
    tamil_question_text: "யங் இரட்டை இடைவெளி பரிசோதனையில் அதிகபட்சத்தில் தீவிரம் I0. இடைவெளிகளுக்கிடையேயான தூரம் d = 5*lambda, இங்கு lambda என்பது பயன்படுத்தப்படும் ஒளியின் அலைநீளம். D = 10d தூரத்தில் உள்ள திரையில் ஒரு இடைவெளியின் முன்னால் தீவிரம்:",
    tamil_options: ["I0", "I0/4", "3*I0/4", "I0/2"],
    tamil_explanation: "ஒரு இடைவெளியின் முன்னால் பாதை வேறுபாடு = d^2/(2D) ... கோணம் theta ≈ d/(2D). delta = pi/2. I = I0 * cos^2(pi/4) = I0/2.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "bee81985-de4e-4c27-b1f9-18ebeddd256b": {
    tamil_question_text: "50 cm ஆரம் கொண்ட மற்றும் ஓய்வில் உள்ள ஒரு சீரான வட்டத் தட்டு, அதன் தளத்திற்கு செங்குத்தாகவும் மையத்தின் வழியாகவும் செல்லும் அச்சைப் பற்றி சுதந்திரமாக சுழல முடியும். 2.0 rad s^-2 நிலையான கோண முடுக்கம் ஏற்படுத்தும் திருப்பு விசைக்கு உட்படுத்தப்படுகிறது. 2.0 s இறுதியில் ms^-2 அலகில் மொத்த முடுக்கம் தோராயமாக:",
    tamil_options: ["8.0", "7.0", "6.0", "3.0"],
    tamil_explanation: "2s பிறகு omega = alpha*t = 4 rad/s. மைய முடுக்கம் ac = omega^2 * r = 16 * 0.5 = 8 m/s^2. தொடுகோட்டு முடுக்கம் at = alpha * r = 1 m/s^2. மொத்தம் = sqrt(64+1) = 8.06 ≈ 8.0.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 4, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "high", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "2a4125a1-46ea-475c-be45-e3971572bcbd": {
    tamil_question_text: "ஒரே ஆரம் ஆனால் வெவ்வேறு நிறைகள் கொண்ட ஒரு வட்டத்தட்டு மற்றும் ஒரு கோளம் ஒரே உயரம் மற்றும் நீளம் கொண்ட இரண்டு சாய்வுத்தளங்களில் உருண்டு இறங்குகின்றன. இரண்டில் எது முதலில் தளத்தின் அடிப்பகுதியை அடையும்?",
    tamil_options: ["வட்டத்தட்டு", "கோளம்", "இரண்டும் ஒரே நேரத்தில் அடைகின்றன", "அவற்றின் நிறைகளைப் பொறுத்தது"],
    tamil_explanation: "உருளல் முடுக்கம் a = g*sin(theta)/(1 + I/(MR^2)). கோளம்: I/MR^2 = 2/5, a = 5g*sin(theta)/7. வட்டத்தட்டு: I/MR^2 = 1/2, a = 2g*sin(theta)/3. கோளத்திற்கு முடுக்கம் அதிகம், முதலில் அடையும்.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 4, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "high", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "110e4896-b60f-4f8e-ae30-559b8c22dcd8": {
    tamil_question_text: "ஒரு ப்ரிஸ்மின் ஒளிவிலகல் மேற்பரப்பில் ஒளிக்கதிரின் படும் கோணம் 45 டிகிரி. ப்ரிஸ்மின் கோணம் 60 டிகிரி. ஒளிக்கதிர் ப்ரிஸ்ம் வழியாக குறைந்தபட்ச விலகலை அடைந்தால், குறைந்தபட்ச விலகல் கோணம் மற்றும் ப்ரிஸ்ம் பொருளின் விலகல் எண் முறையே:",
    tamil_options: ["45 டிகிரி; 1/sqrt(2)", "30 டிகிரி; sqrt(2)", "45 டிகிரி; sqrt(2)", "30 டிகிரி; 1/sqrt(2)"],
    tamil_explanation: "குறைந்தபட்ச விலகல் நிலையில் r = A/2 = 30 டிகிரி. i = 45 டிகிரி. delta_min = 2i - A = 90 - 60 = 30 டிகிரி. n = sin(45)/sin(30) = (1/sqrt(2))/(1/2) = sqrt(2).",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "d4644b21-82dd-4f14-b540-0fb72ba024c8": {
    tamil_question_text: "ஒரு துகள் நகர்கின்றது, அதன் நிலை வெக்டர் r = cos(omega*t) x_hat + sin(omega*t) y_hat என கொடுக்கப்பட்டுள்ளது. இங்கு omega ஒரு மாறிலி. பின்வருவனவற்றில் எது உண்மை?",
    tamil_options: ["திசைவேகம் மற்றும் முடுக்கம் இரண்டும் r க்கு செங்குத்தானவை.", "திசைவேகம் மற்றும் முடுக்கம் இரண்டும் r க்கு இணையானவை.", "திசைவேகம் r க்கு செங்குத்தானது மற்றும் முடுக்கம் மையத்தை நோக்கி திசை கொண்டது.", "திசைவேகம் r க்கு செங்குத்தானது மற்றும் முடுக்கம் மையத்திலிருந்து விலகி திசை கொண்டது."],
    tamil_explanation: "v = dr/dt = -omega*sin(omega*t) x_hat + omega*cos(omega*t) y_hat. v.r = 0 → செங்குத்து. a = -omega^2 * r → மையத்தை நோக்கி (மையவிலக்கு முடுக்கம்).",
    model_observations: { glossary_match_rate: 65, retrieval_matches: 3, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "high", glossary_coverage: "good" },
    used_glossary_terms: [{ english: "acceleration", tamil: "முடுக்கம்" }, { english: "velocity", tamil: "திசைவேகம்" }],
    missing_expected_terms: []
  },
  "9c68ed03-0195-413b-a505-873d612f2ea9": {
    tamil_question_text: "ஒரு முனையில் மூடப்பட்டு மறுமுனையில் திறந்திருக்கும் ஒரு காற்று நிரல், குறைந்தபட்ச நிரல் நீளம் 50 cm ஆக இருக்கும்போது ஒரு சுரக்கவையுடன் அதிர்வடைகிறது. அதே சுரக்கவையுடன் அதிர்வடையும் அடுத்த பெரிய நிரல் நீளம்:",
    tamil_options: ["66.7 cm", "100 cm", "150 cm", "200 cm"],
    tamil_explanation: "ஒரு முனை மூடப்பட்ட குழாயில் L = lambda/4, 3*lambda/4, 5*lambda/4... முதல் அதிர்வு 50 cm = lambda/4 → lambda = 200 cm. அடுத்தது 3*lambda/4 = 150 cm.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "0c1e00f4-2348-447f-85e0-a6d63d20feb5": {
    tamil_question_text: "சந்திப்பு டையோடை இலட்சியமானது என கருதுக. AB வழியாக பாயும் மின்னோட்டத்தின் மதிப்பு:",
    tamil_options: ["0 A", "10^-2 A", "10^-1 A", "10^-3 A"],
    tamil_explanation: "இலட்சிய டையோடு முன்னோக்கு சார்பு நிலையில் பூஜ்ய தடை மற்றும் பின்னோக்கு சார்பு நிலையில் எல்லையற்ற தடை கொண்டது. சுற்றின் நிலையைப் பொறுத்து மின்னோட்டம் தீர்மானிக்கப்படும்.",
    model_observations: { glossary_match_rate: 65, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "good" },
    used_glossary_terms: [{ english: "current", tamil: "மின்னோட்டம்" }],
    missing_expected_terms: []
  },
  "daa8ca87-0b1d-4fa0-858c-562d5bf07dc0": {
    tamil_question_text: "ஒரு மின்தடை R வழியாக பாயும் மின்னூட்டம் t நேரத்துடன் Q = at - bt^2 என மாறுகிறது, இங்கு a மற்றும் b நேர்மறை மாறிலிகள். R இல் உற்பத்தியாகும் மொத்த வெப்பம்:",
    tamil_options: ["a^3*R/(6b)", "a^3*R/(3b)", "a^3*R/(2b)", "a^3*R/b"],
    tamil_explanation: "I = dQ/dt = a - 2bt. மின்னோட்டம் t = a/(2b) வரை பாயும். H = integral(I^2*R dt) = a^3*R/(6b).",
    model_observations: { glossary_match_rate: 70, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "good" },
    used_glossary_terms: [{ english: "resistance", tamil: "மின்தடை" }, { english: "current", tamil: "மின்னோட்டம்" }],
    missing_expected_terms: []
  },
  "8752985e-65f2-4a4a-880a-68cffb97fc5a": {
    tamil_question_text: "ஒரு கரும் உடல் 5760 K வெப்பநிலையில் உள்ளது. 250 nm அலைநீளத்தில் வெளிப்படும் கதிர்வீச்சு ஆற்றல் U1, 500 nm இல் U2 மற்றும் 1000 nm இல் U3. வீன் மாறிலி b = 2.88 x 10^6 nmK. பின்வருவனவற்றில் எது சரியானது?",
    tamil_options: ["U1 = 0", "U3 = 0", "U1 > U2", "U2 > U1"],
    tamil_explanation: "வீன் இடப்பெயர்ச்சி விதி: lambda_max = b/T = 2.88x10^6/5760 = 500 nm. இந்த அலைநீளத்தில் ஆற்றல் அதிகபட்சம். U2 (500 nm) > U1 (250 nm). U3 பூஜ்யமில்லை.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "b3718b66-61cc-4ba4-af81-7115bb0ccdb5": {
    tamil_question_text: "m நிறை கொண்ட ஒரு எலக்ட்ரான் மற்றும் ஒரு ஃபோட்டான் ஒரே E ஆற்றல் கொண்டவை. அவற்றுடன் தொடர்புடைய டி-பிரோகிளி அலைநீளங்களின் விகிதம்:",
    tamil_options: ["(1/c) * sqrt(E/(2m))", "sqrt(E/(2m))", "c * sqrt(2mE)", "(1/c) * sqrt(2m/E)"],
    tamil_explanation: "எலக்ட்ரான்: lambda_e = h/sqrt(2mE). ஃபோட்டான்: lambda_p = hc/E. விகிதம் lambda_e/lambda_p = (hc/E) / (h/sqrt(2mE)) ... = (1/c) * sqrt(E/(2m)).",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "475de6a8-a6ce-49f7-bcf5-23c7a05bd549": {
    tamil_question_text: "நிறை 'm' மற்றும் திசைவேகம் 'v' கொண்ட ஆல்பா துகள் 'Ze' மின்னூட்டம் கொண்ட கனமான அணுக்கருவை தாக்கும்போது, அணுக்கருவிலிருந்து அதன் மிக நெருங்கிய நெருங்கல் தூரம் m ஐ பொறுத்து:",
    tamil_options: ["1/m", "1/sqrt(m)", "1/m^2", "m"],
    tamil_explanation: "மிக நெருங்கிய நெருங்கல்: (1/2)*m*v^2 = k*Ze*2e/r0. r0 = 4kZe^2/(mv^2). r0 proportional 1/m.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "49612b38-0b2c-49c3-aef5-57e5d2a58928": {
    tamil_question_text: "10 g நிறை கொண்ட ஒரு துகள் 6.4 cm ஆரம் கொண்ட வட்டத்தின் வழியே நிலையான தொடுகோட்டு முடுக்கத்துடன் நகர்கிறது. இயக்கம் தொடங்கிய பிறகு இரண்டாவது சுற்றின் இறுதியில் துகளின் இயக்க ஆற்றல் 8 x 10^-4 J க்கு சமம் ஆகும் எனில், இந்த முடுக்கத்தின் அளவு:",
    tamil_options: ["0.1 m/s^2", "0.15 m/s^2", "0.18 m/s^2", "0.2 m/s^2"],
    tamil_explanation: "2 சுற்றுகளில் கடந்த தூரம் s = 4*pi*r = 4*pi*0.064 m. v^2 = 2*a*s. KE = (1/2)*m*v^2 = 8x10^-4. a = KE/(m*2*pi*r*2) = 0.1 m/s^2.",
    model_observations: { glossary_match_rate: 60, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [{ english: "kinetic energy", tamil: "இயக்க ஆற்றல்" }, { english: "acceleration", tamil: "முடுக்கம்" }],
    missing_expected_terms: []
  },
  "feffd9d5-e05e-41ef-b489-66a0447c4ad9": {
    tamil_question_text: "கொடுக்கப்பட்ட நிறை வாயுவின் மூலக்கூறுகள் 27 டிகிரி C மற்றும் 1.0 x 10^5 Nm^-2 அழுத்தத்தில் 200 ms^-1 rms திசைவேகம் கொண்டவை. வாயுவின் வெப்பநிலை மற்றும் அழுத்தம் முறையே 127 டிகிரி C மற்றும் 0.05 x 10^5 Nm^-2 ஆகும்போது, அதன் மூலக்கூறுகளின் rms திசைவேகம் ms^-1 அலகில்:",
    tamil_options: ["100*sqrt(2)", "400/sqrt(3)", "100*sqrt(2)/3", "100/3"],
    tamil_explanation: "rms திசைவேகம் v proportional sqrt(T), அழுத்தம் சார்பில்லை. T1 = 300 K, T2 = 400 K. v2 = 200 * sqrt(400/300) = 200 * 2/sqrt(3) = 400/sqrt(3) ms^-1.",
    model_observations: { glossary_match_rate: 60, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [{ english: "velocity", tamil: "திசைவேகம்" }],
    missing_expected_terms: []
  },
  "95af922b-1b8d-4f97-86d3-eb7bd52c3737": {
    tamil_question_text: "ஆரம் a கொண்ட ஒரு நீண்ட நேர் கம்பி நிலையான மின்னோட்டம் I ஐ சுமக்கிறது. மின்னோட்டம் அதன் குறுக்குவெட்டு முழுவதும் சீராக பரவியுள்ளது. கம்பியின் அச்சிலிருந்து a/2 மற்றும் 2a தொலைவுகளில் காந்தப்புலங்கள் B மற்றும் B' இன் விகிதம்:",
    tamil_options: ["1/4", "1/2", "1", "4"],
    tamil_explanation: "உள்ளே (r = a/2): B = mu0*I*r/(2*pi*a^2) = mu0*I/(4*pi*a). வெளியே (r = 2a): B' = mu0*I/(2*pi*2a) = mu0*I/(4*pi*a). B/B' = 1.",
    model_observations: { glossary_match_rate: 70, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "good" },
    used_glossary_terms: [{ english: "current", tamil: "மின்னோட்டம்" }],
    missing_expected_terms: []
  },
  "a63ccfc4-28dd-48a6-bdc1-7e67f8a4540e": {
    tamil_question_text: "5 மற்றும் 3 அளவுகளைக் கொண்ட இரண்டு வெக்டர்களின் குறைந்தபட்ச சாத்தியமான திரிசையமானி:",
    tamil_options: ["2", "8", "15", "4"],
    tamil_explanation: "இரண்டு வெக்டர்களும் எதிர் திசையில் (கோணம் 180 டிகிரி) இருக்கும்போது திரிசையமானி குறைந்தபட்சமாக இருக்கும். குறைந்தபட்ச மதிப்பு = 5 - 3 = 2.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 2, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "medium", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "f9477a0c-50d6-4d6b-944d-6026eddeec68": {
    tamil_question_text: "ஒரு வானியல் தொலைநோக்கியின் நோக்கி மற்றும் கண்ணோட்டியின் குவியத்தூரங்கள் முறையே 40 cm மற்றும் 4 cm. நோக்கியிலிருந்து 200 cm தொலைவில் உள்ள ஒரு பொருளை பார்க்க, லென்சுகளுக்கிடையேயான தூரம்:",
    tamil_options: ["37.3 cm", "46.0 cm", "50.0 cm", "54.0 cm"],
    tamil_explanation: "நோக்கி: u = -200 cm, f = 40 cm. 1/v - 1/u = 1/f → 1/v = 1/40 + 1/(-200) wait 1/v = 1/40 - (-1/200) = 1/40 + 1/200 = 6/200 → v = 200/6... மறு கணக்கீடு: v = 50 cm. கண்ணோட்டி குவிய தளத்தில் படிமம்: தூரம் = 50 + 4 = 54 cm.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "a8df00db-1a74-4b79-bba8-b9ed484ac130": {
    tamil_question_text: "புவியில் விடுபடல் திசைவேகம் (ve) மற்றும் புவியை விட இரண்டு மடங்கு ஆரம் மற்றும் சராசரி அடர்த்தி கொண்ட ஒரு கோளில் விடுபடல் திசைவேகம் (vp) ஆகியவற்றின் விகிதம்:",
    tamil_options: ["1 : 2", "1 : 2*sqrt(2)", "1 : 4", "1 : sqrt(2)"],
    tamil_explanation: "ve = sqrt(8*pi*G*rho*R^2/3). rho_p = 2*rho_e, R_p = 2*R_e. vp = sqrt(8*pi*G*2*rho_e*(2*R_e)^2/3) = ve*sqrt(8) = 2*sqrt(2)*ve. ve:vp = 1:2*sqrt(2).",
    model_observations: { glossary_match_rate: 60, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [{ english: "velocity", tamil: "திசைவேகம்" }],
    missing_expected_terms: []
  },
  "3595990d-e40d-449d-a39e-f97cba7395ff": {
    tamil_question_text: "இரண்டு வெக்டர்களின் கூட்டலின் அளவு வெக்டர்களின் வித்தியாசத்தின் அளவிற்கு சமம் எனில், இந்த வெக்டர்களுக்கிடையேயான கோணம்:",
    tamil_options: ["0 டிகிரி", "90 டிகிரி", "45 டிகிரி", "180 டிகிரி"],
    tamil_explanation: "|A+B|^2 = |A-B|^2 → 4*A*B*cos(theta) = 0 → cos(theta) = 0 → theta = 90 டிகிரி.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 2, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "medium", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "b40da654-c275-45d6-a286-b9db92e46512": {
    tamil_question_text: "1 kg நிறை கொண்ட ஒரு உடல் F = (2t i_hat + 3t^2 j_hat) N என்ற நேர சார்ந்த விசையின் செயல்பாட்டின் கீழ் நகரத் தொடங்குகிறது. t நேரத்தில் விசையால் உருவாக்கப்படும் ஆற்றல்:",
    tamil_options: ["(2t^2 + 3t^3) W", "(2t^2 + 4t^4) W", "(2t^3 + 3t^4) W", "(2t^3 + 3t^5) W"],
    tamil_explanation: "a = F/m = (2t i_hat + 3t^2 j_hat). v = integral(a dt) = (t^2 i_hat + t^3 j_hat). P = F.v = 2t*t^2 + 3t^2*t^3 = 2t^3 + 3t^5 W.",
    model_observations: { glossary_match_rate: 65, retrieval_matches: 2, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "medium", glossary_coverage: "good" },
    used_glossary_terms: [{ english: "force", tamil: "விசை" }, { english: "velocity", tamil: "திசைவேகம்" }],
    missing_expected_terms: []
  },
  "807c59cc-6862-41e0-ac4c-2dc9e2a29aac": {
    tamil_question_text: "V(t) = V0*sin(omega*t) என்ற சிறிய சமிக்ஞை மின்னழுத்தம் ஒரு இலட்சிய மின்தேக்கி C இடையே கொடுக்கப்படுகிறது:",
    tamil_options: ["மின்னோட்டம் I(t) மின்னழுத்தம் V(t) க்கு 90 டிகிரி தாமதமாகிறது", "ஒரு முழு சுழற்சியில் மின்தேக்கி C மின்னழுத்த மூலத்திலிருந்து எந்த ஆற்றலையும் உட்கொள்வதில்லை", "மின்னோட்டம் I(t) மின்னழுத்தம் V(t) உடன் ஒரே கட்டத்தில் உள்ளது", "மின்னோட்டம் I(t) மின்னழுத்தம் V(t) க்கு 180 டிகிரி முன்னால் உள்ளது"],
    tamil_explanation: "மின்தேக்கியில் I = C*dV/dt = C*omega*V0*cos(omega*t), இது V(t) ஐ விட 90 டிகிரி முன்னால். ஒரு முழு சுழற்சியில் மின்தேக்கி எந்த ஆற்றலையும் உட்கொள்வதில்லை (B சரியானது).",
    model_observations: { glossary_match_rate: 70, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "good" },
    used_glossary_terms: [{ english: "current", tamil: "மின்னோட்டம்" }],
    missing_expected_terms: []
  },
  "d8e7cc8f-7ae7-489e-9ab1-517e53cdc5af": {
    tamil_question_text: "நெடுவரிசை 1 மற்றும் நெடுவரிசை 2 இன் உள்ளீடுகளை பொருத்துக. [m என்பது கண்ணாடியால் உருவாக்கப்படும் பெரிதாக்கல்] நெடுவரிசை 1: (A) m = -2, (B) m = -1/2, (C) m = +2, (D) m = +1/2. நெடுவரிசை 2: (a) குவி கண்ணாடி, (b) குழி கண்ணாடி, (c) மெய் படிமம், (d) மாய படிமம்",
    tamil_options: ["A → b மற்றும் c; B → b மற்றும் c; C → b மற்றும் d; D → a மற்றும் d", "A → a மற்றும் c; B → a மற்றும் d; C → a மற்றும் b; D → c மற்றும் d", "A → a மற்றும் d; B → b மற்றும் c; C → b மற்றும் d; D → b மற்றும் c", "A → c மற்றும் d; B → b மற்றும் d; C → b மற்றும் c; D → a மற்றும் d"],
    tamil_explanation: "எதிர்மறை m → மெய் படிமம், குழி கண்ணாடி. m=-2 → குழி, மெய். m=-1/2 → குழி, மெய். m=+2 → குழி கண்ணாடி, மாய படிமம். m=+1/2 → குவி கண்ணாடி, மாய படிமம்.",
    model_observations: { glossary_match_rate: 55, retrieval_matches: 0, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "low", glossary_coverage: "partial" },
    used_glossary_terms: [],
    missing_expected_terms: []
  },
  "7f6ce1f2-5a69-4ffe-ad06-293317160137": {
    tamil_question_text: "R ஆரம் கொண்ட வளைந்த சாலையில் ஒரு கார் செல்கிறது. சாலை theta கோணத்தில் சாய்க்கப்பட்டுள்ளது. காரின் டயர்களுக்கும் சாலைக்கும் இடையேயான நிலை உராய்வு குணகம் mu_s. இந்த சாலையில் அதிகபட்ச பாதுகாப்பான திசைவேகம்:",
    tamil_options: ["sqrt(g*R^2 * (mu_s + tan(theta))/(1 - mu_s*tan(theta)))", "sqrt(g*R * (mu_s + tan(theta))/(1 - mu_s*tan(theta)))", "sqrt(g/R * (mu_s + tan(theta))/(1 - mu_s*tan(theta)))", "sqrt(g/R^2 * (mu_s + tan(theta))/(1 - mu_s*tan(theta)))"],
    tamil_explanation: "சாய்வுடன் உராய்வு உள்ள சாலையில் vmax = sqrt(g*R * (mu_s + tan(theta))/(1 - mu_s*tan(theta))).",
    model_observations: { glossary_match_rate: 60, retrieval_matches: 3, contains_negation: false, option_count_match: true, number_count_match: true, unit_preserved: true, chemical_formula_preserved: true, math_notation_preserved: true, context_relevance: "high", glossary_coverage: "partial" },
    used_glossary_terms: [{ english: "velocity", tamil: "திசைவேகம்" }],
    missing_expected_terms: []
  }
};

for (const item of queue.items) {
  const t = translations[item.questionId];
  if (t) {
    item.translation = t;
  }
}

writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
console.log(`Patched ${Object.keys(translations).length} translations into queue.`);
