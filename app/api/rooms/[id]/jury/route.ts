import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { Room, RoomModel, RoomStatus } from '@/core/models/room';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/rooms/[id]/jury - 배심원 투표 결과 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params; // Next.js 15: params is now a Promise

  console.info('[jury-api] GET start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[jury-api] GET unauthorized', { requestId });
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

      console.error('[jury-api] GET room fetch error', { 
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

    // 배심원 투표 조회 (room_id 기반)
    const { data: juryVotes, error: juryVotesError } = await supabase
      .from('jury_votes')
      .select('*')
      .eq('room_id', roomId)
      .order('juror_number', { ascending: true });

    if (juryVotesError) {
      console.error('[jury-api] GET jury votes fetch error', {
        requestId,
        error: juryVotesError.message
      });
      return NextResponse.json(
        {
          error: 'database_error',
          message: '배심원 투표 조회 중 오류가 발생했습니다',
          requestId
        },
        { status: 500 }
      );
    }

    // 투표 통계 계산
    const votes = juryVotes || [];
    const votesA = votes.filter(vote => vote.vote === 'A').length;
    const votesB = votes.filter(vote => vote.vote === 'B').length;
    const totalVotes = votes.length;
    const expectedJurors = 7; // 기본 배심원 수

    const averageConfidence = totalVotes > 0
      ? Math.round(votes.reduce((sum, vote) => sum + (vote.confidence || 0), 0) / totalVotes * 10) / 10
      : 0;

    // 합의 수준 계산
    let consensusLevel: 'high' | 'medium' | 'low' = 'low';
    if (totalVotes >= expectedJurors) {
      const majorityVotes = Math.max(votesA, votesB);
      const consensusRatio = majorityVotes / totalVotes;

      if (consensusRatio >= 0.8) {
        consensusLevel = 'high';
      } else if (consensusRatio >= 0.6) {
        consensusLevel = 'medium';
      }
    }

    // 투표 진행률 계산
    const votingProgress = Math.round((totalVotes / expectedJurors) * 100);

    console.info('[jury-api] GET success', {
      requestId,
      roomId,
      userId,
      totalVotes,
      votesA,
      votesB
    });

    return NextResponse.json({
      votes: votes.map((vote: any) => ({
        id: vote.id,
        juror_number: vote.juror_number,
        vote: vote.vote,
        reasoning: vote.reasoning,
        confidence: vote.confidence,
        created_at: vote.created_at
      })),
      statistics: {
        total_votes: totalVotes,
        votes_a: votesA,
        votes_b: votesB,
        voting_progress: votingProgress,
        average_confidence: averageConfidence,
        consensus_level: consensusLevel,
        is_voting_complete: totalVotes >= expectedJurors,
        majority_side: votesA > votesB ? 'A' : votesB > votesA ? 'B' : null
      },
      room: {
        id: room.id,
        title: room.title,
        status: room.status
      },
      requestId
    });

  } catch (error) {
    console.error('[jury-api] GET unexpected error', { 
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
