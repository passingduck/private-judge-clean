import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  LawyerResponseSchema,
  JudgeResponseSchema,
  JurorResponseSchema,
  validateLLMResponse,
  validatePartialLLMResponse,
  DefaultResponses,
  LawyerResponse,
  JudgeResponse,
  JurorResponse
} from '@/core/llm/schemas';
import {
  parseAndValidateLLMResponse,
  parseBatchLLMResponses,
  evaluateResponseQuality,
  parseLawyerResponse,
  parseJudgeResponse,
  parseJurorResponse
} from '@/core/llm/parser';

describe('LLM Response Schema Validation', () => {
  describe('Lawyer Response Schema', () => {
    describe('Valid responses', () => {
      it('완벽한 변호사 응답 검증 성공', () => {
        const validResponse: LawyerResponse = {
          statement: '환경보호는 우리 세대와 미래 세대를 위한 필수적인 투자입니다. 단기적 경제적 손실보다 장기적 지속가능성이 더 중요합니다.',
          key_points: [
            '기후변화로 인한 경제적 피해가 더 클 것',
            '재생에너지 산업의 성장 잠재력',
            '환경 규제가 혁신을 촉진함'
          ],
          counter_arguments: [
            '경제성장 우선론의 단기적 시각',
            '환경 비용의 외부화 문제'
          ],
          evidence_references: [
            'IPCC 6차 보고서',
            '스턴 보고서의 경제적 분석'
          ]
        };

        const result = validateLLMResponse(LawyerResponseSchema, validResponse, 'lawyer');
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validResponse);
      });

      it('최소 길이 경계값 테스트', () => {
        const minimalResponse: LawyerResponse = {
          statement: 'A'.repeat(50), // 정확히 50자
          key_points: ['포인트1', '포인트2'], // 최소 2개
          counter_arguments: ['반박1'], // 최소 1개
          evidence_references: [] // 0개 허용
        };

        const result = validateLLMResponse(LawyerResponseSchema, minimalResponse, 'lawyer');
        expect(result.success).toBe(true);
      });

      it('최대 길이 경계값 테스트', () => {
        const maximalResponse: LawyerResponse = {
          statement: 'A'.repeat(2000), // 정확히 2000자
          key_points: Array(5).fill('A'.repeat(200)), // 최대 5개, 각 200자
          counter_arguments: Array(3).fill('A'.repeat(300)), // 최대 3개, 각 300자
          evidence_references: Array(5).fill('A'.repeat(200)) // 최대 5개, 각 200자
        };

        const result = validateLLMResponse(LawyerResponseSchema, maximalResponse, 'lawyer');
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid responses', () => {
      it('필수 필드 누락 시 실패', () => {
        const incompleteResponse = {
          statement: '발언 내용입니다.',
          // key_points 누락
          counter_arguments: ['반박'],
          evidence_references: []
        };

        const result = validateLLMResponse(LawyerResponseSchema, incompleteResponse, 'lawyer');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('VALIDATION_ERROR');
      });

      it('문자열 길이 제한 위반', () => {
        const invalidResponse = {
          statement: 'A'.repeat(2001), // 2000자 초과
          key_points: ['포인트1', '포인트2'],
          counter_arguments: ['반박'],
          evidence_references: []
        };

        const result = validateLLMResponse(LawyerResponseSchema, invalidResponse, 'lawyer');
        expect(result.success).toBe(false);
      });

      it('배열 길이 제한 위반', () => {
        const invalidResponse = {
          statement: '적절한 길이의 발언 내용입니다.',
          key_points: ['포인트1'], // 최소 2개 필요
          counter_arguments: ['반박'],
          evidence_references: []
        };

        const result = validateLLMResponse(LawyerResponseSchema, invalidResponse, 'lawyer');
        expect(result.success).toBe(false);
      });

      it('잘못된 데이터 타입', () => {
        const invalidResponse = {
          statement: 123, // 문자열이어야 함
          key_points: ['포인트1', '포인트2'],
          counter_arguments: ['반박'],
          evidence_references: []
        };

        const result = validateLLMResponse(LawyerResponseSchema, invalidResponse, 'lawyer');
        expect(result.success).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('빈 배열 처리', () => {
        const responseWithEmptyArrays = {
          statement: '적절한 길이의 발언 내용입니다.',
          key_points: ['포인트1', '포인트2'],
          counter_arguments: ['반박'],
          evidence_references: [] // 빈 배열 허용
        };

        const result = validateLLMResponse(LawyerResponseSchema, responseWithEmptyArrays, 'lawyer');
        expect(result.success).toBe(true);
      });

      it('특수문자 포함 텍스트', () => {
        const responseWithSpecialChars = {
          statement: '환경보호는 "필수"입니다! (경제성장과 함께) - 미래를 위해 @#$%^&*',
          key_points: ['포인트1 "인용"', '포인트2 (괄호)'],
          counter_arguments: ['반박 & 추가'],
          evidence_references: ['참조#1']
        };

        const result = validateLLMResponse(LawyerResponseSchema, responseWithSpecialChars, 'lawyer');
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Judge Response Schema', () => {
    describe('Valid responses', () => {
      it('완벽한 판사 응답 검증 성공', () => {
        const validResponse: JudgeResponse = {
          summary: '양측 모두 설득력 있는 주장을 펼쳤으나, A측의 장기적 관점이 더 설득력이 있었습니다.',
          analysis_a: 'A측은 환경보호의 장기적 경제적 이익을 잘 제시했으며, 과학적 근거가 탄탄했습니다.',
          analysis_b: 'B측은 단기적 경제적 현실을 잘 지적했으나, 장기적 비전이 부족했습니다.',
          strengths_a: ['과학적 근거 제시', '장기적 관점', '혁신 동력 강조'],
          weaknesses_a: ['단기적 비용 간과'],
          strengths_b: ['현실적 경제 분석', '즉시 실행 가능성'],
          weaknesses_b: ['장기적 비전 부족'],
          reasoning: '환경보호와 경제성장은 상호 배타적이지 않으며, 지속가능한 발전을 위해서는 환경을 우선시하는 것이 합리적입니다.',
          score_a: 75,
          score_b: 65
        };

        const result = validateLLMResponse(JudgeResponseSchema, validResponse, 'judge');
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validResponse);
      });

      it('점수 경계값 테스트', () => {
        const boundaryResponse: JudgeResponse = {
          summary: '적절한 길이의 판결 요약입니다.',
          analysis_a: '적절한 길이의 A측 분석입니다.',
          analysis_b: '적절한 길이의 B측 분석입니다.',
          strengths_a: ['강점1', '강점2'],
          weaknesses_a: ['약점1'],
          strengths_b: ['강점1', '강점2'],
          weaknesses_b: ['약점1'],
          reasoning: '적절한 길이의 판결 근거입니다.',
          score_a: 0, // 최소값
          score_b: 100 // 최대값
        };

        const result = validateLLMResponse(JudgeResponseSchema, boundaryResponse, 'judge');
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid responses', () => {
      it('점수 범위 초과', () => {
        const invalidResponse = {
          summary: '적절한 길이의 판결 요약입니다.',
          analysis_a: '적절한 길이의 A측 분석입니다.',
          analysis_b: '적절한 길이의 B측 분석입니다.',
          strengths_a: ['강점1', '강점2'],
          weaknesses_a: ['약점1'],
          strengths_b: ['강점1', '강점2'],
          weaknesses_b: ['약점1'],
          reasoning: '적절한 길이의 판결 근거입니다.',
          score_a: 101, // 100 초과
          score_b: -1   // 0 미만
        };

        const result = validateLLMResponse(JudgeResponseSchema, invalidResponse, 'judge');
        expect(result.success).toBe(false);
      });

      it('소수점 점수 (정수만 허용)', () => {
        const invalidResponse = {
          summary: '적절한 길이의 판결 요약입니다.',
          analysis_a: '적절한 길이의 A측 분석입니다.',
          analysis_b: '적절한 길이의 B측 분석입니다.',
          strengths_a: ['강점1', '강점2'],
          weaknesses_a: ['약점1'],
          strengths_b: ['강점1', '강점2'],
          weaknesses_b: ['약점1'],
          reasoning: '적절한 길이의 판결 근거입니다.',
          score_a: 75.5, // 소수점 불허
          score_b: 65.3
        };

        const result = validateLLMResponse(JudgeResponseSchema, invalidResponse, 'judge');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Juror Response Schema', () => {
    describe('Valid responses', () => {
      it('완벽한 배심원 응답 검증 성공', () => {
        const validResponse: JurorResponse = {
          vote: 'A',
          reasoning: '환경보호의 장기적 중요성과 과학적 근거가 더 설득력 있었습니다.',
          confidence: 8,
          key_factors: ['과학적 근거', '장기적 관점']
        };

        const result = validateLLMResponse(JurorResponseSchema, validResponse, 'juror');
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validResponse);
      });

      it('확신도 경계값 테스트', () => {
        const minConfidenceResponse: JurorResponse = {
          vote: 'B',
          reasoning: '적절한 길이의 투표 이유입니다.',
          confidence: 1, // 최소값
          key_factors: ['요인1']
        };

        const maxConfidenceResponse: JurorResponse = {
          vote: 'A',
          reasoning: '적절한 길이의 투표 이유입니다.',
          confidence: 10, // 최대값
          key_factors: ['요인1']
        };

        expect(validateLLMResponse(JurorResponseSchema, minConfidenceResponse, 'juror').success).toBe(true);
        expect(validateLLMResponse(JurorResponseSchema, maxConfidenceResponse, 'juror').success).toBe(true);
      });
    });

    describe('Invalid responses', () => {
      it('잘못된 투표 값', () => {
        const invalidResponse = {
          vote: 'C', // A 또는 B만 허용
          reasoning: '적절한 길이의 투표 이유입니다.',
          confidence: 5,
          key_factors: ['요인1']
        };

        const result = validateLLMResponse(JurorResponseSchema, invalidResponse, 'juror');
        expect(result.success).toBe(false);
      });

      it('확신도 범위 초과', () => {
        const invalidResponse = {
          vote: 'A',
          reasoning: '적절한 길이의 투표 이유입니다.',
          confidence: 11, // 10 초과
          key_factors: ['요인1']
        };

        const result = validateLLMResponse(JurorResponseSchema, invalidResponse, 'juror');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Parser Functions', () => {
    describe('JSON parsing', () => {
      it('완벽한 JSON 파싱 성공', async () => {
        const validJson = JSON.stringify({
          vote: 'A',
          reasoning: '적절한 길이의 투표 이유입니다.',
          confidence: 8,
          key_factors: ['요인1', '요인2']
        });

        const result = await parseJurorResponse(validJson);
        expect(result.success).toBe(true);
        expect(result.data?.vote).toBe('A');
      });

      it('마크다운 코드 블록 제거', async () => {
        const jsonWithMarkdown = `
\`\`\`json
{
  "vote": "B",
  "reasoning": "적절한 길이의 투표 이유입니다.",
  "confidence": 7,
  "key_factors": ["요인1"]
}
\`\`\`
        `;

        const result = await parseJurorResponse(jsonWithMarkdown);
        expect(result.success).toBe(true);
        expect(result.data?.vote).toBe('B');
      });

      it('앞뒤 불필요한 텍스트 제거', async () => {
        const jsonWithExtra = `
여기는 설명입니다.
{
  "vote": "A",
  "reasoning": "적절한 길이의 투표 이유입니다.",
  "confidence": 6,
  "key_factors": ["요인1"]
}
추가 설명이 있습니다.
        `;

        const result = await parseJurorResponse(jsonWithExtra);
        expect(result.success).toBe(true);
        expect(result.data?.vote).toBe('A');
      });

      it('잘못된 JSON 형식 처리', async () => {
        const invalidJson = `{
          "vote": "A",
          "reasoning": "적절한 길이의 투표 이유입니다.", // 주석 불가
          "confidence": 5,
          "key_factors": ["요인1"]
        }`;

        const result = await parseJurorResponse(invalidJson, { useDefaults: true });
        expect(result.success).toBe(true);
        expect(result.fallbackUsed).toBe(true);
      });
    });

    describe('Fallback handling', () => {
      it('파싱 실패 시 기본값 사용', async () => {
        const invalidResponse = 'This is not JSON at all';

        const result = await parseLawyerResponse(invalidResponse, { useDefaults: true });
        expect(result.success).toBe(true);
        expect(result.fallbackUsed).toBe(true);
        expect(result.data?.statement).toContain('기술적 오류');
      });

      it('부분 검증 성공 시 누락 필드 채우기', async () => {
        const partialJson = JSON.stringify({
          statement: '적절한 길이의 발언 내용입니다.',
          key_points: ['포인트1', '포인트2']
          // counter_arguments, evidence_references 누락
        });

        const result = await parseLawyerResponse(partialJson, { allowPartial: false });
        expect(result.success).toBe(true);
        expect(result.data?.counter_arguments).toBeDefined();
        expect(result.data?.evidence_references).toBeDefined();
      });

      it('기본값 사용 안 함 옵션', async () => {
        const invalidResponse = 'This is not JSON';

        const result = await parseJurorResponse(invalidResponse, { useDefaults: false });
        expect(result.success).toBe(false);
        expect(result.fallbackUsed).toBeUndefined();
      });
    });

    describe('Batch processing', () => {
      it('배치 파싱 성공', async () => {
        const responses = [
          {
            response: JSON.stringify({
              vote: 'A',
              reasoning: '적절한 길이의 투표 이유입니다.',
              confidence: 8,
              key_factors: ['요인1']
            }),
            role: 'juror' as const,
            id: 'juror1'
          },
          {
            response: JSON.stringify({
              vote: 'B',
              reasoning: '다른 적절한 길이의 투표 이유입니다.',
              confidence: 7,
              key_factors: ['요인2']
            }),
            role: 'juror' as const,
            id: 'juror2'
          }
        ];

        const results = await parseBatchLLMResponses(responses);
        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(true);
        expect(results[0].id).toBe('juror1');
        expect(results[1].id).toBe('juror2');
      });

      it('배치에서 일부 실패 처리', async () => {
        const responses = [
          {
            response: JSON.stringify({
              vote: 'A',
              reasoning: '적절한 길이의 투표 이유입니다.',
              confidence: 8,
              key_factors: ['요인1']
            }),
            role: 'juror' as const,
            id: 'juror1'
          },
          {
            response: 'invalid json',
            role: 'juror' as const,
            id: 'juror2'
          }
        ];

        const results = await parseBatchLLMResponses(responses, { useDefaults: true });
        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(true);
        expect(results[1].fallbackUsed).toBe(true);
      });
    });

    describe('Response quality evaluation', () => {
      it('고품질 변호사 응답 평가', () => {
        const highQualityResponse: LawyerResponse = {
          statement: '환경보호는 우리 세대와 미래 세대를 위한 필수적인 투자입니다. 단기적 경제적 손실보다 장기적 지속가능성이 더 중요하며, 이는 과학적 근거와 경제적 분석을 통해 입증됩니다.',
          key_points: ['기후변화 경제적 피해', '재생에너지 성장', '혁신 촉진 효과'],
          counter_arguments: ['단기적 시각의 한계', '외부화 비용 문제'],
          evidence_references: ['IPCC 보고서', '스턴 보고서']
        };

        const quality = evaluateResponseQuality(highQualityResponse, 'lawyer');
        expect(quality.score).toBeGreaterThan(80);
        expect(quality.issues).toHaveLength(0);
      });

      it('저품질 판사 응답 평가', () => {
        const lowQualityResponse: JudgeResponse = {
          summary: '짧은 요약',
          analysis_a: '짧은 분석',
          analysis_b: '짧은 분석',
          strengths_a: ['강점'],
          weaknesses_a: ['약점'],
          strengths_b: ['강점'],
          weaknesses_b: ['약점'],
          reasoning: '짧은 근거',
          score_a: 51,
          score_b: 49
        };

        const quality = evaluateResponseQuality(lowQualityResponse, 'judge');
        expect(quality.score).toBeLessThan(50);
        expect(quality.issues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Default responses', () => {
    it('모든 역할의 기본값이 스키마를 통과', () => {
      const lawyerDefault = DefaultResponses.lawyer();
      const judgeDefault = DefaultResponses.judge();
      const jurorDefault = DefaultResponses.juror();

      expect(validateLLMResponse(LawyerResponseSchema, lawyerDefault, 'lawyer').success).toBe(true);
      expect(validateLLMResponse(JudgeResponseSchema, judgeDefault, 'judge').success).toBe(true);
      expect(validateLLMResponse(JurorResponseSchema, jurorDefault, 'juror').success).toBe(true);
    });

    it('기본값에 오류 표시 포함', () => {
      const defaults = [
        DefaultResponses.lawyer(),
        DefaultResponses.judge(),
        DefaultResponses.juror()
      ];

      defaults.forEach(defaultResponse => {
        const hasErrorIndicator = Object.values(defaultResponse).some(value =>
          typeof value === 'string' && value.includes('기술적 오류')
        );
        expect(hasErrorIndicator).toBe(true);
      });
    });
  });

  describe('Performance tests', () => {
    it('대량 응답 처리 성능', async () => {
      const startTime = Date.now();
      
      const responses = Array(100).fill(null).map((_, index) => ({
        response: JSON.stringify({
          vote: index % 2 === 0 ? 'A' : 'B',
          reasoning: `배심원 ${index}의 투표 이유입니다.`,
          confidence: Math.floor(Math.random() * 10) + 1,
          key_factors: [`요인${index}`]
        }),
        role: 'juror' as const,
        id: `juror${index}`
      }));

      const results = await parseBatchLLMResponses(responses);
      const endTime = Date.now();
      
      expect(results).toHaveLength(100);
      expect(results.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5초 이내
    });

    it('큰 응답 처리', async () => {
      const largeResponse = {
        statement: 'A'.repeat(1500), // 큰 텍스트
        key_points: Array(5).fill('A'.repeat(150)),
        counter_arguments: Array(3).fill('A'.repeat(250)),
        evidence_references: Array(5).fill('A'.repeat(180))
      };

      const startTime = Date.now();
      const result = await parseLawyerResponse(JSON.stringify(largeResponse));
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // 1초 이내
    });
  });
});

// Jest 설정
export const llmSchemasTestConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/llm-schemas.test.ts'],
  collectCoverageFrom: [
    'core/llm/**/*.ts',
    '!core/llm/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};
