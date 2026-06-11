export interface ExtractedEntities {
  score?: number;
  scoreType?: 'MHT-CET' | 'JEE-Main';
  branch?: string;
  quota?: 'CAP' | 'Minority' | 'Institutional' | 'TFWS';
  category?: 'Open' | 'OBC' | 'SC' | 'ST' | 'EWS' | 'EBC';
}

export type Intent =
  | 'CUTOFF'
  | 'FEES'
  | 'DOCUMENTS'
  | 'ELIGIBILITY'
  | 'PROCESS'
  | 'FACILITIES'
  | 'PLACEMENTS'
  | 'SYLLABUS'
  | 'CONTACT'
  | 'GENERAL';

const BRANCH_SYNONYMS: { [key: string]: string } = {
  comp: 'Computer Engineering',
  computer: 'Computer Engineering',
  comps: 'Computer Engineering',
  cse: 'Computer Engineering',
  it: 'Information Technology',
  infotech: 'Information Technology',
  information: 'Information Technology',
  extc: 'Electronics & Telecommunication Engineering',
  telecom: 'Electronics & Telecommunication Engineering',
  telecommunication: 'Electronics & Telecommunication Engineering',
  electronics: 'Electronics & Telecommunication Engineering',
  aids: 'Artificial Intelligence and Data Science',
  ai: 'Artificial Intelligence and Machine Learning',
  aiml: 'Artificial Intelligence and Machine Learning',
  cyber: 'Computer Science and Engineering - Cyber Security',
  security: 'Computer Science and Engineering - Cyber Security',
  cybersecurity: 'Computer Science and Engineering - Cyber Security',
  iot: 'Internet of Things',
  mech: 'Mechanical & Mechatronics Engineering',
  mechanical: 'Mechanical & Mechatronics Engineering',
  mechatronics: 'Mechanical & Mechatronics Engineering',
  civil: 'Civil Engineering',
  ecs: 'Electronics and Computer Science',
  'electronics and computer': 'Electronics and Computer Science',
  'electronics & computer': 'Electronics and Computer Science',
};

// Normalize categories
const CATEGORY_SYNONYMS: { [key: string]: 'Open' | 'OBC' | 'SC' | 'ST' | 'EWS' | 'EBC' } = {
  open: 'Open',
  general: 'Open',
  obc: 'OBC',
  sc: 'SC',
  st: 'ST',
  ews: 'EWS',
  ebc: 'EBC',
};

// Normalize quotas
const QUOTA_SYNONYMS: { [key: string]: 'CAP' | 'Minority' | 'Institutional' | 'TFWS' } = {
  cap: 'CAP',
  centralized: 'CAP',
  minority: 'Minority',
  hindi: 'Minority',
  linguistic: 'Minority',
  institute: 'Institutional',
  institutional: 'Institutional',
  management: 'Institutional',
  tfws: 'TFWS',
  waiver: 'TFWS',
};

/**
 * Clean up spelling mistakes and normalize branches in queries.
 */
function preprocessText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Extracts entities (branch, score, category, quota) from user text.
 */
export function extractEntities(text: string): ExtractedEntities {
  const cleanText = preprocessText(text);
  const entities: ExtractedEntities = {};

  // 1. Extract percentile score
  // Matches "89 percentile", "89%", "89.5 %", "89percentile"
  const scoreRegex = /(\d+(\.\d+)?)\s*(%|percentile|percent|marks)/i;
  const scoreMatch = cleanText.match(scoreRegex);
  if (scoreMatch) {
    const value = parseFloat(scoreMatch[1]);
    if (value >= 0 && value <= 100) {
      entities.score = value;
    }
  }

  // 2. Extract score type (CET vs JEE)
  if (cleanText.includes('cet') || cleanText.includes('mht')) {
    entities.scoreType = 'MHT-CET';
  } else if (cleanText.includes('jee') || cleanText.includes('main') || cleanText.includes('mains')) {
    entities.scoreType = 'JEE-Main';
  } else if (entities.score) {
    // Default to MHT-CET if score exists but no type mentioned
    entities.scoreType = 'MHT-CET';
  }

  // 3. Extract engineering branch
  for (const synonym in BRANCH_SYNONYMS) {
    // Use word boundaries or check simple inclusion
    const regex = new RegExp(`\\b${synonym}\\b`, 'i');
    if (regex.test(cleanText) || cleanText.includes(synonym)) {
      entities.branch = BRANCH_SYNONYMS[synonym];
      break;
    }
  }

  // 4. Extract Category
  for (const synonym in CATEGORY_SYNONYMS) {
    const regex = new RegExp(`\\b${synonym}\\b`, 'i');
    if (regex.test(cleanText)) {
      entities.category = CATEGORY_SYNONYMS[synonym];
      break;
    }
  }

  // 5. Extract Quota
  for (const synonym in QUOTA_SYNONYMS) {
    const regex = new RegExp(`\\b${synonym}\\b`, 'i');
    if (regex.test(cleanText)) {
      entities.quota = QUOTA_SYNONYMS[synonym];
      break;
    }
  }

  return entities;
}

