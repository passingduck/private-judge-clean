import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { Job, JobModel, JobStatus } from '@/core/models/job';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/jobs/[id] - 작업 상태 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: jobId } = await params; // Next.js 15: params is now a Promise

  console.info('[jobs-status-api] GET start', { 
    requestId, 
    userId, 
    userEmail,
    jobId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[jobs-status-api] GET unauthorized', { requestId });
      return NextResponse.json(
        { 
          error: 'unauthorized', 
          message: '인증이 필요합니다',
          requestId 
        },
        { status: 401 }
      );
    }

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
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

    // 작업 정보 조회
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        room:rooms(id, title, creator_id, participant_id)
      `)
      .eq('id', jobId)
      .single();

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        console.warn('[jobs-status-api] GET job not found', { 
          requestId, 
          jobId 
        });
        return NextResponse.json(
          { 
            error: 'not_found', 
            message: '작업을 찾을 수 없습니다',
            requestId 
          },
          { status: 404 }
        );
      }

      console.error('[jobs-status-api] GET job fetch error', { 
        requestId, 
        error: jobError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '작업 정보 조회 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    const jobValidation = JobModel.validate(jobData);
    if (!jobValidation.success) {
      console.error('[jobs-status-api] GET job validation failed', { 
        requestId, 
        error: jobValidation.error 
      });
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

    // 권한 확인 (방 멤버만 접근 가능)
    if (job.room_id) {
      const room = jobData.room;
      if (!room || (room.creator_id !== userId && room.participant_id !== userId)) {
        console.warn('[jobs-status-api] GET access denied', { 
          requestId, 
          jobId, 
          userId,
          roomId: job.room_id
        });
        return NextResponse.json(
          { 
            error: 'forbidden', 
            message: '이 작업에 접근할 권한이 없습니다',
            requestId 
          },
          { status: 403 }
        );
      }
    }

    const summary = jobModel.getSummary();

    console.info('[jobs-status-api] GET success', { 
      requestId, 
      jobId, 
      userId,
      jobType: job.type,
      jobStatus: job.status,
      progress: summary.progress
    });

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      room_id: job.room_id,
      room: jobData.room ? {
        id: jobData.room.id,
        title: jobData.room.title
      } : null,
      payload: job.payload,
      result: job.result,
      error_message: job.error_message,
      retry_count: job.retry_count,
      max_retries: job.max_retries,
      progress: jobModel.progress,
      progress_percentage: summary.progress,
      priority: summary.priority,
      duration: summary.duration,
      wait_time: summary.waitTime,
      estimated_time_remaining: summary.estimatedTimeRemaining,
      can_retry: summary.canRetry,
      can_cancel: summary.canCancel,
      is_active: jobModel.isActive(),
      is_completed: jobModel.isCompleted(),
      scheduled_at: job.scheduled_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
      created_at: job.created_at,
      updated_at: job.updated_at,
      requestId
    });

  } catch (error) {
    console.error('[jobs-status-api] GET unexpected error', { 
      requestId, 
      jobId,
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

// PATCH /api/jobs/[id] - 작업 취소
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: jobId } = await params; // Next.js 15: params is now a Promise

  console.info('[jobs-status-api] PATCH start', { 
    requestId, 
    userId, 
    userEmail,
    jobId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[jobs-status-api] PATCH unauthorized', { requestId });
      return NextResponse.json(
        { 
          error: 'unauthorized', 
          message: '인증이 필요합니다',
          requestId 
        },
        { status: 401 }
      );
    }

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '유효하지 않은 작업 ID 형식입니다',
          requestId 
        },
        { status: 400 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { action } = body;

    if (action !== 'cancel') {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '지원되지 않는 액션입니다. "cancel"만 가능합니다',
          requestId 
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(true); // Use service role

    // 작업 정보 조회
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        room:rooms(id, title, creator_id, participant_id)
      `)
      .eq('id', jobId)
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

      console.error('[jobs-status-api] PATCH job fetch error', { 
        requestId, 
        error: jobError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '작업 정보 조회 중 오류가 발생했습니다',
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

    // 권한 확인 (방 생성자만 취소 가능)
    if (job.room_id) {
      const room = jobData.room;
      if (!room || room.creator_id !== userId) {
        console.warn('[jobs-status-api] PATCH access denied', { 
          requestId, 
          jobId, 
          userId,
          roomCreatorId: room?.creator_id
        });
        return NextResponse.json(
          { 
            error: 'forbidden', 
            message: '방 생성자만 작업을 취소할 수 있습니다',
            requestId 
          },
          { status: 403 }
        );
      }
    }

    // 취소 가능 여부 확인
    if (!jobModel.canBeCancelled()) {
      console.warn('[jobs-status-api] PATCH cannot cancel job', { 
        requestId, 
        jobId,
        status: job.status
      });
      return NextResponse.json(
        { 
          error: 'cannot_cancel', 
          message: '이 작업은 취소할 수 없습니다',
          requestId 
        },
        { status: 409 }
      );
    }

    // 작업 취소
    const { data: updatedJobData, error: updateError } = await supabase
      .from('jobs')
      .update({
        status: JobStatus.CANCELLED,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) {
      console.error('[jobs-status-api] PATCH update error', { 
        requestId, 
        error: updateError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '작업 취소 처리 중 오류가 발생했습니다',
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

    console.info('[jobs-status-api] PATCH success', { 
      requestId, 
      jobId, 
      userId,
      oldStatus: job.status,
      newStatus: updatedJob.status
    });

    return NextResponse.json({
      id: updatedJob.id,
      status: updatedJob.status,
      old_status: job.status,
      completed_at: updatedJob.completed_at,
      updated_at: updatedJob.updated_at,
      message: '작업이 취소되었습니다',
      requestId
    });

  } catch (error) {
    console.error('[jobs-status-api] PATCH unexpected error', { 
      requestId, 
      jobId,
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
