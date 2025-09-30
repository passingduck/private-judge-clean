import { NextRequest, NextResponse } from 'next/server';
import { signOut, getSessionFromCookies } from '@/data/supabase/auth';

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

    // NextResponse를 사용하여 쿠키 삭제
    const response = NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.',
      requestId
    });

    // 쿠키 삭제 문자열 직접 생성
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? 'Secure; ' : '';

    const clearAccessTokenCookie = `sb-access-token=; ${secureFlag}HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
    const clearRefreshTokenCookie = `sb-refresh-token=; ${secureFlag}HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

    // 헤더에 직접 추가
    response.headers.append('Set-Cookie', clearAccessTokenCookie);
    response.headers.append('Set-Cookie', clearRefreshTokenCookie);

    console.info('[auth/logout] success', { requestId });

    return response;

  } catch (error) {
    console.error('[auth/logout] error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // 에러가 발생해도 쿠키는 삭제
    const response = NextResponse.json(
      {
        success: false,
        error: 'LOGOUT_ERROR',
        message: '로그아웃 처리 중 오류가 발생했지만 세션은 삭제되었습니다.',
        requestId
      },
      { status: 500 }
    );

    // 쿠키 삭제 문자열 직접 생성
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? 'Secure; ' : '';

    const clearAccessTokenCookie = `sb-access-token=; ${secureFlag}HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
    const clearRefreshTokenCookie = `sb-refresh-token=; ${secureFlag}HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

    // 헤더에 직접 추가
    response.headers.append('Set-Cookie', clearAccessTokenCookie);
    response.headers.append('Set-Cookie', clearRefreshTokenCookie);

    return response;
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
