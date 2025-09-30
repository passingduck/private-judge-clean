'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // URL fragment에서 토큰 추출 (implicit flow)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresIn = params.get('expires_in');
      const tokenType = params.get('token_type');

      if (accessToken && refreshToken) {
        try {
          // JWT에서 사용자 정보 추출
          const payload = JSON.parse(atob(accessToken.split('.')[1]));

          const user = {
            id: payload.sub,
            email: payload.email || '',
            user_metadata: payload.user_metadata || {},
            app_metadata: payload.app_metadata || {}
          };

          // 서버에 세션 설정 요청
          const response = await fetch('/api/auth/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_in: expiresIn ? parseInt(expiresIn) : 3600,
              user
            }),
            credentials: 'include'
          });

          if (response.ok) {
            // 성공 시 dashboard로 리다이렉트
            window.location.href = '/dashboard?message=로그인되었습니다.';
          } else {
            // 실패 시 에러 페이지로
            window.location.href = '/auth/error?error=callback_failed&message=세션 설정에 실패했습니다.';
          }
        } catch (error) {
          console.error('Callback error:', error);
          window.location.href = '/auth/error?error=callback_error&message=인증 처리 중 오류가 발생했습니다.';
        }
      } else {
        // 토큰이 없으면 에러
        window.location.href = '/auth/error?error=missing_tokens&message=인증 토큰이 없습니다.';
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인 처리 중...</h1>
        <p className="text-gray-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}