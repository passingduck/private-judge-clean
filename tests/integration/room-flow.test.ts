/**
 * 통합 테스트: 전체 방 생성부터 토론 완료까지의 플로우
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { getSupabaseClient } from '@/data/supabase/client';

const supabase = getSupabaseClient(true); // Use service role for tests

describe('Room Flow Integration Tests', () => {
  let testUserId1: string;
  let testUserId2: string;
  let testRoomId: string;
  let testRoomCode: string;

  beforeAll(async () => {
    // 테스트용 사용자 생성
    const { data: user1, error: user1Error } = await supabase
      .from('users')
      .insert({
        email: 'test-user-1@example.com',
        display_name: 'Test User 1'
      })
      .select()
      .single();

    const { data: user2, error: user2Error } = await supabase
      .from('users')
      .insert({
        email: 'test-user-2@example.com',
        display_name: 'Test User 2'
      })
      .select()
      .single();

    if (user1Error || user2Error) {
      throw new Error('Failed to create test users');
    }

    testUserId1 = user1.id;
    testUserId2 = user2.id;
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    if (testRoomId) {
      await supabase.from('rooms').delete().eq('id', testRoomId);
    }
    if (testUserId1) {
      await supabase.from('users').delete().eq('id', testUserId1);
    }
    if (testUserId2) {
      await supabase.from('users').delete().eq('id', testUserId2);
    }
  });

  beforeEach(() => {
    // 각 테스트 전에 상태 초기화
    testRoomId = '';
    testRoomCode = '';
  });

  test('전체 플로우: 방 생성 → 참가 → 안건 협상 → 토론 → 판결', async () => {
    // 1. 방 생성
    console.log('1. 방 생성 테스트');
    const createRoomResponse = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId1,
        'x-user-email': 'test-user-1@example.com',
      },
      body: JSON.stringify({
        title: '통합 테스트 방',
        description: '자동화된 통합 테스트를 위한 방입니다',
        tags: ['테스트', '자동화']
      }),
    });

    expect(createRoomResponse.status).toBe(201);
    const roomData = await createRoomResponse.json();
    expect(roomData).toHaveProperty('id');
    expect(roomData).toHaveProperty('code');
    expect(roomData.title).toBe('통합 테스트 방');
    expect(roomData.status).toBe('waiting_participant');

    testRoomId = roomData.id;
    testRoomCode = roomData.code;

    // 2. 방 참가
    console.log('2. 방 참가 테스트');
    const joinRoomResponse = await fetch('http://localhost:3001/api/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId2,
        'x-user-email': 'test-user-2@example.com',
      },
      body: JSON.stringify({
        roomId: testRoomId,
        roomCode: testRoomCode
      }),
    });

    expect(joinRoomResponse.status).toBe(200);
    const joinData = await joinRoomResponse.json();
    expect(joinData.room.status).toBe('agenda_negotiation');

    // 3. 방 상태 확인
    console.log('3. 방 상태 확인');
    const roomStatusResponse = await fetch(`http://localhost:3001/api/rooms/${testRoomId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId1,
        'x-user-email': 'test-user-1@example.com',
      },
    });

    expect(roomStatusResponse.status).toBe(200);
    const statusData = await roomStatusResponse.json();
    expect(statusData.status).toBe('agenda_negotiation');
    expect(statusData.participant_id).toBe(testUserId2);

    // 4. 안건 제안
    console.log('4. 안건 제안 테스트');
    const motionResponse = await fetch(`http://localhost:3001/api/rooms/${testRoomId}/motion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId1,
        'x-user-email': 'test-user-1@example.com',
      },
      body: JSON.stringify({
        title: '인공지능의 윤리적 사용',
        description: 'AI 기술의 발전과 함께 윤리적 사용에 대한 논의가 필요하다'
      }),
    });

    expect(motionResponse.status).toBe(201);
    const motionData = await motionResponse.json();
    expect(motionData.title).toBe('인공지능의 윤리적 사용');
    expect(motionData.status).toBe('proposed');

    // 5. 안건 수락 (클레임 생성)
    console.log('5. 안건 수락 테스트');
    const claimResponse = await fetch(`http://localhost:3001/api/rooms/${testRoomId}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId2,
        'x-user-email': 'test-user-2@example.com',
      },
      body: JSON.stringify({
        action: 'accept',
        reason: '중요한 주제라고 생각합니다'
      }),
    });

    expect(claimResponse.status).toBe(201);
    const claimData = await claimResponse.json();
    expect(claimData.action).toBe('accept');

    // 6. 방 상태를 arguments_submission으로 변경
    console.log('6. 방 상태 변경 테스트');
    const updateStatusResponse = await fetch(`http://localhost:3001/api/rooms/${testRoomId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId1,
        'x-user-email': 'test-user-1@example.com',
      },
      body: JSON.stringify({
        status: 'arguments_submission'
      }),
    });

    expect(updateStatusResponse.status).toBe(200);
    const updateData = await updateStatusResponse.json();
    expect(updateData.status).toBe('arguments_submission');

    // 7. 논증 제출 (A측)
    console.log('7. A측 논증 제출 테스트');
    const argumentAResponse = await fetch(`http://localhost:3001/api/rooms/${testRoomId}/arguments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId1,
        'x-user-email': 'test-user-1@example.com',
      },
      body: JSON.stringify({
        side: 'A',
        title: 'AI 윤리 가이드라인의 필요성',
        content: 'AI 기술이 급속도로 발전하면서 윤리적 가이드라인이 반드시 필요합니다.',
        evidence: [
          { type: 'research', content: '최근 연구에 따르면...' },
          { type: 'example', content: '실제 사례로는...' }
        ]
      }),
    });

    expect(argumentAResponse.status).toBe(201);
    const argumentAData = await argumentAResponse.json();
    expect(argumentAData.side).toBe('A');
    expect(argumentAData.title).toBe('AI 윤리 가이드라인의 필요성');

    // 8. 논증 제출 (B측)
    console.log('8. B측 논증 제출 테스트');
    const argumentBResponse = await fetch(`http://localhost:3001/api/rooms/${testRoomId}/arguments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId2,
        'x-user-email': 'test-user-2@example.com',
      },
      body: JSON.stringify({
        side: 'B',
        title: '자율적 AI 발전의 중요성',
        content: '과도한 규제보다는 자율적인 발전이 더 효과적일 수 있습니다.',
        evidence: [
          { type: 'research', content: '혁신 연구에 따르면...' },
          { type: 'case_study', content: '성공 사례로는...' }
        ]
      }),
    });

    expect(argumentBResponse.status).toBe(201);
    const argumentBData = await argumentBResponse.json();
    expect(argumentBData.side).toBe('B');
    expect(argumentBData.title).toBe('자율적 AI 발전의 중요성');

    // 9. AI 토론 시작
    console.log('9. AI 토론 시작 테스트');
    const debateStartResponse = await fetch(`http://localhost:3001/api/rooms/${testRoomId}/debate/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId1,
        'x-user-email': 'test-user-1@example.com',
      },
      body: JSON.stringify({
        config: {
          max_rounds: 3,
          time_limit: 300,
          jury_size: 5
        }
      }),
    });

    expect(debateStartResponse.status).toBe(202);
    const debateData = await debateStartResponse.json();
    expect(debateData).toHaveProperty('job_id');
    expect(debateData.message).toContain('AI 토론이 시작되었습니다');

    // 10. 작업 상태 확인
    console.log('10. 작업 상태 확인 테스트');
    const jobId = debateData.job_id;
    const jobStatusResponse = await fetch(`http://localhost:3001/api/jobs/${jobId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId1,
        'x-user-email': 'test-user-1@example.com',
      },
    });

    expect(jobStatusResponse.status).toBe(200);
    const jobData = await jobStatusResponse.json();
    expect(jobData.type).toBe('ai_debate');
    expect(['queued', 'running', 'succeeded'].includes(jobData.status)).toBe(true);

    // 11. 방별 작업 목록 확인
    console.log('11. 방별 작업 목록 확인 테스트');
    const roomJobsResponse = await fetch(`http://localhost:3001/api/rooms/${testRoomId}/jobs`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId1,
        'x-user-email': 'test-user-1@example.com',
      },
    });

    expect(roomJobsResponse.status).toBe(200);
    const roomJobsData = await roomJobsResponse.json();
    expect(roomJobsData.jobs).toBeInstanceOf(Array);
    expect(roomJobsData.jobs.length).toBeGreaterThan(0);
    expect(roomJobsData.statistics.total_count).toBeGreaterThan(0);

    console.log('✅ 전체 통합 테스트 완료');
  }, 30000); // 30초 타임아웃

  test('에러 시나리오: 잘못된 방 코드로 참가 시도', async () => {
    // 먼저 방 생성
    const createRoomResponse = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId1,
        'x-user-email': 'test-user-1@example.com',
      },
      body: JSON.stringify({
        title: '에러 테스트 방',
        description: '에러 시나리오 테스트용',
        tags: ['에러', '테스트']
      }),
    });

    const roomData = await createRoomResponse.json();
    testRoomId = roomData.id;

    // 잘못된 방 코드로 참가 시도
    const joinRoomResponse = await fetch('http://localhost:3001/api/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId2,
        'x-user-email': 'test-user-2@example.com',
      },
      body: JSON.stringify({
        roomId: testRoomId,
        roomCode: 'WRONG1' // 잘못된 코드
      }),
    });

    expect(joinRoomResponse.status).toBe(400);
    const errorData = await joinRoomResponse.json();
    expect(errorData.message).toContain('방 코드가 일치하지 않습니다');
  });

  test('권한 테스트: 다른 사용자의 방에 무단 접근', async () => {
    // 사용자1이 방 생성
    const createRoomResponse = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId1,
        'x-user-email': 'test-user-1@example.com',
      },
      body: JSON.stringify({
        title: '권한 테스트 방',
        description: '권한 테스트용',
        tags: ['권한', '테스트']
      }),
    });

    const roomData = await createRoomResponse.json();
    testRoomId = roomData.id;

    // 사용자2가 참가하지 않은 상태에서 안건 제안 시도
    const motionResponse = await fetch(`http://localhost:3001/api/rooms/${testRoomId}/motion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId2, // 참가하지 않은 사용자
        'x-user-email': 'test-user-2@example.com',
      },
      body: JSON.stringify({
        title: '무단 안건 제안',
        description: '권한 없는 사용자의 안건 제안'
      }),
    });

    expect(motionResponse.status).toBe(403);
    const errorData = await motionResponse.json();
    expect(errorData.message).toContain('접근 권한이 없습니다');
  });
});
