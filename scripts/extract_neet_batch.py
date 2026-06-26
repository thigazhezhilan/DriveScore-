"""
NEET PYQ Batch Extractor — Gate 1 dry-run
Extracts 2017–2021, 2024, 2025 to CSV. No DB writes.

Output:
  docs/english_PREVIOUS_YEAR/output/{year}_clean.csv
  docs/english_PREVIOUS_YEAR/output/{year}_review.csv
  docs/english_PREVIOUS_YEAR/output/dedup_report.csv
  docs/english_PREVIOUS_YEAR/output/summary.txt

Usage:
  python scripts/extract_neet_batch.py
  python scripts/extract_neet_batch.py --year 2019
  python scripts/extract_neet_batch.py --skip-dedup
"""

import sys, re, csv, io, unicodedata
from pathlib import Path
import fitz

ROOT    = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "docs" / "english_PREVIOUS_YEAR"
OUT_DIR = PDF_DIR / "output"
OUT_DIR.mkdir(exist_ok=True)

# ── year configs ──────────────────────────────────────────────────────────────
YEAR_CONFIGS = {
    2017: dict(family="AK",
               pdf="NEET 2017 question paper - Code A with Answers and Solutions.pdf",
               code="A",
               boundaries={"Physics":(1,45),"Chemistry":(46,90),"Biology":(91,180)},
               total_q=180),
    2018: dict(family="AK",
               pdf="Question Paper Solutions and Answer Keys for NEET 2018 - Code - WW.pdf",
               code="WW",
               boundaries={"Physics":(1,45),"Chemistry":(46,90),"Biology":(91,180)},
               total_q=180),
    2019: dict(family="A",
               pdf="NEET-2019 (Code-R1)_Solutions.pdf",
               code="R1",
               boundaries={"Biology":(1,90),"Physics":(91,135),"Chemistry":(136,180)},
               total_q=180),
    2020: dict(family="B",
               pdf="2020-NEET-Phase-I_G5.pdf",
               code="G5",
               subjects_order=["Physics","Chemistry","Biology"],
               q_per_subject={"Physics":45,"Chemistry":45,"Biology":90}),
    2021: dict(family="C",
               pdf="2021-question-paper.pdf",
               key_pdf="2021-answer-key.pdf",
               code="M4",
               total_q=200),
    2024: dict(family="D",
               pdf="NEET - PYQ - 2024.pdf",
               code="T3",
               answer_page_0idx=27,
               total_q=200),
    2025: dict(family="D",
               pdf="NEET - PYQ - 2025.pdf",
               code="45",
               answer_page_0idx=25,
               total_q=180),
}