/**
 * Classifies the intent of the user query based on keyword analysis.
 */
export function classifyIntent(text: string): Intent {
  const cleanText = preprocessText(text);

  // Fees & Scholarships
  if (
    cleanText.includes('fee') ||
    cleanText.includes('fees') ||
    cleanText.includes('cost') ||
    cleanText.includes('charge') ||
    cleanText.includes('charges') ||
    cleanText.includes('payment') ||
    cleanText.includes('scholarship') ||
    cleanText.includes('scholarships') ||
    cleanText.includes('concession') ||
    cleanText.includes('waiver') ||
    cleanText.includes('tfws')
  ) {
    return 'FEES';
  }

  // Cutoffs
  if (
    cleanText.includes('cutoff') ||
    cleanText.includes('cutoffs') ||
    cleanText.includes('cut off') ||
    cleanText.includes('percentile') ||
    cleanText.includes('marks') ||
    cleanText.includes('admission score') ||
    cleanText.includes('can i get') ||
    cleanText.includes('will i get') ||
    cleanText.includes('chance') ||
    cleanText.includes('closing rank')
  ) {
    return 'CUTOFF';
  }

  // Documents
  if (
    cleanText.includes('document') ||
    cleanText.includes('documents') ||
    cleanText.includes('cert') ||
    cleanText.includes('certificate') ||
    cleanText.includes('certificates') ||
    cleanText.includes('affidavit') ||
    cleanText.includes('lc') ||
    cleanText.includes('leaving') ||
    cleanText.includes('marksheet') ||
    cleanText.includes('proforma')
  ) {
    return 'DOCUMENTS';
  }

  // Placements
  if (
    cleanText.includes('placement') ||
    cleanText.includes('placements') ||
    cleanText.includes('job') ||
    cleanText.includes('jobs') ||
    cleanText.includes('recruit') ||
    cleanText.includes('recruiter') ||
    cleanText.includes('recruiters') ||
    cleanText.includes('salary') ||
    cleanText.includes('package') ||
    cleanText.includes('lpa')
  ) {
    return 'PLACEMENTS';
  }

  // Facilities
  if (
    cleanText.includes('facility') ||
    cleanText.includes('facilities') ||
    cleanText.includes('hostel') ||
    cleanText.includes('hostels') ||
    cleanText.includes('library') ||
    cleanText.includes('lab') ||
    cleanText.includes('labs') ||
    cleanText.includes('canteen') ||
    cleanText.includes('gym') ||
    cleanText.includes('sports') ||
    cleanText.includes('ground') ||
    cleanText.includes('campus') ||
    cleanText.includes('infrastructure')
  ) {
    return 'FACILITIES';
  }

  // Syllabus & Curriculum
  if (
    cleanText.includes('syllabus') ||
    cleanText.includes('subject') ||
    cleanText.includes('subjects') ||
    cleanText.includes('curriculum') ||
    cleanText.includes('course structure') ||
    cleanText.includes('sem') ||
    cleanText.includes('semester') ||
    cleanText.includes('credits') ||
    cleanText.includes('autonomous')
  ) {
    return 'SYLLABUS';
  }

  // Eligibility
  if (
    cleanText.includes('eligibility') ||
    cleanText.includes('eligible') ||
    cleanText.includes('criteria') ||
    cleanText.includes('requirement') ||
    cleanText.includes('requirements') ||
    cleanText.includes('board marks') ||
    cleanText.includes('hsc percentage')
  ) {
    return 'ELIGIBILITY';
  }

  // Admission Process
  if (
    cleanText.includes('process') ||
    cleanText.includes('procedure') ||
    cleanText.includes('how to apply') ||
    cleanText.includes('steps') ||
    cleanText.includes('cap round') ||
    cleanText.includes('cap rounds') ||
    cleanText.includes('registration') ||
    cleanText.includes('allotment')
  ) {
    return 'PROCESS';
  }

  // Contact
  if (
    cleanText.includes('contact') ||
    cleanText.includes('phone') ||
    cleanText.includes('number') ||
    cleanText.includes('email') ||
    cleanText.includes('address') ||
    cleanText.includes('location') ||
    cleanText.includes('office') ||
    cleanText.includes('admission cell') ||
    cleanText.includes('call')
  ) {
    return 'CONTACT';
  }

  return 'GENERAL';
}
