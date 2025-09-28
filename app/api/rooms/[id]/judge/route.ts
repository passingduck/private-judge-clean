import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { Room, RoomModel, RoomStatus } from '@/core/models/room';
import { Verdict, VerdictModel } from '@/core/models/verdict';

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

    // 토론 세션 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('debate_sessions')
      .select('id, status')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            error: 'not_found', 
            message: '토론 세션을 찾을 수 없습니다',
            requestId 
          },
          { status: 404 }
        );
      }

      console.error('[judge-api] GET session fetch error', { 
        requestId, 
        error: sessionError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '토론 세션 조회 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    // 심판 판결 조회
    const { data: judgeData, error: judgeError } = await supabase
      .from('judge_decisions')
      .select('*')
      .eq('session_id', sessionData.id)
      .single();

    if (judgeError) {
      if (judgeError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            error: 'not_found', 
            message: '심판 판결이 아직 나오지 않았습니다',
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
          message: '심판 판결 조회 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    const verdictValidation = VerdictModel.validate(judgeData);
    if (!verdictValidation.success) {
      console.error('[judge-api] GET verdict validation failed', { 
        requestId, 
        error: verdictValidation.error 
      });
      return NextResponse.json(
        { 
          error: 'data_error', 
          message: '심판 판결 데이터가 유효하지 않습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    const verdict: Verdict = verdictValidation.data;
    const verdictModel = new VerdictModel(verdict);

    // 배심원 투표 조회
    const { data: juryVotes, error: juryError } = await supabase
      .from('jury_votes')
      .select('*')
      .eq('session_id', sessionData.id)
      .order('created_at', { ascending: true });

    if (juryError) {
      console.warn('[judge-api] GET jury votes fetch error', { 
        requestId, 
        error: juryError.message 
      });
    }

    // 토론 라운드 및 턴 조회
    const { data: roundsData, error: roundsError } = await supabase
      .from('rounds')
      .select(`
        *,
        turns:debate_turns(*)
      `)
      .eq('session_id', sessionData.id)
      .order('round_number', { ascending: true });

    if (roundsError) {
      console.warn('[judge-api] GET rounds fetch error', { 
        requestId, 
        error: roundsError.message 
      });
    }

    const summary = verdictModel.getSummary();

    console.info('[judge-api] GET success', { 
      requestId, 
      roomId, 
      userId,
      sessionId: sessionData.id,
      winner: verdict.winner,
      juryVotesCount: juryVotes?.length || 0
    });

    return NextResponse.json({
      session_id: sessionData.id,
      session_status: sessionData.status,
      judge_decision: {
        id: verdict.id,
        winner: verdict.winner,
        reasoning: verdict.reasoning,
        strengths_a: verdict.strengths_a,
        weaknesses_a: verdict.weaknesses_a,
        strengths_b: verdict.strengths_b,
        weaknesses_b: verdict.weaknesses_b,
        overall_quality: verdict.overall_quality,
        fairness_score: (verdict as any).fairness_score || 0,
        clarity_score: (verdict as any).clarity_score || 0,
        created_at: verdict.created_at
      },
      jury_votes: (juryVotes || []).map((vote: any) => ({
        id: vote.id,
        juror_id: vote.juror_id,
        vote: vote.vote,
        reasoning: vote.reasoning,
        confidence: vote.confidence,
        bias_detected: vote.bias_detected,
        created_at: vote.created_at
      })),
      debate_rounds: (roundsData || []).map((round: any) => ({
        id: round.id,
        round_number: round.round_number,
        status: round.status,
        turns: (round.turns || []).map((turn: any) => ({
          id: turn.id,
          turn_number: turn.turn_number,
          side: turn.side,
          content: turn.content,
          created_at: turn.created_at
        })),
        started_at: round.started_at,
        completed_at: round.completed_at
      })),
      statistics: {
        total_rounds: roundsData?.length || 0,
        total_turns: roundsData?.reduce((sum: number, round: any) => sum + (round.turns?.length || 0), 0) || 0,
        jury_votes_count: juryVotes?.length || 0,
        jury_consensus: summary.isUnanimous ? 'high' : summary.isClose ? 'low' : 'medium',
        average_jury_confidence: summary.averageConfidence,
        verdict_strength: summary.credibility
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
