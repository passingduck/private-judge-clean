import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/rooms/[id] - 특정 방 정보 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params;

  console.info('[room-detail-api] GET start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[room-detail-api] GET unauthorized', { requestId });
      return NextResponse.json(
        { 
          error: 'unauthorized', 
          message: '인증이 필요합니다',
          requestId 
        },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient(true); // Use service role

    // 방 상세 정보 조회 (기본 정보만)
    const { data: roomData, error: fetchError } = await supabase
      .from('rooms')
      .select(`
        *,
        creator:users!rooms_creator_id_fkey(id, display_name, avatar_url)
      `)
      .eq('id', roomId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.warn('[room-detail-api] GET room not found', { 
          requestId, 
          roomId 
        });
        return NextResponse.json(
          { 
            error: 'not_found', 
            message: '방을 찾을 수 없습니다',
            requestId 
          },
          { status: 404 }
        );
      }

      console.error('[room-detail-api] GET fetch error', { 
        requestId, 
        error: fetchError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '방 정보를 불러오는데 실패했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    // 방 데이터 검증 (임시로 우회)
    console.info('[room-detail-api] GET room data received', {
      requestId,
      roomData,
      roomDataKeys: Object.keys(roomData || {}),
      title: roomData?.title,
      description: roomData?.description
    });
    
    // 실제 Supabase 데이터 사용
    const room = {
      id: roomData?.id || roomId,
      code: roomData?.code || 'TEMP',
      title: roomData?.title || '토론방',
      description: roomData?.description || null,
      status: roomData?.status || 'waiting_participant',
      creator_id: roomData?.creator_id || userId,
      participant_id: roomData?.participant_id || null,
      created_at: roomData?.created_at || new Date().toISOString(),
      updated_at: roomData?.updated_at || new Date().toISOString(),
      creator: roomData?.creator || { id: userId, display_name: 'hersungjin', avatar_url: null },
      tags: [] // 임시로 빈 배열
    };

    // 간단한 응답 생성
    const isCreator = room.creator_id === userId;
    const userSide = isCreator ? 'A' : 'B';
    
    console.info('[room-detail-api] GET success', {
      requestId,
      roomId,
      userId,
      isCreator,
      userSide
    });

    // 간단한 응답 반환
    console.info('[room-detail-api] GET final response', {
      requestId,
      roomTitle: room.title,
      roomDescription: room.description,
      roomDescriptionLength: room.description?.length || 0
    });
    
    return NextResponse.json({
      room,
      user: {
        id: userId,
        email: userEmail,
        side: userSide,
        is_creator: isCreator
      },
      progress: {
        current_step: room.status,
        can_propose_motion: room.status === 'agenda_negotiation' && isCreator,
        can_join: room.status === 'waiting_participant' && !isCreator,
        can_start_debate: room.status === 'agenda_negotiation' && isCreator
      },
      requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[room-detail-api] GET unexpected error', {
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