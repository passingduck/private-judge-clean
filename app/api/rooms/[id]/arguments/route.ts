import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/data/supabase/client';
import { ArgumentModel, CreateArgumentSchema, ArgumentSide } from '@/core/models/argument';

// GET /api/rooms/[id]/arguments - 사용자와 상대방의 주장 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;

    // 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub;

    if (!userId) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }

    // 방 정보 조회
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('id, creator_id, participant_id, status')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
    }

    // 권한 확인
    if (roomData.creator_id !== userId && roomData.participant_id !== userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    // 사용자의 side 결정
    const isCreator = roomData.creator_id === userId;
    const userSide = isCreator ? ArgumentSide.A : ArgumentSide.B;
    const opponentSide = isCreator ? ArgumentSide.B : ArgumentSide.A;

    // 주장들 조회 (admin client 사용)
    const { data: argumentsData, error: argsError } = await supabaseAdmin!
      .from('arguments')
      .select('*')
      .eq('room_id', roomId);

    if (argsError) {
      console.error('Arguments query error:', argsError);
      return NextResponse.json({ error: '주장을 조회할 수 없습니다' }, { status: 500 });
    }

    // 사용자와 상대방의 주장 분리
    const myArgument = argumentsData?.find(arg => arg.side === userSide) || null;
    const opponentArgument = argumentsData?.find(arg => arg.side === opponentSide) || null;

    // 제출 가능 여부 확인
    const canSubmit = roomData.status === 'arguments_submission' && !myArgument;

    return NextResponse.json({
      my_argument: myArgument,
      opponent_argument: opponentArgument,
      user_side: userSide,
      can_submit: canSubmit
    });

  } catch (error) {
    console.error('Get arguments error:', error);
    return NextResponse.json(
      { error: '주장 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// POST /api/rooms/[id]/arguments - 주장 제출
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const body = await request.json();

    // 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub;

    if (!userId) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }

    // 방 정보 조회
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('id, creator_id, participant_id, status')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
    }

    // 권한 확인
    if (roomData.creator_id !== userId && roomData.participant_id !== userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    // 방 상태 확인
    if (roomData.status !== 'arguments_submission') {
      return NextResponse.json({ error: '주장 제출 단계가 아닙니다' }, { status: 400 });
    }

    // 사용자의 side 결정
    const isCreator = roomData.creator_id === userId;
    const userSide = isCreator ? ArgumentSide.A : ArgumentSide.B;

    // 이미 제출했는지 확인
    const { data: existingArg } = await supabaseAdmin!
      .from('arguments')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (existingArg) {
      return NextResponse.json({ error: '이미 주장을 제출하셨습니다' }, { status: 400 });
    }

    // 입력 데이터 검증
    const validation = CreateArgumentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: '유효하지 않은 입력입니다',
        details: validation.error.errors
      }, { status: 400 });
    }

    // 새 주장 생성
    const newArgument = ArgumentModel.createNew(validation.data, userId, userSide);

    // DB에 저장 (admin client 사용)
    const { data: savedArgument, error: saveError } = await supabaseAdmin!
      .from('arguments')
      .insert({
        room_id: roomId,
        user_id: newArgument.user_id,
        side: newArgument.side,
        title: newArgument.title,
        content: newArgument.content,
        evidence: newArgument.evidence,
        submitted_at: newArgument.submitted_at,
        created_at: newArgument.created_at,
        updated_at: newArgument.updated_at
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save argument error:', saveError);
      return NextResponse.json({ error: '주장 저장에 실패했습니다' }, { status: 500 });
    }

    // 양측이 모두 제출했는지 확인
    const { data: allArguments } = await supabaseAdmin!
      .from('arguments')
      .select('side')
      .eq('room_id', roomId);

    const hasSideA = allArguments?.some(arg => arg.side === ArgumentSide.A);
    const hasSideB = allArguments?.some(arg => arg.side === ArgumentSide.B);
    const bothSubmitted = hasSideA && hasSideB;

    // 양측 모두 제출했으면 방 상태를 ai_processing으로 변경
    if (bothSubmitted) {
      await supabase
        .from('rooms')
        .update({
          status: 'ai_processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId);
    }

    return NextResponse.json({
      argument: savedArgument,
      room_status: bothSubmitted ? 'ai_processing' : 'arguments_submission',
      message: bothSubmitted 
        ? '양측 주장이 모두 제출되어 AI 재판이 시작됩니다' 
        : '주장이 성공적으로 제출되었습니다'
    }, { status: 201 });

  } catch (error) {
    console.error('Create argument error:', error);
    return NextResponse.json(
      { error: '주장 제출 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
