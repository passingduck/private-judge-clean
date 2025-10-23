// Supabase Edge Function: Job Processor
// Runs every minute via Supabase Cron
// Calls the Vercel API to process queued jobs

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  console.log('[job-processor] Function invoked', { requestId });

  try {
    const workerSecret = Deno.env.get('WORKER_SECRET');
    const vercelApiUrl = Deno.env.get('VERCEL_API_URL') || 'https://private-judge-lovat.vercel.app';

    if (!workerSecret) {
      console.error('[job-processor] WORKER_SECRET not configured', { requestId });
      return new Response(
        JSON.stringify({ error: 'WORKER_SECRET not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const processUrl = `${vercelApiUrl}/api/jobs/process`;
    console.log('[job-processor] Calling Vercel API', { requestId, processUrl });

    const response = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workerSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const responseData = await response.json();

    console.log('[job-processor] Vercel API response', {
      requestId,
      status: response.status,
      data: responseData
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData,
          requestId
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: responseData,
        requestId
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[job-processor] Error', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        requestId
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
