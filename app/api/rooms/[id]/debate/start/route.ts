import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { Room, RoomModel, RoomStatus } from '@/core/models/room';
import { JobType, CreateJob, JobModel } from '@/core/models/job';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/rooms/[id]/debate/start - AI 토론 시작
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params; // Next.js 15: params is now a Promise

  console.info('[debate-start-api] POST start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[debate-start-api] POST unauthorized', { requestId });
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

    const supabase = getSupabaseClient(true); // Use service role
    console.log('[debate-start-api] POST supabase client check', {
      requestId,
      isServiceRoleConfigured: require('@/data/supabase/client').isServiceRoleConfigured(),
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE
    });

    // 방 정보 조회
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) {
      if (roomError.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'not_found',
            message: '방을 찾을 수 없습니다',
            requestId
          },
          { status: 404 }
        );
      }

      console.error('[debate-start-api] POST room fetch error', {
        requestId,
        error: roomError.message
      });
      return NextResponse.json(
        {
          error: 'database_error',
          message: '방 정보 조회 중 오류가 발생했습니다',
          requestId
        },
        { status: 500 }
      );
    }

    const roomValidation = RoomModel.validate(roomData);
    if (!roomValidation.success) {
      return NextResponse.json(
        {
          error: 'data_error',
          message: '방 데이터가 유효하지 않습니다',
          requestId
        },
        { status: 500 }
      );
    }

    const room: Room = roomValidation.data;
    const roomModel = new RoomModel(room);

    // 권한 확인 (생성자 또는 참가자만 토론 시작 가능)
    if (!roomModel.isCreator(userId) && !roomModel.isParticipant(userId)) {
      console.warn('[debate-start-api] POST not authorized', {
        requestId,
        roomId,
        userId
      });
      return NextResponse.json(
        {
          error: 'forbidden',
          message: '방 참여자만 토론을 시작할 수 있습니다',
          requestId
        },
        { status: 403 }
      );
    }

    // 방 상태 확인 (주장 제출 단계여야 함)
    if (room.status !== RoomStatus.ARGUMENTS_SUBMISSION) {
      console.warn('[debate-start-api] POST invalid room status', {
        requestId,
        roomId,
        status: room.status
      });
      return NextResponse.json(
        {
          error: 'invalid_status',
          message: '주장 제출 단계에서만 토론을 시작할 수 있습니다',
          requestId
        },
        { status: 409 }
      );
    }

    // 안건 조회 (별도 쿼리)
    const { data: motionData, error: motionError } = await supabase
      .from('motions')
      .select('id, title, description, status, agreed_at')
      .eq('room_id', roomId)
      .eq('status', 'agreed')
      .single();

    if (motionError || !motionData) {
      console.warn('[debate-start-api] POST no agreed motion', {
        requestId,
        roomId,
        motionError: motionError?.message,
        motionErrorDetails: JSON.stringify(motionError),
        motionData: motionData
      });
      return NextResponse.json(
        {
          error: 'no_motion',
          message: '합의된 안건이 없습니다',
          requestId,
          debug: {
            motionError: motionError?.message,
            motionErrorCode: (motionError as any)?.code
          }
        },
        { status: 409 }
      );
    }

    // 양측 주장 조회 (별도 쿼리)
    const { data: argumentsData, error: argumentsError } = await supabase
      .from('arguments')
      .select('id, user_id, side, title, content, evidence, submitted_at')
      .eq('room_id', roomId);

    if (argumentsError) {
      console.error('[debate-start-api] POST arguments fetch error', {
        requestId,
        error: argumentsError.message
      });
      return NextResponse.json(
        {
          error: 'database_error',
          message: '주장 조회 중 오류가 발생했습니다',
          requestId
        },
        { status: 500 }
      );
    }

    const argumentsA = argumentsData?.filter((arg: any) => arg.side === 'A') || [];
    const argumentsB = argumentsData?.filter((arg: any) => arg.side === 'B') || [];

    if (argumentsA.length === 0 || argumentsB.length === 0) {
      console.warn('[debate-start-api] POST missing arguments', { 
        requestId, 
        roomId,
        argumentsA: argumentsA.length,
        argumentsB: argumentsB.length
      });
      return NextResponse.json(
        { 
          error: 'missing_arguments', 
          message: '양측 모두 주장을 제출해야 합니다',
          requestId 
        },
        { status: 409 }
      );
    }

    // 방 상태를 1차 토론으로 변경
    const { error: statusUpdateError } = await supabase
      .from('rooms')
      .update({
        status: RoomStatus.DEBATE_ROUND_1,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId);

    if (statusUpdateError) {
      console.error('[debate-start-api] POST status update error', {
        requestId,
        error: statusUpdateError.message
      });
      return NextResponse.json(
        {
          error: 'database_error',
          message: '방 상태 업데이트에 실패했습니다',
          requestId
        },
        { status: 500 }
      );
    }

    // 1라운드 생성
    const { data: roundData, error: roundError } = await supabase
      .from('rounds')
      .insert({
        room_id: roomId,
        round_number: 1,
        round_type: 'first',
        status: 'pending'
      })
      .select()
      .single();

    if (roundError) {
      console.error('[debate-start-api] POST round creation error', { 
        requestId, 
        error: roundError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '토론 라운드 생성에 실패했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    // AI 토론 작업 생성
    const debateJobData: CreateJob = {
      type: JobType.AI_DEBATE,
      room_id: roomId,
      payload: {
        room_id: roomId,
        round: 1,
        motion: {
          id: motionData.id,
          title: motionData.title,
          description: motionData.description
        },
        argument_a: argumentsA[0],
        argument_b: argumentsB[0],
        previous_sessions: []
      },
      max_retries: 3
    };

    const jobValidation = JobModel.validateCreate(debateJobData);
    if (!jobValidation.success) {
      console.error('[debate-start-api] POST job validation failed', { 
        requestId, 
        error: jobValidation.error 
      });
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: `작업 데이터 검증 실패: ${jobValidation.error}`,
          requestId 
        },
        { status: 400 }
      );
    }

    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        type: debateJobData.type,
        room_id: debateJobData.room_id,
        payload: debateJobData.payload,
        status: 'queued',
        max_retries: debateJobData.max_retries
      })
      .select()
      .single();

    if (jobError) {
      console.error('[debate-start-api] POST job creation error', { 
        requestId, 
        error: jobError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: 'AI 토론 작업 생성에 실패했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    console.info('[debate-start-api] POST success', { 
      requestId, 
      roomId, 
      roundId: roundData.id,
      jobId: jobData.id,
      userId
    });

    return NextResponse.json({
      message: 'AI 토론이 시작되었습니다',
      room_id: roomId,
      round: {
        id: roundData.id,
        round_number: 1,
        round_type: 'first',
        status: 'pending'
      },
      job: {
        id: jobData.id,
        type: jobData.type,
        status: jobData.status,
        created_at: jobData.created_at
      },
      estimated_duration: '약 10-15분 소요 예정',
      requestId
    }, { status: 201 });

  } catch (error) {
    console.error('[debate-start-api] POST unexpected error', { 
      requestId, 
      roomId,
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
