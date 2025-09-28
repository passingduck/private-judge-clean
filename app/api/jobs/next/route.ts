import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { Job, JobModel, JobType, JobStatus } from '@/core/models/job';

// GET /api/jobs/next - 다음 실행할 작업 조회 (워커용)
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const workerToken = headersList.get('x-worker-token');
  
  console.info('[jobs-next-api] GET start', { 
    requestId,
    hasWorkerToken: !!workerToken
  });

  try {
    // 워커 인증 확인 (간단한 토큰 기반)
    const expectedWorkerToken = process.env.WORKER_TOKEN || 'dev-worker-token';
    if (!workerToken || workerToken !== expectedWorkerToken) {
      console.warn('[jobs-next-api] GET unauthorized worker', { requestId });
      return NextResponse.json(
        { 
          error: 'unauthorized', 
          message: '워커 인증이 필요합니다',
          requestId 
        },
        { status: 401 }
      );
    }

    // 쿼리 파라미터에서 작업 타입 필터 확인
    const { searchParams } = new URL(request.url);
    const typesParam = searchParams.get('types');
    const limitParam = searchParams.get('limit');
    
    let jobTypes: JobType[] | undefined;
    if (typesParam) {
      jobTypes = typesParam.split(',').filter(type => 
        Object.values(JobType).includes(type as JobType)
      ) as JobType[];
    }

    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 10) : 1;

    console.info('[jobs-next-api] GET parameters', { 
      requestId,
      jobTypes,
      limit
    });

    const supabase = getSupabaseClient(true); // Use service role

    // 다음 실행할 작업들 조회
    let query = supabase
      .from('jobs')
      .select(`
        *,
        room:rooms(id, title, creator_id, participant_id)
      `)
      .eq('status', JobStatus.PENDING)
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (jobTypes && jobTypes.length > 0) {
      query = query.in('type', jobTypes);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[jobs-next-api] GET jobs fetch error', { 
        requestId, 
        error: error.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '작업 조회 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.info('[jobs-next-api] GET no jobs available', { requestId });
      return NextResponse.json({
        jobs: [],
        available_count: 0,
        message: '실행할 작업이 없습니다',
        requestId
      });
    }

    // 작업 데이터 검증 및 변환
    const jobs: Job[] = [];
    for (const jobData of data) {
      const validation = JobModel.validate(jobData);
      if (validation.success) {
        jobs.push(validation.data);
      } else {
        console.warn('[jobs-next-api] GET invalid job data', { 
          requestId, 
          jobId: jobData.id, 
          error: validation.error 
        });
      }
    }

    // 대기 중인 작업 통계
    const { count: totalPendingCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact' })
      .eq('status', JobStatus.PENDING);

    const { count: totalRunningCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact' })
      .eq('status', JobStatus.RUNNING);

    console.info('[jobs-next-api] GET success', { 
      requestId,
      jobsReturned: jobs.length,
      totalPending: totalPendingCount || 0,
      totalRunning: totalRunningCount || 0
    });

    return NextResponse.json({
      jobs: jobs.map(job => {
        const jobModel = new JobModel(job);
        const summary = jobModel.getSummary();
        
        return {
          id: job.id,
          type: job.type,
          status: job.status,
          room_id: job.room_id,
          room: jobData.room ? {
            id: jobData.room.id,
            title: jobData.room.title
          } : null,
          payload: job.payload,
          priority: summary.priority,
          retry_count: job.retry_count,
          max_retries: job.max_retries,
          scheduled_at: job.scheduled_at,
          created_at: job.created_at,
          wait_time_seconds: summary.waitTime,
          can_start: jobModel.canStart()
        };
      }),
      available_count: jobs.length,
      queue_status: {
        total_pending: totalPendingCount || 0,
        total_running: totalRunningCount || 0,
        types_requested: jobTypes || 'all'
      },
      requestId
    });

  } catch (error) {
    console.error('[jobs-next-api] GET unexpected error', { 
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        error: 'internal_error', 
        message: '서버 내부 오류가 발생했습니다',
        requestId 
      },
      { status: 500 }
    );
  }
}

