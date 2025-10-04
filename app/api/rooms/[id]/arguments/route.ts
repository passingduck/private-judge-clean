import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { argumentQueries } from '@/data/supabase/queries';
import { ArgumentModel, CreateArgumentSchema, ArgumentSide } from '@/core/models/argument';
import { getSupabaseClient } from '@/data/supabase/client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/rooms/[id]/arguments - 방의 주장 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params;

  console.info('[arguments-api] GET start', {
    requestId,
    userId,
    userEmail,
    roomId
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[arguments-api] GET unauthorized', { requestId });
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

    // 방의 모든 주장 조회
    const arguments = await argumentQueries.getByRoomId(roomId);

    // 내 주장과 상대방 주장 분리
    const myArgument = arguments.find(arg => arg.user_id === userId) || null;
    const opponentArgument = arguments.find(arg => arg.user_id !== userId) || null;

    // 제출 가능 여부 확인 (status가 arguments_submission이고 아직 제출하지 않은 경우)
    const canSubmit = roomData.status === 'arguments_submission' && !myArgument;

    console.info('[arguments-api] GET success', {
      requestId,
      roomId,
      userId,
      hasMyArgument: !!myArgument,
      hasOpponentArgument: !!opponentArgument,
      canSubmit
    });

    return NextResponse.json({
      my_argument: myArgument,
      opponent_argument: opponentArgument,
      user_side: userMember.side,
      can_submit: canSubmit,
      requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[arguments-api] GET unexpected error', {
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

// POST /api/rooms/[id]/arguments - 주장 제출
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params;

  console.info('[arguments-api] POST start', {
    requestId,
    userId,
    userEmail,
    roomId
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[arguments-api] POST unauthorized', { requestId });
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

    // 방 상태 확인
    if (roomData.status !== 'arguments_submission') {
      return NextResponse.json(
        {
          error: 'invalid_state',
          message: '주장 제출 단계가 아닙니다',
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

    // 이미 제출했는지 확인
    const existingArgument = await argumentQueries.getByUserAndRoom(userId, roomId);
    if (existingArgument) {
      return NextResponse.json(
        {
          error: 'already_submitted',
          message: '이미 주장을 제출했습니다',
          requestId
        },
        { status: 400 }
      );
    }

    // 데이터 검증
    const validation = CreateArgumentSchema.safeParse({
      ...body,
      room_id: roomId
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

    // 주장 생성
    const side = userMember.side as ArgumentSide;
    const newArgument = ArgumentModel.createNew(validation.data, userId, side);

    // DB에 저장
    const createdArgument = await argumentQueries.create(newArgument);

    // 양쪽 주장이 모두 제출되었는지 확인
    const allArguments = await argumentQueries.getByRoomId(roomId);
    if (allArguments.length >= 2) {
      // 방 상태를 ai_processing으로 변경
      await supabase
        .from('rooms')
        .update({
          status: 'ai_processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId);
    }

    console.info('[arguments-api] POST success', {
      requestId,
      roomId,
      userId,
      argumentId: createdArgument.id,
      bothSubmitted: allArguments.length >= 2
    });

    return NextResponse.json({
      argument: createdArgument,
      room_status: allArguments.length >= 2 ? 'ai_processing' : 'arguments_submission',
      message: allArguments.length >= 2
        ? '양측 주장이 모두 제출되어 AI 토론이 시작됩니다'
        : '주장이 성공적으로 제출되었습니다',
      requestId
    }, { status: 201 });

  } catch (error) {
    console.error('[arguments-api] POST unexpected error', {
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
