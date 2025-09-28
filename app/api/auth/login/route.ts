import { NextRequest, NextResponse } from 'next/server';
import { signInWithPassword, setSessionCookies, AuthError } from '@/data/supabase/auth';

// POST /api/auth/login
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    console.info('[auth/login] start', { requestId });
    
    const body = await request.json();
    const { email, password } = body;

    // 입력 검증
    if (!email || !password) {
      console.warn('[auth/login] missing credentials', { requestId, hasEmail: !!email });
      return NextResponse.json(
        { 
          success: false, 
          error: 'EMAIL_PASSWORD_REQUIRED',
          message: '이메일과 비밀번호를 입력해주세요.',
          requestId 
        },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('[auth/login] invalid email format', { requestId, email: email.substring(0, 5) + '***' });
      return NextResponse.json(
        { 
          success: false, 
          error: 'INVALID_EMAIL_FORMAT',
          message: '올바른 이메일 형식을 입력해주세요.',
          requestId 
        },
        { status: 400 }
      );
    }

    // GoTrue REST API를 통한 로그인
    const session = await signInWithPassword(email, password, requestId);
    
    if (!session || !session.access_token) {
      console.error('[auth/login] no session returned', { requestId });
      return NextResponse.json(
        { 
          success: false, 
          error: 'LOGIN_FAILED',
          message: '로그인에 실패했습니다.',
          requestId 
        },
        { status: 401 }
      );
    }

    // 세션 쿠키 설정
    const cookies = setSessionCookies(session);
    
    const response = NextResponse.json({
      success: true,
      message: '로그인되었습니다.',
      user: {
        id: session.user.id,
        email: session.user.email,
        display_name: session.user.user_metadata?.display_name || null
      },
      requestId
    });

    // 쿠키 헤더 설정
    cookies.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });

    console.info('[auth/login] success', { 
      requestId, 
      userId: session.user.id,
      email: email.substring(0, 5) + '***'
    });

    return response;

  } catch (error) {
    console.error('[auth/login] error', { 
      requestId, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof AuthError) {
      // GoTrue 에러를 사용자 친화적 메시지로 변환
      let message = '로그인에 실패했습니다.';
      
      switch (error.code) {
        case 'invalid_grant':
        case 'INVALID_CREDENTIALS':
          message = '이메일 또는 비밀번호가 올바르지 않습니다.';
          break;
        case 'email_not_confirmed':
          message = '이메일 인증이 필요합니다. 이메일을 확인해주세요.';
          break;
        case 'too_many_requests':
          message = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
          break;
        case 'signup_disabled':
          message = '현재 회원가입이 비활성화되어 있습니다.';
          break;
      }

      return NextResponse.json(
        { 
          success: false, 
          error: error.code || 'AUTH_ERROR',
          message,
          requestId 
        },
        { status: error.status || 401 }
      );
    }

    // 예상치 못한 에러
    return NextResponse.json(
      { 
        success: false, 
        error: 'INTERNAL_ERROR',
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        requestId 
      },
      { status: 500 }
    );
  }
}

// GET /api/auth/login (로그인 페이지 정보)
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Login endpoint ready',
    methods: ['POST'],
    fields: {
      email: { type: 'string', required: true, format: 'email' },
      password: { type: 'string', required: true, minLength: 6 }
    }
  });
}
