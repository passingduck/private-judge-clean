import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { Room, RoomModel, RoomStatus } from '@/core/models/room';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PATCH /api/rooms/[id]/status - 방 상태 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params; // Next.js 15: params is now a Promise

  console.info('[room-status-api] PATCH start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[room-status-api] PATCH unauthorized', { requestId });
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

    // 요청 본문 파싱
    const body = await request.json();
    const { status: newStatus } = body;

    // 상태 검증
    if (!newStatus || typeof newStatus !== 'string') {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '새로운 상태가 필요합니다',
          requestId 
        },
        { status: 400 }
      );
    }

    const validStatuses = Object.values(RoomStatus);
    if (!validStatuses.includes(newStatus as RoomStatus)) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '유효하지 않은 상태값입니다',
          requestId 
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(true); // Use service role

    // RPC 함수를 사용하여 상태 업데이트
    const { data: result, error: updateError } = await supabase.rpc(
      'update_room_status',
      {
        p_room_id: roomId,
        p_new_status: newStatus,
        p_user_id: userId
      }
    );

    if (updateError) {
      console.error('[room-status-api] PATCH update error', { 
        requestId, 
        error: updateError.message 
      });

      // 특정 에러 처리
      if (updateError.message.includes('room_not_found')) {
        return NextResponse.json(
          { 
            error: 'not_found', 
            message: '방을 찾을 수 없습니다',
            requestId 
          },
          { status: 404 }
        );
      }

      if (updateError.message.includes('unauthorized')) {
        return NextResponse.json(
          { 
            error: 'forbidden', 
            message: '방 상태를 변경할 권한이 없습니다',
            requestId 
          },
          { status: 403 }
        );
      }

      if (updateError.message.includes('invalid_status_transition')) {
        return NextResponse.json(
          { 
            error: 'invalid_transition', 
            message: '유효하지 않은 상태 전환입니다',
            requestId 
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '상태 업데이트 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    // 업데이트된 방 정보 조회
    const { data: roomData, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (fetchError) {
      console.error('[room-status-api] PATCH fetch updated room error', { 
        requestId, 
        error: fetchError.message 
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

    const roomValidation = RoomModel.validate(roomData);
    if (!roomValidation.success) {
      console.error('[room-status-api] PATCH room validation failed', { 
        requestId, 
        error: roomValidation.error 
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

    const room: Room = roomValidation.data;
    const roomModel = new RoomModel(room);

    console.info('[room-status-api] PATCH success', { 
      requestId, 
      roomId, 
      userId,
      oldStatus: result.old_status,
      newStatus: result.new_status
    });

    return NextResponse.json({
      id: room.id,
      status: room.status,
      old_status: result.old_status,
      progress: roomModel.getProgress(),
      next_possible_statuses: roomModel.getNextPossibleStatuses(),
      updated_at: room.updated_at,
      requestId
    });

  } catch (error) {
    console.error('[room-status-api] PATCH unexpected error', { 
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

// GET /api/rooms/[id]/status - 방 상태 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params; // Next.js 15: params is now a Promise

  console.info('[room-status-api] GET start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[room-status-api] GET unauthorized', { requestId });
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

    // 방 정보 조회
    const { data: roomData, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.warn('[room-status-api] GET room not found', { 
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

      console.error('[room-status-api] GET fetch room error', { 
        requestId, 
        error: fetchError.message 
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
      console.error('[room-status-api] GET room validation failed', { 
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

    // 접근 권한 확인
    if (!roomModel.isUserMember(userId)) {
      console.warn('[room-status-api] GET access denied', { 
        requestId, 
        roomId, 
        userId 
      });
      return NextResponse.json(
        { 
          error: 'forbidden', 
          message: '이 방에 접근할 권한이 없습니다',
          requestId 
        },
        { status: 403 }
      );
    }

    // 방 통계 조회
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_room_statistics',
      { p_room_id: roomId }
    );

    if (statsError) {
      console.warn('[room-status-api] GET stats error', { 
        requestId, 
        error: statsError.message 
      });
    }

    console.info('[room-status-api] GET success', { 
      requestId, 
      roomId, 
      userId,
      status: room.status
    });

    return NextResponse.json({
      id: room.id,
      status: room.status,
      progress: roomModel.getProgress(),
      current_step_info: roomModel.getCurrentStepInfo(),
      next_possible_statuses: roomModel.getNextPossibleStatuses(),
      can_transition_to: (targetStatus: RoomStatus) => roomModel.canTransitionTo(targetStatus),
      is_active: roomModel.isActive(),
      is_completed: roomModel.isCompleted(),
      age: roomModel.getAgeString(),
      statistics: stats || null,
      updated_at: room.updated_at,
      requestId
    });

  } catch (error) {
    console.error('[room-status-api] GET unexpected error', { 
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
