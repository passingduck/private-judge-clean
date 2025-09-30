import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { motionQueries } from '@/data/supabase/queries';
import { MotionModel, MotionAction, MotionStatus } from '@/core/models/motion';

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

    // 안건 조회
    const motion = await motionQueries.getByRoomId(roomId);

    if (!motion) {
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
    }

    // 안건 모델로 변환
    const motionModel = MotionModel.fromData(motion as any);
    const canRespond = motionModel.canUserRespond(userId);

    console.info('[motion-api] GET success', {
      requestId,
      roomId,
      userId,
      motionId: motion.id,
      status: motion.status
    });

    return NextResponse.json({
      motion: motionModel.toJSON(),
      can_respond: canRespond,
      is_proposer: motionModel.isProposer(userId),
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

// POST /api/rooms/[id]/motion - 안건 제안 또는 응답
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

    // 요청 body 파싱
    const body = await request.json();
    const supabase = getSupabaseClient(true); // admin client

    // 기존 안건 확인
    const existingMotion = await motionQueries.getByRoomId(roomId);

    // 새 안건 제안
    if (!existingMotion) {
      const validation = MotionModel.validateCreate(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'validation_error', message: validation.error, requestId },
          { status: 400 }
        );
      }

      const newMotion = MotionModel.createNew(validation.data, userId);

      const { data: created, error: insertError } = await supabase
        .from('motions')
        .insert(newMotion)
        .select()
        .single();

      if (insertError) throw insertError;

      console.info('[motion-api] POST success - motion created', { requestId, motionId: created.id });

      return NextResponse.json({ motion: created, requestId }, { status: 201 });
    }

    // 기존 안건에 응답 (수정/거절/수락)
    const validation = MotionModel.validateResponse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'validation_error', message: validation.error, requestId },
        { status: 400 }
      );
    }

    const motionModel = MotionModel.fromData(existingMotion as any);

    // 권한 확인
    if (!motionModel.canUserRespond(userId)) {
      return NextResponse.json(
        { error: 'forbidden', message: '안건에 응답할 권한이 없습니다', requestId },
        { status: 403 }
      );
    }

    const { action, modifications, reason } = validation.data;

    // 협상 히스토리 추가
    motionModel.addNegotiationAction(action, userId, modifications, reason);

    // 상태 변경
    switch (action) {
      case MotionAction.ACCEPTED:
        motionModel.changeStatus(MotionStatus.AGREED);
        break;
      case MotionAction.REJECTED:
        motionModel.changeStatus(MotionStatus.REJECTED);
        break;
      case MotionAction.MODIFIED:
        motionModel.changeStatus(MotionStatus.UNDER_NEGOTIATION);
        if (modifications) {
          motionModel.applyModifications(modifications);
        }
        break;
    }

    // 데이터베이스 업데이트
    const updatedData = motionModel.toJSON();
    const { data: updated, error: updateError } = await supabase
      .from('motions')
      .update({
        title: updatedData.title,
        description: updatedData.description,
        status: updatedData.status,
        negotiation_history: updatedData.negotiation_history,
        agreed_at: updatedData.agreed_at,
        updated_at: updatedData.updated_at
      })
      .eq('id', motionModel.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 안건 합의 시 방 상태 업데이트
    if (action === MotionAction.ACCEPTED) {
      await supabase
        .from('rooms')
        .update({ status: 'arguments_submission', updated_at: new Date().toISOString() })
        .eq('id', roomId);
    }

    console.info('[motion-api] POST success - motion updated', {
      requestId,
      motionId: updated.id,
      action
    });

    return NextResponse.json({ motion: updated, requestId }, { status: 200 });

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