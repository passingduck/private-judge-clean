import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { 
  Argument, 
  CreateArgument, 
  ArgumentModel, 
  ArgumentSide 
} from '@/core/models/argument';
import { Room, RoomModel, RoomStatus } from '@/core/models/room';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/rooms/[id]/arguments - 주장 제출
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params; // Next.js 15: params is now a Promise

  console.info('[arguments-api] POST start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[arguments-api] POST unauthorized', { requestId });
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
    console.info('[arguments-api] POST body received', { 
      requestId, 
      bodyKeys: Object.keys(body) 
    });

    // 입력 데이터 검증
    const argumentData = { ...body, room_id: roomId };
    const validation = ArgumentModel.validateCreate(argumentData);
    if (!validation.success) {
      console.warn('[arguments-api] POST validation failed', { 
        requestId, 
        error: validation.error 
      });
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: validation.error,
          requestId 
        },
        { status: 400 }
      );
    }

    const createData: CreateArgument = validation.data;
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
        console.warn('[arguments-api] POST room not found or no access', { 
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

      console.error('[arguments-api] POST room fetch error', { 
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
    const roomModel = new RoomModel(room);
    const userMembership = roomData.room_members[0];

    // 방 상태 확인 (주장 제출 단계여야 함)
    if (room.status !== RoomStatus.ARGUMENTS_SUBMISSION) {
      console.warn('[arguments-api] POST invalid room status', { 
        requestId, 
        roomId, 
        status: room.status 
      });
      return NextResponse.json(
        { 
          error: 'invalid_status', 
          message: '주장 제출 단계에서만 주장을 제출할 수 있습니다',
          requestId 
        },
        { status: 409 }
      );
    }

    // 사용자 측면 확인
    const userSide = userMembership.side as ArgumentSide;
    if (!userSide) {
      console.warn('[arguments-api] POST user has no side', { 
        requestId, 
        roomId, 
        userId 
      });
      return NextResponse.json(
        { 
          error: 'no_side', 
          message: '사용자에게 할당된 측면이 없습니다',
          requestId 
        },
        { status: 409 }
      );
    }

    // 기존 주장 확인 (한 사용자당 하나의 주장만 가능)
    const { data: existingArgument, error: argumentCheckError } = await supabase
      .from('arguments')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (argumentCheckError && argumentCheckError.code !== 'PGRST116') {
      console.error('[arguments-api] POST existing argument check error', { 
        requestId, 
        error: argumentCheckError.message 
      });
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: '기존 주장 확인 중 오류가 발생했습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    if (existingArgument) {
      console.warn('[arguments-api] POST argument already exists', { 
        requestId, 
        roomId, 
        userId 
      });
      return NextResponse.json(
        { 
          error: 'argument_exists', 
          message: '이미 주장을 제출했습니다',
          requestId 
        },
        { status: 409 }
      );
    }

    // 증거 데이터 검증
    const evidence = createData.evidence || [];
    for (const evidenceItem of evidence) {
      const evidenceValidation = ArgumentModel.validateEvidence(evidenceItem);
      if (!evidenceValidation.success) {
        console.warn('[arguments-api] POST evidence validation failed', { 
          requestId, 
          error: evidenceValidation.error 
        });
        return NextResponse.json(
          { 
            error: 'validation_error', 
            message: `증거 검증 실패: ${evidenceValidation.error}`,
            requestId 
          },
          { status: 400 }
        );
      }
    }

    // 주장 생성
    const now = new Date().toISOString();
    const { data: createdArgumentData, error: createError } = await supabase
      .from('arguments')
      .insert({
        room_id: roomId,
        user_id: userId,
        side: userSide,
        title: createData.title,
        content: createData.content,
        evidence: evidence,
        submitted_at: now
      })
      .select()
      .single();

    if (createError) {
      console.error('[arguments-api] POST create argument error', { 
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

    const argumentValidation = ArgumentModel.validate(createdArgumentData);
    if (!argumentValidation.success) {
      console.error('[arguments-api] POST argument validation failed', { 
        requestId, 
        error: argumentValidation.error 
      });
      return NextResponse.json(
        { 
          error: 'data_error', 
          message: '생성된 주장 데이터가 유효하지 않습니다',
          requestId 
        },
        { status: 500 }
      );
    }

    const argument: Argument = argumentValidation.data;
    const argumentModel = new ArgumentModel(argument);

    // 양측 주장이 모두 제출되었는지 확인
    const { data: allArguments, error: allArgumentsError } = await supabase
      .from('arguments')
      .select('side')
      .eq('room_id', roomId);

    if (allArgumentsError) {
      console.warn('[arguments-api] POST check all arguments error', { 
        requestId, 
        error: allArgumentsError.message 
      });
    } else {
      const sideACount = allArguments?.filter(arg => arg.side === 'A').length || 0;
      const sideBCount = allArguments?.filter(arg => arg.side === 'B').length || 0;
      
      // 양측 모두 주장을 제출했으면 알림 (상태는 수동으로 변경)
      if (sideACount > 0 && sideBCount > 0) {
        console.info('[arguments-api] POST both sides submitted', { 
          requestId, 
          roomId,
          sideACount,
          sideBCount
        });
      }
    }

    const summary = argumentModel.getSummary();

    console.info('[arguments-api] POST success', { 
      requestId, 
      roomId, 
      argumentId: argument.id,
      userId,
      side: userSide,
      strengthScore: summary.strengthScore
    });

    return NextResponse.json({
      id: argument.id,
      title: argument.title,
      side: argument.side,
      user_id: argument.user_id,
      word_count: summary.wordCount,
      evidence_count: summary.evidenceCount,
      evidence_types: summary.evidenceTypes,
      strength_score: summary.strengthScore,
      submitted_at: argument.submitted_at,
      created_at: argument.created_at,
      requestId
    }, { status: 201 });

  } catch (error) {
    console.error('[arguments-api] POST unexpected error', { 
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

// GET /api/rooms/[id]/arguments - 방의 주장 목록 조회
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');
  const { id: roomId } = await params; // Next.js 15: params is now a Promise

  console.info('[arguments-api] GET start', { 
    requestId, 
    userId, 
    userEmail,
    roomId 
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn('[arguments-api] GET unauthorized', { requestId });
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
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) {
      if (roomError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            error: 'not_found', 
            message: '방을 찾을 수 없습니다',
            requestId 
          },
          { status: 404 }
        );
      }

      console.error('[arguments-api] GET room fetch error', { 
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
    const roomModel = new RoomModel(room);

    // 권한 확인
    if (!roomModel.isUserMember(userId)) {
      console.warn('[arguments-api] GET access denied', { 
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

    // 주장 목록 조회
    const { data: argumentsData, error: argumentsError } = await supabase
      .from('arguments')
      .select(`
        *,
        user:users!arguments_user_id_fkey(id, display_name, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('submitted_at', { ascending: true });

    if (argumentsError) {
      console.error('[arguments-api] GET arguments fetch error', { 
        requestId, 
        error: argumentsError.message 
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

    // 주장 데이터 검증 및 변환
    const argumentList: any[] = [];
    for (const argumentData of argumentsData || []) {
      const validation = ArgumentModel.validate(argumentData);
      if (validation.success) {
        const argument = validation.data;
        const argumentModel = new ArgumentModel(argument);
        const summary = argumentModel.getSummary();
        
        argumentList.push({
          id: argument.id,
          title: argument.title,
          content: argument.content,
          side: argument.side,
          user_id: argument.user_id,
          user: argumentData.user,
          evidence: argument.evidence,
          evidence_count: summary.evidenceCount,
          evidence_types: summary.evidenceTypes,
          word_count: summary.wordCount,
          strength_score: summary.strengthScore,
          is_own: argument.user_id === userId,
          submitted_at: argument.submitted_at,
          created_at: argument.created_at
        });
      } else {
        console.warn('[arguments-api] GET invalid argument data', { 
          requestId, 
          argumentId: argumentData.id, 
          error: validation.error 
        });
      }
    }

    // 측면별 분류
    const argumentsA = argumentList.filter(arg => arg.side === 'A');
    const argumentsB = argumentList.filter(arg => arg.side === 'B');

    // 대결 분석
    const argumentsAData = argumentsData?.filter(arg => arg.side === 'A').map(arg => {
      const validation = ArgumentModel.validate(arg);
      return validation.success ? validation.data : null;
    }).filter(Boolean) as Argument[];

    const argumentsBData = argumentsData?.filter(arg => arg.side === 'B').map(arg => {
      const validation = ArgumentModel.validate(arg);
      return validation.success ? validation.data : null;
    }).filter(Boolean) as Argument[];

    const debateAnalysis = argumentsAData.length > 0 && argumentsBData.length > 0 
      ? ArgumentModel.analyzeDebate(argumentsAData, argumentsBData)
      : null;

    console.info('[arguments-api] GET success', { 
      requestId, 
      roomId, 
      userId,
      totalArguments: argumentList.length,
      sideACount: argumentsA.length,
      sideBCount: argumentsB.length
    });

    return NextResponse.json({
      arguments,
      by_side: {
        A: argumentsA,
        B: argumentsB
      },
      statistics: {
        total_count: argumentList.length,
        side_a_count: argumentsA.length,
        side_b_count: argumentsB.length,
        both_sides_submitted: argumentsA.length > 0 && argumentsB.length > 0,
        average_strength: argumentList.length > 0 
          ? Math.round(argumentList.reduce((sum, arg) => sum + arg.strength_score, 0) / argumentList.length)
          : 0
      },
      debate_analysis: debateAnalysis,
      user_argument: argumentList.find(arg => arg.is_own) || null,
      can_submit: roomModel.getUserSide(userId) && 
                  room.status === RoomStatus.ARGUMENTS_SUBMISSION &&
                  !argumentList.some(arg => arg.is_own),
      requestId
    });

  } catch (error) {
    console.error('[arguments-api] GET unexpected error', { 
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
