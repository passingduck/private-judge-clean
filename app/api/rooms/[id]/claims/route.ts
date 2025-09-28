import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { Room, RoomModel, RoomStatus } from '@/core/models/room';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface CreateClaimRequest {
  title: string;
  description: string;
  evidence?: Array<{
    type: 'text' | 'url' | 'document';
    content: string;
    source?: string;
  }>;
}

// POST /api/rooms/[id]/claims - 주장(클레임) 생성
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params; // Next.js 15: params is now a Promise

  console.info('[claims-api] POST start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[claims-api] POST unauthorized', { requestId });
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
    const body: CreateClaimRequest = await request.json();
    console.info('[claims-api] POST body received', { 
      requestId, 
      bodyKeys: Object.keys(body) 
    });

    // 입력 데이터 검증
    if (!body.title?.trim()) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '주장 제목을 입력해주세요',
          requestId 
        },
        { status: 400 }
      );
    }

    if (!body.description?.trim()) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '주장 설명을 입력해주세요',
          requestId 
        },
        { status: 400 }
      );
    }

    if (body.title.length > 200) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '주장 제목은 200자를 초과할 수 없습니다',
          requestId 
        },
        { status: 400 }
      );
    }

    if (body.description.length > 2000) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '주장 설명은 2000자를 초과할 수 없습니다',
          requestId 
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(true); // Use service role

    // 방 정보 및 사용자 멤버십 확인
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select(`
        *,
        room_members!inner(user_id, role, side)
      `)
      .eq('id', roomId)
      .eq('room_members.user_id', userId)
      .single();

    if (roomError) {
      if (roomError.code === 'PGRST116') {
        console.warn('[claims-api] POST room not found or no access', { 
          requestId, 
          roomId, 
          userId 
        });
        return NextResponse.json(
          { 
            error: 'not_found', 
            message: '방을 찾을 수 없거나 접근 권한이 없습니다',
            requestId 
          },
          { status: 404 }
        );
      }

      console.error('[claims-api] POST room fetch error', { 
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
    const userMembership = roomData.room_members[0];

    // 방 상태 확인 (안건 협상 단계에서만 주장 생성 가능)
    if (room.status !== RoomStatus.AGENDA_NEGOTIATION) {
      console.warn('[claims-api] POST invalid room status', { 
        requestId, 
        roomId, 
        status: room.status 
      });
      return NextResponse.json(
        { 
          error: 'invalid_status', 
          message: '안건 협상 단계에서만 주장을 생성할 수 있습니다',
          requestId 
        },
        { status: 409 }
      );
    }

    // 증거 데이터 검증
    const evidence = body.evidence || [];
    if (evidence.length > 10) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '증거는 최대 10개까지 첨부할 수 있습니다',
          requestId 
        },
        { status: 400 }
      );
    }

    for (const evidenceItem of evidence) {
      if (!evidenceItem.type || !['text', 'url', 'document'].includes(evidenceItem.type)) {
        return NextResponse.json(
          { 
            error: 'validation_error', 
            message: '증거 타입은 text, url, document 중 하나여야 합니다',
            requestId 
          },
          { status: 400 }
        );
      }

      if (!evidenceItem.content?.trim()) {
        return NextResponse.json(
          { 
            error: 'validation_error', 
            message: '증거 내용을 입력해주세요',
            requestId 
          },
          { status: 400 }
        );
      }

      if (evidenceItem.content.length > 1000) {
        return NextResponse.json(
          { 
            error: 'validation_error', 
            message: '각 증거 내용은 1000자를 초과할 수 없습니다',
            requestId 
          },
          { status: 400 }
        );
      }
    }

    // 주장 생성
    const now = new Date().toISOString();
    const { data: claimData, error: createError } = await supabase
      .from('claims')
      .insert({
        room_id: roomId,
        user_id: userId,
        title: body.title.trim(),
        description: body.description.trim(),
        evidence: evidence,
        created_at: now,
        updated_at: now
      })
      .select(`
        *,
        user:users(id, display_name, avatar_url)
      `)
      .single();

    if (createError) {
      console.error('[claims-api] POST create claim error', { 
        requestId, 
        error: createError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '주장 생성에 실패했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    console.info('[claims-api] POST success', { 
      requestId, 
      roomId, 
      claimId: claimData.id,
      userId,
      title: body.title
    });

    return NextResponse.json({
      id: claimData.id,
      title: claimData.title,
      description: claimData.description,
      evidence: claimData.evidence,
      user: claimData.user,
      created_at: claimData.created_at,
      updated_at: claimData.updated_at,
      requestId
    }, { status: 201 });

  } catch (error) {
    console.error('[claims-api] POST unexpected error', { 
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

// GET /api/rooms/[id]/claims - 방의 주장 목록 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params; // Next.js 15: params is now a Promise

  console.info('[claims-api] GET start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[claims-api] GET unauthorized', { requestId });
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

      console.error('[claims-api] GET room fetch error', { 
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

    // 주장 목록 조회
    const { data: claimsData, error: claimsError } = await supabase
      .from('claims')
      .select(`
        *,
        user:users(id, display_name, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (claimsError) {
      console.error('[claims-api] GET claims fetch error', { 
        requestId, 
        error: claimsError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '주장 목록 조회 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    // 주장 데이터 변환
    const claims = (claimsData || []).map((claim: any) => ({
      id: claim.id,
      title: claim.title,
      description: claim.description,
      evidence: claim.evidence || [],
      evidence_count: (claim.evidence || []).length,
      user: claim.user,
      is_own: claim.user_id === userId,
      created_at: claim.created_at,
      updated_at: claim.updated_at
    }));

    console.info('[claims-api] GET success', { 
      requestId, 
      roomId, 
      userId,
      totalClaims: claims.length
    });

    return NextResponse.json({
      claims,
      statistics: {
        total_count: claims.length,
        user_claims_count: claims.filter(claim => claim.is_own).length,
        total_evidence_count: claims.reduce((sum: number, claim: any) => sum + claim.evidence_count, 0)
      },
      user_can_create: roomData.status === RoomStatus.AGENDA_NEGOTIATION,
      requestId
    });

  } catch (error) {
    console.error('[claims-api] GET unexpected error', { 
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
