import { NextRequest, NextResponse } from 'next/server';
import { signUpWithPassword } from '@/data/supabase/auth';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  console.info('[signup-api] POST start', { requestId });

  try {
    const body = await request.json();
    const { email, password, displayName } = body;

    // 입력 검증
    if (!email || !password || !displayName) {
      return NextResponse.json(
        { message: '이메일, 비밀번호, 표시 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: '비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    console.info('[signup-api] Attempting signup', { 
      requestId, 
      email: email.substring(0, 3) + '***' // 이메일 일부만 로그
    });

    // Supabase 회원가입
    const result = await signUpWithPassword(email, password, {
      data: {
        display_name: displayName
      }
    }, requestId);

    console.info('[signup-api] Signup successful', { 
      requestId, 
      userId: result.user?.id 
    });

    return NextResponse.json({
      message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
      user: {
        id: result.user?.id,
        email: result.user?.email,
        display_name: displayName
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('[signup-api] Unhandled error', { 
      requestId, 
      error: error.message 
    });

    // 환경변수 누락 오류에 대한 구체적인 메시지
    if (error.message?.includes('Missing required auth environment variables')) {
      return NextResponse.json(
        { 
          message: '서버 설정 오류입니다. 관리자에게 문의하세요.',
          details: '인증 서비스 환경변수가 설정되지 않았습니다.'
        },
        { status: 500 }
      );
    }

    // Supabase 인증 오류
    if (error.message?.includes('User already registered')) {
      return NextResponse.json(
        { message: '이미 가입된 이메일입니다.' },
        { status: 409 }
      );
    }

    if (error.message?.includes('Password should be')) {
      return NextResponse.json(
        { message: '비밀번호가 요구사항을 충족하지 않습니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
