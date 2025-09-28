import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/rooms/[id]/motion - 안건 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params;

  console.info('[motion-api] GET start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[motion-api] GET unauthorized', { requestId });
      return NextResponse.json(
        { 
          error: 'unauthorized', 
          message: '인증이 필요합니다',
          requestId 
        },
        { status: 401 }
      );
    }

    // 간단한 응답 반환 (아직 안건이 없는 상태)
    console.info('[motion-api] GET success - no motion yet', {
      requestId,
      roomId,
      userId
    });

    return NextResponse.json({
      motion: null,
      can_propose: true,
      requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[motion-api] GET unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error)
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

// POST /api/rooms/[id]/motion - 안건 제안
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params;

  console.info('[motion-api] POST start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[motion-api] POST unauthorized', { requestId });
      return NextResponse.json(
        { 
          error: 'unauthorized', 
          message: '인증이 필요합니다',
          requestId 
        },
        { status: 401 }
      );
    }

    // 간단한 응답 반환 (임시로 성공 처리)
    console.info('[motion-api] POST success - motion created', {
      requestId,
      roomId,
      userId
    });

    return NextResponse.json({
      motion: {
        id: 'temp-motion-id',
        title: '제안된 안건',
        status: 'proposed',
        proposer_id: userId,
        created_at: new Date().toISOString()
      },
      requestId
    }, { status: 201 });

  } catch (error) {
    console.error('[motion-api] POST unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error)
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