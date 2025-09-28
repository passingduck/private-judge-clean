import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { Job, JobModel, JobStatus } from '@/core/models/job';
import { MESSAGES } from '@/core/constants/messages';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/jobs/[id]/cancel - 작업 취소
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: jobId } = await params; // Next.js 15: params is now a Promise

  console.info('[job-cancel-api] POST start', {
    requestId,
    userId,
    userEmail,
    jobId,
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn(`[${requestId}] Unauthorized: No user ID found.`);
      return NextResponse.json(
        { message: '인증이 필요합니다' },
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

    // 작업 조회 및 권한 확인
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        room:rooms(id, creator_id, participant_id)
      `)
      .eq('id', jobId)
      .single();

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        console.error(
          `[${requestId}] Job not found: ${jobId}`
        );
        return NextResponse.json(
          { message: '작업을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      console.error(
        `[${requestId}] Failed to fetch job ${jobId}:`,
        jobError.message
      );
      return NextResponse.json(
        { message: '서버 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    const jobValidation = JobModel.validate(jobData);
    if (!jobValidation.success) {
      console.error(
        `[${requestId}] Job data validation failed:`,
        jobValidation.error
      );
      return NextResponse.json(
        { message: '잘못된 데이터입니다' },
        { status: 500 }
      );
    }

    const job: Job = jobValidation.data;
    const jobModel = new JobModel(job);

    // 작업 취소 가능 여부 확인
    if (!jobModel.canBeCancelled()) {
      console.warn(
        `[${requestId}] Job ${jobId} cannot be cancelled. Current status: ${job.status}`
      );
      return NextResponse.json(
        { 
          message: `작업을 취소할 수 없습니다. 현재 상태: ${job.status}`,
          current_status: job.status,
          cancellable_statuses: ['pending', 'running']
        },
        { status: 409 }
      );
    }

    // 권한 확인 - 방 생성자 또는 참가자만 취소 가능
    if (job.room_id && jobData.room) {
      const room = jobData.room;
      const isCreator = room.creator_id === userId;
      const isParticipant = room.participant_id === userId;

      if (!isCreator && !isParticipant) {
        console.warn(
          `[${requestId}] User ${userId} is not authorized to cancel job ${jobId}`
        );
        return NextResponse.json(
          { message: '접근 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    // 작업 취소 처리
    const now = new Date().toISOString();
    const { data: cancelledJob, error: cancelError } = await supabase
      .from('jobs')
      .update({
        status: JobStatus.CANCELLED,
        completed_at: now,
        updated_at: now,
        error_message: `사용자 ${userId}에 의해 취소됨`
      })
      .eq('id', jobId)
      .eq('status', job.status) // 동시성 제어
      .select()
      .single();

    if (cancelError) {
      if (cancelError.code === 'PGRST116') {
        // 다른 프로세스가 이미 상태를 변경했음
        console.warn(
          `[${requestId}] Job ${jobId} status was changed by another process`
        );
        return NextResponse.json(
          { 
            message: '작업 상태가 다른 프로세스에 의해 변경되었습니다. 다시 시도해주세요.',
            requestId 
          },
          { status: 409 }
        );
      }

      console.error(
        `[${requestId}] Failed to cancel job ${jobId}:`,
        cancelError.message
      );
      return NextResponse.json(
        { message: '작업 취소에 실패했습니다' },
        { status: 500 }
      );
    }

    const cancelledJobValidation = JobModel.validate(cancelledJob);
    if (!cancelledJobValidation.success) {
      console.error(
        `[${requestId}] Cancelled job data validation failed:`,
        cancelledJobValidation.error
      );
      return NextResponse.json(
        { message: '잘못된 데이터입니다' },
        { status: 500 }
      );
    }

    console.info(
      `[${requestId}] Job ${jobId} cancelled successfully by user ${userId}`
    );

    return NextResponse.json({
      id: cancelledJob.id,
      type: cancelledJob.type,
      status: cancelledJob.status,
      room_id: cancelledJob.room_id,
      cancelled_at: cancelledJob.completed_at,
      cancelled_by: userId,
      message: '작업이 성공적으로 취소되었습니다',
      requestId
    });

  } catch (error: any) {
    console.error(
      `[${requestId}] Unhandled error in POST /api/jobs/[id]/cancel:`,
      error.message,
      error.stack
    );
    return NextResponse.json(
      { message: MESSAGES.COMMON.SERVER_ERROR, error: error.message },
      { status: 500 }
    );
  }
}
