import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookies, AuthError } from '@/data/supabase/auth';

// GET /api/auth/callback
// 이메일 확인, 패스워드 재설정 등의 콜백 처리
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    console.info('[auth/callback] start', { requestId });
    
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const expiresIn = searchParams.get('expires_in');
    const tokenType = searchParams.get('token_type');
    const type = searchParams.get('type'); // signup, recovery, email_change 등
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.info('[auth/callback] params', { 
      requestId, 
      type, 
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      error 
    });

    // 에러가 있는 경우
    if (error) {
      console.warn('[auth/callback] auth error', { 
        requestId, 
        error, 
        description: errorDescription 
      });

      const redirectUrl = new URL('/auth/error', request.url);
      redirectUrl.searchParams.set('error', error);
      redirectUrl.searchParams.set('message', errorDescription || '인증 중 오류가 발생했습니다.');
      
      return NextResponse.redirect(redirectUrl);
    }

    // 토큰이 없는 경우
    if (!accessToken || !refreshToken) {
      console.warn('[auth/callback] missing tokens', { requestId });
      
      const redirectUrl = new URL('/auth/error', request.url);
      redirectUrl.searchParams.set('error', 'missing_tokens');
      redirectUrl.searchParams.set('message', '인증 토큰이 없습니다.');
      
      return NextResponse.redirect(redirectUrl);
    }

    // JWT에서 사용자 정보 추출
    let user;
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      user = {
        id: payload.sub,
        email: payload.email || '',
        email_confirmed_at: payload.email_confirmed_at,
        app_metadata: payload.app_metadata || {},
        user_metadata: payload.user_metadata || {},
        created_at: '',
        updated_at: ''
      };
    } catch (jwtError) {
      console.error('[auth/callback] invalid JWT', { requestId, jwtError });
      
      const redirectUrl = new URL('/auth/error', request.url);
      redirectUrl.searchParams.set('error', 'invalid_token');
      redirectUrl.searchParams.set('message', '유효하지 않은 토큰입니다.');
      
      return NextResponse.redirect(redirectUrl);
    }

    // 세션 객체 구성
    const session = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenType || 'bearer',
      expires_in: expiresIn ? parseInt(expiresIn) : 3600,
      user
    };

    // 세션 쿠키 설정
    const cookies = setSessionCookies(session);
    
    // 타입별 리다이렉트 처리
    let redirectPath = '/dashboard';
    let message = '인증이 완료되었습니다.';
    
    switch (type) {
      case 'signup':
        message = '회원가입이 완료되었습니다. 환영합니다!';
        redirectPath = '/dashboard';
        break;
      case 'recovery':
        message = '패스워드가 재설정되었습니다.';
        redirectPath = '/dashboard';
        break;
      case 'email_change':
        message = '이메일이 변경되었습니다.';
        redirectPath = '/dashboard';
        break;
      case 'invite':
        message = '초대를 수락했습니다.';
        redirectPath = '/dashboard';
        break;
      default:
        message = '로그인되었습니다.';
        redirectPath = '/dashboard';
    }

    const redirectUrl = new URL(redirectPath, request.url);
    redirectUrl.searchParams.set('message', message);
    
    const response = NextResponse.redirect(redirectUrl);
    
    // 쿠키 헤더 설정
    cookies.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });

    console.info('[auth/callback] success', { 
      requestId, 
      userId: user.id,
      type,
      redirectPath
    });

    return response;

  } catch (error) {
    console.error('[auth/callback] error', { 
      requestId, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    const redirectUrl = new URL('/auth/error', request.url);
    redirectUrl.searchParams.set('error', 'callback_error');
    redirectUrl.searchParams.set('message', '인증 처리 중 오류가 발생했습니다.');
    
    return NextResponse.redirect(redirectUrl);
  }
}

// POST /api/auth/callback
// 수동 토큰 교환 (필요한 경우)
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    console.info('[auth/callback] POST start', { requestId });
    
    const body = await request.json();
    const { access_token, refresh_token, expires_in, user } = body;

    if (!access_token || !refresh_token || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'MISSING_SESSION_DATA',
          message: '세션 데이터가 불완전합니다.',
          requestId 
        },
        { status: 400 }
      );
    }

    // 세션 객체 구성
    const session = {
      access_token,
      refresh_token,
      token_type: 'bearer',
      expires_in: expires_in || 3600,
      user
    };

    // 세션 쿠키 설정
    const cookies = setSessionCookies(session);
    
    const response = NextResponse.json({
      success: true,
      message: '세션이 설정되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name || null
      },
      requestId
    });

    // 쿠키 헤더 설정
    cookies.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });

    console.info('[auth/callback] POST success', { 
      requestId, 
      userId: user.id
    });

    return response;

  } catch (error) {
    console.error('[auth/callback] POST error', { 
      requestId, 
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'CALLBACK_ERROR',
        message: '세션 설정 중 오류가 발생했습니다.',
        requestId 
      },
      { status: 500 }
    );
  }
}
