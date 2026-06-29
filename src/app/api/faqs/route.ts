import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const revalidate = 3600; // Cache on Vercel's edge network for 1 hour

/**
 * Public endpoint to fetch the FAQ list for client-side matching.
 * Accessible by anyone, cached heavily at the edge to reduce database hits.
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('id, question, answer, category, keywords, source_name, source_url')
      .order('category', { ascending: true });

    if (error) {
      throw error;
    }

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('[API FAQs] Error retrieving FAQs:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to retrieve FAQ list.' },
      { status: 500 }
    );
  }
}
