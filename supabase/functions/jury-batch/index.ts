import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// 환경 변수 인터페이스
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// 배심원 배치 처리를 위한 전용 Edge Function
Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  
  try {
    console.log(`[${requestId}] Jury batch processor started`);
    
    // 환경 변수 확인
    const env: Env = {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL')!,
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    };

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 요청 파라미터 파싱
    const { room_id, jury_count = 7 } = await req.json();

    if (!room_id) {
      throw new Error('room_id is required');
    }

    console.log(`[${requestId}] Creating ${jury_count} jury jobs for room ${room_id}`);

    // 7개의 배심원 작업을 병렬로 생성
    const juryJobs = [];
    for (let i = 1; i <= jury_count; i++) {
      juryJobs.push({
        type: 'ai_jury',
        status: 'queued',
        room_id: room_id,
        payload: {
          room_id: room_id,
          juror_number: i,
          batch_id: requestId
        },
        scheduled_at: new Date().toISOString()
      });
    }

    // 배치로 작업 생성
    const { data: createdJobs, error: createError } = await supabase
      .from('jobs')
      .insert(juryJobs)
      .select();

    if (createError) {
      throw new Error(`Failed to create jury jobs: ${createError.message}`);
    }

    // jobs-worker 호출하여 즉시 처리 시작
    try {
      const workerResponse = await fetch(`${env.SUPABASE_URL}/functions/v1/jobs-worker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ take: jury_count })
      });

      if (!workerResponse.ok) {
        console.warn(`[${requestId}] Failed to trigger jobs-worker: ${workerResponse.status}`);
      } else {
        console.log(`[${requestId}] Successfully triggered jobs-worker`);
      }
    } catch (workerError) {
      console.warn(`[${requestId}] Error triggering jobs-worker:`, workerError);
      // 워커 호출 실패는 치명적이지 않음 (스케줄러가 나중에 처리)
    }

    console.log(`[${requestId}] Created ${createdJobs?.length || 0} jury jobs`);

    return new Response(JSON.stringify({
      success: true,
      batch_id: requestId,
      jobs_created: createdJobs?.length || 0,
      job_ids: createdJobs?.map(job => job.id) || [],
      room_id: room_id,
      message: `${jury_count} jury jobs queued for processing`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${requestId}] Jury batch error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      requestId: requestId
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
