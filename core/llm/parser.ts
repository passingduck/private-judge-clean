import { 
  LLMSchemas, 
  LLMRole, 
  ValidationResult, 
  DefaultResponses,
  validateLLMResponse,
  validatePartialLLMResponse,
  LawyerResponse,
  JudgeResponse,
  JurorResponse
} from './schemas';

// 파싱 옵션
interface ParseOptions {
  allowPartial?: boolean;
  useDefaults?: boolean;
  maxRetries?: number;
  requestId?: string;
}

// 파싱 결과
interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  fallbackUsed?: boolean;
}

/**
 * LLM 응답을 파싱하고 검증하는 메인 함수
 */
export async function parseAndValidateLLMResponse<T>(
  rawResponse: string,
  role: LLMRole,
  options: ParseOptions = {}
): Promise<ParseResult<T>> {
  const {
    allowPartial = false,
    useDefaults = true,
    requestId = crypto.randomUUID()
  } = options;

  console.info('[llm-parser] start', { 
    requestId, 
    role, 
    responseLength: rawResponse.length,
    allowPartial,
    useDefaults
  });

  try {
    // 1단계: JSON 파싱
    const jsonParseResult = parseJSON(rawResponse, requestId);
    if (!jsonParseResult.success) {
      console.warn('[llm-parser] JSON parse failed', { 
        requestId, 
        role, 
        error: jsonParseResult.error 
      });

      if (useDefaults) {
        return createFallbackResponse(role, jsonParseResult.error, requestId);
      }

      return {
        success: false,
        error: jsonParseResult.error
      };
    }

    // 2단계: 스키마 검증
    const schema = LLMSchemas[role];
    const validationResult = allowPartial
      ? validatePartialLLMResponse(schema as any, jsonParseResult.data, role)
      : validateLLMResponse(schema as any, jsonParseResult.data, role);

    if (validationResult.success) {
      console.info('[llm-parser] success', { 
        requestId, 
        role,
        dataKeys: Object.keys(validationResult.data || {})
      });

      return {
        success: true,
        data: validationResult.data as T
      };
    }

    // 3단계: 검증 실패 시 처리
    console.warn('[llm-parser] validation failed', { 
      requestId, 
      role, 
      error: validationResult.error 
    });

    // 부분 검증 시도 (전체 검증이 실패한 경우)
    if (!allowPartial) {
      const partialResult = validatePartialLLMResponse(schema as any, jsonParseResult.data, role);
      if (partialResult.success && hasMinimumRequiredFields(partialResult.data, role)) {
        console.info('[llm-parser] partial validation success', { 
          requestId, 
          role,
          availableFields: Object.keys(partialResult.data || {})
        });

        return {
          success: true,
          data: fillMissingFields(partialResult.data, role) as T,
          fallbackUsed: true
        };
      }
    }

    // 기본값 사용
    if (useDefaults) {
      return createFallbackResponse(role, validationResult.error, requestId);
    }

    return {
      success: false,
      error: validationResult.error
    };

  } catch (error) {
    console.error('[llm-parser] unexpected error', { 
      requestId, 
      role, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    if (useDefaults) {
      return createFallbackResponse(role, {
        code: 'UNEXPECTED_ERROR',
        message: '예상치 못한 파싱 오류',
        details: { originalError: String(error) }
      }, requestId);
    }

    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: '예상치 못한 파싱 오류',
        details: { originalError: String(error) }
      }
    };
  }
}

/**
 * JSON 파싱 함수
 */
function parseJSON(rawResponse: string, requestId: string): ValidationResult<any> {
  try {
    // 응답 정리 (마크다운 코드 블록 제거 등)
    const cleanedResponse = cleanLLMResponse(rawResponse);
    
    const parsed = JSON.parse(cleanedResponse);
    
    console.info('[llm-parser] JSON parse success', { 
      requestId, 
      originalLength: rawResponse.length,
      cleanedLength: cleanedResponse.length,
      parsedKeys: Object.keys(parsed || {})
    });

    return {
      success: true,
      data: parsed
    };
  } catch (error) {
    console.warn('[llm-parser] JSON parse error', { 
      requestId, 
      error: error instanceof Error ? error.message : String(error),
      responsePreview: rawResponse.substring(0, 200) + '...'
    });

    return {
      success: false,
      error: {
        code: 'JSON_PARSE_ERROR',
        message: 'JSON 파싱 실패',
        details: { 
          originalError: String(error),
          responsePreview: rawResponse.substring(0, 200)
        }
      }
    };
  }
}

