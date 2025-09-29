import { jwtVerify, SignJWT, importJWK } from 'jose';

// 환경 변수 타입
interface AuthEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_JWT_SECRET: string;
}

// 사용자 정보 타입
export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  phone?: string;
  confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  identities?: any[];
  created_at: string;
  updated_at: string;
}

// 세션 정보 타입
export interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
  refresh_token: string;
  user: User;
}

// JWT 페이로드 타입
export interface JWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email?: string;
  phone?: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  role: string;
  aal?: string;
  amr?: any[];
  session_id: string;
}

// 인증 에러 클래스
export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// 환경 변수 검증
function getAuthEnv(): AuthEnv {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET
  };

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_JWT_SECRET) {
    throw new AuthError('Missing required auth environment variables');
  }

  return env as AuthEnv;
}

// GoTrue REST API 호출 헬퍼
async function callGoTrue(
  endpoint: string,
  options: RequestInit = {},
  requestId = crypto.randomUUID()
): Promise<any> {
  const env = getAuthEnv();
  const url = `${env.SUPABASE_URL}/auth/v1${endpoint}`;
  
  const headers = {
    'apikey': env.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...options.headers
  };

  console.info('[auth] GoTrue call', { requestId, endpoint, method: options.method || 'GET' });

  const response = await fetch(url, {
    ...options,
    headers
  });

  const text = await response.text();
  
  if (!response.ok) {
    // ⚠️ GoTrue는 에러 시 JSON으로 상세 정보를 반환. 
    //    민감한 정보가 포함될 수 있으므로 로깅 시 주의
    console.error('[auth] GoTrue error', { 
      requestId, 
      status: response.status, 
      endpoint,
      error: text.slice(0, 200) // 에러 메시지 길이 제한
    });
    
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { message: text };
    }
    
    throw new AuthError(
      errorData.message || `GoTrue API error: ${response.status}`,
      errorData.error_code || 'GOTRUE_ERROR',
      response.status
    );
  }

  console.info('[auth] GoTrue success', { requestId, endpoint, bytes: text.length });
  
  return text ? JSON.parse(text) : null;
}

// JWT 토큰 검증
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const env = getAuthEnv();
    
    // JWT Secret을 JWK 형태로 변환
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    
    const { payload } = await jwtVerify(token, secret, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated'
    });

    return payload as any;
  } catch (error) {
    console.error('[auth] JWT verification failed:', error);
    throw new AuthError('Invalid or expired token', 'INVALID_JWT', 401);
  }
}

