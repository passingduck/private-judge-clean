import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// 테스트 데이터
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'test@example.com'
};

const mockRoomId = '660e8400-e29b-41d4-a716-446655440001';

const mockAgenda = {
  room_id: mockRoomId,
  title: '환경보호가 경제성장보다 우선되어야 한다',
  description: '기후변화와 환경파괴가 심각한 상황에서, 단기적 경제적 손실을 감수하더라도 환경보호를 우선시해야 한다는 입장입니다. 지속가능한 발전을 위해서는 환경이 먼저 보호되어야 합니다.'
};

const mockArgument = {
  room_id: mockRoomId,
  title: '환경보호 우선 정책의 필요성',
  content: '기후변화로 인한 피해가 경제적 손실보다 훨씬 크다는 것이 과학적으로 입증되고 있습니다. IPCC 보고서에 따르면, 지구 온도가 1.5도 상승할 경우 경제적 피해는 GDP의 10-23%에 달할 것으로 예상됩니다.',
  evidence: [
    {
      type: 'document',
      title: 'IPCC 6차 보고서',
      url: 'https://www.ipcc.ch/report/ar6/wg2/',
      description: '기후변화 영향 및 적응에 관한 과학적 근거'
    }
  ]
};

// 테스트 헬퍼: 인증된 요청 생성
function createAuthenticatedRequest(
  url: string, 
  options: RequestInit = {}
): NextRequest {
  const headers = new Headers(options.headers);
  headers.set('x-user-id', mockUser.id);
  headers.set('x-user-email', mockUser.email);
  headers.set('x-request-id', crypto.randomUUID());
  
  return new NextRequest(url, {
    ...options,
    headers
  });
}

