import { NextRequest, NextResponse } from 'next/server';

// Vercel Cron Job handler - 1분마다 실행
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  console.info('[cron-process-jobs] Cron job triggered', { requestId });

  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Vercel cron은 자동으로 Authorization: Bearer <CRON_SECRET> 헤더를 추가
  // 또는 Vercel의 특수 헤더를 확인할 수도 있음
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[cron-process-jobs] Unauthorized cron request', { requestId });
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // 내부 job processor 호출
    const workerSecret = process.env.WORKER_SECRET;
    if (!workerSecret) {
      console.error('[cron-process-jobs] WORKER_SECRET not configured', { requestId });
      return NextResponse.json({ error: 'configuration_error' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://private-judge-lovat.vercel.app';
    const processUrl = `${baseUrl}/api/jobs/process`;

    console.info('[cron-process-jobs] Calling job processor', { requestId, processUrl });

    const response = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workerSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.info('[cron-process-jobs] Job processor response', {
      requestId,
      status: response.status,
      data
    });

    return NextResponse.json({
      success: true,
      processorResponse: data,
      requestId
    });

  } catch (error) {
    console.error('[cron-process-jobs] Error', {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      requestId
    }, { status: 500 });
  }
}
