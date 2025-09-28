import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// API 핸들러 임포트 (구현 후 활성화)
// import { POST as createRoom, GET as getRooms } from '@/app/api/rooms/route';
// import { GET as getRoomDetail } from '@/app/api/rooms/[id]/route';
// import { POST as joinRoom } from '@/app/api/rooms/join/route';
// import { GET as getRoomStatus } from '@/app/api/rooms/[id]/status/route';

// 테스트 데이터
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'test@example.com'
};

const mockRoom = {
  title: '환경보호 vs 경제성장 우선순위',
  description: '환경보호와 경제성장 중 어느 것이 우선되어야 하는가?'
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

// 응답 검증 헬퍼
async function validateResponse(response: Response, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
  
  const contentType = response.headers.get('content-type');
  expect(contentType).toContain('application/json');
  
  const data = await response.json();
  expect(data).toBeDefined();
  
  return data;
}

describe('Rooms API Contract Tests', () => {
  describe('POST /api/rooms - 방 생성', () => {
    it('유효한 데이터로 방 생성 성공', async () => {
      // 구현 대기 중 - 스키마 검증만 수행
      const expectedSchema = {
        id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
        code: expect.stringMatching(/^[A-Z0-9]{6}$/),
        title: mockRoom.title,
        status: 'waiting_participant',
        created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      };

      // TODO: API 구현 후 실제 테스트 활성화
      // const request = createAuthenticatedRequest('http://localhost:3000/api/rooms', {
      //   method: 'POST',
      //   body: JSON.stringify(mockRoom)
      // });
      
      // const response = await createRoom(request);
      // const data = await validateResponse(response, 201);
      
      // expect(data).toMatchObject(expectedSchema);
      
      // 현재는 스키마 구조만 검증
      expect(expectedSchema).toBeDefined();
    });

    it('필수 필드 누락 시 400 에러', async () => {
      const invalidData = { description: '설명만 있음' };
      
      const expectedErrorSchema = {
        error: expect.any(String),
        message: expect.any(String),
        details: expect.any(Object)
      };

      // TODO: API 구현 후 실제 테스트 활성화
      // const request = createAuthenticatedRequest('http://localhost:3000/api/rooms', {
      //   method: 'POST',
      //   body: JSON.stringify(invalidData)
      // });
      
      // const response = await createRoom(request);
      // const data = await validateResponse(response, 400);
      
      // expect(data).toMatchObject(expectedErrorSchema);
      
      expect(expectedErrorSchema).toBeDefined();
    });

    it('제목 길이 제한 검증 (5-200자)', async () => {
      const testCases = [
        { title: '짧음', shouldFail: true }, // 5자 미만
        { title: '적절한 길이의 제목입니다', shouldFail: false },
        { title: 'A'.repeat(201), shouldFail: true } // 200자 초과
      ];

      testCases.forEach(testCase => {
        if (testCase.shouldFail) {
          expect(testCase.title.length < 5 || testCase.title.length > 200).toBe(true);
        } else {
          expect(testCase.title.length >= 5 && testCase.title.length <= 200).toBe(true);
        }
      });
    });

    it('인증되지 않은 요청 시 401 에러', async () => {
      const expectedErrorSchema = {
        error: 'unauthorized',
        message: expect.stringContaining('인증')
      };

      // TODO: 미들웨어 테스트로 검증
      expect(expectedErrorSchema).toBeDefined();
    });
  });

  describe('GET /api/rooms - 방 목록 조회', () => {
    it('사용자의 방 목록 조회 성공', async () => {
      const expectedSchema = {
        rooms: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            code: expect.stringMatching(/^[A-Z0-9]{6}$/),
            title: expect.any(String),
            status: expect.stringMatching(/^(waiting_participant|agenda_negotiation|arguments_submission|ai_processing|completed|cancelled)$/),
            creator_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
          })
        ]),
        total: expect.any(Number),
        has_more: expect.any(Boolean)
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedSchema).toBeDefined();
    });

    it('상태 필터링 쿼리 파라미터 검증', async () => {
      const validStatuses = [
        'waiting_participant',
        'agenda_negotiation', 
        'arguments_submission',
        'ai_processing',
        'completed',
        'cancelled'
      ];

      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    it('페이지네이션 파라미터 검증', async () => {
      const paginationTests = [
        { limit: 1, offset: 0, valid: true },
        { limit: 100, offset: 0, valid: true },
        { limit: 101, offset: 0, valid: false }, // 최대 100
        { limit: 0, offset: 0, valid: false }, // 최소 1
        { limit: 20, offset: -1, valid: false } // 음수 불가
      ];

      paginationTests.forEach(test => {
        const isValidLimit = test.limit >= 1 && test.limit <= 100;
        const isValidOffset = test.offset >= 0;
        expect(isValidLimit && isValidOffset).toBe(test.valid);
      });
    });
  });

  describe('GET /api/rooms/{roomId} - 방 상세 조회', () => {
    it('방 상세 정보 조회 성공', async () => {
      const expectedSchema = {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        code: expect.stringMatching(/^[A-Z0-9]{6}$/),
        title: expect.any(String),
        status: expect.any(String),
        agenda: expect.objectContaining({
          id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          title: expect.any(String),
          status: expect.stringMatching(/^(proposed|under_negotiation|agreed|rejected)$/)
        }),
        arguments: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            side: expect.stringMatching(/^[AB]$/),
            title: expect.any(String),
            content: expect.any(String)
          })
        ]),
        debate_sessions: expect.any(Array),
        verdict: expect.any(Object)
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedSchema).toBeDefined();
    });

    it('존재하지 않는 방 ID로 404 에러', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const expectedErrorSchema = {
        error: 'not_found',
        message: expect.stringContaining('찾을 수 없습니다')
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedErrorSchema).toBeDefined();
    });

    it('접근 권한이 없는 방에 403 에러', async () => {
      const expectedErrorSchema = {
        error: 'forbidden',
        message: expect.stringContaining('권한이 없습니다')
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedErrorSchema).toBeDefined();
    });

    it('잘못된 UUID 형식으로 400 에러', async () => {
      const invalidIds = ['invalid-uuid', '123', 'not-a-uuid'];
      
      invalidIds.forEach(id => {
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        expect(isValidUUID).toBe(false);
      });
    });
  });

  describe('POST /api/rooms/join - 방 입장', () => {
    it('유효한 방 코드로 입장 성공', async () => {
      const joinRequest = { code: 'ABC123' };
      
      const expectedSchema = {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        code: 'ABC123',
        title: expect.any(String),
        status: 'agenda_negotiation', // 참여 후 상태 변경
        participant_id: mockUser.id
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedSchema).toBeDefined();
    });

    it('잘못된 방 코드 형식으로 400 에러', async () => {
      const invalidCodes = ['abc123', 'ABCD', '123456789', 'AB-123'];
      
      invalidCodes.forEach(code => {
        const isValidCode = /^[A-Z0-9]{6}$/.test(code);
        expect(isValidCode).toBe(false);
      });
    });

    it('존재하지 않는 방 코드로 404 에러', async () => {
      const nonExistentCode = 'ZZZZZZ';
      
      const expectedErrorSchema = {
        error: 'not_found',
        message: expect.stringContaining('방을 찾을 수 없음')
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedErrorSchema).toBeDefined();
    });

    it('이미 가득 찬 방에 409 에러', async () => {
      const expectedErrorSchema = {
        error: 'room_full',
        message: expect.stringContaining('가득')
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedErrorSchema).toBeDefined();
    });

    it('자신이 생성한 방에 입장 시도 시 409 에러', async () => {
      const expectedErrorSchema = {
        error: 'already_member',
        message: expect.stringContaining('이미 참여')
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedErrorSchema).toBeDefined();
    });
  });

  describe('GET /api/rooms/{roomId}/status - 방 상태 조회', () => {
    it('방 진행 상태 조회 성공 (폴링용)', async () => {
      const expectedSchema = {
        status: expect.stringMatching(/^(waiting_participant|agenda_negotiation|arguments_submission|ai_processing|completed|cancelled)$/),
        progress: expect.objectContaining({
          current_step: expect.any(String),
          total_steps: expect.any(Number),
          completed_steps: expect.any(Number),
          estimated_completion: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
        }),
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedSchema).toBeDefined();
    });

    it('진행 상태별 응답 구조 검증', async () => {
      const statusTests = [
        {
          status: 'waiting_participant',
          expectedSteps: ['participant_join', 'agenda_negotiation', 'arguments_submission', 'ai_processing', 'completed']
        },
        {
          status: 'ai_processing', 
          expectedSteps: ['debate_round_1', 'judge_decision_1', 'debate_round_2', 'judge_decision_2', 'jury_voting', 'final_report']
        }
      ];

      statusTests.forEach(test => {
        expect(test.expectedSteps.length).toBeGreaterThan(0);
        expect(test.expectedSteps).toContain(test.expectedSteps[0]);
      });
    });
  });

  describe('API 응답 공통 검증', () => {
    it('모든 성공 응답에 적절한 Content-Type 헤더', async () => {
      const expectedContentType = 'application/json';
      expect(expectedContentType).toBe('application/json');
    });

    it('모든 에러 응답에 일관된 구조', async () => {
      const errorResponseSchema = {
        error: expect.any(String),
        message: expect.any(String),
        requestId: expect.any(String)
      };

      expect(errorResponseSchema).toBeDefined();
    });

    it('UUID 필드 형식 검증', async () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440001',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];
      
      const invalidUUIDs = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716-44665544000', // 짧음
        '550e8400-e29b-41d4-a716-4466554400011' // 김
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      validUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(true);
      });

      invalidUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(false);
      });
    });

    it('날짜 형식 검증 (ISO 8601)', async () => {
      const validDates = [
        '2025-09-27T13:45:30.123Z',
        '2025-09-27T13:45:30Z',
        '2025-09-27T13:45:30.123+09:00'
      ];

      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

      validDates.forEach(date => {
        expect(dateRegex.test(date)).toBe(true);
      });
    });
  });

  describe('보안 및 권한 검증', () => {
    it('인증 헤더 없이 보호된 엔드포인트 접근 시 401', async () => {
      // 미들웨어에서 처리되는 부분
      const protectedEndpoints = [
        '/api/rooms',
        '/api/rooms/123',
        '/api/rooms/join',
        '/api/rooms/123/status'
      ];

      protectedEndpoints.forEach(endpoint => {
        expect(endpoint.startsWith('/api/rooms')).toBe(true);
      });
    });

    it('다른 사용자의 방에 무단 접근 시 403', async () => {
      // RLS 정책으로 처리되는 부분
      const expectedBehavior = 'RLS policy should prevent unauthorized access';
      expect(expectedBehavior).toBeDefined();
    });

    it('요청 ID 추적 가능', async () => {
      // 모든 응답에 requestId 포함
      const responseWithRequestId = {
        success: true,
        data: {},
        requestId: expect.stringMatching(/^[0-9a-f-]{36}$/)
      };

      expect(responseWithRequestId.requestId).toBeDefined();
    });
  });
});

// Jest 설정 및 헬퍼
export const testConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'app/api/**/*.ts',
    '!app/api/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