// 이메일/패스워드 로그인
export async function signInWithPassword(
  email: string, 
  password: string,
  requestId = crypto.randomUUID()
): Promise<Session> {
  try {
    const data = await callGoTrue('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password
      })
    }, requestId);

    return data as Session;
  } catch (error) {
    console.error('[auth] Sign in failed', { requestId, email, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// 이메일 회원가입
export async function signUpWithPassword(
  email: string,
  password: string,
  options: {
    data?: Record<string, any>;
    redirectTo?: string;
  } = {},
  requestId = crypto.randomUUID()
): Promise<{ user: User | null; session: Session | null }> {
  try {
    const data = await callGoTrue('/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        data: options.data,
        gotrue_meta_security: {},
        ...(options.redirectTo && { redirect_to: options.redirectTo })
      })
    }, requestId);

    return {
      user: data.user || null,
      session: data.session || null
    };
  } catch (error) {
    console.error('[auth] Sign up failed', { requestId, email, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// 토큰 새로고침
export async function refreshToken(
  refreshToken: string,
  requestId = crypto.randomUUID()
): Promise<Session> {
  try {
    const data = await callGoTrue('/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    }, requestId);

    return data as Session;
  } catch (error) {
    console.error('[auth] Token refresh failed', { requestId, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// 로그아웃
export async function signOut(
  accessToken: string,
  requestId = crypto.randomUUID()
): Promise<void> {
  try {
    await callGoTrue('/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }, requestId);
  } catch (error) {
    console.error('[auth] Sign out failed', { requestId, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// 사용자 정보 조회
export async function getUser(
  accessToken: string,
  requestId = crypto.randomUUID()
): Promise<User> {
  try {
    const data = await callGoTrue('/user', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }, requestId);

    return data as User;
  } catch (error) {
    console.error('[auth] Get user failed', { requestId, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// 사용자 정보 업데이트
export async function updateUser(
  accessToken: string,
  updates: {
    email?: string;
    password?: string;
    data?: Record<string, any>;
  },
  requestId = crypto.randomUUID()
): Promise<User> {
  try {
    const data = await callGoTrue('/user', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(updates)
    }, requestId);

    return data as User;
  } catch (error) {
    console.error('[auth] Update user failed', { requestId, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// 패스워드 재설정 요청
export async function resetPasswordForEmail(
  email: string,
  redirectTo?: string,
  requestId = crypto.randomUUID()
): Promise<void> {
  try {
    await callGoTrue('/recover', {
      method: 'POST',
      body: JSON.stringify({
        email,
        ...(redirectTo && { redirect_to: redirectTo })
      })
    }, requestId);
  } catch (error) {
    console.error('[auth] Password reset failed', { requestId, email, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// 이메일 확인 재전송
export async function resendConfirmation(
  email: string,
  type: 'signup' | 'email_change' = 'signup',
  requestId = crypto.randomUUID()
): Promise<void> {
  try {
    await callGoTrue('/resend', {
      method: 'POST',
      body: JSON.stringify({
        email,
        type
      })
    }, requestId);
  } catch (error) {
    console.error('[auth] Resend confirmation failed', { requestId, email, type, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// 쿠키에서 세션 추출
export function getSessionFromCookies(cookies: string): Session | null {
  try {
    // 쿠키에서 access_token과 refresh_token 추출
    const cookieObj: Record<string, string> = {};
    cookies.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        cookieObj[key] = decodeURIComponent(value);
      }
    });

    const accessToken = cookieObj['sb-access-token'];
    const refreshToken = cookieObj['sb-refresh-token'];

    if (!accessToken || !refreshToken) {
      return null;
    }

    // JWT에서 사용자 정보 추출
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: payload.exp - Math.floor(Date.now() / 1000),
      expires_at: payload.exp,
      user: {
        id: payload.sub,
        email: payload.email || '',
        app_metadata: payload.app_metadata || {},
        user_metadata: payload.user_metadata || {},
        created_at: '',
        updated_at: ''
      }
    };
  } catch (error) {
    console.warn('[auth] Failed to parse session from cookies:', error);
    return null;
  }
}

// 세션을 쿠키로 설정
export function setSessionCookies(session: Session): string[] {
  const maxAge = session.expires_in || 3600;
  const expires = new Date(Date.now() + maxAge * 1000);
  
  const cookieOptions = `Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires.toUTCString()}`;
  
  return [
    `sb-access-token=${encodeURIComponent(session.access_token)}; ${cookieOptions}`,
    `sb-refresh-token=${encodeURIComponent(session.refresh_token)}; ${cookieOptions}`
  ];
}

// 쿠키 삭제
export function clearSessionCookies(): string[] {
  const expiredCookieOptions = 'Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  return [
    `sb-access-token=; ${expiredCookieOptions}`,
    `sb-refresh-token=; ${expiredCookieOptions}`
  ];
}

// 미들웨어용 인증 검증
export async function validateAuthToken(token: string): Promise<User | null> {
  try {
    const payload = await verifyJWT(token);
    
    return {
      id: payload.sub,
      email: payload.email || '',
      app_metadata: payload.app_metadata || {},
      user_metadata: payload.user_metadata || {},
      created_at: '',
      updated_at: ''
    };
  } catch {
    return null;
  }
}

// 헬퍼: 현재 사용자 ID 추출
export function getCurrentUserId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}
