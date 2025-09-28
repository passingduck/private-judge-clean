import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseClient } from '@/data/supabase/client';
import { User, UserModel, UpdateUser } from '@/core/models/user';
import { MESSAGES } from '@/core/constants/messages';

// GET /api/user/profile - 사용자 프로필 조회
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');

  console.info('[user-profile-api] GET start', {
    requestId,
    userId,
    userEmail,
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn(`[${requestId}] Unauthorized: No user ID found.`);
      return NextResponse.json(
        { message: MESSAGES.AUTH.LOGIN_REQUIRED },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient(true); // Use service role

    // 사용자 프로필 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        room_memberships:room_members(
          room_id,
          role,
          side,
          joined_at,
          room:rooms(id, title, status, created_at)
        )
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        console.error(
          `[${requestId}] User not found: ${userId}`
        );
        return NextResponse.json(
          { message: MESSAGES.AUTH.USER_NOT_FOUND },
          { status: 404 }
        );
      }

      console.error(
        `[${requestId}] Failed to fetch user ${userId}:`,
        userError.message
      );
      return NextResponse.json(
        { message: MESSAGES.COMMON.SERVER_ERROR },
        { status: 500 }
      );
    }

    const userValidation = UserModel.validate(userData);
    if (!userValidation.success) {
      console.error(
        `[${requestId}] User data validation failed:`,
        userValidation.error
      );
      return NextResponse.json(
        { message: MESSAGES.COMMON.INVALID_DATA },
        { status: 500 }
      );
    }

    const user: User = userValidation.data;

    // 사용자 통계 계산
    const roomMemberships = userData.room_memberships || [];
    const statistics = {
      total_rooms: roomMemberships.length,
      rooms_as_creator: roomMemberships.filter((m: any) => m.role === 'creator').length,
      rooms_as_participant: roomMemberships.filter((m: any) => m.role === 'participant').length,
      completed_debates: roomMemberships.filter((m: any) => 
        m.room && m.room.status === 'completed'
      ).length,
      active_debates: roomMemberships.filter((m: any) => 
        m.room && ['arguments_submission', 'ai_debate_in_progress'].includes(m.room.status)
      ).length
    };

    // 최근 활동 (최근 5개 방)
    const recentRooms = roomMemberships
      .sort((a: any, b: any) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
      .slice(0, 5)
      .map((membership: any) => ({
        room_id: membership.room_id,
        title: membership.room?.title || '알 수 없는 방',
        role: membership.role,
        side: membership.side,
        status: membership.room?.status || 'unknown',
        joined_at: membership.joined_at,
        created_at: membership.room?.created_at
      }));

    console.info(
      `[${requestId}] User profile fetched successfully for user ${userId}`
    );

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        preferences: user.preferences,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at
      },
      statistics,
      recent_activity: recentRooms,
      requestId
    });

  } catch (error: any) {
    console.error(
      `[${requestId}] Unhandled error in GET /api/user/profile:`,
      error.message,
      error.stack
    );
    return NextResponse.json(
      { message: MESSAGES.COMMON.SERVER_ERROR, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/user/profile - 사용자 프로필 업데이트
export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email');

  console.info('[user-profile-api] PATCH start', {
    requestId,
    userId,
    userEmail,
  });

  try {
    // 인증 확인
    if (!userId || !userEmail) {
      console.warn(`[${requestId}] Unauthorized: No user ID found.`);
      return NextResponse.json(
        { message: MESSAGES.AUTH.LOGIN_REQUIRED },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    console.info('[user-profile-api] PATCH body received', {
      requestId,
      bodyKeys: Object.keys(body)
    });

    // 업데이트 데이터 검증
    const updateValidation = UpdateUser.safeParse(body);
    if (!updateValidation.success) {
      console.warn(
        `[${requestId}] Invalid update data:`,
        updateValidation.error.errors
      );
      return NextResponse.json(
        {
          message: MESSAGES.COMMON.INVALID_INPUT,
          errors: updateValidation.error.errors,
        },
        { status: 400 }
      );
    }

    const updateData = updateValidation.data;

    // 추가 검증
    if (updateData.display_name && updateData.display_name.length > 50) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '표시 이름은 50자를 초과할 수 없습니다',
          requestId 
        },
        { status: 400 }
      );
    }

    if (updateData.bio && updateData.bio.length > 500) {
      return NextResponse.json(
        { 
          error: 'validation_error', 
          message: '자기소개는 500자를 초과할 수 없습니다',
          requestId 
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(true); // Use service role

    // 사용자 프로필 업데이트
    const now = new Date().toISOString();
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        ...updateData,
        updated_at: now
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error(
        `[${requestId}] Failed to update user ${userId}:`,
        updateError.message
      );
      return NextResponse.json(
        { message: MESSAGES.USER.UPDATE_FAILED },
        { status: 500 }
      );
    }

    const userValidation = UserModel.validate(updatedUser);
    if (!userValidation.success) {
      console.error(
        `[${requestId}] Updated user data validation failed:`,
        userValidation.error
      );
      return NextResponse.json(
        { message: MESSAGES.COMMON.INVALID_DATA },
        { status: 500 }
      );
    }

    const user: User = userValidation.data;

    console.info(
      `[${requestId}] User profile updated successfully for user ${userId}`
    );

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        preferences: user.preferences,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at
      },
      message: '프로필이 성공적으로 업데이트되었습니다',
      requestId
    });

  } catch (error: any) {
    console.error(
      `[${requestId}] Unhandled error in PATCH /api/user/profile:`,
      error.message,
      error.stack
    );
    return NextResponse.json(
      { message: MESSAGES.COMMON.SERVER_ERROR, error: error.message },
      { status: 500 }
    );
  }
}
