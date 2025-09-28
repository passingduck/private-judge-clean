import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { 
  Room, 
  RoomModel, 
  RoomUtils,
  RoomStatus 
} from '@/core/models/room';

// POST /api/rooms/join - 방 코드로 입장
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');

  console.info('[rooms-join-api] POST start', { 
    requestId, 
    userId, 
    userEmail 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[rooms-join-api] POST unauthorized', { requestId });
      return NextResponse.json(
        { 
          error: 'unauthorized', 
          message: '인증이 필요합니다',
          requestId 
        },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    console.info('[rooms-join-api] POST body received', { 
      requestId, 
      bodyKeys: Object.keys(body) 
    });

    // 방 코드 검증
    const { code } = body;
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '방 코드가 필요합니다',
          requestId 
        },
        { status: 400 }
      );
    }

    if (!RoomUtils.isValidRoomCode(code)) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '유효하지 않은 방 코드 형식입니다 (6자리 영숫자)',
          requestId 
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(true); // Use service role

    // 방 코드로 방 조회
    const { data: roomData, error: fetchError } = await supabase
      .from('rooms')
      .select(`
        *,
        creator:users!rooms_creator_id_fkey(id, display_name, avatar_url),
        participant:users!rooms_participant_id_fkey(id, display_name, avatar_url)
      `)
      .eq('code', code.toUpperCase())
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.warn('[rooms-join-api] POST room not found', { 
          requestId, 
          code 
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

      console.error('[rooms-join-api] POST fetch room error', { 
        requestId, 
        error: fetchError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '방 조회 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    // 방 데이터 검증
    const roomValidation = RoomModel.validate(roomData);
    if (!roomValidation.success) {
      console.error('[rooms-join-api] POST room validation failed', { 
        requestId, 
        error: roomValidation.error 
      });
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

    // 비즈니스 로직 검증
    
    // 1. 자신이 생성한 방인지 확인
    if (roomModel.isCreator(userId)) {
      console.warn('[rooms-join-api] POST creator cannot join own room', { 
        requestId, 
        roomId: room.id, 
        userId 
      });
      return NextResponse.json(
        { 
          error: 'already_member', 
          message: '자신이 생성한 방에는 입장할 수 없습니다',
          requestId 
        },
        { status: 409 }
      );
    }

    // 2. 이미 참가자인지 확인
    if (roomModel.isParticipant(userId)) {
      console.warn('[rooms-join-api] POST already participant', { 
        requestId, 
        roomId: room.id, 
        userId 
      });
      return NextResponse.json(
        { 
          error: 'already_member', 
          message: '이미 참여 중인 방입니다',
          requestId 
        },
        { status: 409 }
      );
    }

    // 3. 방이 입장 가능한 상태인지 확인
    if (!roomModel.canJoin()) {
      console.warn('[rooms-join-api] POST cannot join room', { 
        requestId, 
        roomId: room.id, 
        status: room.status,
        hasParticipant: roomModel.hasParticipant()
      });

      let message = '이 방에 입장할 수 없습니다';
      if (roomModel.isFull()) {
        message = '방이 가득 찼습니다';
      } else if (!roomModel.isWaitingForParticipant()) {
        message = '토론이 이미 진행 중이거나 완료된 방입니다';
      }

      return NextResponse.json(
        { 
          error: 'room_full', 
          message,
          requestId 
        },
        { status: 409 }
      );
    }

    // 사용자가 다른 활성 방에 참여 중인지 확인
    const { data: existingMemberships, error: membershipError } = await supabase
      .from('room_members')
      .select(`
        room_id,
        rooms!inner(status)
      `)
      .eq('user_id', userId)
      .in('rooms.status', ['waiting_participant', 'agenda_negotiation', 'arguments_submission', 'ai_processing']);

    if (membershipError) {
      console.error('[rooms-join-api] POST check existing memberships error', { 
        requestId, 
        error: membershipError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '사용자 상태 확인 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    if (existingMemberships && existingMemberships.length > 0) {
      console.warn('[rooms-join-api] POST user already in active room', { 
        requestId, 
        userId, 
        activeRooms: existingMemberships.length 
      });
      return NextResponse.json(
        { 
          error: 'already_in_room', 
          message: '이미 다른 활성 방에 참여 중입니다',
          requestId 
        },
        { status: 409 }
      );
    }

    // 트랜잭션으로 방 입장 처리
    const { data: updatedRoomData, error: updateError } = await supabase.rpc(
      'join_room_transaction',
      {
        p_room_id: room.id,
        p_user_id: userId
      }
    );

    if (updateError) {
      console.error('[rooms-join-api] POST join room transaction error', { 
        requestId, 
        error: updateError.message 
      });

      // 특정 에러 코드에 따른 처리
      if (updateError.message.includes('room_full')) {
        return NextResponse.json(
          { 
            error: 'room_full', 
            message: '방이 가득 찼습니다',
            requestId 
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '방 입장 처리 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    // 업데이트된 방 정보 조회
    const { data: finalRoomData, error: finalFetchError } = await supabase
      .from('rooms')
      .select(`
        *,
        creator:users!rooms_creator_id_fkey(id, display_name, avatar_url),
        participant:users!rooms_participant_id_fkey(id, display_name, avatar_url),
        motions(id, title, description, status, agreed_at)
      `)
      .eq('id', room.id)
      .single();

    if (finalFetchError) {
      console.error('[rooms-join-api] POST fetch updated room error', { 
        requestId, 
        error: finalFetchError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '업데이트된 방 정보 조회에 실패했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    // 최종 응답 데이터 구성
    const finalRoomValidation = RoomModel.validate(finalRoomData);
    if (!finalRoomValidation.success) {
      console.error('[rooms-join-api] POST final room validation failed', { 
        requestId, 
        error: finalRoomValidation.error 
      });
      return NextResponse.json(
        { 
          error: 'data_error', 
          message: '업데이트된 방 데이터가 유효하지 않습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    const finalRoom: Room = finalRoomValidation.data;
    const finalRoomModel = new RoomModel(finalRoom);

    console.info('[rooms-join-api] POST success', { 
      requestId, 
      roomId: finalRoom.id, 
      userId, 
      newStatus: finalRoom.status 
    });

    return NextResponse.json({
      id: finalRoom.id,
      code: finalRoom.code,
      title: finalRoom.title,
      description: finalRoom.description,
      status: finalRoom.status,
      creator_id: finalRoom.creator_id,
      participant_id: finalRoom.participant_id,
      creator: finalRoomData.creator,
      participant: finalRoomData.participant,
      motion: finalRoomData.motions?.[0] || null,
      progress: finalRoomModel.getProgress(),
      user_side: finalRoomModel.getUserSide(userId),
      created_at: finalRoom.created_at,
      updated_at: finalRoom.updated_at,
      requestId
    });

  } catch (error) {
    console.error('[rooms-join-api] POST unexpected error', { 
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
