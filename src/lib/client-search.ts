export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords?: string[] | null;
  source_name: string | null;
  source_url: string | null;
}

// Map synonyms to a canonical root token to resolve varied phrasing (English & Hinglish)
const SYNONYM_MAP: { [key: string]: string } = {
  // Fee variations
  cost: 'fee',
  fees: 'fee',
  price: 'fee',
  charges: 'fee',
  payment: 'fee',
  kharcha: 'fee',
  paisa: 'fee',
  money: 'fee',
  concession: 'scholarship',
  waiver: 'scholarship',
  tfws: 'scholarship',

  // Branch variations
  comp: 'computer_engineering',
  computer: 'computer_engineering',
  comps: 'computer_engineering',
  cse: 'computer_engineering',
  it: 'information_technology',
  infotech: 'information_technology',
  extc: 'electronics_telecom',
  telecom: 'electronics_telecom',
  aids: 'ai_data_science',
  aiml: 'ai_machine_learning',
  cyber: 'cyber_security',

  // Metric & process variations
  cutoff: 'cutoff',
  cutoffs: 'cutoff',
  percentile: 'cutoff',
  marks: 'cutoff',
  score: 'cutoff',
  closing: 'cutoff',
  doc: 'document',
  docs: 'document',
  documents: 'document',
  certificate: 'document',
  certificates: 'document',
  marksheet: 'document',
  hostels: 'hostel',
  stay: 'hostel',
  room: 'hostel',
  accommodation: 'hostel',
  placements: 'placement',
  jobs: 'placement',
  salary: 'placement',
  package: 'placement',
  lpa: 'placement'
};

// Stopwords to filter out for clean topic matching
const STOPWORDS = new Set([
  'what', 'is', 'are', 'the', 'for', 'of', 'in', 'at', 'on', 'a', 'an', 'to', 'and', 'or', 'do',
  'i', 'you', 'he', 'she', 'they', 'we', 'how', 'can', 'get', 'was', 'were', 'about', 'with',
  'by', 'from', 'admission', 'admissions', 'tcet', 'mumbai', 'college', 'engineering',
  'technology', 'thakur', 'kya', 'hai', 'kaise', 'milega', 'kitna', 'konse', 'kis', 'ko',
  'me', 'se', 'tha', 'thi', 'the', 'please', 'details', 'give', 'tell'
]);

/**
 * Strips common English plural/tense suffixes for basic stemming.
 */
function stem(word: string): string {
  if (word.length > 4) {
    if (word.endsWith('ing')) return word.slice(0, -3);
    if (word.endsWith('es')) return word.slice(0, -2);
    if (word.endsWith('s')) return word.slice(0, -1);
  }
  return word;
}

/**
 * Tokenizes text, normalizes synonyms, applies stemming, and filters out stopwords.
 */
export function tokenizeAndNormalize(text: string): string[] {
  const rawWords = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && !STOPWORDS.has(word));

  return rawWords.map((w) => {
    // Check direct synonym map first
    if (SYNONYM_MAP[w]) return SYNONYM_MAP[w];
    // Stem word and re-check synonym map
    const stemmed = stem(w);
    if (SYNONYM_MAP[stemmed]) return SYNONYM_MAP[stemmed];
    return stemmed;
  });
}

/**
 * Computes Jaccard Similarity (Intersection over Union) of normalized token sets.
 */
export function calculateJaccardSimilarity(query: string, target: string): number {
  const qWords = new Set(tokenizeAndNormalize(query));
  const tWords = new Set(tokenizeAndNormalize(target));

  if (qWords.size === 0 || tWords.size === 0) return 0;

  let intersectionCount = 0;
  for (const word of qWords) {
    if (tWords.has(word)) {
      intersectionCount++;
    }
  }

  const unionCount = qWords.size + tWords.size - intersectionCount;
  return intersectionCount / unionCount;
}

/**
 * Computes target keyword coverage ratio.
 */
export function calculateKeywordCoverage(query: string, target: string): number {
  const qWords = new Set(tokenizeAndNormalize(query));
  const tWords = tokenizeAndNormalize(target);

  if (tWords.length === 0) return 0;

  let matchCount = 0;
  for (const word of tWords) {
    if (qWords.has(word)) {
      matchCount++;
    }
  }

  return matchCount / tWords.length;
}

let faqCache: FAQ[] = [];

/**
 * Public function to fetch FAQs from client-side route `/api/faqs`.
 */
export async function fetchFAQs(): Promise<FAQ[]> {
  if (faqCache.length > 0) return faqCache;

  try {
    const response = await fetch('/api/faqs');
    if (!response.ok) throw new Error('Failed to fetch FAQs');
    faqCache = await response.json();
    return faqCache;
  } catch (error) {
    console.error('[Client Search] Error loading FAQs:', error);
    return [];
  }
}

/**
 * Matches a user query against the FAQ list.
 * Evaluates similarity against the main question as well as explicit keyword tags.
 */
export function findLocalFAQMatch(
  query: string,
  faqs: FAQ[],
  threshold = 0.45
): { faq: FAQ; score: number } | null {
  let bestMatch: FAQ | null = null;
  let highestScore = 0;

  const normalizedQueryTokens = new Set(tokenizeAndNormalize(query));
  if (normalizedQueryTokens.size === 0) return null;

  for (const faq of faqs) {
    // 1. Calculate similarity against main question
    const jaccard = calculateJaccardSimilarity(query, faq.question);
    const coverage = calculateKeywordCoverage(query, faq.question);
    let score = jaccard * 0.4 + coverage * 0.6;

    // 2. Boost score if explicit keywords array is defined and matched
    if (faq.keywords && Array.isArray(faq.keywords)) {
      const keywordString = faq.keywords.join(' ');
      const kwJaccard = calculateJaccardSimilarity(query, keywordString);
      const kwCoverage = calculateKeywordCoverage(query, keywordString);
      const kwScore = kwJaccard * 0.3 + kwCoverage * 0.7;

      if (kwScore > score) {
        score = kwScore;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = faq;
    }
  }

  if (bestMatch && highestScore >= threshold) {
    return { faq: bestMatch, score: highestScore };
  }

  return null;
}
