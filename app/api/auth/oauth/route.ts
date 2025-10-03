import { NextRequest, NextResponse } from 'next/server';
import { getOAuthSignInUrl } from '@/data/supabase/auth';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    console.info('[auth/oauth] start', { requestId });

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as 'google' | 'github' | null;
    const redirectTo = searchParams.get('redirect_to');

    if (!provider || !['google', 'github'].includes(provider)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PROVIDER',
          message: '유효하지 않은 OAuth 제공자입니다.',
          requestId
        },
        { status: 400 }
      );
    }

    // redirect_to가 없으면 환경 변수 사용
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    const finalRedirectTo = redirectTo || (siteUrl ? `${siteUrl}/auth/callback` : undefined);

    console.info('[auth/oauth] provider', {
      requestId,
      provider,
      redirectTo: finalRedirectTo,
      env_NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      env_NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
    });

    const oauthUrl = getOAuthSignInUrl(provider, finalRedirectTo);

    console.info('[auth/oauth] redirecting', { requestId, provider });

    return NextResponse.redirect(oauthUrl);

  } catch (error) {
    console.error('[auth/oauth] error', {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        success: false,
        error: 'OAUTH_ERROR',
        message: 'OAuth 인증 중 오류가 발생했습니다.',
        requestId
      },
      { status: 500 }
    );
  }
}