import { z } from 'zod';

// 변호사 응답 스키마
export const LawyerResponseSchema = z.object({
  statement: z.string()
    .min(50, '발언 내용은 최소 50자 이상이어야 합니다')
    .max(2000, '발언 내용은 최대 2000자를 초과할 수 없습니다')
    .describe('변호사의 주요 발언 내용'),
  
  key_points: z.array(z.string().min(5).max(200))
    .min(2, '핵심 포인트는 최소 2개 이상이어야 합니다')
    .max(5, '핵심 포인트는 최대 5개까지 허용됩니다')
    .describe('주요 논점들'),
  
  counter_arguments: z.array(z.string().min(5).max(300))
    .min(1, '반박 포인트는 최소 1개 이상이어야 합니다')
    .max(3, '반박 포인트는 최대 3개까지 허용됩니다')
    .describe('상대방에 대한 반박 내용'),
  
  evidence_references: z.array(z.string().min(3).max(200))
    .max(5, '증거 참조는 최대 5개까지 허용됩니다')
    .describe('증거 자료 참조')
});

// 판사 응답 스키마
export const JudgeResponseSchema = z.object({
  summary: z.string()
    .min(100, '판결 요약은 최소 100자 이상이어야 합니다')
    .max(500, '판결 요약은 최대 500자를 초과할 수 없습니다')
    .describe('판결 요약'),
  
  analysis_a: z.string()
    .min(100, 'A측 분석은 최소 100자 이상이어야 합니다')
    .max(1000, 'A측 분석은 최대 1000자를 초과할 수 없습니다')
    .describe('A측 주장 분석'),
  
  analysis_b: z.string()
    .min(100, 'B측 분석은 최소 100자 이상이어야 합니다')
    .max(1000, 'B측 분석은 최대 1000자를 초과할 수 없습니다')
    .describe('B측 주장 분석'),
  
  strengths_a: z.array(z.string().min(10).max(200))
    .min(2, 'A측 강점은 최소 2개 이상이어야 합니다')
    .max(5, 'A측 강점은 최대 5개까지 허용됩니다')
    .describe('A측의 강점들'),
  
  weaknesses_a: z.array(z.string().min(10).max(200))
    .min(1, 'A측 약점은 최소 1개 이상이어야 합니다')
    .max(3, 'A측 약점은 최대 3개까지 허용됩니다')
    .describe('A측의 약점들'),
  
  strengths_b: z.array(z.string().min(10).max(200))
    .min(2, 'B측 강점은 최소 2개 이상이어야 합니다')
    .max(5, 'B측 강점은 최대 5개까지 허용됩니다')
    .describe('B측의 강점들'),
  
  weaknesses_b: z.array(z.string().min(10).max(200))
    .min(1, 'B측 약점은 최소 1개 이상이어야 합니다')
    .max(3, 'B측 약점은 최대 3개까지 허용됩니다')
    .describe('B측의 약점들'),
  
  reasoning: z.string()
    .min(200, '판결 근거는 최소 200자 이상이어야 합니다')
    .max(1000, '판결 근거는 최대 1000자를 초과할 수 없습니다')
    .describe('판결의 상세 근거'),
  
  score_a: z.number()
    .int('A측 점수는 정수여야 합니다')
    .min(0, 'A측 점수는 0 이상이어야 합니다')
    .max(100, 'A측 점수는 100 이하여야 합니다')
    .describe('A측 점수 (0-100)'),
  
  score_b: z.number()
    .int('B측 점수는 정수여야 합니다')
    .min(0, 'B측 점수는 0 이상이어야 합니다')
    .max(100, 'B측 점수는 100 이하여야 합니다')
    .describe('B측 점수 (0-100)')
});

// 배심원 응답 스키마
export const JurorResponseSchema = z.object({
  vote: z.enum(['A', 'B'], {
    errorMap: () => ({ message: '투표는 "A" 또는 "B"만 허용됩니다' })
  }).describe('투표 선택'),
  
  reasoning: z.string()
    .min(50, '투표 이유는 최소 50자 이상이어야 합니다')
    .max(300, '투표 이유는 최대 300자를 초과할 수 없습니다')
    .describe('투표 이유'),
  
  confidence: z.number()
    .int('확신도는 정수여야 합니다')
    .min(1, '확신도는 최소 1 이상이어야 합니다')
    .max(10, '확신도는 최대 10 이하여야 합니다')
    .describe('투표에 대한 확신도 (1-10)'),
  
  key_factors: z.array(z.string().min(5).max(100))
    .min(1, '결정적 요인은 최소 1개 이상이어야 합니다')
    .max(3, '결정적 요인은 최대 3개까지 허용됩니다')
    .describe('투표 결정에 영향을 준 주요 요인들')
});

// 타입 추출
export type LawyerResponse = z.infer<typeof LawyerResponseSchema>;
export type JudgeResponse = z.infer<typeof JudgeResponseSchema>;
export type JurorResponse = z.infer<typeof JurorResponseSchema>;

// 스키마 맵 (동적 접근용)
export const LLMSchemas = {
  lawyer: LawyerResponseSchema,
  judge: JudgeResponseSchema,
  juror: JurorResponseSchema
} as const;

export type LLMRole = keyof typeof LLMSchemas;

// 검증 결과 타입
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// 공통 검증 함수
export function validateLLMResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  role: string
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${role} 응답 검증 실패`,
          details: {
            issues: error.issues.map(issue => ({
              path: issue.path.join('.'),
              message: issue.message,
              received: (issue as any).received || undefined
            }))
          }
        }
      };
    }
    
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: '알 수 없는 검증 오류',
        details: { originalError: String(error) }
      }
    };
  }
}

// 부분 검증 함수 (일부 필드만 검증)
export function validatePartialLLMResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  role: string
): ValidationResult<Partial<T>> {
  try {
    // 부분 스키마로 변환
    const partialSchema = schema.partial();
    const validatedData = partialSchema.parse(data);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    return validateLLMResponse(schema, data, role) as ValidationResult<Partial<T>>;
  }
}

// 스키마별 기본값 제공
export const DefaultResponses = {
  lawyer: (): LawyerResponse => ({
    statement: '기술적 오류로 인해 응답을 생성할 수 없습니다.',
    key_points: ['응답 생성 실패', '재시도 필요'],
    counter_arguments: ['기술적 문제 발생'],
    evidence_references: []
  }),
  
  judge: (): JudgeResponse => ({
    summary: '기술적 오류로 인해 판결을 생성할 수 없습니다.',
    analysis_a: 'A측 분석을 완료할 수 없습니다.',
    analysis_b: 'B측 분석을 완료할 수 없습니다.',
    strengths_a: ['분석 불가', '재시도 필요'],
    weaknesses_a: ['분석 불가'],
    strengths_b: ['분석 불가', '재시도 필요'],
    weaknesses_b: ['분석 불가'],
    reasoning: '기술적 문제로 인해 상세한 판결 근거를 제공할 수 없습니다.',
    score_a: 50,
    score_b: 50
  }),
  
  juror: (): JurorResponse => ({
    vote: 'A' as const,
    reasoning: '기술적 오류로 인해 상세한 투표 이유를 제공할 수 없습니다.',
    confidence: 5,
    key_factors: ['기술적 문제 발생']
  })
} as const;
