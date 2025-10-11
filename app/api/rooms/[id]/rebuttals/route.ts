import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { rebuttalQueries } from '@/data/supabase/queries';
import { RebuttalModel, CreateRebuttalSchema, RebuttalRound } from '@/core/models/rebuttal';
import { ArgumentSide } from '@/core/models/argument';
import { getSupabaseClient } from '@/data/supabase/client';
import { RoomStatus } from '@/core/models/room';
import { JobType, CreateJob, JobModel } from '@/core/models/job';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/rooms/[id]/rebuttals - 방의 반론 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params;

  // URL에서 round_number 쿼리 파라미터 가져오기
  const { searchParams } = new URL(request.url);
  const roundNumber = searchParams.get('round_number');

  console.info('[rebuttals-api] GET start', {
    requestId,
    userId,
    userEmail,
    roomId,
    roundNumber
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[rebuttals-api] GET unauthorized', { requestId });
      return NextResponse.json(
        {
          error: 'unauthorized',
          message: '인증이 필요합니다',
          requestId
        },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient(true); // admin client

    // 방 정보 조회
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*, room_members(user_id, role, side)')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return NextResponse.json(
        {
          error: 'not_found',
          message: '방을 찾을 수 없습니다',
          requestId
        },
        { status: 404 }
      );
    }

    // 사용자가 이 방의 멤버인지 확인
    const roomMembers = roomData.room_members as any[];
    const userMember = roomMembers?.find((m: any) => m.user_id === userId);

    if (!userMember) {
      return NextResponse.json(
        {
          error: 'forbidden',
          message: '이 방의 멤버가 아닙니다',
          requestId
        },
        { status: 403 }
      );
    }

    // 반론 조회 (라운드 지정 여부에 따라 다르게 조회)
    let rebuttals;
    if (roundNumber) {
      const round = parseInt(roundNumber, 10);
      if (![1, 2].includes(round)) {
        return NextResponse.json(
          {
            error: 'invalid_round',
            message: '라운드는 1 또는 2여야 합니다',
            requestId
          },
          { status: 400 }
        );
      }
      rebuttals = await rebuttalQueries.getByRoomIdAndRound(roomId, round);
    } else {
      rebuttals = await rebuttalQueries.getByRoomId(roomId);
    }

    // 내 반론과 상대방 반론 분리
    const myRebuttals = rebuttals.filter((r: any) => r.user_id === userId);
    const opponentRebuttals = rebuttals.filter((r: any) => r.user_id !== userId);

    console.info('[rebuttals-api] GET success', {
      requestId,
      roomId,
      userId,
      myRebuttalsCount: myRebuttals.length,
      opponentRebuttalsCount: opponentRebuttals.length
    });

    return NextResponse.json({
      my_rebuttals: myRebuttals,
      opponent_rebuttals: opponentRebuttals,
      all_rebuttals: rebuttals,
      user_side: userMember.side,
      requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[rebuttals-api] GET unexpected error', {
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

// POST /api/rooms/[id]/rebuttals - 반론 제출
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params;

  console.info('[rebuttals-api] POST start', {
    requestId,
    userId,
    userEmail,
    roomId
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[rebuttals-api] POST unauthorized', { requestId });
      return NextResponse.json(
        {
          error: 'unauthorized',
          message: '인증이 필요합니다',
          requestId
        },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient(true); // admin client

    // 요청 body 파싱
    const body = await request.json();

    // 방 정보 조회
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*, room_members(user_id, role, side)')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return NextResponse.json(
        {
          error: 'not_found',
          message: '방을 찾을 수 없습니다',
          requestId
        },
        { status: 404 }
      );
    }

    // 방 상태 확인 - 반론 대기 상태인지 확인
    const validStatuses = ['waiting_rebuttal_1', 'waiting_rebuttal_2'];
    if (!validStatuses.includes(roomData.status)) {
      return NextResponse.json(
        {
          error: 'invalid_state',
          message: '반론 제출 단계가 아닙니다',
          current_status: roomData.status,
          requestId
        },
        { status: 400 }
      );
    }

    // 사용자가 이 방의 멤버인지 확인
    const roomMembers = roomData.room_members as any[];
    const userMember = roomMembers?.find((m: any) => m.user_id === userId);

    if (!userMember) {
      return NextResponse.json(
        {
          error: 'forbidden',
          message: '이 방의 멤버가 아닙니다',
          requestId
        },
        { status: 403 }
      );
    }

    // 라운드 번호 결정
    const roundNumber = roomData.status === 'waiting_rebuttal_1'
      ? RebuttalRound.AFTER_ROUND_1
      : RebuttalRound.AFTER_ROUND_2;

    // 이미 제출했는지 확인
    const existingRebuttal = await rebuttalQueries.getByUserRoomAndRound(
      userId,
      roomId,
      roundNumber
    );

    if (existingRebuttal) {
      return NextResponse.json(
        {
          error: 'already_submitted',
          message: '이미 반론을 제출했습니다',
          requestId
        },
        { status: 400 }
      );
    }

    // 데이터 검증
    const validation = CreateRebuttalSchema.safeParse({
      ...body,
      room_id: roomId,
      round_number: roundNumber
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        {
          error: 'validation_error',
          message: `${firstError.path.join('.')}: ${firstError.message}`,
          requestId
        },
        { status: 400 }
      );
    }

    // 반론 생성
    const side = userMember.side === 'A' ? ArgumentSide.A : ArgumentSide.B;
    const newRebuttal = RebuttalModel.createNew(validation.data, userId, side);

    // DB에 저장
    const createdRebuttal = await rebuttalQueries.create(newRebuttal);

    // 양쪽 반론이 모두 제출되었는지 확인
    const allRebuttals = await rebuttalQueries.getByRoomIdAndRound(roomId, roundNumber);
    const bothSubmitted = allRebuttals.length >= 2;

    // 양측 반론이 모두 제출되면 다음 라운드 시작
    if (bothSubmitted) {
      // 다음 상태 결정
      const nextStatus = roundNumber === RebuttalRound.AFTER_ROUND_1
        ? RoomStatus.DEBATE_ROUND_2
        : RoomStatus.DEBATE_ROUND_3;

      const nextRoundNumber = roundNumber === RebuttalRound.AFTER_ROUND_1 ? 2 : 3;

      // 방 상태 업데이트
      const { error: statusUpdateError } = await supabase.rpc(
        'update_room_status',
        {
          p_room_id: roomId,
          p_new_status: nextStatus,
          p_user_id: userId
        }
      );

      if (statusUpdateError) {
        console.error('[rebuttals-api] POST status update error', {
          requestId,
          error: statusUpdateError.message
        });
      } else {
        // 다음 라운드 생성
        const { data: roundData, error: roundError } = await supabase
          .from('rounds')
          .insert({
            room_id: roomId,
            round_number: nextRoundNumber,
            round_type: nextRoundNumber === 2 ? 'second' : 'final',
            status: 'pending'
          })
          .select()
          .single();

        if (roundError) {
          console.error('[rebuttals-api] POST round creation error', {
            requestId,
            error: roundError.message
          });
        } else {
          // 안건 및 주장 조회
          const { data: motionData } = await supabase
            .from('motions')
            .select('id, title, description')
            .eq('room_id', roomId)
            .eq('status', 'agreed')
            .single();

          const { data: argumentsData } = await supabase
            .from('arguments')
            .select('*')
            .eq('room_id', roomId);

          if (motionData && argumentsData) {
            const argumentA = argumentsData.find((arg: any) => arg.side === 'A');
            const argumentB = argumentsData.find((arg: any) => arg.side === 'B');

            // 이전 라운드 반론 조회
            const previousRebuttals = await rebuttalQueries.getByRoomId(roomId);

            // AI 토론 작업 생성
            const debateJobData: CreateJob = {
              type: JobType.AI_DEBATE,
              room_id: roomId,
              payload: {
                room_id: roomId,
                round: nextRoundNumber,
                motion: {
                  id: motionData.id,
                  title: motionData.title,
                  description: motionData.description
                },
                argument_a: argumentA,
                argument_b: argumentB,
                rebuttals: previousRebuttals
              },
              max_retries: 3
            };

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
              console.error('[rebuttals-api] POST job creation error', {
                requestId,
                error: jobError.message
              });
            } else {
              console.info('[rebuttals-api] POST next round started', {
                requestId,
                roomId,
                nextRoundNumber,
                roundId: roundData.id,
                jobId: jobData.id
              });
            }
          }
        }
      }
    }

    console.info('[rebuttals-api] POST success', {
      requestId,
      roomId,
      userId,
      rebuttalId: createdRebuttal.id,
      roundNumber,
      bothSubmitted
    });

    return NextResponse.json({
      rebuttal: createdRebuttal,
      both_submitted: bothSubmitted,
      room_status: roomData.status,
      message: bothSubmitted
        ? '양측 반론이 모두 제출되었습니다. 다음 라운드가 자동으로 시작됩니다.'
        : '반론이 성공적으로 제출되었습니다',
      requestId
    }, { status: 201 });

  } catch (error) {
    console.error('[rebuttals-api] POST unexpected error', {
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