# ── keyword classifiers ───────────────────────────────────────────────────────
PHYSICS_KW = [
    (["dimension","significant figure","unit of","least count"],"Units and Measurements"),
    (["projectile","vector","relative velocity","kinematics","displacement time","velocity time"],"Motion in a Plane"),
    (["friction","inclin","normal force","block of mass","atwood","tension in string","newton second"],"Laws of Motion"),
    (["work done","kinetic energy","collision","power","potential energy","conservative force"],"Work Energy and Power"),
    (["torque","moment of inertia","angular momentum","rotational","centre of mass","flywheel","radius of gyration"],"System of Particles and Rotational Motion"),
    (["satellite","orbit","gravitation","escape velocity","kepler","geostationary","gravitational potential"],"Gravitation"),
    (["young's modulus","elastic","stress","strain","bulk modulus","compressibility"],"Mechanical Properties of Solids"),
    (["capillary","viscosity","bernoulli","surface tension","fluid","poiseuille","stokes","reynolds"],"Mechanical Properties of Fluids"),
    (["expansion","calorimetr","thermal","specific heat","conduction","convection","stefan","newton cooling","black body"],"Thermal Properties of Matter"),
    (["carnot","refrigerator","adiabatic","isothermal","thermodynamic","heat engine","efficiency","entropy","internal energy"],"Thermodynamics"),
    (["speed of sound","mean free path","kinetic theory","degrees of freedom","rms speed","ideal gas law","moles of gas","maxwell distribution"],"Kinetic Theory"),
    (["simple harmonic","oscillat","pendulum","spring constant","time period","restoring force"],"Oscillations"),
    (["resonant","string","doppler","standing wave","beat frequency","longitudinal wave","transverse wave","sound wave"],"Waves"),
    (["capacitor","electric field","potential","coulomb","gauss","electric dipole","dielectric","equipotential"],"Electrostatic Potential and Capacitance"),
    (["potentiometer","ammeter","resistance","current","conductivity","wheatstone","kirchhoff","ohm","drift velocity","meter bridge"],"Current Electricity"),
    (["magnetic field","moving charge","cyclotron","solenoid","lorentz force","biot savart","ampere","toroid"],"Moving Charges and Magnetism"),
    (["induced emf","inductance","magnetic flux","faraday","lenz","eddy current","mutual inductance","self inductance"],"Electromagnetic Induction"),
    (["alternating current","reactance","rms value","a.c circuit","impedance","resonance","lcr","wattless current","power factor"],"Alternating Current"),
    (["electromagnetic wave","em wave","spectrum","maxwell equation"],"Electromagnetic Waves"),
    (["telescope","microscope","lens","prism","mirror","refraction","focal length","magnification","total internal reflection","refractive index"],"Ray Optics and Optical Instruments"),
    (["diffraction","interference","double slit","polarisation","coherent","fringe width","wavelength of light"],"Wave Optics"),
    (["photoelectric","de broglie","work function","photon","matter wave","compton effect"],"Dual Nature of Radiation and Matter"),
    (["bohr model","hydrogen spectrum","lyman","balmer","paschen","energy level","ionization energy of hydrogen"],"Atoms"),
    (["nucleus","radioactive","decay","binding energy","half life","alpha particle","beta particle","nuclear reaction"],"Nuclei"),
    (["diode","transistor","semiconductor","amplifier","logic gate","npn","pnp","zener","p-n junction","rectifier"],"Semiconductor Electronics"),
]
CHEMISTRY_KW = [
    (["mole concept","avogadro","stoichiometr","empirical formula","molarity","molality","normality","limiting reagent"],"Some Basic Concepts of Chemistry"),
    (["orbital","quantum number","electronic configuration","aufbau","pauli","hund","wave function","atomic radius"],"Structure of Atom"),
    (["periodic table","electronegativ","ionization energy","electron gain enthalpy","isoelectronic","periodicity"],"Classification of Elements and Periodicity"),
    (["hybridisation","bond order","vsepr","dipole moment","isostructural","lone pair","sigma bond","pi bond","resonance structure","formal charge"],"Chemical Bonding and Molecular Structure"),
    (["ideal gas","real gas","van der waals","critical temperature","liquefaction","boyle","charles","effusion of gas","compressibility factor"],"States of Matter"),
    (["buffer solution","equilibrium constant","ph of","le chatelier","ksp","solubility product","hydrolysis","degree of dissociation","common ion"],"Equilibrium"),
    (["oxidation number","oxidation state","redox reaction","kmno4","oxidising agent","reducing agent","disproportionation"],"Redox Reactions"),
    (["s-block","alkali metal","alkaline earth metal","sodium","potassium","beryllium","magnesium","diagonal relationship"],"The s-Block Elements"),
    (["p-block element","oxoacid","interhalogen","noble gas","allotrope","phosphorus","sulphur","chlorine","silicon","boron","nitrogen oxide","ozone"],"The p-Block Elements"),
    (["d-block","f-block","lanthanide","transition element","actinide","dichromate","permanganate","variable oxidation"],"The d- and f-Block Elements"),
    (["coordination compound","ligand","complex ion","ethylenediamine","edta","crystal field","chelate","isomerism of complex","cfse","ean rule"],"Coordination Compounds"),
    (["solid state","bcc","fcc","unit cell","packing","crystal system","schottky defect","frenkel defect","interstitial","doping of semiconductor"],"The Solid State"),
    (["mole fraction","raoult law","colligative properties","osmotic pressure","vapour pressure","depression of freezing","elevation of boiling","van't hoff factor"],"Solutions"),
    (["electrochemistry","electrode potential","nernst equation","galvanic cell","corrosion","electrolytic cell","faraday law","cell reaction"],"Electrochemistry"),
    (["rate constant","order of reaction","chemical kinetics","activation energy","arrhenius equation","half life of reaction","molecularity","rate law"],"Chemical Kinetics"),
    (["haloalkane","haloarene","sn1","sn2","alkyl halide","nucleophilic substitution","elimination reaction","grignard reagent"],"Haloalkanes and Haloarenes"),
    (["phenol","alcohol","ether","reimer tiemann","lucas test","iodoform test","dehydration of alcohol","oxidation of alcohol"],"Alcohols Phenols and Ethers"),
    (["aldehyde","ketone","carboxylic acid","carbonyl","aldol condensation","cannizzaro","beckmann rearrangement","clemmensen","amide formation"],"Aldehydes Ketones and Carboxylic Acids"),
    (["amine","diazonium","aniline","azo dye","coupling reaction","gabriel synthesis","basicity of amine"],"Amines"),
    (["nucleophile","electrophile","structural isomer","hyperconjugation","carbocation","carbanion","inductive effect","mesomeric effect","acidity of organic","organic reagent"],"Organic Chemistry - Some Basic Principles and Techniques"),
    (["alkene","alkyne","benzene","markovnikov","hydrocarbon","ozonolysis","hydrogenation","aromatic","friedel crafts"],"Hydrocarbons"),
    (["polymer","nylon","teflon","natural rubber","caprolactam","monomer","dacron","bakelite","condensation polymer","addition polymer"],"Polymers"),
    (["enzyme","carbohydrate","protein","vitamin","nucleic acid","reducing sugar","glycoside","peptide bond","dna base"],"Biomolecules"),
    (["enthalpy","entropy","gibbs energy","heat of combustion","hess law","lattice energy","bond enthalpy","standard enthalpy"],"Thermodynamics"),
    (["surface chemistry","adsorption","colloid","emulsion","tyndall effect","coagulation","peptization","micelle","lyophilic","lyophobic"],"Surface Chemistry"),
    (["metallurgy","ore","smelting","roasting","froth flotation","electrorefining","extraction of metal"],"General Principles and Processes of Isolation of Elements"),
    (["environmental chemistry","pollution","ozone layer","smog","eutrophication","bod","acid rain","greenhouse effect"],"Environmental Chemistry"),
    (["drug","analgesic","antiseptic","antibiotic","antacid","tranquiliser","sulpha drug","antifertility"],"Chemistry in Everyday Life"),
]
BIOLOGY_KW = [
    (["five kingdom","monera","protista","bacteria","fungi","lichen","virus","viroid","prion","cyanobacteria"],"Biological Classification"),
    (["algae","bryophyte","pteridophyte","gymnosperm","plant kingdom","moss","fern","hepaticae","thallophyta"],"Plant Kingdom"),
    (["phylum","porifera","coelenterate","arthropod","chordata","annelida","mollusca","echinodermata","nematode","platyhelminthes"],"Animal Kingdom"),
    (["placentation","inflorescence","cotyledon","morphology","flower structure","raceme","cyathium","calyx","petal","stipule","venation"],"Morphology of Flowering Plants"),
    (["meristem","vascular bundle","secondary growth","dicot stem","anatomy of plant","endodermis","pericycle","xylem tissue"],"Anatomy of Flowering Plants"),
    (["cockroach","earthworm","frog","haemolymph","malpighian tubule","periplaneta"],"Structural Organisation in Animals"),
    (["organelle","mitochondria","ribosome","prokaryote","cell wall","thylakoid","golgi body","lysosome","centriole","centrosome","endoplasmic reticulum"],"Cell: The Unit of Life"),
    (["phosphodiester bond","amino acid structure","polysaccharide","biomolecule","monosaccharide","disaccharide","glycogen","starch","cellulose"],"Biomolecules"),
    (["meiosis","mitosis","cell cycle","chiasmata","crossing over","synapsis","bivalent","spindle formation","karyokinesis"],"Cell Cycle and Cell Division"),
    (["transpiration","root pressure","xylem transport","ascent of sap","guttation","plasmolysis","water potential","turgor pressure"],"Transport in Plants"),
    (["nitrogen fixation","mineral nutrition","leghaemoglobin","essential element","nutrient deficiency","rhizobium","nitrification"],"Mineral Nutrition"),
    (["photosynthesis","calvin cycle","light reaction","photolysis of water","stroma","noncyclic photophosphorylation","rubisco","c3 plant","c4 plant","cam plant"],"Photosynthesis in Higher Plants"),
    (["respiration","glycolysis","krebs cycle","respiratory quotient","fermentation","oxidative phosphorylation","pyruvate","acetyl coa"],"Respiration in Plants"),
    (["auxin","gibberellin","plant growth","coleoptile","phytochrome","abscisic acid","vernalization","photoperiodism","apical dominance","ethylene"],"Plant Growth and Development"),
    (["digestion","succus entericus","dentition","salivary amylase","bile salt","pancreatic juice","small intestine","villi","absorption of food"],"Digestion and Absorption"),
    (["alveoli","breathing","emphysema","respiratory","tidal volume","residual volume","surfactant","co2 transport","oxyhemoglobin","chloride shift"],"Breathing and Exchange of Gases"),
    (["heart","blood","cardiac cycle","lymph","plasma","erythrocyte","leucocyte","platelet","coagulation","double circulation","systole","diastole"],"Body Fluids and Circulation"),
    (["nephron","urine","excretion","kidney","loop of henle","bowman capsule","glomerular filtration","juxta","osmoregulation","antidiuretic hormone"],"Excretory Products and their Elimination"),
    (["muscle","joint","skeletal","bone","locomotion","myosin","actin","sarcomere","troponin","sliding filament","osteoporosis"],"Locomotion and Movement"),
    (["neuron","fovea","spinal cord","reflex arc","brain","synapse","resting potential","action potential","cochlea","retina","thalamus","cerebellum"],"Neural Control and Coordination"),
    (["hormone","pituitary","thyroid","insulin","adrenal","testosterone","estrogen","progesterone","feedback mechanism","gonadotropin","parathyroid","calcitonin"],"Chemical Coordination and Integration"),
    (["gametophyte","endosperm","pollen grain","embryo sac","synergid","double fertilization","megasporangium","microsporangium","tapetum","apomixis"],"Sexual Reproduction in Flowering Plants"),
    (["ovulation","menstrual cycle","graafian follicle","spermatogenesis","oogenesis","placenta","corpus luteum","fertilization","implantation","parturition"],"Human Reproduction"),
    (["ectopic pregnancy","gift","contraceptive","ivf","iud","mtp","stds","amniocentesis","reproductive health","infertility"],"Reproductive Health"),
    (["linkage","codominance","pleiotropic","mendel","pedigree analysis","inheritance","colour blindness","haemophilia","phenotype","genotype","dihybrid cross","monohybrid cross"],"Principles of Inheritance and Variation"),
    (["dna","rna","chargaff rule","satellite dna","genetic material","transcription","translation","replication","hnrna","trna","codon","lac operon","trp operon"],"Molecular Basis of Inheritance"),
    (["evolution","natural selection","homologous","analogous","industrial melanism","darwin","hardy weinberg equilibrium","mutation","speciation","fossil record"],"Evolution"),
    (["antibody","immune response","protozoan","infectious disease","cancer","drug addiction","aids","typhoid","malaria","amoebiasis","ascariasis","widal test"],"Human Health and Disease"),
    (["outbreeding","animal husbandry","apiculture","aquaculture","food production","inbreeding depression","hybridization","mutation breeding"],"Strategies for Enhancement in Food Production"),
    (["microbe","biogas","antibiotic","fermentation","sewage treatment","biocontrol agent","biofertilizer","mycorrhiza","activated sludge"],"Microbes in Human Welfare"),
    (["vector","restriction enzyme","cloning","pcr","t-dna","agrobacterium","plasmid","gel electrophoresis","restriction site","recombinant dna","blotting","probe"],"Biotechnology - Principles and Processes"),
    (["golden rice","bt cotton","gene therapy","transgenic","gmo","rnai","insulin production","pharming","biopiracy","biosafety"],"Biotechnology and its Applications"),
    (["niche","population","community","biotic interaction","succession","carrying capacity","interspecific","intraspecific","natality","mortality"],"Organisms and Populations"),
    (["trophic level","ecosystem","food chain","productivity","nutrient cycle","detritus","decomposition","biomagnification","energy flow"],"Ecosystem"),
    (["endemic","biodiversity","endangered","hotspot","conservation","red list","iucn","cites","biosphere reserve","in situ","ex situ"],"Biodiversity and Conservation"),
    (["acid rain","eutrophication","pollution","ozone depletion","greenhouse gas","global warming","afforestation","deforestation","sewage disposal"],"Environmental Issues"),
]
SUBJECT_KW = {"Physics": PHYSICS_KW, "Chemistry": CHEMISTRY_KW, "Biology": BIOLOGY_KW}

