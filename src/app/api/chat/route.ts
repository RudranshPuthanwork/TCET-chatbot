import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent, extractEntities } from '@/lib/nlp';
import { generateRAGResponse } from '@/lib/rag';
import { supabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message query parameter is required and must be a string.' },
        { status: 400 }
      );
    }

    // 1. NLP Processing: Intent Classification & Entity Extraction
    const intent = classifyIntent(message);
    const entities = extractEntities(message);

    console.log(`NLP Results - Query: "${message}" | Intent: ${intent} | Entities:`, entities);

    // 2. Execute RAG Pipeline via Gemini & Supabase
    const ragResult = await generateRAGResponse(message, history);

    // 3. Log Query for Admin Analytics
    // Check if the response contains the fallback/unanswered phrase
    const isAnswered = !ragResult.answer.includes("I am sorry, but I cannot find official information");

    const { error: logError } = await supabase.from('query_logs').insert({
      query: message,
      detected_intent: intent,
      is_answered: isAnswered,
      feedback_score: null // Filled when user clicks thumbs up/down
    });

    if (logError) {
      console.error('Error logging query to Supabase:', logError);
    }

    // 4. Return Chat Response
    return NextResponse.json({
      answer: ragResult.answer,
      citations: ragResult.citations,
      followUps: ragResult.followUps,
      intent,
      entities
    });
  } catch (error) {
    console.error('Error in /api/chat route:', error);
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

// Support pre-flight request for CORS if needed in production
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
