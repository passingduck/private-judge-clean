import { NextRequest, NextResponse } from 'next/server';
import { validateAuthToken, getSessionFromCookies } from '@/data/supabase/auth';

// 인증이 필요한 경로들
const PROTECTED_PATHS = [
  '/dashboard',
  '/rooms', // 토론방 목록과 모든 하위 경로
  '/room',
  '/history',
  '/api/rooms',
  '/api/arguments',
  '/api/motions',
  '/api/jobs'
];

// 인증된 사용자가 접근하면 안 되는 경로들 (로그인 페이지 등)
const AUTH_PATHS = [
  '/login',
  '/signup'
];

// API 경로 중 인증이 필요 없는 경로들
const PUBLIC_API_PATHS = [
  '/api/auth',
  '/api/health',
  '/api/jobs/process', // Worker endpoint
  '/api/jobs/next'     // Worker endpoint
];

// 경로 매칭 헬퍼
function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname.startsWith(pattern);
  });
}

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const { pathname } = request.nextUrl;
  
  console.info('[middleware] start', { 
    requestId, 
    pathname, 
    method: request.method,
    userAgent: request.headers.get('user-agent')?.substring(0, 50)
  });

  try {
    // 정적 파일과 Next.js 내부 경로는 건너뛰기
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.startsWith('/api/auth/') || // 인증 API는 미들웨어에서 제외
      pathname.includes('.') // 정적 파일들
    ) {
      console.info('[middleware] skip static/internal', { requestId, pathname });
      return NextResponse.next();
    }

    // 쿠키에서 세션 정보 추출
    const cookieHeader = request.headers.get('cookie') || '';
    const session = getSessionFromCookies(cookieHeader);
    
    console.info('[middleware] session check', {
      requestId,
      hasSession: !!session,
      userId: session?.user?.id,
      pathname
    });

    // 공개 API는 먼저 체크 (보호된 경로보다 우선)
    if (pathname.startsWith('/api/') && matchesPath(pathname, PUBLIC_API_PATHS)) {
      console.info('[middleware] public API access', { requestId, pathname });
      return NextResponse.next();
    }

    // 인증된 사용자가 로그인 페이지 접근 시 대시보드로 리다이렉트
    if (session && matchesPath(pathname, AUTH_PATHS)) {
      console.info('[middleware] redirect authenticated user from auth page', { 
        requestId, 
        userId: session.user.id,
        from: pathname 
      });
      
      const redirectUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // 보호된 경로 접근 시 인증 확인
    if (matchesPath(pathname, PROTECTED_PATHS)) {
      if (!session) {
        console.warn('[middleware] unauthorized access to protected path', { 
          requestId, 
          pathname 
        });
        
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('message', '로그인이 필요합니다.');
        
        return NextResponse.redirect(loginUrl);
      }

      // JWT 토큰 유효성 검증
      try {
        const user = await validateAuthToken(session.access_token);
        
        if (!user) {
          console.warn('[middleware] invalid token', { 
            requestId, 
            pathname,
            userId: session.user.id 
          });
          
          // 토큰이 유효하지 않으면 로그인 페이지로
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          loginUrl.searchParams.set('message', '세션이 만료되었습니다. 다시 로그인해주세요.');
          
          const response = NextResponse.redirect(loginUrl);
          
          // 만료된 쿠키 삭제
          response.headers.append('Set-Cookie', 'sb-access-token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
          response.headers.append('Set-Cookie', 'sb-refresh-token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
          
          return response;
        }

        // 요청 헤더에 사용자 정보 추가 (API 라우트에서 사용)
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', user.id);
        requestHeaders.set('x-user-email', user.email);
        requestHeaders.set('x-request-id', requestId);
        
        console.info('[middleware] authorized access', { 
          requestId, 
          userId: user.id,
          pathname 
        });
        
        return NextResponse.next({
          request: {
            headers: requestHeaders
          }
        });

      } catch (tokenError) {
        console.error('[middleware] token validation error', { 
          requestId, 
          pathname,
          error: tokenError instanceof Error ? tokenError.message : String(tokenError)
        });
        
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('message', '인증 오류가 발생했습니다. 다시 로그인해주세요.');
        
        return NextResponse.redirect(loginUrl);
      }
    }

    // API 경로 처리
    if (pathname.startsWith('/api/')) {
      // 공개 API는 통과
      if (matchesPath(pathname, PUBLIC_API_PATHS)) {
        console.info('[middleware] public API access', { requestId, pathname });
        return NextResponse.next();
      }

      // 보호된 API는 인증 확인
      if (!session) {
        console.warn('[middleware] unauthorized API access', { requestId, pathname });
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'UNAUTHORIZED',
            message: '인증이 필요합니다.',
            requestId 
          },
          { status: 401 }
        );
      }

      // JWT 토큰 유효성 검증
      try {
        const user = await validateAuthToken(session.access_token);
        
        if (!user) {
          console.warn('[middleware] invalid token for API', { 
            requestId, 
            pathname 
          });
          
          return NextResponse.json(
            { 
              success: false, 
              error: 'INVALID_TOKEN',
              message: '유효하지 않은 토큰입니다.',
              requestId 
            },
            { status: 401 }
          );
        }

        // 요청 헤더에 사용자 정보 추가
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', user.id);
        requestHeaders.set('x-user-email', user.email);
        requestHeaders.set('x-request-id', requestId);
        
        console.info('[middleware] authorized API access', { 
          requestId, 
          userId: user.id,
          pathname 
        });
        
        return NextResponse.next({
          request: {
            headers: requestHeaders
          }
        });

      } catch (tokenError) {
        console.error('[middleware] API token validation error', { 
          requestId, 
          pathname,
          error: tokenError instanceof Error ? tokenError.message : String(tokenError)
        });
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'TOKEN_VALIDATION_ERROR',
            message: '토큰 검증 중 오류가 발생했습니다.',
            requestId 
          },
          { status: 500 }
        );
      }
    }

    // 기타 경로는 통과
    console.info('[middleware] pass through', { requestId, pathname });
    return NextResponse.next();

  } catch (error) {
    console.error('[middleware] unexpected error', { 
      requestId, 
      pathname,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // 예상치 못한 에러 시 요청 통과 (서비스 중단 방지)
    return NextResponse.next();
  }
}

// 미들웨어가 적용될 경로 설정
export const config = {
  matcher: [
    /*
     * 다음 경로들을 제외한 모든 경로에 미들웨어 적용:
     * - api (handled by not matching)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
