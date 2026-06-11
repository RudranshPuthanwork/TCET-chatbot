import { GoogleGenAI } from '@google/genai';
import { supabase } from './db';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    'WARNING: GEMINI_API_KEY is missing. Ensure GEMINI_API_KEY is set in your .env file.'
  );
}

// Initialize the Google Gen AI client
const ai = new GoogleGenAI({ apiKey: apiKey || 'placeholder-api-key' });

let extractor: any = null;

/**
 * Generates vector embeddings for a given text using local Xenova/all-MiniLM-L6-v2 transformer.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!extractor) {
      const { pipeline } = await import('@xenova/transformers');
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data) as number[];
  } catch (error) {
    console.error('Error generating local embedding:', error);
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
  matchThreshold = 0.55,
  matchCount = 3
): Promise<DocumentSearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('Error calling match_documents RPC:', error);
      return [];
    }

    return (data as DocumentSearchResult[]) || [];
  } catch (error) {
    console.error('Error in searchSimilarDocuments:', error);
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
 */
export async function generateRAGResponse(
  query: string,
  chatHistory: ChatMessage[] = []
): Promise<ChatbotResponse> {
  if (!apiKey) {
    return {
      answer:
        '⚠️ **System Configuration Required:** Please configure your `GEMINI_API_KEY` in the environment settings to enable the AI engine.',
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

    // 3. Format chat history for context window
    const formattedHistory = chatHistory
      .slice(-6) // Keep last 6 exchanges for context to avoid context bloat
      .map((msg) => `${msg.role === 'user' ? 'Student/Parent' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // 4. Construct System Prompt (enforces strict grounding and bilingual rules)
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

    // 5. Invoke Gemini LLM (using gemini-1.5-flash or gemini-2.5-flash)
    const fullPrompt = `${systemInstruction}\n\nChat History:\n${formattedHistory}\n\nStudent/Parent Query: ${query}\nAssistant Response:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    const answer = response.text || 'No response generated.';

    // 6. Generate dynamic follow-up questions
    const followUpPrompt = `Based on the user's question: "${query}" and the chatbot's response: "${answer.substring(0, 150)}...", generate 3 short, relevant, and natural follow-up questions a student or parent would ask next.
    Format your response as a simple JSON array of strings. Do not include markdown code block syntax. Example: ["What are the document submission dates?", "Is there a hostel for girls?", "Can I get a fee waiver?"]`;

    let followUps: string[] = [];
    try {
      const followUpResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: followUpPrompt,
      });

      const rawText = followUpResponse.text?.trim() || '[]';
      // Clean possible markdown wrapper ```json ... ```
      const cleanedJson = rawText.replace(/```json/i, '').replace(/```/g, '').trim();
      followUps = JSON.parse(cleanedJson);
    } catch (err) {
      console.warn('Failed to generate follow-ups, using defaults:', err);
      // Fallback follow-ups depending on intent
      followUps = [
        'What was the cutoff for Computer Engineering?',
        'What are the fees for IT branch?',
        'What documents are required for Minority Quota?',
      ];
    }

    return {
      answer,
      citations: matches.length > 0 ? citations : [],
      followUps: followUps.slice(0, 3), // Ensure max 3
    };
  } catch (error) {
    console.error('Error generating chatbot RAG response:', error);
    return {
      answer:
        'I apologize, but I encountered an error while processing your request. Please try again or contact the TCET Admission Cell directly.',
      citations: [],
      followUps: ['What is the admission process?', 'What are the fees?', 'How to contact TCET?'],
    };
  }
}