/**
 * LLM 응답 정리 함수
 */
function cleanLLMResponse(response: string): string {
  let cleaned = response.trim();

  // 마크다운 코드 블록 제거
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');

  // 앞뒤 불필요한 텍스트 제거
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  return cleaned.trim();
}

/**
 * 최소 필수 필드 확인
 */
function hasMinimumRequiredFields(data: any, role: LLMRole): boolean {
  if (!data || typeof data !== 'object') return false;

  switch (role) {
    case 'lawyer':
      return !!(data.statement && data.key_points);
    case 'judge':
      return !!(data.summary && data.reasoning && 
                typeof data.score_a === 'number' && 
                typeof data.score_b === 'number');
    case 'juror':
      return !!(data.vote && data.reasoning && typeof data.confidence === 'number');
    default:
      return false;
  }
}

/**
 * 누락된 필드를 기본값으로 채우기
 */
function fillMissingFields(partialData: any, role: LLMRole): any {
  const defaults = DefaultResponses[role]();
  
  return {
    ...defaults,
    ...partialData
  };
}

/**
 * 폴백 응답 생성
 */
function createFallbackResponse<T>(
  role: LLMRole, 
  error: any, 
  requestId: string
): ParseResult<T> {
  console.warn('[llm-parser] using fallback response', { 
    requestId, 
    role, 
    error 
  });

  const fallbackData = DefaultResponses[role]();

  return {
    success: true,
    data: fallbackData as T,
    fallbackUsed: true,
    error: {
      code: 'FALLBACK_USED',
      message: '기본값으로 대체됨',
      details: { originalError: error }
    }
  };
}

/**
 * 배치 파싱 (여러 응답 동시 처리)
 */
export async function parseBatchLLMResponses(
  responses: Array<{ response: string; role: LLMRole; id?: string }>,
  options: ParseOptions = {}
): Promise<Array<ParseResult<any> & { id?: string; role: LLMRole }>> {
  const requestId = options.requestId || crypto.randomUUID();
  
  console.info('[llm-parser] batch parse start', { 
    requestId, 
    count: responses.length 
  });

  const results = await Promise.all(
    responses.map(async ({ response, role, id }) => {
      const result = await parseAndValidateLLMResponse(response, role, {
        ...options,
        requestId: `${requestId}-${id || role}`
      });

      return {
        ...result,
        id,
        role
      };
    })
  );

  const successCount = results.filter(r => r.success).length;
  const fallbackCount = results.filter(r => r.fallbackUsed).length;

  console.info('[llm-parser] batch parse complete', { 
    requestId, 
    total: results.length,
    success: successCount,
    fallbacks: fallbackCount,
    failures: results.length - successCount
  });

  return results;
}

/**
 * 응답 품질 평가
 */
export function evaluateResponseQuality(
  data: any, 
  role: LLMRole
): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  if (!data) {
    return { score: 0, issues: ['응답 데이터 없음'] };
  }

  switch (role) {
    case 'lawyer':
      if (data.statement && data.statement.length < 100) {
        issues.push('발언이 너무 짧음');
        score -= 20;
      }
      if (data.key_points && data.key_points.length < 3) {
        issues.push('핵심 포인트 부족');
        score -= 15;
      }
      if (data.counter_arguments && data.counter_arguments.length === 0) {
        issues.push('반박 내용 없음');
        score -= 10;
      }
      break;

    case 'judge':
      if (data.reasoning && data.reasoning.length < 300) {
        issues.push('판결 근거가 부족함');
        score -= 25;
      }
      if (Math.abs(data.score_a - data.score_b) < 5) {
        issues.push('점수 차이가 너무 작음');
        score -= 10;
      }
      break;

    case 'juror':
      if (data.reasoning && data.reasoning.length < 80) {
        issues.push('투표 이유가 부족함');
        score -= 20;
      }
      if (data.confidence < 3) {
        issues.push('확신도가 너무 낮음');
        score -= 15;
      }
      break;
  }

  return { score: Math.max(0, score), issues };
}

/**
 * 타입별 파싱 헬퍼 함수들
 */
export const parseLawyerResponse = (response: string, options?: ParseOptions) =>
  parseAndValidateLLMResponse<LawyerResponse>(response, 'lawyer', options);

export const parseJudgeResponse = (response: string, options?: ParseOptions) =>
  parseAndValidateLLMResponse<JudgeResponse>(response, 'judge', options);

export const parseJurorResponse = (response: string, options?: ParseOptions) =>
  parseAndValidateLLMResponse<JurorResponse>(response, 'juror', options);
