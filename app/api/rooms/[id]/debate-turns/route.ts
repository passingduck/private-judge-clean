import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/rooms/[id]/debate-turns - 토론 턴 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params;

  console.info('[debate-turns-api] GET start', {
    requestId,
    userId,
    userEmail,
    roomId,
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'unauthorized', message: '인증이 필요합니다', requestId },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient(true);

    // 방 접근 권한 확인
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, creator_id, participant_id')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'not_found', message: '방을 찾을 수 없습니다', requestId },
        { status: 404 }
      );
    }

    // 권한 확인
    if (room.creator_id !== userId && room.participant_id !== userId) {
      return NextResponse.json(
        { error: 'forbidden', message: '접근 권한이 없습니다', requestId },
        { status: 403 }
      );
    }

    // 라운드와 토론 턴 조회
    const { data: rounds, error: roundsError } = await supabase
      .from('rounds')
      .select(`
        id,
        round_number,
        round_type,
        status,
        started_at,
        completed_at,
        debate_turns (
          id,
          turn_number,
          side,
          lawyer_type,
          content,
          status,
          started_at,
          completed_at,
          created_at
        )
      `)
      .eq('room_id', roomId)
      .order('round_number', { ascending: true });

    if (roundsError) {
      console.error('[debate-turns-api] GET error', {
        requestId,
        error: roundsError.message,
      });
      return NextResponse.json(
        { error: 'database_error', message: '토론 턴 조회 실패', requestId },
        { status: 500 }
      );
    }

    // 토론 턴을 라운드별로 정리
    const formattedRounds = (rounds || []).map((round: any) => ({
      id: round.id,
      round_number: round.round_number,
      round_type: round.round_type,
      status: round.status,
      started_at: round.started_at,
      completed_at: round.completed_at,
      turns: (round.debate_turns || [])
        .sort((a: any, b: any) => a.turn_number - b.turn_number)
        .map((turn: any) => ({
          id: turn.id,
          turn_number: turn.turn_number,
          side: turn.side,
          lawyer_type: turn.lawyer_type,
          content: turn.content,
          status: turn.status,
          started_at: turn.started_at,
          completed_at: turn.completed_at,
          created_at: turn.created_at,
        })),
    }));

    console.info('[debate-turns-api] GET success', {
      requestId,
      roomId,
      roundsCount: formattedRounds.length,
    });

    return NextResponse.json({
      rounds: formattedRounds,
      statistics: {
        total_rounds: formattedRounds.length,
        completed_rounds: formattedRounds.filter((r: any) => r.status === 'completed').length,
        total_turns: formattedRounds.reduce((sum: number, r: any) => sum + (r.turns?.length || 0), 0),
      },
      requestId,
    });
  } catch (error) {
    console.error('[debate-turns-api] GET unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'internal_error', message: '서버 내부 오류', requestId },
      { status: 500 }
    );
  }
}
