// Jest 테스트 환경 설정

// 전역 모킹
global.crypto = {
  randomUUID: () => '550e8400-e29b-41d4-a716-446655440001'
} as any;

// 콘솔 로그 모킹 (테스트 중 로그 출력 제어)
const originalConsole = global.console;

beforeEach(() => {
  // 각 테스트마다 콘솔 모킹 초기화
  global.console = {
    ...originalConsole,
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn()
  };
});

afterEach(() => {
  // 테스트 후 원래 콘솔 복원
  global.console = originalConsole;
});

// 환경 변수 모킹
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.OPENAI_MODEL = 'gpt-4o';

// 타임아웃 설정
jest.setTimeout(30000); // 30초

// 비동기 테스트를 위한 헬퍼
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 테스트 데이터 팩토리
export const createMockUser = (overrides = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'test@example.com',
  display_name: 'Test User',
  ...overrides
});

export const createMockRoom = (overrides = {}) => ({
  id: '660e8400-e29b-41d4-a716-446655440001',
  code: 'ABC123',
  title: '테스트 토론 방',
  description: '테스트용 토론 방입니다.',
  status: 'waiting_participant',
  creator_id: '550e8400-e29b-41d4-a716-446655440001',
  created_at: '2025-09-27T13:00:00Z',
  updated_at: '2025-09-27T13:00:00Z',
  ...overrides
});

export const createMockJob = (overrides = {}) => ({
  id: '770e8400-e29b-41d4-a716-446655440001',
  type: 'ai_debate',
  status: 'queued',
  room_id: '660e8400-e29b-41d4-a716-446655440001',
  payload: {},
  retry_count: 0,
  max_retries: 3,
  scheduled_at: '2025-09-27T14:00:00Z',
  created_at: '2025-09-27T13:45:00Z',
  updated_at: '2025-09-27T13:45:00Z',
  ...overrides
});

// 에러 매처 확장
expect.extend({
  toHaveValidationError(received, expectedField) {
    const pass = received.success === false && 
                 received.error?.code === 'VALIDATION_ERROR' &&
                 received.error?.details?.issues?.some((issue: any) => 
                   issue.path === expectedField
                 );

    return {
      message: () => 
        pass 
          ? `Expected not to have validation error for field "${expectedField}"`
          : `Expected to have validation error for field "${expectedField}"`,
      pass
    };
  },

  toBeValidLLMResponse(received) {
    const pass = received.success === true && received.data !== undefined;

    return {
      message: () =>
        pass
          ? 'Expected not to be valid LLM response'
          : 'Expected to be valid LLM response',
      pass
    };
  }
});

// 타입 확장
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidationError(expectedField: string): R;
      toBeValidLLMResponse(): R;
    }
  }
}

export {};
