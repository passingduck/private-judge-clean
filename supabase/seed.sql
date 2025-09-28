-- 사적 재판 시스템 시드 데이터
-- 개발 및 테스트용 샘플 데이터

-- 테스트 사용자 생성
INSERT INTO users (id, email, display_name, avatar_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'alice@example.com', '앨리스', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice'),
  ('550e8400-e29b-41d4-a716-446655440002', 'bob@example.com', '밥', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob'),
  ('550e8400-e29b-41d4-a716-446655440003', 'charlie@example.com', '찰리', 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie'),
  ('550e8400-e29b-41d4-a716-446655440004', 'diana@example.com', '다이애나', 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana')
ON CONFLICT (id) DO NOTHING;

-- 테스트 방 생성
INSERT INTO rooms (id, code, creator_id, participant_id, title, description, status) VALUES
  (
    '660e8400-e29b-41d4-a716-446655440001',
    'ENV123',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '환경보호 vs 경제성장',
    '현재 상황에서 환경보호와 경제성장 중 어느 것이 우선되어야 하는가?',
    'arguments_submission'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440002',
    'EDU456',
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '온라인 교육 vs 오프라인 교육',
    '코로나19 이후 교육 방식의 미래는 어떻게 되어야 하는가?',
    'completed'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440003',
    'WORK78',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL,
    '재택근무 vs 사무실 근무',
    '포스트 코로나 시대의 최적의 근무 방식은?',
    'waiting_participant'
  )
ON CONFLICT (id) DO NOTHING;

-- 방 멤버십 (트리거로 자동 생성되지만 명시적으로 추가)
INSERT INTO room_members (room_id, user_id, role, side) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'creator', 'A'),
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'participant', 'B'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'creator', 'A'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'participant', 'B'),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'creator', 'A')
ON CONFLICT (room_id, user_id) DO NOTHING;

-- 테스트 안건
INSERT INTO motions (id, room_id, title, description, proposer_id, status, agreed_at) VALUES
  (
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    '환경보호가 경제성장보다 우선되어야 한다',
    '기후변화와 환경파괴가 심각한 상황에서, 단기적 경제적 손실을 감수하더라도 환경보호를 우선시해야 한다는 입장입니다. 지속가능한 발전을 위해서는 환경이 먼저 보호되어야 합니다.',
    '550e8400-e29b-41d4-a716-446655440001',
    'agreed',
    NOW() - INTERVAL '2 hours'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    '온라인 교육이 오프라인 교육보다 효과적이다',
    '디지털 기술의 발달과 개인화 학습의 장점을 고려할 때, 온라인 교육이 전통적인 오프라인 교육보다 더 효과적이고 미래지향적이다.',
    '550e8400-e29b-41d4-a716-446655440003',
    'agreed',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- 테스트 주장
INSERT INTO arguments (id, room_id, user_id, side, title, content, evidence) VALUES
  (
    '880e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'A',
    '환경보호 우선 정책의 필요성',
    '기후변화로 인한 피해가 경제적 손실보다 훨씬 크다는 것이 과학적으로 입증되고 있습니다. IPCC 보고서에 따르면, 지구 온도가 1.5도 상승할 경우 경제적 피해는 GDP의 10-23%에 달할 것으로 예상됩니다. 반면 환경보호 투자는 GDP의 1-2% 수준으로 훨씬 경제적입니다.',
    '[
      {
        "type": "document",
        "title": "IPCC 6차 보고서",
        "url": "https://www.ipcc.ch/report/ar6/wg2/",
        "description": "기후변화 영향 및 적응에 관한 과학적 근거"
      },
      {
        "type": "statistic",
        "title": "경제적 피해 예측",
        "description": "온도 상승 시 GDP 대비 피해 규모"
      }
    ]'::jsonb
  ),
  (
    '880e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'B',
    '경제성장을 통한 환경 기술 발전',
    '경제성장이 있어야 환경 기술에 투자할 수 있는 여력이 생깁니다. 선진국들의 사례를 보면, 경제발전 이후에 환경 기술이 급속도로 발달했습니다. 개발도상국에서 환경보호만 우선시하면 빈곤 문제가 심화되어 오히려 환경 파괴가 가속화될 수 있습니다.',
    '[
      {
        "type": "statistic",
        "title": "쿠즈네츠 곡선",
        "description": "소득 증가에 따른 환경 개선 패턴"
      },
      {
        "type": "link",
        "title": "한국의 경제발전과 환경기술",
        "url": "https://example.com/korea-env-tech",
        "description": "한국의 경제성장 과정에서 환경기술 발전 사례"
      }
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 테스트 라운드 (완료된 토론용)
INSERT INTO rounds (id, room_id, round_number, round_type, status, started_at, completed_at) VALUES
  (
    '990e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440002',
    1,
    'first',
    'completed',
    NOW() - INTERVAL '1 day 2 hours',
    NOW() - INTERVAL '1 day 1 hour'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    2,
    'second',
    'completed',
    NOW() - INTERVAL '1 day 1 hour',
    NOW() - INTERVAL '1 day 30 minutes'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440002',
    3,
    'final',
    'completed',
    NOW() - INTERVAL '1 day 30 minutes',
    NOW() - INTERVAL '1 day 10 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- 테스트 배심원 투표 (완료된 토론용)
INSERT INTO jury_votes (id, room_id, juror_number, vote, reasoning, confidence) VALUES
  ('aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', 1, 'A', '온라인 교육의 접근성과 개인화 학습의 장점이 더 설득력 있었습니다.', 8),
  ('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 2, 'B', '대면 교육의 사회적 상호작용과 실습의 중요성이 잘 드러났습니다.', 7),
  ('aa0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', 3, 'A', '디지털 네이티브 세대에게는 온라인 교육이 더 효과적일 것 같습니다.', 6),
  ('aa0e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 4, 'A', '코로나19 상황에서 입증된 온라인 교육의 실용성이 인상적이었습니다.', 9),
  ('aa0e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', 5, 'B', '교육의 본질적 가치는 인간적 교감에 있다고 생각합니다.', 8),
  ('aa0e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', 6, 'A', '비용 효율성과 확장성 측면에서 온라인 교육이 우수합니다.', 7),
  ('aa0e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440002', 7, 'B', '실험, 실습 등 체험 학습은 오프라인에서만 가능합니다.', 8)
ON CONFLICT (id) DO NOTHING;

-- 테스트 최종 리포트 (완료된 토론용)
INSERT INTO final_reports (
  id, 
  room_id, 
  winner, 
  reasoning, 
  strengths_a, 
  weaknesses_a, 
  strengths_b, 
  weaknesses_b, 
  overall_quality,
  jury_summary
) VALUES (
  'bb0e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440002',
  'A',
  '온라인 교육 측(A)이 더 설득력 있는 논증을 제시했습니다. 특히 접근성, 개인화 학습, 비용 효율성 측면에서 구체적인 데이터와 사례를 제시하여 논리적 일관성을 보여주었습니다. 배심원 투표 결과도 4:3으로 A측이 승리했습니다.',
  '구체적인 통계 자료 활용, 코로나19 실증 사례 제시, 미래 지향적 관점, 논리적 구조',
  '오프라인 교육의 장점에 대한 반박 부족, 디지털 격차 문제 간과',
  '교육의 본질적 가치 강조, 인간적 교감의 중요성 부각, 실습 교육의 필요성 제시',
  '변화하는 시대 흐름에 대한 대응 부족, 온라인 교육의 장점 과소평가',
  8,
  '{
    "total_votes": 7,
    "votes_a": 4,
    "votes_b": 3,
    "average_confidence": 7.6,
    "key_factors": ["접근성", "개인화 학습", "비용 효율성", "인간적 교감", "실습 교육"]
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 테스트 작업 큐
INSERT INTO jobs (id, type, status, room_id, payload, result, scheduled_at, completed_at) VALUES
  (
    'cc0e8400-e29b-41d4-a716-446655440001',
    'ai_debate',
    'succeeded',
    '660e8400-e29b-41d4-a716-446655440002',
    '{"round": 1, "type": "first"}',
    '{"success": true, "turns_generated": 10}',
    NOW() - INTERVAL '1 day 2 hours',
    NOW() - INTERVAL '1 day 1 hour'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440002',
    'ai_jury',
    'succeeded',
    '660e8400-e29b-41d4-a716-446655440002',
    '{"jury_count": 7}',
    '{"votes_generated": 7, "votes_a": 4, "votes_b": 3}',
    NOW() - INTERVAL '1 day 20 minutes',
    NOW() - INTERVAL '1 day 15 minutes'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440003',
    'ai_debate',
    'queued',
    '660e8400-e29b-41d4-a716-446655440001',
    '{"round": 1, "type": "first"}',
    NULL,
    NOW(),
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 개발용 편의 함수들
CREATE OR REPLACE FUNCTION reset_test_data()
RETURNS void AS $$
BEGIN
  -- 테스트 데이터만 삭제 (시드 데이터 기준)
  DELETE FROM jobs WHERE room_id IN (
    SELECT id FROM rooms WHERE code IN ('ENV123', 'EDU456', 'WORK78')
  );
  DELETE FROM final_reports WHERE room_id IN (
    SELECT id FROM rooms WHERE code IN ('ENV123', 'EDU456', 'WORK78')
  );
  DELETE FROM jury_votes WHERE room_id IN (
    SELECT id FROM rooms WHERE code IN ('ENV123', 'EDU456', 'WORK78')
  );
  DELETE FROM rounds WHERE room_id IN (
    SELECT id FROM rooms WHERE code IN ('ENV123', 'EDU456', 'WORK78')
  );
  DELETE FROM arguments WHERE room_id IN (
    SELECT id FROM rooms WHERE code IN ('ENV123', 'EDU456', 'WORK78')
  );
  DELETE FROM motions WHERE room_id IN (
    SELECT id FROM rooms WHERE code IN ('ENV123', 'EDU456', 'WORK78')
  );
  DELETE FROM room_members WHERE room_id IN (
    SELECT id FROM rooms WHERE code IN ('ENV123', 'EDU456', 'WORK78')
  );
  DELETE FROM rooms WHERE code IN ('ENV123', 'EDU456', 'WORK78');
  DELETE FROM users WHERE email LIKE '%@example.com';
  
  RAISE NOTICE 'Test data has been reset';
END;
$$ LANGUAGE plpgsql;

-- 통계 조회 함수
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_rooms BIGINT,
  active_rooms BIGINT,
  completed_rooms BIGINT,
  pending_jobs BIGINT,
  failed_jobs BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM rooms) as total_rooms,
    (SELECT COUNT(*) FROM rooms WHERE status IN ('agenda_negotiation', 'arguments_submission', 'ai_processing')) as active_rooms,
    (SELECT COUNT(*) FROM rooms WHERE status = 'completed') as completed_rooms,
    (SELECT COUNT(*) FROM jobs WHERE status IN ('queued', 'running')) as pending_jobs,
    (SELECT COUNT(*) FROM jobs WHERE status = 'failed') as failed_jobs;
END;
$$ LANGUAGE plpgsql;
