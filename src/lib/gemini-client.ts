import { GoogleGenAI } from '@google/genai';

/**
 * Retrieves all configured Gemini API keys from the environment.
 * Supports a comma-separated list of keys in GEMINI_API_KEYS, falling back to GEMINI_API_KEY.
 */
function getApiKeys(): string[] {
  const keysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  return keysStr
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
}

let currentKeyIndex = 0;

/**
 * Executes a Gemini API operation, rotating to the next available API key if a quota
 * limit or rate limit error (HTTP 429 or RESOURCE_EXHAUSTED) is encountered.
 */
export async function executeWithFailover<T>(
  apiCall: (ai: GoogleGenAI) => Promise<T>
): Promise<T> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error('No GEMINI_API_KEY or GEMINI_API_KEYS environment variables configured.');
  }

  let lastError: any = null;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIndex = (currentKeyIndex + attempt) % keys.length;
    const apiKey = keys[keyIndex];
    const ai = new GoogleGenAI({ apiKey });

    try {
      const result = await apiCall(ai);
      // Pin the active index to this successful key
      currentKeyIndex = keyIndex;
      return result;
    } catch (error: any) {
      console.error(
        `[Gemini Client] API call failed with key index ${keyIndex}:`,
        error?.message || error
      );
      lastError = error;

      const errStr = String(error?.message || error).toLowerCase();
      const isQuotaError =
        errStr.includes('429') ||
        errStr.includes('quota') ||
        errStr.includes('exhausted') ||
        errStr.includes('limit') ||
        errStr.includes('resource_exhausted') ||
        error?.status === 429;

      if (isQuotaError && keys.length > 1) {
        console.warn(`[Gemini Client] Rate limit or quota exhausted for key index ${keyIndex}. Rotating...`);
        continue;
      } else {
        // Re-throw immediately if it's a structural error (e.g. bad request) or we have only 1 key
        throw error;
      }
    }
  }

  throw lastError || new Error('All configured Gemini API keys failed.');
}
