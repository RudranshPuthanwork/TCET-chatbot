import { executeWithFailover } from './gemini-client';
import { supabase } from './db';

/**
 * Generates vector embeddings for a given text using the Gemini API (gemini-embedding-2) with 768 dimensions.
 * Uses key failover to bypass rate limits.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    return await executeWithFailover(async (ai) => {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });

      if (response.embeddings && response.embeddings.length > 0 && response.embeddings[0].values) {
        return response.embeddings[0].values as number[];
      } else {
        throw new Error('Failed to extract embedding values from Gemini response.');
      }
    });
  } catch (error) {
    console.error('[RAG] Error generating embedding:', error);
    throw error;
  }
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  content: string;
  source_name: string;
  source_url: string | null;
  similarity: number;
}

/**
 * Searches the Supabase vector database for matching documents.
 */
export async function searchSimilarDocuments(
  query: string,
  matchThreshold = 0.35,
  matchCount = 4
): Promise<DocumentSearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('[RAG] Error calling match_documents RPC:', error);
      return [];
    }

    return (data as DocumentSearchResult[]) || [];
  } catch (error) {
    console.error('[RAG] Error in searchSimilarDocuments:', error);
    return [];
  }
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Citation {
  title: string;
  sourceName: string;
  sourceUrl: string | null;
}

export interface ChatbotResponse {
  answer: string;
  citations: Citation[];
  followUps: string[];
}

/**
 * Main RAG function that takes user query + history and returns a grounded answer.
 * Optimized with prompt caching, multiple API key rotation, and a single API call for answers and follow-ups.
 */
export async function generateRAGResponse(
  query: string,
  chatHistory: ChatMessage[] = []
): Promise<ChatbotResponse> {
  const hasKeys = !!(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY);
  if (!hasKeys) {
    return {
      answer:
        '⚠️ **System Configuration Required:** Please configure your `GEMINI_API_KEYS` in the environment settings to enable the AI engine.',
      citations: [],
      followUps: [],
    };
  }

  try {
    // 1. Search vector DB for matching chunks
    const matches = await searchSimilarDocuments(query, 0.35, 4);

    // 2. Format search results into a clean context block
    let contextBlock = '';
    const citations: Citation[] = [];

    if (matches.length > 0) {
      contextBlock = matches
        .map((match, idx) => {
          // Track unique citations
          if (
            !citations.some(
              (c) => c.sourceName === match.source_name && c.title === match.title
            )
          ) {
            citations.push({
              title: match.title,
              sourceName: match.source_name,
              sourceUrl: match.source_url,
            });
          }
          return `[Source #${idx + 1}: ${match.source_name} - ${match.title}]\n${match.content}\n`;
        })
        .join('\n---\n\n');
    }

    // 3. Construct System Prompt (enforces strict grounding and bilingual rules)
    // Note: Passed inside config.systemInstruction to enable implicit prompt caching on Gemini.
    const systemInstruction = `You are the official Thakur College of Engineering and Technology (TCET) Admission Assistant.
Your goal is to help parents and students get accurate information about admissions, cutoffs, fees, syllabus, placement, and hostel facilities based ONLY on the documents provided in the Context below.

Context:
---
${contextBlock || 'No matching official document found.'}
---

Rules:
1. Base your answer strictly on the Context provided. 
2. If the context does not contain the answer, reply exactly: "I am sorry, but I cannot find official information about this in my files. Please contact the TCET Admission Cell directly at +91-22-67308000 or email tcet.admission@thakureducation.org."
3. Do NOT hallucinate details, guess fees, make up dates, or list cutoff percentiles not mentioned in the Context.
4. Keep your answers professional, concise, structured, and easy for parents to understand. Use bullet points where appropriate.
5. If the user asks in Hindi or Marathi, translate the context facts and respond in Hindi or Marathi respectively. Keep a welcoming, respectful tone.
6. Do NOT mention details like "According to context..." or "Based on source #1...". Speak directly as the official TCET help desk.`;

    // 4. Format chat history for context window (last 4 exchanges)
    const formattedHistory = chatHistory.slice(-4).map((msg) => ({
      role: msg.role === 'model' ? ('model' as const) : ('user' as const),
      parts: [{ text: msg.content }],
    }));

    const contents = [
      ...formattedHistory,
      {
        role: 'user' as const,
        parts: [{ text: query }],
      },
    ];

    // 5. Generate Answer and Follow-ups in a single structured Gemini call
    const result = await executeWithFailover(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              answer: {
                type: 'STRING',
                description:
                  'The structured response answering the query based on the context. Must translate to Hindi or Marathi if the user query is in Hindi or Marathi.',
              },
              followUps: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description:
                  'Generate exactly 3 relevant, short, and natural follow-up questions for the student or parent.',
              },
            },
            required: ['answer', 'followUps'],
          },
        },
      });

      return response.text;
    });

    if (!result) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsedResponse = JSON.parse(result);

    return {
      answer: parsedResponse.answer || 'No response generated.',
      citations: matches.length > 0 ? citations : [],
      followUps: (parsedResponse.followUps || []).slice(0, 3), // Max 3 follow-ups
    };
  } catch (error) {
    console.error('[RAG] Error generating chatbot response:', error);
    return {
      answer:
        'I apologize, but I encountered an error while processing your request. Please try again or contact the TCET Admission Cell directly.',
      citations: [],
      followUps: ['What is the admission process?', 'What are the fees?', 'How to contact TCET?'],
    };
  }
}