FIGURE_HINTS = ["figure","shown in","as shown","diagram","graph","circuit",
                "following structure","structure of the","in the figure",
                "figure given below","diagram given below","graph given below",
                "circuit given below","shown below","figure below"]
ANS_LETTER   = {"1":"A","2":"B","3":"C","4":"D"}

# Answer patterns (Sol.(k) or Answer(k), with possible multi-answer "1 & 4")
ANSWER_PAT_INLINE = re.compile(r'(?:Sol\.|Answer)\s*\(([1-4])[^)]*\)', re.I)
# Q# at start of line; period optional (handles "51\n" format)
QNUM_PAT = re.compile(r'(?:^|\n)\s*(\d{1,3})\.?\s', re.MULTILINE)

# ── helpers ───────────────────────────────────────────────────────────────────

def normalize(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode()
    s = re.sub(r"[^a-z0-9 ]"," ",s.lower())
    return re.sub(r"\s+"," ",s).strip()

def clean(s):
    return re.sub(r"\s+"," ",(s or "")).replace("\n"," ").strip()

def classify(text):
    h = text.lower()
    best = (0, None, "Unclassified")
    for subj, kws_list in SUBJECT_KW.items():
        for kws, chapter in kws_list:
            score = sum(1 for k in kws if k in h)
            if score > best[0]:
                best = (score, subj, chapter)
    return best

def has_figure(text):
    t = text.lower()
    return any(h in t for h in FIGURE_HINTS)

def split_options(block):
    """
    Returns (stem, [A,B,C,D]) from the LAST complete ascending (1)…(4) run.
    Returns (block, None) on failure.
    """
    i1s = [m.start() for m in re.finditer(r'\(1\)',block)]
    i2s = [m.start() for m in re.finditer(r'\(2\)',block)]
    i3s = [m.start() for m in re.finditer(r'\(3\)',block)]
    i4s = [m.start() for m in re.finditer(r'\(4\)',block)]
    if not (i1s and i2s and i3s and i4s):
        return block, None
    best = None
    for i1 in reversed(i1s):
        i2l = [x for x in i2s if x>i1]
        if not i2l: continue
        i2 = i2l[0]
        i3l = [x for x in i3s if x>i2]
        if not i3l: continue
        i3 = i3l[0]
        i4l = [x for x in i4s if x>i3]
        if not i4l: continue
        best = (i1,i2,i3,i4l[0]); break
    if not best:
        return block, None
    i1,i2,i3,i4 = best
    stem = block[:i1]
    d_raw = block[i4+3:]
    trim = re.search(r'(?:Sol\.|Answer)\s*\(', d_raw, re.I)
    if trim: d_raw = d_raw[:trim.start()]
    opts = [clean(block[i1+3:i2]),clean(block[i2+3:i3]),
            clean(block[i3+3:i4]),clean(d_raw)]
    for o in opts:
        if not (1 <= len(o) <= 400):
            return block, None
    return stem, opts

def subj_boundary(n, boundaries):
    for s,(lo,hi) in boundaries.items():
        if lo <= n <= hi: return s
    return None

# ── CSV helpers ────────────────────────────────────────────────────────────────

CLEAN_H  = ["subject","chapter","concept","difficulty","par_time_sec","par_seconds",
            "question_text","option_a","option_b","option_c","option_d","correct_option","year","q_no"]
REVIEW_H = CLEAN_H + ["review_status","reason"]
DEDUP_H  = ["year","q_no","subject","existing_id","existing_year","match_basis","decision"]

def row(subject,chapter,par,stem,opts,ans,year,n,par_s=None):
    return {"subject":subject,"chapter":chapter,"concept":chapter,"difficulty":"",
            "par_time_sec":par,"par_seconds":par_s or "",
            "question_text":clean(stem),"option_a":opts[0],"option_b":opts[1],
            "option_c":opts[2],"option_d":opts[3],"correct_option":ans,"year":year,"q_no":n}

def rev(base,status,reason):
    r = dict(base); r["review_status"]=status; r["reason"]=reason; return r

def no_answer_row(n,subject,ans_letter,year,reason):
    return {"subject":subject or "","chapter":"","concept":"","difficulty":"",
            "par_time_sec":90,"par_seconds":"","question_text":"",
            "option_a":"","option_b":"","option_c":"","option_d":"",
            "correct_option":ans_letter or "","year":year,"q_no":n,
            "review_status":"unusable_no_answer","reason":reason}

def write_csv(path,rows,header):
    with open(path,"w",newline="",encoding="utf-8") as f:
        w = csv.DictWriter(f,fieldnames=header,extrasaction="ignore")
        w.writeheader(); w.writerows(rows)

# ── question processor ────────────────────────────────────────────────────────

def process_q(n, block, subject, ans, year, par_s=None):
    """Returns ('clean'|'review', row_dict)."""
    stem, opts = split_options(block)
    if opts is None:
        base = {"subject":subject,"chapter":"","concept":"","difficulty":"",
                "par_time_sec":90,"par_seconds":"","question_text":clean(stem)[:200],
                "option_a":"","option_b":"","option_c":"","option_d":"",
                "correct_option":ans,"year":year,"q_no":n}
        return "review", rev(base,"unusable_parse_fail","could not split 4 options")
    txt = clean(stem)+" "+" ".join(opts)
    score, cls_subj, chapter = classify(txt)
    par = par_s if par_s else (90 if subject=="Biology" else 60)
    if has_figure(txt):
        return "review", rev(row(subject,chapter,par,stem,opts,ans,year,n,par_s),
                              "fixable_figure","figure_hint keyword detected")
    if chapter == "Unclassified":
        return "review", rev(row(subject,"Unclassified",par,stem,opts,ans,year,n,par_s),
                              "fixable_low_conf","chapter=Unclassified (score=0)")
    if score == 1:
        return "review", rev(row(subject,chapter,par,stem,opts,ans,year,n,par_s),
                              "fixable_low_conf",f"score=1 (single keyword, chapter={chapter})")
    if cls_subj and cls_subj != subject and score >= 2:
        return "review", rev(row(subject,chapter,par,stem,opts,ans,year,n,par_s),
                              "fixable_low_conf",
                              f"boundary={subject} classifier={cls_subj}(s={score})")
    return "clean", row(subject,chapter,par,stem,opts,ans,year,n,par_s)

# ── dedup ─────────────────────────────────────────────────────────────────────

_DDI = None

def load_dedup():
    global _DDI
    if _DDI is not None: return
    _DDI = {}
    if "--skip-dedup" in sys.argv:
        print("  [dedup] skipped"); return
    try:
        env = dict(m.groups() for m in
                   (re.match(r'^([A-Z0-9_]+)=(.*)$', l)
                    for l in (ROOT/".env.local").read_text(encoding="utf-8").splitlines()) if m)
        import importlib
        sb = importlib.import_module("supabase").create_client(
            env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    except Exception as e:
        print(f"  [dedup] no DB ({e})"); return
    data = []
    for s in range(0,2000,1000):
        res = sb.table("questions").select("id,body,year").is_("centre_id","null")\
                .eq("source","pyq").eq("language","en").range(s,s+999).execute()
        data.extend(res.data or [])
        if len(res.data or []) < 1000: break
    for r in data:
        b = r.get("body") or ""
        k = normalize(b)[:80]
        _DDI.setdefault(k,[]).append({"id":r["id"],"year":r.get("year"),"nfull":normalize(b)})
    print(f"  [dedup] loaded {len(data)} existing Q")

def chk_dedup(stem, opts, year, n, subject):
    if not _DDI: return None
    full = stem+" "+" ".join(opts)
    k = normalize(stem)[:80]
    nf = normalize(full)
    for c in _DDI.get(k,[]):
        if c["nfull"] == nf:
            return {"year":year,"q_no":n,"subject":subject,
                    "existing_id":c["id"],"existing_year":c["year"],
                    "match_basis":"full_body_options","decision":"DROP"}
    return None

# ── Q# extraction helpers ─────────────────────────────────────────────────────

def bounded_candidates(full, max_q):
    """
    Find (n, q_txt_start, q_body_start, ans_letter) where Answer(k) appears
    BEFORE the next Q# occurrence.  This excludes instruction-numbered preambles
    whose blocks are too short to contain Answer(k).
    """
    all_pos = [(int(m.group(1)), m.start(), m.end())
               for m in QNUM_PAT.finditer(full)
               if 1 <= int(m.group(1)) <= max_q]
    out = []
    for i,(n,qs,qe) in enumerate(all_pos):
        nxt = all_pos[i+1][1] if i+1 < len(all_pos) else len(full)
        ans = ANSWER_PAT_INLINE.search(full[qe:nxt])
        if ans:
            out.append((n, qs, qe, ANS_LETTER[ans.group(1)]))
    return out

def longest_run_from_candidates(cands):
    """Return the longest monotonic run starting at n=1."""
    best = []
    for i,(n,qs,qe,a) in enumerate(cands):
        if n != 1: continue
        run = [(n,qs,qe,a)]; last = 1
        for j in range(i+1,len(cands)):
            nj,qsj,qej,aj = cands[j]
            if nj == last+1:
                run.append((nj,qsj,qej,aj)); last = nj
        if len(run) > len(best): best = run
    return best

def longest_run_no_answer(full, max_q, min_run=30, require_options=False):
    """
    Find Q# text positions using longest monotonic run WITHOUT Answer requirement.
    For papers where answers are in a separate file/page.
    Returns {q_no: (q_txt_start, q_body_start)}.

    If require_options=True, among all runs of sufficient length prefer the run
    whose Q1 block contains all four option markers (1)(2)(3)(4) — used for 2021
    to skip the instruction-preamble run (items 1-15 share the same numbering but
    those blocks contain plain text, not MCQ options).
    """
    all_pos = [(int(m.group(1)), m.start(), m.end())
               for m in QNUM_PAT.finditer(full)
               if 1 <= int(m.group(1)) <= max_q]

    valid_runs = []
    for i,(n,qs,qe) in enumerate(all_pos):
        if n != 1: continue
        run = [(n,qs,qe)]; last = 1
        for j in range(i+1,len(all_pos)):
            nj,qsj,qej = all_pos[j]
            if nj == last+1:
                run.append((nj,qsj,qej)); last = nj
        if len(run) >= min_run:
            valid_runs.append(run)

    if not valid_runs:
        return {}

    if not require_options:
        best = max(valid_runs, key=len)
        return {n:(qs,qe) for n,qs,qe in best}

    def q1_has_options(run):
        _, qs0, qe0 = run[0]
        nxt = run[1][1] if len(run) > 1 else len(full)
        block = full[qe0:nxt]
        return all(f'({k})' in block for k in ['1','2','3','4'])

    runs_with_opts = [r for r in valid_runs if q1_has_options(r)]
    best = max(runs_with_opts, key=len) if runs_with_opts else max(valid_runs, key=len)
    return {n:(qs,qe) for n,qs,qe in best}


def build_amap_ordered(sub_full, max_q, lookahead=2):
    """
    Ordered answer assignment for interleaved-solution PDFs (Family A).

    Phase 1: strict bounded_candidates — same as the old second pass.
             Correct for Q#s whose answer appears before the next Q# start.
    Phase 2: for Q#s not found in Phase 1, find their text position between
             the strictly-found neighbours (prev < qs_n < next), then assign
             the first unused Answer(k) in a window extending `lookahead` Q#s
             past Q#n's start.  This recovers answers that appear AFTER the
             next Q#'s stem (interleaved-solution format).

    Returns (amap, missing_reasons).
    amap:            {n: (q_txt_start, q_body_start, ans_letter)}
    missing_reasons: {n: reason_str} for every Q# not placed in amap
    """
    # ── Phase 1: strict bounded ───────────────────────────────────────────────
    amap = {}
    for n, qs, qe, a in bounded_candidates(sub_full, max_q):
        if n not in amap:
            amap[n] = (qs, qe, a)

    missing = sorted(n for n in range(1, max_q + 1) if n not in amap)
    if not missing:
        return amap, {}

    # ── Phase 2 setup ─────────────────────────────────────────────────────────
    # All QNUM_PAT positions grouped by Q#
    pos_by_qnum = {}
    for m in QNUM_PAT.finditer(sub_full):
        n = int(m.group(1))
        if 1 <= n <= max_q:
            pos_by_qnum.setdefault(n, []).append((m.start(), m.end()))

    # All Answer(k) positions
    all_ans = [(m.start(), ANS_LETTER[m.group(1)])
               for m in ANSWER_PAT_INLINE.finditer(sub_full)]

    # Mark answers already consumed in Phase 1 by re-running the bounded scan
    all_pos_scan = [(int(m.group(1)), m.start(), m.end())
                    for m in QNUM_PAT.finditer(sub_full)
                    if 1 <= int(m.group(1)) <= max_q]
    used_pos = set()
    for i, (n, qs_s, qe_s) in enumerate(all_pos_scan):
        if n not in amap or amap[n][0] != qs_s:
            continue
        nxt = all_pos_scan[i + 1][1] if i + 1 < len(all_pos_scan) else len(sub_full)
        m_ans = ANSWER_PAT_INLINE.search(sub_full[qe_s:nxt])
        if m_ans:
            used_pos.add(qe_s + m_ans.start())
    ans_used = [apos in used_pos for apos, _ in all_ans]

    # ── Phase 2: lookahead for missing Q#s ────────────────────────────────────
    missing_reasons = {}

    for n in missing:
        if n not in pos_by_qnum:
            missing_reasons[n] = "Q# not found in PDF text (structural/OCR gap)"
            continue

        # Positional bounds from adjacent strictly-found (or Phase-2-found) Q#s
        prev_pos = max((amap[k][0] for k in amap if k < n), default=0)
        next_pos = min((amap[k][0] for k in amap if k > n), default=len(sub_full))

        # Pick the earliest occurrence of Q#n that sits between its neighbours
        candidates = [(qs, qe) for qs, qe in pos_by_qnum[n]
                      if prev_pos < qs < next_pos]
        if not candidates:
            missing_reasons[n] = "Q# not found between adjacent questions in text"
            continue

        qs, qe = candidates[0]

        # Window end: start of Q_{n+lookahead+1} (using amap, which grows as we go)
        win_qnum = n + lookahead + 1
        window_end = amap[win_qnum][0] if win_qnum in amap else len(sub_full)

        found = False
        for j, (apos, aletter) in enumerate(all_ans):
            if ans_used[j]:
                continue
            if apos < qs:
                continue
            if apos >= window_end:
                break
            amap[n] = (qs, qe, aletter)
            ans_used[j] = True
            found = True
            break

        if not found:
            missing_reasons[n] = f"no Answer marker found within {lookahead}-Q# window"

    return amap, missing_reasons

def emit(n, block, subject, ans, year, par_s,
         clean_rows, review_rows, dedup_rows):
    """Process one question block and route to the right output list."""
    kind, r = process_q(n, block, subject, ans, year, par_s)
    if kind == "clean":
        dd = chk_dedup(r["question_text"],
                       [r["option_a"],r["option_b"],r["option_c"],r["option_d"]],
                       year, n, subject)
        if dd: dedup_rows.append(dd); return
    if kind == "clean":
        clean_rows.append(r)
    else:
        review_rows.append(r)

def scan_amap(full, amap, total_q, subject_fn, year,
              clean_rows, review_rows, dedup_rows, par_fn=None,
              missing_reason=None):
    """
    Iterate sorted amap entries, build blocks, call emit.
    Also marks missing Q#s as unusable_no_answer.
    amap: {q_no: (q_txt_start, q_body_start, ans_letter)}
    missing_reason: optional dict {q_no: reason} for Q#s not in amap;
                    defaults to "no text in PDF (image/OCR gap)"
    """
    sorted_items = sorted(amap.items())
    qs_list = [(qn,v[0],v[1],v[2]) for qn,v in sorted_items]

    for i,(n,qt,qb,ans) in enumerate(qs_list):
        subject = subject_fn(n)
        if not subject: continue
        nxt = qs_list[i+1][1] if i+1<len(qs_list) else len(full)
        raw = full[qb:nxt]
        trim = ANSWER_PAT_INLINE.search(raw)
        block = raw[:trim.start()] if trim else raw
        par_s = par_fn(n) if par_fn else None
        emit(n, block, subject, ans, year, par_s,
             clean_rows, review_rows, dedup_rows)

    found = set(amap.keys())
    for n in range(1, total_q+1):
        if n in found: continue
        s = subject_fn(n)
        if s:
            reason = (missing_reason or {}).get(n, "no text in PDF (image/OCR gap)")
            review_rows.append(no_answer_row(n, s, "", year, reason))

# ── FAMILY A: inline Answer(n) — 2017, 2018, 2019 ────────────────────────────

def extract_a(year, cfg):
    doc = fitz.open(str(PDF_DIR / cfg["pdf"]))
    full = "".join(doc[pi].get_text() for pi in range(len(doc)))
    doc.close()
    total_q = cfg["total_q"]
    bdry = cfg["boundaries"]

    # Bounded candidates: Answer(k) must appear BEFORE the next Q# occurrence.
    # This excludes instruction Q#s whose blocks are too short for Answer(k).
    cands = bounded_candidates(full, total_q)
    run   = longest_run_from_candidates(cands)
    if not run:
        print(f"  [{year}] ERROR: no valid run found"); return [],[],[]

    real_start = run[0][1]
    # Second pass: ordered assignment with lookahead recovers interleaved answers
    amap_rel, missing_reasons = build_amap_ordered(full[real_start:], total_q, lookahead=2)

    # Convert relative positions to absolute
    amap = {n: (real_start + v[0], real_start + v[1], v[2])
            for n, v in amap_rel.items()}

    n_structural = sum(1 for r in missing_reasons.values() if "structural" in r)
    n_spurious   = sum(1 for r in missing_reasons.values() if "spurious" in r)
    n_no_ans     = sum(1 for r in missing_reasons.values() if "no Answer" in r)
    print(f"  [{year}] Found {len(amap)}/{total_q} Q#s "
          f"(structural-gap={n_structural}, spurious={n_spurious}, no-ans-window={n_no_ans})")

    clean_rows, review_rows, dedup_rows = [], [], []
    scan_amap(full, amap, total_q,
              subject_fn=lambda n: subj_boundary(n, bdry),
              year=year,
              clean_rows=clean_rows, review_rows=review_rows, dedup_rows=dedup_rows,
              missing_reason=missing_reasons)
    return clean_rows, review_rows, dedup_rows


# ── FAMILY AK: positional answer key — 2017, 2018 ────────────────────────────

def extract_a_key(year, cfg):
    """
    Like Family A but answers come from POSITIONAL PAIRING of Answer(k) markers,
    not from the inline bounded search.

    In the Vedantu solutions PDFs for 2017/2018, answers are interleaved: Q#n's
    answer appears in Q#(n+1)'s block.  The inline bounded approach assigned those
    answers to the wrong Q#.  Positional pairing (nth marker = Q#n's answer) is
    unambiguous because the solution writer solved Q1, Q2, … in order.

    Text positions still come from build_amap_ordered (Phase 1 strict + Phase 2
    between-strict-neighbors), so the question text is extracted correctly.
    """
    doc = fitz.open(str(PDF_DIR / cfg["pdf"]))
    full = "".join(doc[pi].get_text() for pi in range(len(doc)))
    doc.close()
    total_q = cfg["total_q"]
    bdry = cfg["boundaries"]

    # ── Positional answer key ──────────────────────────────────────────────────
    all_ans_pos = [(m.start(), ANS_LETTER[m.group(1)])
                   for m in ANSWER_PAT_INLINE.finditer(full)]
    n_markers = len(all_ans_pos)
    extras = n_markers - total_q
    positional_key = {n + 1: all_ans_pos[n][1] for n in range(min(n_markers, total_q))}
    print(f"  [{year}] Positional key: {n_markers} Answer markers → {total_q} Q#s "
          f"({'exact' if extras == 0 else f'{extras:+d} extra, first {total_q} used'})")

    # ── Q# text positions ──────────────────────────────────────────────────────
    cands = bounded_candidates(full, total_q)
    run   = longest_run_from_candidates(cands)
    if not run:
        print(f"  [{year}] ERROR: no valid run found"); return [], [], []
    real_start = run[0][1]

    amap_rel, missing_reasons = build_amap_ordered(full[real_start:], total_q, lookahead=2)

    # ── Cross-check inline vs positional ──────────────────────────────────────
    inline_key = {n: a for n, (_, _, a) in amap_rel.items()}
    mismatches = {n for n in inline_key
                  if n in positional_key and inline_key[n] != positional_key[n]}
    between_adj = sum(1 for r in missing_reasons.values()
                      if "between adjacent" in r)
    structural  = sum(1 for r in missing_reasons.values() if "structural" in r)
    print(f"  [{year}] Text positions: {len(amap_rel)}/{total_q} found "
          f"(structural={structural}, between-adj={between_adj})")
    print(f"  [{year}] Inline→positional mismatch: {len(mismatches)} Q#s "
          f"(interleaved answer shift)")
    if mismatches:
        print(f"    Shifted Q#s: {sorted(mismatches)[:30]}")

    # ── Rebuild amap with positional answers ───────────────────────────────────
    amap = {}
    for n, (qs, qe, _) in amap_rel.items():
        if n in positional_key:
            amap[n] = (real_start + qs, real_start + qe, positional_key[n])

    clean_rows, review_rows, dedup_rows = [], [], []
    scan_amap(full, amap, total_q,
              subject_fn=lambda n: subj_boundary(n, bdry),
              year=year,
              clean_rows=clean_rows, review_rows=review_rows, dedup_rows=dedup_rows,
              missing_reason=missing_reasons)
    return clean_rows, review_rows, dedup_rows


# ── FAMILY B: per-subject restart — 2020 ─────────────────────────────────────

def _process_2020_blocks(blocks, q_count, subj, year, clean_rows, review_rows, dedup_rows):
    """
    Process a list of (seq_n, block_text) for one 2020 subject section.
    Within each block, finds answer via ANSWER_PAT_INLINE and question text
    via "N. " pattern (bounded before the Sol. marker).
    """
    found_q = set()
    par_count = 0
    for n, block in blocks:
        if n > q_count: break
        # Extract par_seconds
        par_m = re.search(r'Expected time to solve\s*[:\-–]\s*(\d+)\s*sec', block, re.I)
        par_s = int(par_m.group(1)) if par_m else None
        if par_s: par_count += 1
        # Find answer (Sol.(k) or Answer(k))
        ans_m = ANSWER_PAT_INLINE.search(block)
        if not ans_m:
            review_rows.append(no_answer_row(n, subj, "", year, "no Sol./Answer in block"))
            continue
        ans = ANS_LETTER[ans_m.group(1)]
        # Find question text: look for "N. " or "N\n" AFTER the metadata header
        # and BEFORE the answer marker
        q_m = re.search(r'(?:^|\n)\s*' + str(n) + r'\.\s*', block[:ans_m.start()])
        if q_m:
            q_body = block[q_m.end():ans_m.start()]
        else:
            # Fallback: take everything after last known metadata field before the answer
            cf_m = re.search(r'(?:Concept field|Sub concept|NEET UG):[^\n]*\n',
                             block[:ans_m.start()], re.I)
            q_body = block[cf_m.end():ans_m.start()] if cf_m else block[:ans_m.start()]
        found_q.add(n)
        emit(n, q_body, subj, ans, year, par_s, clean_rows, review_rows, dedup_rows)

    for n in range(1, q_count + 1):
        if n not in found_q:
            review_rows.append(no_answer_row(n, subj, "", year, "Q# block not found"))

    print(f"  [2020/{subj}] {len(found_q)}/{q_count} Q#s, par_s for {par_count}")


def extract_b(year, cfg):
    doc = fitz.open(str(PDF_DIR / cfg["pdf"]))
    full = "".join(doc[pi].get_text() for pi in range(len(doc)))
    doc.close()
    subj_order = cfg["subjects_order"]
    q_per = cfg["q_per_subject"]

    # Find section boundaries by first occurrence of each subject keyword
    sec_starts = {}
    prev_pos = 0
    for subj in subj_order:
        m = re.search(r'(?i)\b' + subj + r'\b', full[prev_pos:])
        if m:
            sec_starts[subj] = prev_pos + m.start()
            prev_pos = sec_starts[subj] + 100

    print(f"  [2020] Section starts: "
          + ", ".join(f"{s}@{p}" for s, p in sec_starts.items()))

    clean_rows, review_rows, dedup_rows = [], [], []

    for si, subj in enumerate(subj_order):
        if subj not in sec_starts:
            print(f"  [2020] WARNING: {subj} section not found"); continue
        sec_s = sec_starts[subj]
        sec_e = sec_starts[subj_order[si+1]] if si+1 < len(subj_order) else len(full)
        sec_text = full[sec_s:sec_e]
        q_count = q_per.get(subj, 45)

        # Physics section uses "Question No. N" as per-question header.
        # Chemistry/Biology sections use "Question Type:" as per-question header.
        qno_hits = re.findall(r'Question No\.', sec_text, re.I)
        qt_hits  = re.findall(r'Question Type:', sec_text, re.I)

        if len(qno_hits) >= q_count // 2:
            # Physics-style: "Question No. N ... Sol.(k)"
            markers = [(int(m.group(1)), m.start())
                       for m in re.finditer(r'Question No\.\s*(\d+)', sec_text, re.I)
                       if 1 <= int(m.group(1)) <= q_count]
            # Sort by position (markers should be in order for this PDF)
            markers.sort(key=lambda x: x[1])
            blocks = []
            for i, (n, pos) in enumerate(markers):
                end = markers[i+1][1] if i+1 < len(markers) else len(sec_text)
                blocks.append((n, sec_text[pos:end]))
        elif len(qt_hits) >= q_count // 2:
            # Chemistry/Biology-style: "Question Type: NEET ... Sol.(k)"
            positions = [m.start() for m in re.finditer(r'Question Type:', sec_text, re.I)]
            blocks = []
            for i, pos in enumerate(positions):
                end = positions[i+1] if i+1 < len(positions) else len(sec_text)
                blocks.append((i + 1, sec_text[pos:end]))
        else:
            print(f"  [2020/{subj}] neither Question No. nor Question Type: found, skipping")
            for n in range(1, q_count + 1):
                review_rows.append(no_answer_row(n, subj, "", year, "section format not recognized"))
            continue

        _process_2020_blocks(blocks, q_count, subj, year, clean_rows, review_rows, dedup_rows)

    return clean_rows, review_rows, dedup_rows


# ── FAMILY C: separate key file — 2021 ───────────────────────────────────────

def extract_c(year, cfg):
    key_doc = fitz.open(str(PDF_DIR / cfg["key_pdf"]))
    key_txt = key_doc[0].get_text(); key_doc.close()
    key = {}
    for m in re.finditer(r'(\d+)\s+([1-4])', key_txt):
        key[int(m.group(1))] = ANS_LETTER[m.group(2)]
    total_q = cfg["total_q"]
    gaps = [n for n in range(1,total_q+1) if n not in key]
    print(f"  [2021] Key: {len(key)}/{total_q}" +
          (f" | gaps: {gaps}" if gaps else ""))

    doc = fitz.open(str(PDF_DIR / cfg["pdf"]))
    full = "".join(doc[pi].get_text() for pi in range(len(doc)))
    doc.close()

    def get_subj(n):
        if 1   <= n <= 50:  return "Physics"
        if 51  <= n <= 100: return "Chemistry"
        if 101 <= n <= total_q: return "Biology"
        return None

    # Use longest Q# run WITHOUT Answer requirement (key is external).
    # require_options=True: skip the instruction-preamble run (items 1-15 are
    # plain text, not MCQs) and select the run whose Q1 block has (1)(2)(3)(4).
    qpos = longest_run_no_answer(full, total_q, min_run=30, require_options=True)
    print(f"  [2021] Q# positions found: {len(qpos)}/{total_q}")

    # Build amap: combine text positions with key answers
    amap = {n: (qpos[n][0], qpos[n][1], key[n])
            for n in qpos if n in key}

    key_gaps = {n: "not in NTA key file" for n in gaps}
    clean_rows, review_rows, dedup_rows = [], [], []
    scan_amap(full, amap, total_q,
              subject_fn=get_subj, year=year,
              clean_rows=clean_rows, review_rows=review_rows, dedup_rows=dedup_rows,
              missing_reason=key_gaps)
    return clean_rows, review_rows, dedup_rows


# ── FAMILY D: compact end-table — 2024, 2025 ─────────────────────────────────

def extract_d(year, cfg):
    doc = fitz.open(str(PDF_DIR / cfg["pdf"]))
    total_q = cfg["total_q"]
    key_txt = doc[cfg["answer_page_0idx"]].get_text()
    key = {}
    for m in re.finditer(r'(\d+)\.\s*\(([1-4])\)', key_txt):
        key[int(m.group(1))] = ANS_LETTER[m.group(2)]
    gaps = [n for n in range(1,total_q+1) if n not in key]
    print(f"  [{year}] Answer table: {len(key)}/{total_q}" +
          (f" | missing: {gaps}" if gaps else ""))

    # Scan only pages BEFORE the answer table
    full = "".join(doc[pi].get_text() for pi in range(cfg["answer_page_0idx"]))
    doc.close()

    def get_subj(n):
        if year == 2025:
            if 1   <= n <= 45:  return "Physics"
            if 46  <= n <= 90:  return "Chemistry"
            if 91  <= n <= 180: return "Biology"
        else:
            if 1   <= n <= 50:  return "Physics"
            if 51  <= n <= 100: return "Chemistry"
            if 101 <= n <= 200: return "Biology"
        return None

    qpos = longest_run_no_answer(full, total_q, min_run=30)
    print(f"  [{year}] Q# positions in paper: {len(qpos)}/{total_q}")

    amap = {n: (qpos[n][0], qpos[n][1], key[n])
            for n in qpos if n in key}

    table_gaps = {n: "not in answer table" for n in gaps}
    clean_rows, review_rows, dedup_rows = [], [], []
    scan_amap(full, amap, total_q,
              subject_fn=get_subj, year=year,
              clean_rows=clean_rows, review_rows=review_rows, dedup_rows=dedup_rows,
              missing_reason=table_gaps)
    return clean_rows, review_rows, dedup_rows


# ── MAIN ──────────────────────────────────────────────────────────────────────

EXTRACTORS = {"A":extract_a,"AK":extract_a_key,"B":extract_b,"C":extract_c,"D":extract_d}

def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)
    single = None
    args = sys.argv[1:]
    for i,a in enumerate(args):
        if a == "--year" and i+1 < len(args): single = int(args[i+1])
        elif a.startswith("--year="): single = int(a.split("=")[1])

    years = [single] if single else sorted(YEAR_CONFIGS)
    load_dedup()

    all_clean, all_review, all_dedup = [], [], []
    summary = []

    for year in years:
        cfg = YEAR_CONFIGS[year]
        print(f"\n{'='*56}\n{year}  family={cfg['family']}  code={cfg['code']}")
        clean_r, review_r, dedup_r = EXTRACTORS[cfg["family"]](year, cfg)

        write_csv(OUT_DIR/f"{year}_clean.csv",  clean_r,  CLEAN_H)
        write_csv(OUT_DIR/f"{year}_review.csv", review_r, REVIEW_H)
        all_clean += clean_r; all_review += review_r; all_dedup += dedup_r

        sc, sr, ss = {}, {}, {}
        for r in clean_r:  sc[r["subject"]] = sc.get(r["subject"],0)+1
        for r in review_r:
            k = r.get("subject",""); sr[k] = sr.get(k,0)+1
            st = r.get("review_status",""); ss[st] = ss.get(st,0)+1
        total = len(clean_r)+len(review_r)
        line = (f"\n{year}: {total} → {len(clean_r)} clean | "
                f"{len(review_r)} review | {len(dedup_r)} dedup-drop")
        summary.append(line); print(line)
        print(f"  Clean:  {sc}"); print(f"  Review: {sr}"); print(f"  Status: {ss}")
        if dedup_r: print(f"  Dedup: {[d['q_no'] for d in dedup_r]}")

        print(f"\n  -- SAMPLE clean (first 3) --")
        for r in clean_r[:3]:
            print(f"  Q{r['q_no']} [{r['subject']}|{r['chapter']}] "
                  f"ans={r['correct_option']} | {r['question_text'][:75]}…")
        print(f"  -- SAMPLE review (2 per status) --")
        shown = {}
        for r in review_r:
            st = r.get("review_status","")
            if shown.get(st,0) < 2:
                shown[st] = shown.get(st,0)+1
                qt = r.get("question_text","")[:55] or "(no text)"
                print(f"  [{st}] Q{r['q_no']} {qt}… | {r.get('reason','')}")

    write_csv(OUT_DIR/"dedup_report.csv", all_dedup, DEDUP_H)

    gc=len(all_clean); gr=len(all_review); gd=len(all_dedup)
    ff = sum(1 for r in all_review if r.get("review_status")=="fixable_figure")
    fl = sum(1 for r in all_review if r.get("review_status")=="fixable_low_conf")
    fu = sum(1 for r in all_review if r.get("review_status","").startswith("unusable"))
    grand = [
        f"\n{'='*56}",
        f"GRAND TOTAL ({len(years)} years):",
        f"  Clean (import-ready):      {gc}",
        f"  Review – fixable_figure:   {ff}   (diagram pass → live)",
        f"  Review – fixable_low_conf: {fl}   (Unclassified or subject conflict)",
        f"  Review – unusable:         {fu}   (no answer / parse fail)",
        f"  Dedup drops:               {gd}",
    ]
    summary += grand; print("\n".join(grand))
    (OUT_DIR/"summary.txt").write_text("\n".join(summary), encoding="utf-8")
    print(f"\nOutput: {OUT_DIR}")

if __name__ == "__main__":
    main()
