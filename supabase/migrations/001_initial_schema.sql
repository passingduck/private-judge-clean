-- 사적 재판 시스템 초기 스키마
-- 생성일: 2025-09-27

-- UUID 확장 활성화 (gen_random_uuid 사용)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 프로필 확장 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 토론 방 테이블
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'waiting_participant' 
    CHECK (status IN ('waiting_participant', 'agenda_negotiation', 'arguments_submission', 'ai_processing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 방 멤버십 테이블 (명시적 권한 관리)
CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('creator', 'participant')),
  side TEXT CHECK (side IN ('A', 'B')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- 안건 테이블
CREATE TABLE motions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'proposed' 
    CHECK (status IN ('proposed', 'under_negotiation', 'agreed', 'rejected')),
  negotiation_history JSONB DEFAULT '[]'::jsonb,
  agreed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id) -- 방당 하나의 안건만
);

-- 안건 수정 요청 테이블
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motion_id UUID NOT NULL REFERENCES motions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('modify', 'reject', 'accept')),
  modifications JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 주장 테이블
CREATE TABLE arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('A', 'B')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  evidence JSONB DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id) -- 사용자당 방당 하나의 주장
);

-- 토론 라운드 테이블
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number IN (1, 2, 3)),
  round_type TEXT NOT NULL CHECK (round_type IN ('first', 'second', 'final')),
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, round_number)
);

-- 토론 턴 테이블 (변호사 발언)
CREATE TABLE debate_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('A', 'B')),
  lawyer_type TEXT NOT NULL CHECK (lawyer_type IN ('lawyer_a', 'lawyer_b')),
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, turn_number)
);

-- 판사 결정 테이블
CREATE TABLE judge_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('round_summary', 'interim_ruling', 'final_verdict')),
  content JSONB NOT NULL,
  reasoning TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 배심원 프로필 테이블
CREATE TABLE juror_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  juror_number INTEGER NOT NULL CHECK (juror_number BETWEEN 1 AND 7),
  profile JSONB NOT NULL, -- 배경, 성향 등
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, juror_number)
);

-- 배심원 투표 테이블
CREATE TABLE jury_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  juror_number INTEGER NOT NULL CHECK (juror_number BETWEEN 1 AND 7),
  vote TEXT NOT NULL CHECK (vote IN ('A', 'B')),
  reasoning TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, juror_number)
);

-- 최종 리포트 테이블
CREATE TABLE final_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  winner TEXT CHECK (winner IN ('A', 'B', 'draw')),
  reasoning TEXT NOT NULL,
  strengths_a TEXT NOT NULL,
  weaknesses_a TEXT NOT NULL,
  strengths_b TEXT NOT NULL,
  weaknesses_b TEXT NOT NULL,
  overall_quality INTEGER CHECK (overall_quality BETWEEN 1 AND 10),
  jury_summary JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id) -- 방당 하나의 최종 리포트
);

-- 비동기 작업 큐 테이블
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('ai_debate', 'ai_judge', 'ai_jury', 'notification')),
  status TEXT NOT NULL DEFAULT 'queued' 
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'retrying')),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_creator ON rooms(creator_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_room_members_room_user ON room_members(room_id, user_id);
CREATE INDEX idx_arguments_room_user ON arguments(room_id, user_id);
CREATE INDEX idx_jobs_status_scheduled ON jobs(status, scheduled_at);
CREATE INDEX idx_debate_turns_round ON debate_turns(round_id);
CREATE INDEX idx_jury_votes_room ON jury_votes(room_id);

-- 방 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 방 생성 시 자동으로 코드 생성하는 트리거
CREATE OR REPLACE FUNCTION set_room_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    LOOP
      NEW.code := generate_room_code();
      -- 중복 확인
      IF NOT EXISTS (SELECT 1 FROM rooms WHERE code = NEW.code) THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_room_code
  BEFORE INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION set_room_code();

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거들
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_motions_updated_at
  BEFORE UPDATE ON motions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_arguments_updated_at
  BEFORE UPDATE ON arguments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 방 멤버 자동 추가 함수
CREATE OR REPLACE FUNCTION add_room_member()
RETURNS TRIGGER AS $$
BEGIN
  -- 방 생성자 추가
  IF TG_OP = 'INSERT' THEN
    INSERT INTO room_members (room_id, user_id, role, side)
    VALUES (NEW.id, NEW.creator_id, 'creator', 'A');
  END IF;
  
  -- 참여자 추가
  IF TG_OP = 'UPDATE' AND OLD.participant_id IS NULL AND NEW.participant_id IS NOT NULL THEN
    INSERT INTO room_members (room_id, user_id, role, side)
    VALUES (NEW.id, NEW.participant_id, 'participant', 'B')
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_room_member
  AFTER INSERT OR UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION add_room_member();
