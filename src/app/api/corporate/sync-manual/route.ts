import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getCorporateSyncQueue } from '@/lib/queue';

// Corporate Sync Manual - Task 13
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Trigger job immediately with high priority
    const job = await getCorporateSyncQueue().add({}, { priority: 10 });
    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    console.error('[sync-manual] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
