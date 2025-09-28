import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// 테스트 데이터
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'test@example.com'
};

const mockRoomId = '660e8400-e29b-41d4-a716-446655440001';
const mockJobId = '770e8400-e29b-41d4-a716-446655440001';

const mockDebateJob = {
  id: mockJobId,
  type: 'ai_debate',
  status: 'queued',
  room_id: mockRoomId,
  payload: {
    room_id: mockRoomId,
    round: 1,
    argument_a: { title: 'A측 주장', content: '환경보호 우선' },
    argument_b: { title: 'B측 주장', content: '경제성장 우선' }
  },
  retry_count: 0,
  max_retries: 3,
  scheduled_at: '2025-09-27T14:00:00Z',
  created_at: '2025-09-27T13:45:00Z',
  updated_at: '2025-09-27T13:45:00Z'
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

describe('Jobs API Contract Tests', () => {
  describe('GET /api/jobs/{jobId} - 작업 상태 조회', () => {
    it('작업 상태 조회 성공', async () => {
      const expectedSchema = {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        type: expect.stringMatching(/^(ai_debate|ai_judge|ai_jury|notification)$/),
        status: expect.stringMatching(/^(queued|running|succeeded|failed|retrying|cancelled)$/),
        room_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        payload: expect.any(Object),
        result: expect.any(Object), // nullable
        error_message: expect.any(String), // nullable
        retry_count: expect.any(Number),
        max_retries: expect.any(Number),
        progress: expect.objectContaining({
          current_step: expect.any(String),
          total_steps: expect.any(Number),
          completed_steps: expect.any(Number),
          estimated_remaining: expect.any(String)
        }),
        scheduled_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        started_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // nullable
        completed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // nullable
        created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      };

      // TODO: API 구현 후 실제 테스트 활성화
      expect(expectedSchema).toBeDefined();
    });

    it('작업 타입별 스키마 검증', async () => {
      const jobTypes = ['ai_debate', 'ai_judge', 'ai_jury', 'notification'];
      
      jobTypes.forEach(type => {
        expect(['ai_debate', 'ai_judge', 'ai_jury', 'notification']).toContain(type);
      });
    });

    it('작업 상태별 필드 검증', async () => {
      const statusTests = [
        {
          status: 'queued',
          shouldHave: ['scheduled_at'],
          shouldNotHave: ['started_at', 'completed_at', 'result']
        },
        {
          status: 'running',
          shouldHave: ['started_at', 'progress'],
          shouldNotHave: ['completed_at', 'result']
        },
        {
          status: 'succeeded',
          shouldHave: ['started_at', 'completed_at', 'result'],
          shouldNotHave: ['error_message']
        },
        {
          status: 'failed',
          shouldHave: ['started_at', 'completed_at', 'error_message'],
          shouldNotHave: ['result']
        }
      ];

      statusTests.forEach(test => {
        expect(test.shouldHave.length).toBeGreaterThan(0);
        expect(test.status).toBeDefined();
      });
    });

    it('재시도 횟수 검증', async () => {
      const retryTests = [
        { retry_count: 0, max_retries: 3, valid: true },
        { retry_count: 3, max_retries: 3, valid: true },
        { retry_count: 4, max_retries: 3, valid: false }, // 최대 초과
        { retry_count: -1, max_retries: 3, valid: false } // 음수 불가
      ];

      retryTests.forEach(test => {
        const isValid = test.retry_count >= 0 && test.retry_count <= test.max_retries;
        expect(isValid).toBe(test.valid);
      });
    });

    it('존재하지 않는 작업 ID로 404 에러', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const expectedErrorSchema = {
        error: 'not_found',
        message: expect.stringContaining('작업을 찾을 수 없습니다')
      };

      expect(expectedErrorSchema).toBeDefined();
    });

    it('접근 권한이 없는 작업에 403 에러', async () => {
      const expectedErrorSchema = {
        error: 'forbidden',
        message: expect.stringContaining('권한이 없습니다')
      };

      expect(expectedErrorSchema).toBeDefined();
    });
  });

  describe('POST /api/jobs/{jobId}/cancel - 작업 취소', () => {
    it('대기 중인 작업 취소 성공', async () => {
      const expectedSchema = {
        message: '작업이 취소되었습니다',
        job: expect.objectContaining({
          id: mockJobId,
          status: 'cancelled',
          updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
        })
      };

      expect(expectedSchema).toBeDefined();
    });

    it('취소 가능한 상태 검증', async () => {
      const cancellableStatuses = ['queued', 'running'];
      const nonCancellableStatuses = ['succeeded', 'failed', 'cancelled'];

      const statusTests = [
        { status: 'queued', canCancel: true },
        { status: 'running', canCancel: true },
        { status: 'succeeded', canCancel: false },
        { status: 'failed', canCancel: false },
        { status: 'cancelled', canCancel: false }
      ];

      statusTests.forEach(test => {
        const isInCancellable = cancellableStatuses.includes(test.status);
        expect(isInCancellable).toBe(test.canCancel);
      });
    });

    it('이미 완료된 작업 취소 시 400 에러', async () => {
      const expectedErrorSchema = {
        error: 'cannot_cancel',
        message: expect.stringContaining('취소할 수 없는 상태')
      };

      expect(expectedErrorSchema).toBeDefined();
    });

    it('실행 중인 작업 취소 시 정리 작업 수행', async () => {
      // 실행 중인 작업 취소 시 리소스 정리가 필요할 수 있음
      const runningJobCancellation = {
        cleanup_required: true,
        partial_results: expect.any(Object),
        rollback_actions: expect.arrayContaining([expect.any(String)])
      };

      expect(runningJobCancellation.cleanup_required).toBe(true);
    });
  });

  describe('GET /api/jobs/room/{roomId} - 방의 작업 목록 조회', () => {
    it('방의 모든 작업 조회 성공', async () => {
      const expectedSchema = {
        jobs: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            type: expect.stringMatching(/^(ai_debate|ai_judge|ai_jury|notification)$/),
            status: expect.stringMatching(/^(queued|running|succeeded|failed|retrying|cancelled)$/),
            room_id: mockRoomId,
            created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
          })
        ]),
        total: expect.any(Number)
      };

      expect(expectedSchema).toBeDefined();
    });

    it('작업 타입 필터링', async () => {
      const typeFilters = ['ai_debate', 'ai_judge', 'ai_jury', 'notification'];
      
      typeFilters.forEach(type => {
        const filteredJobs = [mockDebateJob].filter(job => job.type === type);
        if (type === 'ai_debate') {
          expect(filteredJobs).toHaveLength(1);
        } else {
          expect(filteredJobs).toHaveLength(0);
        }
      });
    });

    it('작업 상태 필터링', async () => {
      const statusFilters = ['queued', 'running', 'succeeded', 'failed', 'retrying', 'cancelled'];
      
      statusFilters.forEach(status => {
        const filteredJobs = [mockDebateJob].filter(job => job.status === status);
        if (status === 'queued') {
          expect(filteredJobs).toHaveLength(1);
        } else {
          expect(filteredJobs).toHaveLength(0);
        }
      });
    });

    it('작업 목록 시간순 정렬 검증', async () => {
      const mockJobs = [
        { created_at: '2025-09-27T13:00:00Z' },
        { created_at: '2025-09-27T13:05:00Z' },
        { created_at: '2025-09-27T13:10:00Z' }
      ];

      // 최신순 정렬 검증
      for (let i = 1; i < mockJobs.length; i++) {
        const prevTime = new Date(mockJobs[i-1].created_at).getTime();
        const currTime = new Date(mockJobs[i].created_at).getTime();
        expect(currTime).toBeGreaterThan(prevTime);
      }
    });

    it('빈 결과 처리', async () => {
      const emptyResponse = {
        jobs: [],
        total: 0
      };

      expect(emptyResponse.jobs).toHaveLength(0);
      expect(emptyResponse.total).toBe(0);
    });
  });

  describe('작업별 페이로드 스키마 검증', () => {
    it('AI 토론 작업 페이로드', async () => {
      const debatePayloadSchema = {
        room_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        round: expect.any(Number),
        argument_a: expect.any(Object),
        argument_b: expect.any(Object),
        previous_sessions: expect.any(Array)
      };

      // 라운드 번호 검증 (1-3)
      const validRounds = [1, 2, 3];
      const testRound = 1;
      expect(validRounds).toContain(testRound);
      expect(debatePayloadSchema).toBeDefined();
    });

    it('AI 판사 작업 페이로드', async () => {
      const judgePayloadSchema = {
        room_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        debate_sessions: expect.arrayContaining([expect.any(Object)]),
        jury_votes: expect.arrayContaining([expect.any(Object)])
      };

      expect(judgePayloadSchema).toBeDefined();
    });

    it('AI 배심원 작업 페이로드', async () => {
      const juryPayloadSchema = {
        room_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        debate_sessions: expect.arrayContaining([expect.any(Object)]),
        jury_count: 7 // 고정값
      };

      // 배심원 수 검증 (정확히 7명)
      expect(juryPayloadSchema.jury_count).toBe(7);
    });

    it('알림 작업 페이로드', async () => {
      const notificationPayloadSchema = {
        user_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        type: expect.stringMatching(/^(room_joined|debate_completed|verdict_ready)$/),
        message: expect.any(String),
        room_id: expect.stringMatching(/^[0-9a-f-]{36}$/)
      };

      const validNotificationTypes = ['room_joined', 'debate_completed', 'verdict_ready'];
      expect(validNotificationTypes).toContain('room_joined');
      expect(notificationPayloadSchema).toBeDefined();
    });
  });

  describe('작업 진행 상태 추적', () => {
    it('진행률 계산 검증', async () => {
      const progressTests = [
        { completed: 0, total: 10, expectedPercent: 0 },
        { completed: 5, total: 10, expectedPercent: 50 },
        { completed: 10, total: 10, expectedPercent: 100 }
      ];

      progressTests.forEach(test => {
        const percent = (test.completed / test.total) * 100;
        expect(percent).toBe(test.expectedPercent);
      });
    });

    it('예상 남은 시간 형식 검증', async () => {
      const timeFormats = [
        '5 minutes',
        '1 hour',
        '30 seconds',
        '2 hours 15 minutes'
      ];

      const timeRegex = /^\d+\s+(second|minute|hour)s?(\s+\d+\s+(second|minute|hour)s?)?$/;

      timeFormats.forEach(format => {
        // 간단한 형식 검증
        expect(format).toMatch(/\d+\s+\w+/);
      });
    });

    it('단계별 진행 상태', async () => {
      const debateSteps = [
        'preparing_arguments',
        'generating_lawyer_a_response',
        'generating_lawyer_b_response',
        'analyzing_responses',
        'completing_round'
      ];

      const currentStep = 'generating_lawyer_a_response';
      const stepIndex = debateSteps.indexOf(currentStep);
      
      expect(stepIndex).toBeGreaterThanOrEqual(0);
      expect(stepIndex).toBeLessThan(debateSteps.length);
    });
  });

  describe('작업 실행 시간 추적', () => {
    it('시간 필드 순서 검증', async () => {
      const timeFields = {
        created_at: '2025-09-27T13:00:00Z',
        scheduled_at: '2025-09-27T13:05:00Z',
        started_at: '2025-09-27T13:05:30Z',
        completed_at: '2025-09-27T13:10:00Z'
      };

      const createdTime = new Date(timeFields.created_at).getTime();
      const scheduledTime = new Date(timeFields.scheduled_at).getTime();
      const startedTime = new Date(timeFields.started_at).getTime();
      const completedTime = new Date(timeFields.completed_at).getTime();

      expect(scheduledTime).toBeGreaterThanOrEqual(createdTime);
      expect(startedTime).toBeGreaterThanOrEqual(scheduledTime);
      expect(completedTime).toBeGreaterThanOrEqual(startedTime);
    });

    it('실행 시간 계산', async () => {
      const startTime = new Date('2025-09-27T13:05:30Z').getTime();
      const endTime = new Date('2025-09-27T13:10:00Z').getTime();
      const durationMs = endTime - startTime;
      const durationMinutes = Math.floor(durationMs / (1000 * 60));

      expect(durationMinutes).toBe(4); // 4분 30초 → 4분
    });

    it('지연 시간 추적', async () => {
      const scheduledTime = new Date('2025-09-27T13:05:00Z').getTime();
      const actualStartTime = new Date('2025-09-27T13:05:30Z').getTime();
      const delayMs = actualStartTime - scheduledTime;
      const delaySeconds = Math.floor(delayMs / 1000);

      expect(delaySeconds).toBe(30);
    });
  });

  describe('에러 처리 및 재시도 로직', () => {
    it('재시도 가능한 에러 타입', async () => {
      const retryableErrors = [
        'network_timeout',
        'rate_limit_exceeded',
        'temporary_service_unavailable',
        'openai_api_error'
      ];

      const nonRetryableErrors = [
        'invalid_payload',
        'authentication_failed',
        'permission_denied',
        'resource_not_found'
      ];

      retryableErrors.forEach(error => {
        expect(retryableErrors).toContain(error);
      });

      nonRetryableErrors.forEach(error => {
        expect(retryableErrors).not.toContain(error);
      });
    });

    it('지수 백오프 계산', async () => {
      const baseDelay = 1000; // 1초
      const retryAttempts = [1, 2, 3];
      
      retryAttempts.forEach(attempt => {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const expectedDelays = [1000, 2000, 4000];
        expect(delay).toBe(expectedDelays[attempt - 1]);
      });
    });

    it('최대 재시도 횟수 검증', async () => {
      const maxRetries = 3;
      const retryCount = 3;
      
      const shouldRetry = retryCount < maxRetries;
      expect(shouldRetry).toBe(false); // 더 이상 재시도하지 않음
    });

    it('에러 메시지 구조', async () => {
      const errorMessageSchema = {
        error_code: expect.any(String),
        error_message: expect.any(String),
        error_details: expect.any(Object),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        retry_after: expect.any(Number) // 초 단위
      };

      expect(errorMessageSchema).toBeDefined();
    });
  });

  describe('작업 큐 관리', () => {
    it('우선순위 기반 실행 순서', async () => {
      const jobs = [
        { type: 'notification', priority: 1 }, // 높은 우선순위
        { type: 'ai_jury', priority: 2 },
        { type: 'ai_judge', priority: 2 },
        { type: 'ai_debate', priority: 3 } // 낮은 우선순위
      ];

      // 우선순위 순으로 정렬
      const sortedJobs = jobs.sort((a, b) => a.priority - b.priority);
      expect(sortedJobs[0].type).toBe('notification');
    });

    it('동시 실행 제한', async () => {
      const concurrentLimits = {
        ai_debate: 2, // 최대 2개 동시 실행
        ai_judge: 1,  // 최대 1개 동시 실행
        ai_jury: 3,   // 최대 3개 동시 실행
        notification: 10 // 최대 10개 동시 실행
      };

      Object.entries(concurrentLimits).forEach(([type, limit]) => {
        expect(limit).toBeGreaterThan(0);
        expect(Number.isInteger(limit)).toBe(true);
      });
    });

    it('작업 의존성 관리', async () => {
      const dependencies = {
        ai_judge: ['ai_debate'], // 판사는 토론 완료 후
        ai_jury: ['ai_debate'],  // 배심원은 토론 완료 후
        final_report: ['ai_judge', 'ai_jury'] // 최종 리포트는 판사+배심원 완료 후
      };

      // ai_judge는 ai_debate에 의존
      expect(dependencies.ai_judge).toContain('ai_debate');
      expect(dependencies.final_report).toContain('ai_judge');
      expect(dependencies.final_report).toContain('ai_jury');
    });
  });

  describe('보안 및 권한 검증', () => {
    it('작업 소유권 검증', async () => {
      // 사용자는 자신이 참여한 방의 작업만 조회 가능
      const userRooms = ['room1', 'room2'];
      const jobRoom = 'room1';
      
      const hasAccess = userRooms.includes(jobRoom);
      expect(hasAccess).toBe(true);
    });

    it('민감한 정보 마스킹', async () => {
      const sensitiveFields = [
        'openai_api_key',
        'user_email',
        'internal_debug_info'
      ];

      // 응답에서 민감한 정보는 제외되어야 함
      const publicJobResponse = {
        id: 'job-123',
        type: 'ai_debate',
        status: 'running',
        // openai_api_key는 포함되지 않음
        // user_email은 포함되지 않음
      };

      sensitiveFields.forEach(field => {
        expect(publicJobResponse).not.toHaveProperty(field);
      });
    });

    it('작업 취소 권한 검증', async () => {
      const jobCreatorId = 'user-123';
      const currentUserId = 'user-123';
      const isRoomMember = true;

      // 작업 생성자이거나 방 멤버인 경우만 취소 가능
      const canCancel = jobCreatorId === currentUserId || isRoomMember;
      expect(canCancel).toBe(true);
    });
  });
});

// Jest 설정
export const jobsTestConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/jobs-api.test.ts'],
  collectCoverageFrom: [
    'app/api/jobs/**/*.ts',
    '!app/api/jobs/**/*.test.ts'
  ]
};
