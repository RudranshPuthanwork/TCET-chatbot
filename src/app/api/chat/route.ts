import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent, extractEntities } from '@/lib/nlp';
import { generateRAGResponse } from '@/lib/rag';
import { supabase } from '@/lib/db';
import { checkAndPromoteToFAQ } from '@/lib/auto-faq';

/**
 * Strips HTML tags from user inputs to prevent injection attacks.
 */
function sanitizeInput(text: string): string {
  return text.replace(/<\/?[^>]+(>|$)/g, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;

    // 1. Validate query existence and format
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { answer: 'Message parameter is required and must be a string.' },
        { status: 400 }
      );
    }

    // 2. Sanitize and check length bounds
    const cleanMessage = sanitizeInput(message);
    if (!cleanMessage) {
      return NextResponse.json(
        { answer: 'Message content cannot be empty or contain only tags.' },
        { status: 400 }
      );
    }

    if (cleanMessage.length > 500) {
      return NextResponse.json(
        { answer: 'Message exceeds the maximum limit of 500 characters.' },
        { status: 400 }
      );
    }

    // 3. Validate chat history payloads to prevent buffer overload attacks
    if (!Array.isArray(history) || history.length > 10) {
      return NextResponse.json(
        { answer: 'Invalid chat history structure or size.' },
        { status: 400 }
      );
    }

    // 4. NLP Processing: Intent Classification & Entity Extraction
    const intent = classifyIntent(cleanMessage);
    const entities = extractEntities(cleanMessage);

    console.log(`[API Chat] Query: "${cleanMessage}" | Intent: ${intent} | Entities:`, entities);

    // 5. Execute RAG Pipeline via Gemini & Supabase
    const ragResult = await generateRAGResponse(cleanMessage, history);

    // 6. Log Query for Admin Analytics
    const isAnswered = !ragResult.answer.includes("I am sorry, but I cannot find official information");

    const { error: logError } = await supabase.from('query_logs').insert({
      query: cleanMessage,
      detected_intent: intent,
      is_answered: isAnswered,
      feedback_score: null // Populated upon user feedback interaction
    });

    if (logError) {
      console.error('[API Chat] Error logging query to Supabase:', logError);
    }

    // 7. Fire-and-forget: Check if this query should be auto-promoted to FAQ
    // Runs asynchronously — never blocks the user response
    checkAndPromoteToFAQ(cleanMessage, ragResult.answer).catch(() => {});

    // 8. Return Chat Response
    return NextResponse.json({
      answer: ragResult.answer,
      citations: ragResult.citations,
      followUps: ragResult.followUps,
      intent,
      entities
    });
  } catch (error) {
    console.error('[API Chat] Error in /api/chat route:', error);
    return NextResponse.json(
      {
        answer: 'I apologize, but I encountered an internal server error while processing your request. Please try again later.',
        citations: [],
        followUps: []
      },
      { status: 500 }
    );
  }
}
