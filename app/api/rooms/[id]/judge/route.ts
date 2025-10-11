import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { Room, RoomModel } from '@/core/models/room';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/rooms/[id]/judge - 심판 판결 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params; // Next.js 15: params is now a Promise

  console.info('[judge-api] GET start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[judge-api] GET unauthorized', { requestId });
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

    // 방 접근 권한 확인
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
        return NextResponse.json(
          { 
            error: 'not_found', 
            message: '방을 찾을 수 없거나 접근 권한이 없습니다',
            requestId 
          },
          { status: 404 }
        );
      }

      console.error('[judge-api] GET room fetch error', { 
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

    // 판사 판결 조회 (room_id 기반)
    const { data: judgeData, error: judgeError } = await supabase
      .from('judge_decisions')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (judgeError) {
      if (judgeError.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'not_found',
            message: '판사 판결이 아직 나오지 않았습니다',
            requestId
          },
          { status: 404 }
        );
      }

      console.error('[judge-api] GET judge decision fetch error', {
        requestId,
        error: judgeError.message
      });
      return NextResponse.json(
        {
          error: 'database_error',
          message: '판사 판결 조회 중 오류가 발생했습니다',
          requestId
        },
        { status: 500 }
      );
    }

    // content 필드에서 판결 정보 추출
    const content = judgeData.content || {};

    console.info('[judge-api] GET success', {
      requestId,
      roomId,
      userId,
      hasDecision: !!judgeData
    });

    return NextResponse.json({
      decision: {
        id: judgeData.id,
        winner: content.winner || content.decision,
        reasoning: content.reasoning,
        analysis_a: content.analysis_a,
        analysis_b: content.analysis_b,
        score_a: content.score_a,
        score_b: content.score_b,
        key_factors: content.key_factors || [],
        created_at: judgeData.created_at
      },
      room: {
        id: room.id,
        title: room.title,
        status: room.status
      },
      requestId
    });

  } catch (error) {
    console.error('[judge-api] GET unexpected error', { 
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
