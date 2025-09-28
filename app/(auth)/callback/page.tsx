'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/layout/layout';
import { MESSAGES } from '@/core/constants/messages';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // URL 파라미터 확인
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const message = searchParams.get('message');
        
        if (error) {
          console.error('Auth callback error:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || '인증 중 오류가 발생했습니다.');
          return;
        }

        if (message) {
          setStatus('success');
          setMessage(message);
          
          // 성공 메시지 표시 후 대시보드로 이동
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          // 파라미터가 없으면 대시보드로 바로 이동
          router.push('/dashboard');
        }
        
      } catch (err) {
        console.error('Callback processing error:', err);
        setStatus('error');
        setMessage('인증 처리 중 오류가 발생했습니다.');
      }
    };

    processCallback();
  }, [searchParams, router]);

  const handleRetry = () => {
    router.push('/auth/login');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <Layout title="인증 처리" showHeader={false}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              사적 재판 시스템
            </h2>
            
            {status === 'loading' && (
              <div className="mt-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-600">
                  인증을 처리하고 있습니다...
                </p>
              </div>
            )}
            
            {status === 'success' && (
              <div className="mt-8">
                <div className="rounded-full h-12 w-12 bg-green-100 mx-auto flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  인증 완료
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {message}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  잠시 후 대시보드로 이동합니다...
                </p>
                <div className="mt-4">
                  <button
                    onClick={handleGoToDashboard}
                    className="btn-primary"
                  >
                    지금 이동하기
                  </button>
                </div>
              </div>
            )}
            
            {status === 'error' && (
              <div className="mt-8">
                <div className="rounded-full h-12 w-12 bg-red-100 mx-auto flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  인증 오류
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {message}
                </p>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleRetry}
                    className="btn-primary w-full"
                  >
                    다시 시도
                  </button>
                  <button
                    onClick={handleGoToDashboard}
                    className="btn-secondary w-full"
                  >
                    대시보드로 이동
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