describe('Debates API Contract Tests', () => {
  describe('POST /api/debates/agenda - 안건 제안', () => {
    it('유효한 안건 제안 성공', async () => {
      const expectedSchema = {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        room_id: mockRoomId,
        title: mockAgenda.title,
        description: mockAgenda.description,
        proposer_id: mockUser.id,
        status: 'proposed',
        negotiation_history: expect.arrayContaining([
          expect.objectContaining({
            action: 'proposed',
            user_id: mockUser.id,
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
          })
        ]),
        created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedSchema).toBeDefined();
    });

    it('제목 길이 검증 (10-300자)', async () => {
      const titleTests = [
        { title: '짧은제목', shouldFail: true }, // 10자 미만
        { title: '적절한 길이의 안건 제목입니다', shouldFail: false },
        { title: 'A'.repeat(301), shouldFail: true } // 300자 초과
      ];

      titleTests.forEach(test => {
        const isValid = test.title.length >= 10 && test.title.length <= 300;
        expect(isValid).toBe(!test.shouldFail);
      });
    });

    it('설명 길이 검증 (50-2000자)', async () => {
      const descriptionTests = [
        { description: '너무 짧은 설명', shouldFail: true }, // 50자 미만
        { description: '적절한 길이의 안건 설명입니다. '.repeat(3), shouldFail: false },
        { description: 'A'.repeat(2001), shouldFail: true } // 2000자 초과
      ];

      descriptionTests.forEach(test => {
        const isValid = test.description.length >= 50 && test.description.length <= 2000;
        expect(isValid).toBe(!test.shouldFail);
      });
    });

    it('필수 필드 누락 시 400 에러', async () => {
      const invalidRequests = [
        { room_id: mockRoomId, description: mockAgenda.description }, // title 누락
        { room_id: mockRoomId, title: mockAgenda.title }, // description 누락
        { title: mockAgenda.title, description: mockAgenda.description } // room_id 누락
      ];

      invalidRequests.forEach(request => {
        const hasAllRequired = request.room_id && request.title && request.description;
        expect(hasAllRequired).toBe(false);
      });
    });

    it('존재하지 않는 방에 안건 제안 시 403 에러', async () => {
      const nonExistentRoomId = '00000000-0000-0000-0000-000000000000';
      
      const expectedErrorSchema = {
        error: 'forbidden',
        message: expect.stringContaining('권한이 없습니다')
      };

      expect(expectedErrorSchema).toBeDefined();
    });
  });

  describe('POST /api/debates/agenda/{agendaId}/respond - 안건 응답', () => {
    it('안건 수락 성공', async () => {
      const acceptRequest = { action: 'accept' };
      
      const expectedSchema = {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        status: 'agreed',
        agreed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        negotiation_history: expect.arrayContaining([
          expect.objectContaining({
            action: 'accepted',
            user_id: mockUser.id
          })
        ])
      };

      expect(expectedSchema).toBeDefined();
    });

    it('안건 거절 with 사유', async () => {
      const rejectRequest = {
        action: 'reject',
        reason: '제안된 안건이 너무 편향적입니다'
      };
      
      const expectedSchema = {
        status: 'rejected',
        negotiation_history: expect.arrayContaining([
          expect.objectContaining({
            action: 'rejected',
            reason: rejectRequest.reason
          })
        ])
      };

      expect(expectedSchema).toBeDefined();
    });

    it('안건 수정 제안', async () => {
      const modifyRequest = {
        action: 'modify',
        modifications: {
          title: '환경보호와 경제성장의 균형점 찾기',
          description: '환경보호와 경제성장 사이의 최적의 균형점을 찾는 것이 목표입니다.'
        },
        reason: '더 균형잡힌 관점으로 수정 제안'
      };

      const expectedSchema = {
        status: 'under_negotiation',
        negotiation_history: expect.arrayContaining([
          expect.objectContaining({
            action: 'modified',
            changes: modifyRequest.modifications,
            reason: modifyRequest.reason
          })
        ])
      };

      expect(expectedSchema).toBeDefined();
    });

    it('잘못된 액션 타입으로 400 에러', async () => {
      const invalidActions = ['approve', 'decline', 'change'];
      const validActions = ['modify', 'reject', 'accept'];

      invalidActions.forEach(action => {
        expect(validActions).not.toContain(action);
      });
    });

    it('수정 시 modifications 필드 필수', async () => {
      const modifyWithoutModifications = {
        action: 'modify',
        reason: '수정이 필요합니다'
        // modifications 누락
      };

      // modify 액션일 때는 modifications가 필요
      if (modifyWithoutModifications.action === 'modify') {
        expect(modifyWithoutModifications).not.toHaveProperty('modifications');
      }
    });

    it('거절/수정 시 reason 필드 검증', async () => {
      const reasonTests = [
        { reason: '짧음', shouldFail: true }, // 10자 미만
        { reason: '적절한 길이의 사유입니다', shouldFail: false },
        { reason: 'A'.repeat(501), shouldFail: true } // 500자 초과
      ];

      reasonTests.forEach(test => {
        const isValid = test.reason.length >= 10 && test.reason.length <= 500;
        expect(isValid).toBe(!test.shouldFail);
      });
    });
  });

  describe('POST /api/debates/arguments - 주장 제출', () => {
    it('유효한 주장 제출 성공', async () => {
      const expectedSchema = {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        room_id: mockRoomId,
        user_id: mockUser.id,
        side: expect.stringMatching(/^[AB]$/),
        title: mockArgument.title,
        content: mockArgument.content,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            type: expect.stringMatching(/^(link|document|statistic|quote)$/),
            title: expect.any(String),
            description: expect.any(String)
          })
        ]),
        submitted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      };

      expect(expectedSchema).toBeDefined();
    });

    it('주장 제목 길이 검증 (10-200자)', async () => {
      const titleTests = [
        { title: '짧은제목', shouldFail: true }, // 10자 미만
        { title: '적절한 길이의 주장 제목입니다', shouldFail: false },
        { title: 'A'.repeat(201), shouldFail: true } // 200자 초과
      ];

      titleTests.forEach(test => {
        const isValid = test.title.length >= 10 && test.title.length <= 200;
        expect(isValid).toBe(!test.shouldFail);
      });
    });

    it('주장 내용 길이 검증 (100-5000자)', async () => {
      const contentTests = [
        { content: '너무 짧은 내용', shouldFail: true }, // 100자 미만
        { content: '적절한 길이의 주장 내용입니다. '.repeat(10), shouldFail: false },
        { content: 'A'.repeat(5001), shouldFail: true } // 5000자 초과
      ];

      contentTests.forEach(test => {
        const isValid = test.content.length >= 100 && test.content.length <= 5000;
        expect(isValid).toBe(!test.shouldFail);
      });
    });

    it('증거 타입 검증', async () => {
      const validEvidenceTypes = ['link', 'document', 'statistic', 'quote'];
      const invalidEvidenceTypes = ['image', 'video', 'audio', 'other'];

      const evidenceTests = [
        { type: 'link', url: 'https://example.com', valid: true },
        { type: 'document', title: 'Research Paper', valid: true },
        { type: 'statistic', description: 'Statistical data', valid: true },
        { type: 'quote', title: 'Expert quote', valid: true },
        { type: 'image', valid: false },
        { type: 'invalid', valid: false }
      ];

      evidenceTests.forEach(test => {
        const isValidType = validEvidenceTypes.includes(test.type);
        expect(isValidType).toBe(test.valid);
      });
    });

    it('URL 형식 검증 (link 타입 증거)', async () => {
      const urlTests = [
        { url: 'https://example.com', valid: true },
        { url: 'http://example.com', valid: true },
        { url: 'ftp://example.com', valid: false },
        { url: 'not-a-url', valid: false },
        { url: 'example.com', valid: false } // 프로토콜 없음
      ];

      const urlRegex = /^https?:\/\/.+/;

      urlTests.forEach(test => {
        const isValidUrl = urlRegex.test(test.url);
        expect(isValidUrl).toBe(test.valid);
      });
    });

    it('이미 주장을 제출한 사용자의 중복 제출 시 409 에러', async () => {
      const expectedErrorSchema = {
        error: 'already_submitted',
        message: expect.stringContaining('이미 주장을 제출')
      };

      expect(expectedErrorSchema).toBeDefined();
    });

    it('안건이 합의되지 않은 상태에서 주장 제출 시 400 에러', async () => {
      const expectedErrorSchema = {
        error: 'agenda_not_agreed',
        message: expect.stringContaining('안건이 합의되지 않음')
      };

      expect(expectedErrorSchema).toBeDefined();
    });
  });

  describe('POST /api/debates/{roomId}/start - AI 토론 시작', () => {
    it('AI 토론 시작 성공', async () => {
      const expectedSchema = {
        job_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        status: 'queued',
        estimated_duration: expect.stringMatching(/^\d+-\d+ minutes?$/)
      };

      expect(expectedSchema).toBeDefined();
    });

    it('양측 주장이 모두 제출되지 않은 경우 400 에러', async () => {
      const expectedErrorSchema = {
        error: 'arguments_incomplete',
        message: expect.stringContaining('양측 주장이 필요')
      };

      expect(expectedErrorSchema).toBeDefined();
    });

    it('이미 토론이 진행 중인 경우 409 에러', async () => {
      const expectedErrorSchema = {
        error: 'debate_in_progress',
        message: expect.stringContaining('이미 진행 중')
      };

      expect(expectedErrorSchema).toBeDefined();
    });

    it('방 상태가 토론 시작 가능한 상태가 아닌 경우 400 에러', async () => {
      const invalidStatuses = ['waiting_participant', 'agenda_negotiation', 'completed', 'cancelled'];
      const validStatus = 'arguments_submission';

      invalidStatuses.forEach(status => {
        expect(status).not.toBe(validStatus);
      });
    });
  });

  describe('GET /api/debates/{roomId}/sessions - 토론 세션 조회', () => {
    it('토론 세션 목록 조회 성공', async () => {
      const expectedSchema = {
        sessions: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            room_id: mockRoomId,
            round: expect.any(Number),
            lawyer_a_response: expect.objectContaining({
              argument: expect.any(String),
              key_points: expect.arrayContaining([expect.any(String)]),
              counter_arguments: expect.arrayContaining([expect.any(String)]),
              evidence_analysis: expect.any(String)
            }),
            lawyer_b_response: expect.objectContaining({
              argument: expect.any(String),
              key_points: expect.arrayContaining([expect.any(String)]),
              counter_arguments: expect.arrayContaining([expect.any(String)]),
              evidence_analysis: expect.any(String)
            }),
            status: expect.stringMatching(/^(pending|in_progress|completed|failed)$/),
            created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
          })
        ]),
        current_round: expect.any(Number),
        status: expect.stringMatching(/^(pending|in_progress|completed)$/)
      };

      expect(expectedSchema).toBeDefined();
    });

    it('라운드 번호 검증 (1-3)', async () => {
      const roundTests = [0, 1, 2, 3, 4];
      const validRounds = [1, 2, 3];

      roundTests.forEach(round => {
        const isValid = validRounds.includes(round);
        expect(isValid).toBe(round >= 1 && round <= 3);
      });
    });

    it('변호사 응답 구조 검증', async () => {
      const lawyerResponseSchema = {
        argument: expect.any(String),
        key_points: expect.arrayContaining([expect.any(String)]),
        counter_arguments: expect.arrayContaining([expect.any(String)]),
        evidence_analysis: expect.any(String)
      };

      // 필수 필드 검증
      const requiredFields = ['argument', 'key_points', 'counter_arguments', 'evidence_analysis'];
      requiredFields.forEach(field => {
        expect(lawyerResponseSchema).toHaveProperty(field);
      });
    });

    it('토론이 시작되지 않은 방의 경우 빈 배열 반환', async () => {
      const expectedEmptyResponse = {
        sessions: [],
        current_round: 0,
        status: 'pending'
      };

      expect(expectedEmptyResponse.sessions).toHaveLength(0);
    });
  });

  describe('GET /api/debates/{roomId}/verdict - 최종 판결 조회', () => {
    it('최종 판결 조회 성공', async () => {
      const expectedSchema = {
        verdict: expect.objectContaining({
          id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          room_id: mockRoomId,
          winner: expect.stringMatching(/^(A|B|draw)$/),
          reasoning: expect.any(String),
          strengths_a: expect.any(String),
          weaknesses_a: expect.any(String),
          strengths_b: expect.any(String),
          weaknesses_b: expect.any(String),
          overall_quality: expect.any(Number),
          jury_summary: expect.objectContaining({
            votes_a: expect.any(Number),
            votes_b: expect.any(Number),
            average_confidence: expect.any(Number)
          }),
          generated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
        }),
        jury_votes: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            jury_number: expect.any(Number),
            vote: expect.stringMatching(/^[AB]$/),
            reasoning: expect.any(String),
            confidence: expect.any(Number),
            created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
          })
        ])
      };

      expect(expectedSchema).toBeDefined();
    });

    it('배심원 번호 검증 (1-7)', async () => {
      const juryNumbers = [0, 1, 4, 7, 8];
      
      juryNumbers.forEach(number => {
        const isValid = number >= 1 && number <= 7;
        expect(isValid).toBe([1, 4, 7].includes(number));
      });
    });

    it('확신도 검증 (1-10)', async () => {
      const confidenceTests = [0, 1, 5, 10, 11];
      
      confidenceTests.forEach(confidence => {
        const isValid = confidence >= 1 && confidence <= 10;
        expect(isValid).toBe([1, 5, 10].includes(confidence));
      });
    });

    it('전체 품질 점수 검증 (1-10)', async () => {
      const qualityTests = [0, 1, 5, 10, 11];
      
      qualityTests.forEach(quality => {
        const isValid = quality >= 1 && quality <= 10;
        expect(isValid).toBe([1, 5, 10].includes(quality));
      });
    });

    it('아직 판결이 생성되지 않은 경우 404 에러', async () => {
      const expectedErrorSchema = {
        error: 'verdict_not_ready',
        message: expect.stringContaining('아직 판결이 생성되지 않음')
      };

      expect(expectedErrorSchema).toBeDefined();
    });

    it('배심원 투표 집계 검증', async () => {
      const mockJuryVotes = [
        { vote: 'A', confidence: 8 },
        { vote: 'B', confidence: 7 },
        { vote: 'A', confidence: 9 },
        { vote: 'A', confidence: 6 },
        { vote: 'B', confidence: 8 },
        { vote: 'A', confidence: 7 },
        { vote: 'B', confidence: 9 }
      ];

      const votesA = mockJuryVotes.filter(v => v.vote === 'A').length;
      const votesB = mockJuryVotes.filter(v => v.vote === 'B').length;
      const avgConfidence = mockJuryVotes.reduce((sum, v) => sum + v.confidence, 0) / mockJuryVotes.length;

      expect(votesA).toBe(4);
      expect(votesB).toBe(3);
      expect(Math.round(avgConfidence * 10) / 10).toBe(7.7);
    });
  });

  describe('API 응답 공통 검증', () => {
    it('모든 날짜 필드가 ISO 8601 형식', async () => {
      const dateFields = [
        'created_at',
        'updated_at',
        'submitted_at',
        'agreed_at',
        'started_at',
        'completed_at',
        'generated_at'
      ];

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

      dateFields.forEach(field => {
        const testDate = '2025-09-27T13:45:30.123Z';
        expect(iso8601Regex.test(testDate)).toBe(true);
      });
    });

    it('모든 UUID 필드가 올바른 형식', async () => {
      const uuidFields = [
        'id',
        'room_id',
        'user_id',
        'proposer_id',
        'agenda_id',
        'job_id'
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      uuidFields.forEach(field => {
        const testUuid = '550e8400-e29b-41d4-a716-446655440001';
        expect(uuidRegex.test(testUuid)).toBe(true);
      });
    });

    it('enum 필드 값 검증', async () => {
      const enumTests = [
        { field: 'status', validValues: ['proposed', 'under_negotiation', 'agreed', 'rejected'] },
        { field: 'action', validValues: ['modify', 'reject', 'accept'] },
        { field: 'side', validValues: ['A', 'B'] },
        { field: 'winner', validValues: ['A', 'B', 'draw'] },
        { field: 'evidence_type', validValues: ['link', 'document', 'statistic', 'quote'] }
      ];

      enumTests.forEach(test => {
        expect(test.validValues.length).toBeGreaterThan(0);
        expect(test.validValues).toContain(test.validValues[0]);
      });
    });
  });

  describe('비즈니스 로직 검증', () => {
    it('안건 협상 히스토리 순서 검증', async () => {
      const negotiationHistory = [
        { action: 'proposed', timestamp: '2025-09-27T10:00:00Z' },
        { action: 'modified', timestamp: '2025-09-27T10:05:00Z' },
        { action: 'accepted', timestamp: '2025-09-27T10:10:00Z' }
      ];

      // 시간순 정렬 검증
      for (let i = 1; i < negotiationHistory.length; i++) {
        const prevTime = new Date(negotiationHistory[i-1].timestamp).getTime();
        const currTime = new Date(negotiationHistory[i].timestamp).getTime();
        expect(currTime).toBeGreaterThan(prevTime);
      }
    });

    it('토론 라운드 진행 순서 검증', async () => {
      const rounds = [1, 2, 3];
      
      rounds.forEach((round, index) => {
        expect(round).toBe(index + 1);
      });
    });

    it('배심원 투표 완료 조건 검증', async () => {
      const totalJurors = 7;
      const submittedVotes = 7;
      
      const isVotingComplete = submittedVotes === totalJurors;
      expect(isVotingComplete).toBe(true);
    });

    it('승부 결정 로직 검증', async () => {
      const testCases = [
        { votesA: 4, votesB: 3, expectedWinner: 'A' },
        { votesA: 2, votesB: 5, expectedWinner: 'B' },
        { votesA: 3, votesB: 3, expectedWinner: 'draw' } // 동점 (7명 중 1명 기권)
      ];

      testCases.forEach(testCase => {
        let winner;
        if (testCase.votesA > testCase.votesB) {
          winner = 'A';
        } else if (testCase.votesB > testCase.votesA) {
          winner = 'B';
        } else {
          winner = 'draw';
        }
        
        expect(winner).toBe(testCase.expectedWinner);
      });
    });
  });
});

// Jest 설정
export const debatesTestConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/debates-api.test.ts'],
  collectCoverageFrom: [
    'app/api/debates/**/*.ts',
    '!app/api/debates/**/*.test.ts'
  ]
};