// POST /api/jobs/next - 작업 시작 처리 (워커용)
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const workerToken = headersList.get('x-worker-token');
  
  console.info('[jobs-next-api] POST start', { 
    requestId,
    hasWorkerToken: !!workerToken
  });

  try {
    // 워커 인증 확인
    const expectedWorkerToken = process.env.WORKER_TOKEN || 'dev-worker-token';
    if (!workerToken || workerToken !== expectedWorkerToken) {
      console.warn('[jobs-next-api] POST unauthorized worker', { requestId });
      return NextResponse.json(
        { 
          error: 'unauthorized', 
          message: '워커 인증이 필요합니다',
          requestId 
        },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { job_id, worker_id } = body;

    console.info('[jobs-next-api] POST body received', { 
      requestId, 
      jobId: job_id,
      workerId: worker_id
    });

    if (!job_id) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: 'job_id가 필요합니다',
          requestId 
        },
        { status: 400 }
      );
    }

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(job_id)) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '유효하지 않은 작업 ID 형식입니다',
          requestId 
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(true); // Use service role

    // 작업 조회 및 상태 확인
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            error: 'not_found', 
            message: '작업을 찾을 수 없습니다',
            requestId 
          },
          { status: 404 }
        );
      }

      console.error('[jobs-next-api] POST job fetch error', { 
        requestId, 
        error: jobError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '작업 조회 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    const jobValidation = JobModel.validate(jobData);
    if (!jobValidation.success) {
      return NextResponse.json(
        { 
          error: 'data_error', 
          message: '작업 데이터가 유효하지 않습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    const job: Job = jobValidation.data;
    const jobModel = new JobModel(job);

    // 작업 시작 가능 여부 확인
    if (!jobModel.canStart()) {
      console.warn('[jobs-next-api] POST job cannot start', { 
        requestId, 
        jobId: job_id,
        currentStatus: job.status
      });
      return NextResponse.json(
        { 
          error: 'invalid_status', 
          message: `작업을 시작할 수 없습니다. 현재 상태: ${job.status}`,
          requestId 
        },
        { status: 409 }
      );
    }

    // 작업을 실행 중 상태로 변경
    const now = new Date().toISOString();
    const { data: updatedJobData, error: updateError } = await supabase
      .from('jobs')
      .update({
        status: JobStatus.RUNNING,
        started_at: now,
        updated_at: now,
        worker_id: worker_id || null
      })
      .eq('id', job_id)
      .eq('status', JobStatus.PENDING) // 동시성 제어
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        // 다른 워커가 이미 작업을 시작했음
        console.warn('[jobs-next-api] POST job already taken', { 
          requestId, 
          jobId: job_id
        });
        return NextResponse.json(
          { 
            error: 'job_taken', 
            message: '다른 워커가 이미 이 작업을 시작했습니다',
            requestId 
          },
          { status: 409 }
        );
      }

      console.error('[jobs-next-api] POST job update error', { 
        requestId, 
        error: updateError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '작업 상태 업데이트 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    const updatedJobValidation = JobModel.validate(updatedJobData);
    if (!updatedJobValidation.success) {
      return NextResponse.json(
        { 
          error: 'data_error', 
          message: '업데이트된 작업 데이터가 유효하지 않습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    const updatedJob: Job = updatedJobValidation.data;

    console.info('[jobs-next-api] POST success', { 
      requestId, 
      jobId: job_id,
      workerId: worker_id,
      jobType: updatedJob.type,
      oldStatus: job.status,
      newStatus: updatedJob.status
    });

    return NextResponse.json({
      job: {
        id: updatedJob.id,
        type: updatedJob.type,
        status: updatedJob.status,
        room_id: updatedJob.room_id,
        payload: updatedJob.payload,
        retry_count: updatedJob.retry_count,
        max_retries: updatedJob.max_retries,
        started_at: updatedJob.started_at,
        created_at: updatedJob.created_at,
        worker_id: updatedJob.worker_id
      },
      message: '작업이 시작되었습니다',
      requestId
    });

  } catch (error) {
    console.error('[jobs-next-api] POST unexpected error', { 
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        error: 'internal_error', 
        message: '서버 내부 오류가 발생했습니다',
        requestId 
      },
      { status: 500 }
    );
  }
}
