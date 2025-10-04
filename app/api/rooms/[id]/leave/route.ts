import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { RoomService } from '@/core/services/room-service';

// POST /api/rooms/[id]/leave - 방 나가기
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');

  console.info('[rooms-leave-api] POST start', {
    requestId,
    userId,
    userEmail
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[rooms-leave-api] POST unauthorized', { requestId });
      return NextResponse.json(
        {
          error: 'unauthorized',
          message: '인증이 필요합니다',
          requestId
        },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const roomId = resolvedParams.id;

    if (!roomId) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: '방 ID가 필요합니다',
          requestId
        },
        { status: 400 }
      );
    }

    const roomService = new RoomService();

    // 방 나가기 처리
    await roomService.leaveRoom(roomId, userId);

    console.info('[rooms-leave-api] POST success', {
      requestId,
      roomId,
      userId
    });

    return NextResponse.json({
      success: true,
      message: '방에서 나갔습니다',
      requestId
    });

  } catch (error) {
    console.error('[rooms-leave-api] POST error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // 비즈니스 로직 에러 처리
    if (error instanceof Error) {
      if (error.message.includes('방을 찾을 수 없습니다')) {
        return NextResponse.json(
          {
            error: 'not_found',
            message: error.message,
            requestId
          },
          { status: 404 }
        );
      }

      if (error.message.includes('생성자는 방을 나갈 수 없습니다') ||
          error.message.includes('참가자가 아닙니다')) {
        return NextResponse.json(
          {
            error: 'forbidden',
            message: error.message,
            requestId
          },
          { status: 403 }
        );
      }
    }

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
