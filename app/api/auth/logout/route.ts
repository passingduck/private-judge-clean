import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signOut, getSessionFromCookies, AuthError } from '@/data/supabase/auth';

// POST /api/auth/logout
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    console.info('[auth/logout] start', { requestId });

    // 쿠키에서 세션 정보 추출
    const cookieHeader = request.headers.get('cookie') || '';
    const session = getSessionFromCookies(cookieHeader);

    if (session?.access_token) {
      try {
        // GoTrue API를 통한 로그아웃 (서버에서 세션 무효화)
        await signOut(session.access_token, requestId);
        console.info('[auth/logout] server logout success', { requestId, userId: session.user.id });
      } catch (signOutError) {
        // 서버 로그아웃 실패해도 클라이언트 쿠키는 삭제
        console.warn('[auth/logout] server logout failed, clearing cookies anyway', {
          requestId,
          error: signOutError instanceof Error ? signOutError.message : String(signOutError)
        });
      }
    } else {
      console.info('[auth/logout] no active session found', { requestId });
    }

    // Next.js cookies API를 사용하여 쿠키 삭제
    const cookieStore = await cookies();
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');

    console.info('[auth/logout] success', { requestId });

    return NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.',
      requestId
    });

  } catch (error) {
    console.error('[auth/logout] error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // 에러가 발생해도 쿠키는 삭제
    try {
      const cookieStore = await cookies();
      cookieStore.delete('sb-access-token');
      cookieStore.delete('sb-refresh-token');
    } catch (cookieError) {
      console.error('[auth/logout] failed to delete cookies', { requestId, error: cookieError });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'LOGOUT_ERROR',
        message: '로그아웃 처리 중 오류가 발생했지만 세션은 삭제되었습니다.',
        requestId
      },
      { status: 500 }
    );
  }
}

// GET /api/auth/logout (로그아웃 상태 확인)
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Logout endpoint ready',
    methods: ['POST'],
    description: 'POST 요청으로 로그아웃을 수행합니다.'
  });
}
