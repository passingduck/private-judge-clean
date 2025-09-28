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

    // 토론 세션 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('debate_sessions')
      .select('id, status, config')
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

      console.error('[jury-api] GET session fetch error', { 
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

    // 배심원 프로필 조회
    const { data: jurorProfiles, error: jurorProfilesError } = await supabase
      .from('juror_profiles')
      .select('*')
      .eq('session_id', sessionData.id)
      .order('created_at', { ascending: true });

    if (jurorProfilesError) {
      console.error('[jury-api] GET juror profiles fetch error', { 
        requestId, 
        error: jurorProfilesError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '배심원 프로필 조회 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    // 배심원 투표 조회
    const { data: juryVotes, error: juryVotesError } = await supabase
      .from('jury_votes')
      .select('*')
      .eq('session_id', sessionData.id)
      .order('created_at', { ascending: true });

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

    // 배심원별 투표 결과 매핑
    const jurorVoteMap = new Map();
    (juryVotes || []).forEach(vote => {
      jurorVoteMap.set(vote.juror_id, vote);
    });

    // 배심원 정보와 투표 결과 결합
    const jurors = (jurorProfiles || []).map(profile => {
      const vote = jurorVoteMap.get(profile.id);
      return {
        id: profile.id,
        name: profile.name,
        background: profile.background,
        expertise: profile.expertise,
        bias: profile.bias,
        vote: vote ? {
          vote: vote.vote,
          reasoning: vote.reasoning,
          confidence: vote.confidence,
          bias_detected: vote.bias_detected,
          created_at: vote.created_at
        } : null,
        has_voted: !!vote,
        created_at: profile.created_at
      };
    });

    // 투표 통계 계산
    const votes = juryVotes || [];
    const votesA = votes.filter(vote => vote.vote === 'A').length;
    const votesB = votes.filter(vote => vote.vote === 'B').length;
    const totalVotes = votes.length;
    const expectedJurors = sessionData.config?.jury_size || 5;
    
    const averageConfidence = totalVotes > 0 
      ? Math.round(votes.reduce((sum, vote) => sum + vote.confidence, 0) / totalVotes * 10) / 10
      : 0;

    const biasDetectedCount = votes.filter(vote => vote.bias_detected).length;

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
      sessionId: sessionData.id,
      totalJurors: jurors.length,
      totalVotes,
      votesA,
      votesB
    });

    return NextResponse.json({
      session_id: sessionData.id,
      session_status: sessionData.status,
      jurors,
      voting_statistics: {
        total_jurors: jurors.length,
        expected_jurors: expectedJurors,
        total_votes: totalVotes,
        votes_a: votesA,
        votes_b: votesB,
        voting_progress: votingProgress,
        average_confidence: averageConfidence,
        bias_detected_count: biasDetectedCount,
        consensus_level: consensusLevel,
        is_voting_complete: totalVotes >= expectedJurors,
        majority_side: votesA > votesB ? 'A' : votesB > votesA ? 'B' : null
      },
      voting_breakdown: {
        by_confidence: {
          high: votes.filter(vote => vote.confidence >= 8).length,
          medium: votes.filter(vote => vote.confidence >= 6 && vote.confidence < 8).length,
          low: votes.filter(vote => vote.confidence < 6).length
        },
        by_bias_detection: {
          bias_detected: biasDetectedCount,
          no_bias: totalVotes - biasDetectedCount
        }
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
