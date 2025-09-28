import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { Job, JobModel, JobType, JobStatus } from '@/core/models/job';
import { Room, RoomModel } from '@/core/models/room';
import { MESSAGES } from '@/core/constants/messages';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/rooms/[id]/jobs - 특정 방의 작업 목록 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params; // Next.js 15: params is now a Promise

  console.info('[room-jobs-api] GET start', {
    requestId,
    userId,
    userEmail,
    roomId,
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn(`[${requestId}] Unauthorized: No user ID found.`);
      return NextResponse.json(
        { message: MESSAGES.AUTH.LOGIN_REQUIRED },
        { status: 401 }
      );
    }

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(roomId)) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '유효하지 않은 방 ID 형식입니다',
          requestId 
        },
        { status: 400 }
      );
    }

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as JobStatus | null;
    const typeFilter = searchParams.get('type') as JobType | null;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0;

    console.info('[room-jobs-api] GET parameters', {
      requestId,
      statusFilter,
      typeFilter,
      limit,
      offset
    });

    const supabase = getSupabaseClient(true); // Use service role

    // 방 존재 여부 및 사용자 권한 확인
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select(`
        *,
        room_members!inner(user_id, role)
      `)
      .eq('id', roomId)
      .eq('room_members.user_id', userId)
      .single();

    if (roomError) {
      if (roomError.code === 'PGRST116') {
        console.error(
          `[${requestId}] Room not found or access denied for room ${roomId} by user ${userId}`
        );
        return NextResponse.json(
          { message: '토론방을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      console.error(
        `[${requestId}] Failed to fetch room ${roomId}:`,
        roomError.message
      );
      return NextResponse.json(
        { message: MESSAGES.COMMON.SERVER_ERROR },
        { status: 500 }
      );
    }

    const roomValidation = RoomModel.validate(roomData);
    if (!roomValidation.success) {
      console.error(
        `[${requestId}] Room data validation failed:`,
        roomValidation.error
      );
      return NextResponse.json(
        { message: '유효하지 않은 데이터입니다' },
        { status: 500 }
      );
    }

    const room: Room = roomValidation.data;

    // 작업 목록 조회 쿼리 구성
    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 필터 적용
    if (statusFilter && Object.values(JobStatus).includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    if (typeFilter && Object.values(JobType).includes(typeFilter)) {
      query = query.eq('type', typeFilter);
    }

    const { data: jobsData, error: jobsError, count } = await query;

    if (jobsError) {
      console.error(
        `[${requestId}] Failed to fetch jobs for room ${roomId}:`,
        jobsError.message
      );
      return NextResponse.json(
        { message: '작업 목록을 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 작업 데이터 검증 및 변환
    const jobs: Job[] = [];
    for (const jobData of jobsData || []) {
      const validation = JobModel.validate(jobData);
      if (validation.success) {
        jobs.push(validation.data);
      } else {
        console.warn(
          `[${requestId}] Invalid job data for job ${jobData.id}:`,
          validation.error
        );
      }
    }

    // 작업 통계 계산
    const statistics = {
      total_count: count || 0,
      pending_count: jobs.filter(job => job.status === JobStatus.QUEUED).length,
      running_count: jobs.filter(job => job.status === JobStatus.RUNNING).length,
      completed_count: jobs.filter(job => job.status === JobStatus.SUCCEEDED).length,
      failed_count: jobs.filter(job => job.status === JobStatus.FAILED).length,
      cancelled_count: jobs.filter(job => job.status === JobStatus.CANCELLED).length,
      by_type: {} as Record<JobType, number>
    };

    // 타입별 통계
    for (const type of Object.values(JobType)) {
      statistics.by_type[type] = jobs.filter(job => job.type === type).length;
    }

    // 작업 데이터 변환 (민감한 정보 제거)
    const transformedJobs = jobs.map(job => {
      const jobModel = new JobModel(job);
      const summary = jobModel.getSummary();
      
      return {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress || 0,
        priority: summary.priority,
        retry_count: job.retry_count,
        max_retries: job.max_retries,
        error_message: job.error_message,
        scheduled_at: job.scheduled_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        created_at: job.created_at,
        updated_at: job.updated_at,
        wait_time_seconds: summary.waitTime,
        execution_time_seconds: summary.executionTime,
        can_be_cancelled: jobModel.canBeCancelled(),
        can_be_retried: job.status === JobStatus.FAILED && job.retry_count < (job.max_retries || 3)
      };
    });

    console.info(
      `[${requestId}] Fetched ${jobs.length} jobs for room ${roomId} (total: ${count})`
    );

    return NextResponse.json({
      jobs: transformedJobs,
      pagination: {
        total_count: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      },
      statistics,
      filters: {
        status: statusFilter,
        type: typeFilter
      },
      room: {
        id: room.id,
        title: room.title,
        status: room.status
      },
      requestId
    });

  } catch (error: any) {
    console.error(
      `[${requestId}] Unhandled error in GET /api/rooms/[id]/jobs:`,
      error.message,
      error.stack
    );
    return NextResponse.json(
      { message: MESSAGES.COMMON.SERVER_ERROR, error: error.message },
      { status: 500 }
    );
  }
}
