import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/data/supabase/client';

// GET /api/health - 시스템 상태 확인
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 기본 응답 데이터
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: { status: 'unknown', responseTime: 0, error?: string },
        openai: { status: 'unknown', responseTime: 0, error?: string },
        supabase_edge_functions: { status: 'unknown', responseTime: 0, error?: string }
      }
    };

    // 데이터베이스 연결 확인
    try {
      const dbStartTime = Date.now();
      const supabase = getSupabaseClient(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      healthData.checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        responseTime: Date.now() - dbStartTime,
        error: error?.message
      };
    } catch (dbError: any) {
      healthData.checks.database = {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: dbError.message
      };
    }

    // OpenAI API 연결 확인 (간단한 모델 목록 조회)
    if (process.env.OPENAI_API_KEY) {
      try {
        const openaiStartTime = Date.now();
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000) // 5초 타임아웃
        });

        healthData.checks.openai = {
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - openaiStartTime,
          statusCode: response.status
        };
      } catch (openaiError: any) {
        healthData.checks.openai = {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: openaiError.message
        };
      }
    } else {
      healthData.checks.openai = {
        status: 'not_configured',
        responseTime: 0,
        error: 'OPENAI_API_KEY not set'
      };
    }

    // Supabase Edge Functions 상태 확인 (프로젝트 URL 기반)
    if (process.env.SUPABASE_URL) {
      try {
        const edgeStartTime = Date.now();
        const edgeFunctionUrl = `${process.env.SUPABASE_URL}/functions/v1/jobs-worker`;
        
        const response = await fetch(edgeFunctionUrl, {
          method: 'HEAD', // HEAD 요청으로 가볍게 확인
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          },
          signal: AbortSignal.timeout(5000)
        });

        healthData.checks.supabase_edge_functions = {
          status: response.status === 404 ? 'healthy' : 'unknown', // 404는 함수가 존재하지만 HEAD를 지원하지 않음을 의미
          responseTime: Date.now() - edgeStartTime,
          statusCode: response.status
        };
      } catch (edgeError: any) {
        healthData.checks.supabase_edge_functions = {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: edgeError.message
        };
      }
    } else {
      healthData.checks.supabase_edge_functions = {
        status: 'not_configured',
        responseTime: 0,
        error: 'SUPABASE_URL not set'
      };
    }

    // 전체 상태 결정
    const allChecks = Object.values(healthData.checks);
    const hasUnhealthy = allChecks.some((check: any) => check.status === 'unhealthy');
    const hasNotConfigured = allChecks.some((check: any) => check.status === 'not_configured');

    if (hasUnhealthy) {
      healthData.status = 'unhealthy';
    } else if (hasNotConfigured) {
      healthData.status = 'degraded';
    } else {
      healthData.status = 'healthy';
    }

    // 총 응답 시간
    const totalResponseTime = Date.now() - startTime;

    // 상태에 따른 HTTP 상태 코드
    const httpStatus = healthData.status === 'healthy' ? 200 : 
                      healthData.status === 'degraded' ? 200 : 503;

    return NextResponse.json({
      ...healthData,
      responseTime: totalResponseTime
    }, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    const totalResponseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      error: error.message,
      responseTime: totalResponseTime
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
