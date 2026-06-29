import { supabase } from './db';
import { tokenizeAndNormalize } from './client-search';

const AUTO_FAQ_THRESHOLD = 5;   // Minimum times a query must be asked
const AUTO_FAQ_WINDOW_HOURS = 24; // Within this many hours
const MAX_AUTO_FAQS = 50;        // Cap on total auto-generated FAQs to prevent table bloat

/**
 * Normalizes a query string to a canonical key for grouping similar queries.
 * Uses the same tokenization + synonym mapping from client-search to ensure consistency.
 */
function normalizeQueryKey(query: string): string {
  const tokens = tokenizeAndNormalize(query);
  // Sort tokens alphabetically so "fees computer" and "computer fees" produce the same key
  return tokens.sort().join('_');
}

/**
 * Checks if a query has been asked frequently enough to be auto-promoted to an FAQ.
 * If the threshold is met AND the query doesn't already match an existing FAQ,
 * it inserts a new FAQ entry using the most recent RAG answer.
 *
 * This function runs asynchronously after each chat response and should never block the user.
 */
export async function checkAndPromoteToFAQ(
  query: string,
  ragAnswer: string
): Promise<void> {
  try {
    // 1. Don't promote error/fallback answers
    if (
      ragAnswer.includes('I am sorry, but I cannot find official information') ||
      ragAnswer.includes('encountered an error') ||
      ragAnswer.includes('System Configuration Required')
    ) {
      return;
    }

    // 2. Check count of similar queries in the last 24 hours
    const windowStart = new Date(Date.now() - AUTO_FAQ_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    const { data: recentLogs, error: logError } = await supabase
      .from('query_logs')
      .select('query')
      .gte('created_at', windowStart)
      .eq('is_answered', true);

    if (logError || !recentLogs) {
      console.error('[Auto-FAQ] Error fetching recent logs:', logError);
      return;
    }

    // 3. Group logs by normalized key and count matches
    const queryKey = normalizeQueryKey(query);
    if (!queryKey || queryKey.length < 3) return; // Skip very short/empty normalized queries

    let matchCount = 0;
    for (const log of recentLogs) {
      if (normalizeQueryKey(log.query) === queryKey) {
        matchCount++;
      }
    }

    if (matchCount < AUTO_FAQ_THRESHOLD) return;

    // 4. Check if a similar FAQ already exists (by normalized key comparison)
    const { data: existingFAQs, error: faqError } = await supabase
      .from('faqs')
      .select('id, question');

    if (faqError) {
      console.error('[Auto-FAQ] Error checking existing FAQs:', faqError);
      return;
    }

    if (existingFAQs) {
      for (const faq of existingFAQs) {
        const existingKey = normalizeQueryKey(faq.question);
        // If the normalized keys share >60% token overlap, consider it a duplicate
        const existingTokens = new Set(existingKey.split('_'));
        const queryTokens = new Set(queryKey.split('_'));
        let overlap = 0;
        for (const t of queryTokens) {
          if (existingTokens.has(t)) overlap++;
        }
        const overlapRatio = overlap / Math.max(existingTokens.size, queryTokens.size);
        if (overlapRatio > 0.6) {
          return; // Already covered by an existing FAQ
        }
      }
    }

    // 5. Check we haven't exceeded the auto-FAQ cap
    const { count, error: countError } = await supabase
      .from('faqs')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'Auto-Generated');

    if (countError) {
      console.error('[Auto-FAQ] Error counting auto FAQs:', countError);
      return;
    }

    if ((count || 0) >= MAX_AUTO_FAQS) {
      console.warn('[Auto-FAQ] Max auto-generated FAQ limit reached. Skipping promotion.');
      return;
    }

    // 6. Promote to FAQ!
    const { error: insertError } = await supabase.from('faqs').insert({
      question: query,
      answer: ragAnswer,
      category: 'Auto-Generated',
      keywords: queryKey.split('_'),
      source_name: 'Auto-Promoted from Frequent Queries',
      source_url: null
    });

    if (insertError) {
      console.error('[Auto-FAQ] Error inserting auto FAQ:', insertError);
    } else {
      console.log(`[Auto-FAQ] ✅ Promoted query to FAQ: "${query}" (asked ${matchCount}x in ${AUTO_FAQ_WINDOW_HOURS}h)`);
    }
  } catch (error) {
    // Never let auto-FAQ errors affect the main chat flow
    console.error('[Auto-FAQ] Unexpected error:', error);
  }
}
