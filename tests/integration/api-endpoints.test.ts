/**
 * 통합 테스트: API 엔드포인트 테스트
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { getSupabaseClient } from '@/data/supabase/client';

const supabase = getSupabaseClient(true);
const BASE_URL = 'http://localhost:3001';

describe('API Endpoints Integration Tests', () => {
  let testUserId: string;
  let testRoomId: string;

  beforeAll(async () => {
    // 테스트용 사용자 생성
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: 'api-test-user@example.com',
        display_name: 'API Test User'
      })
      .select()
      .single();

    if (error) throw new Error('Failed to create test user');
    testUserId = user.id;
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    if (testRoomId) {
      await supabase.from('rooms').delete().eq('id', testRoomId);
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId);
    }
  });

  describe('Rooms API', () => {
    test('POST /api/rooms - 방 생성', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
        body: JSON.stringify({
          title: 'API 테스트 방',
          description: 'API 엔드포인트 테스트용 방',
          tags: ['API', '테스트']
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('code');
      expect(data.title).toBe('API 테스트 방');
      expect(data.status).toBe('waiting_participant');
      expect(data.code).toMatch(/^[A-Z0-9]{6}$/);

      testRoomId = data.id;
    });

    test('GET /api/rooms - 방 목록 조회', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      
      const createdRoom = data.find((room: any) => room.id === testRoomId);
      expect(createdRoom).toBeDefined();
      expect(createdRoom.title).toBe('API 테스트 방');
    });

    test('GET /api/rooms/[id] - 특정 방 조회', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(testRoomId);
      expect(data.title).toBe('API 테스트 방');
      expect(data.creator_id).toBe(testUserId);
    });

    test('PATCH /api/rooms/[id]/status - 방 상태 업데이트', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
        body: JSON.stringify({
          status: 'agenda_negotiation'
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('agenda_negotiation');
    });

    test('GET /api/rooms/[id]/status - 방 상태 조회', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}/status`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('agenda_negotiation');
      expect(data).toHaveProperty('possible_transitions');
    });
  });

  describe('Motion API', () => {
    test('POST /api/rooms/[id]/motion - 안건 생성', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}/motion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
        body: JSON.stringify({
          title: 'API 테스트 안건',
          description: 'API 엔드포인트 테스트를 위한 안건입니다'
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.title).toBe('API 테스트 안건');
      expect(data.status).toBe('proposed');
      expect(data.proposer_id).toBe(testUserId);
    });

    test('GET /api/rooms/[id]/motion - 안건 조회', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}/motion`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe('API 테스트 안건');
      expect(data.status).toBe('proposed');
    });
  });

  describe('Claims API', () => {
    test('POST /api/rooms/[id]/claims - 클레임 생성', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
        body: JSON.stringify({
          action: 'accept',
          reason: 'API 테스트를 위한 수락'
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.action).toBe('accept');
      expect(data.reason).toBe('API 테스트를 위한 수락');
    });

    test('GET /api/rooms/[id]/claims - 클레임 목록 조회', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}/claims`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].action).toBe('accept');
    });
  });

  describe('Arguments API', () => {
    beforeAll(async () => {
      // 논증 제출을 위해 방 상태를 변경
      await fetch(`${BASE_URL}/api/rooms/${testRoomId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
        body: JSON.stringify({
          status: 'arguments_submission'
        }),
      });
    });

    test('POST /api/rooms/[id]/arguments - 논증 제출', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}/arguments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
        body: JSON.stringify({
          side: 'A',
          title: 'API 테스트 논증',
          content: 'API 엔드포인트 테스트를 위한 논증 내용입니다.',
          evidence: [
            { type: 'research', content: '연구 자료 예시' },
            { type: 'example', content: '사례 예시' }
          ]
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.side).toBe('A');
      expect(data.title).toBe('API 테스트 논증');
      expect(data.evidence).toHaveLength(2);
    });

    test('GET /api/rooms/[id]/arguments - 논증 목록 조회', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}/arguments`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].title).toBe('API 테스트 논증');
    });
  });

  describe('User Profile API', () => {
    test('GET /api/user/profile - 사용자 프로필 조회', async () => {
      const response = await fetch(`${BASE_URL}/api/user/profile`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.id).toBe(testUserId);
      expect(data.user.email).toBe('api-test-user@example.com');
      expect(data).toHaveProperty('statistics');
      expect(data).toHaveProperty('recent_activity');
    });

    test('PATCH /api/user/profile - 사용자 프로필 업데이트', async () => {
      const response = await fetch(`${BASE_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
        body: JSON.stringify({
          display_name: '업데이트된 API 테스트 사용자',
          bio: 'API 테스트를 위한 사용자 프로필입니다.'
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.display_name).toBe('업데이트된 API 테스트 사용자');
      expect(data.user.bio).toBe('API 테스트를 위한 사용자 프로필입니다.');
    });
  });

  describe('Jobs API', () => {
    let testJobId: string;

    test('POST /api/rooms/[id]/debate/start - AI 토론 시작 (작업 생성)', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}/debate/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
        body: JSON.stringify({
          config: {
            max_rounds: 2,
            time_limit: 180,
            jury_size: 3
          }
        }),
      });

      expect(response.status).toBe(202);
      const data = await response.json();
      expect(data).toHaveProperty('job_id');
      expect(data.message).toContain('AI 토론이 시작되었습니다');
      
      testJobId = data.job_id;
    });

    test('GET /api/jobs/[id] - 작업 상태 조회', async () => {
      const response = await fetch(`${BASE_URL}/api/jobs/${testJobId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(testJobId);
      expect(data.type).toBe('ai_debate');
      expect(['queued', 'running', 'succeeded', 'failed'].includes(data.status)).toBe(true);
    });

    test('GET /api/rooms/[id]/jobs - 방별 작업 목록 조회', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms/${testRoomId}/jobs`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('jobs');
      expect(data).toHaveProperty('statistics');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.jobs)).toBe(true);
      expect(data.jobs.length).toBeGreaterThan(0);
    });

    test('POST /api/jobs/[id]/cancel - 작업 취소', async () => {
      // 작업이 아직 실행 중인 경우에만 취소 가능
      const statusResponse = await fetch(`${BASE_URL}/api/jobs/${testJobId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });
      
      const statusData = await statusResponse.json();
      
      if (['queued', 'running'].includes(statusData.status)) {
        const response = await fetch(`${BASE_URL}/api/jobs/${testJobId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': testUserId,
            'x-user-email': 'api-test-user@example.com',
          },
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.status).toBe('cancelled');
        expect(data.message).toContain('취소되었습니다');
      } else {
        // 이미 완료된 작업은 취소할 수 없음
        const response = await fetch(`${BASE_URL}/api/jobs/${testJobId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': testUserId,
            'x-user-email': 'api-test-user@example.com',
          },
        });

        expect(response.status).toBe(409);
        const data = await response.json();
        expect(data.message).toContain('취소할 수 없습니다');
      }
    });
  });

  describe('Error Handling', () => {
    test('404 - 존재하지 않는 방 조회', async () => {
      const fakeRoomId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${BASE_URL}/api/rooms/${fakeRoomId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toContain('찾을 수 없습니다');
    });

    test('401 - 인증 헤더 없이 API 호출', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toContain('인증');
    });

    test('400 - 잘못된 요청 데이터', async () => {
      const response = await fetch(`${BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': 'api-test-user@example.com',
        },
        body: JSON.stringify({
          // title 누락 - 필수 필드
          description: '잘못된 요청 테스트'
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('유효하지 않은');
    });
  });
});
