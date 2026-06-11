import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyAdminPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Password' }, { status: 401 });
    }
    // Fetch all logs from the database
    const { data: logs, error } = await supabase
      .from('query_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalQueries = logs ? logs.length : 0;
    const unansweredQueries = logs ? logs.filter(l => !l.is_answered).length : 0;

    // Calculate intent distribution
    const intentDistribution: { [key: string]: number } = {};
    if (logs) {
      logs.forEach(log => {
        const intent = log.detected_intent || 'UNKNOWN';
        intentDistribution[intent] = (intentDistribution[intent] || 0) + 1;
      });
    }

    // Format intent distribution for charts
    const chartData = Object.keys(intentDistribution).map(name => ({
      name,
      value: intentDistribution[name]
    }));

    return NextResponse.json({
      totalQueries,
      unansweredQueries,
      chartData,
      recentLogs: logs ? logs.slice(0, 50) : [], // Limit to top 50 logs
      unansweredLogs: logs ? logs.filter(l => !l.is_answered).slice(0, 50) : []
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
