import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { generateEmbedding } from '@/lib/rag';
import { seedDatabase } from '@/lib/seed-data';
import { verifyAdminPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Password' }, { status: 401 });
    }
    const { data, error } = await supabase
      .from('document_chunks')
      .select('id, title, content, source_name, source_url, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Password' }, { status: 401 });
    }
    const body = await req.json();
    const { action, title, content, sourceName, sourceUrl, id } = body;

    // 1. Database seeding trigger
    if (action === 'seed') {
      const result = await seedDatabase();
      return NextResponse.json({ success: true, ...result });
    }

    // 2. Add custom document chunk
    if (action === 'create') {
      if (!title || !content || !sourceName) {
        return NextResponse.json(
          { error: 'Title, Content, and Source Name are required fields.' },
          { status: 400 }
        );
      }

      // Generate embedding vector
      const embedding = await generateEmbedding(content);

      const { data, error } = await supabase
        .from('document_chunks')
        .insert({
          title,
          content,
          source_name: sourceName,
          source_url: sourceUrl || null,
          embedding
        })
        .select();

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Invalid action provided.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing document POST:', error);
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
      return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
    }

    const { error } = await supabase.from('document_chunks').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document chunk:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
