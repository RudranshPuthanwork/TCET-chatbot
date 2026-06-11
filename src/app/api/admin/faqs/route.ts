import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyAdminPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Password' }, { status: 401 });
    }
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching FAQs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Password' }, { status: 401 });
    }
    const body = await req.json();
    const { question, answer, category, source_name, source_url } = body;

    if (!question || !answer || !category) {
      return NextResponse.json(
        { error: 'Question, Answer, and Category are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('faqs')
      .insert({
        question,
        answer,
        category,
        source_name: source_name || null,
        source_url: source_url || null
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating FAQ:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Password' }, { status: 401 });
    }
    const body = await req.json();
    const { id, question, answer, category, source_name, source_url } = body;

    if (!id || !question || !answer || !category) {
      return NextResponse.json(
        { error: 'ID, Question, Answer, and Category are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('faqs')
      .update({
        question,
        answer,
        category,
        source_name: source_name || null,
        source_url: source_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating FAQ:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Password' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'FAQ ID is required.' }, { status: 400 });
    }

    const { error } = await supabase.from('faqs').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting FAQ:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
