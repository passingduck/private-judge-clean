-- RLS (Row Level Security) 정책 설정
-- 방 멤버 기반 접근 제어, 서비스 롤은 모든 작업 허용

-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE motions ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE juror_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jury_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- 헬퍼 함수: 현재 사용자가 방의 멤버인지 확인
CREATE OR REPLACE FUNCTION is_room_member(room_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM room_members 
    WHERE room_id = room_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 헬퍼 함수: 현재 사용자가 방의 생성자인지 확인
CREATE OR REPLACE FUNCTION is_room_creator(room_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM rooms 
    WHERE id = room_uuid 
    AND creator_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 헬퍼 함수: 서비스 롤인지 확인
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.jwt() ->> 'role' = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users 테이블 정책
CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT USING (auth.uid() = id OR is_service_role());

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id OR is_service_role());

CREATE POLICY "Service role can insert users" ON users
  FOR INSERT WITH CHECK (is_service_role());

CREATE POLICY "Service role can delete users" ON users
  FOR DELETE USING (is_service_role());

-- Rooms 테이블 정책
CREATE POLICY "Users can read rooms they are members of" ON rooms
  FOR SELECT USING (is_room_member(id) OR is_service_role());

CREATE POLICY "Users can create rooms" ON rooms
  FOR INSERT WITH CHECK (auth.uid() = creator_id OR is_service_role());

CREATE POLICY "Room creators can update their rooms" ON rooms
  FOR UPDATE USING (is_room_creator(id) OR is_service_role());

CREATE POLICY "Service role can delete rooms" ON rooms
  FOR DELETE USING (is_service_role());

-- Room Members 테이블 정책
CREATE POLICY "Users can read room members for their rooms" ON room_members
  FOR SELECT USING (is_room_member(room_id) OR is_service_role());

CREATE POLICY "System can insert room members" ON room_members
  FOR INSERT WITH CHECK (is_service_role() OR auth.uid() = user_id);

CREATE POLICY "Room creators can update members" ON room_members
  FOR UPDATE USING (is_room_creator(room_id) OR is_service_role());

CREATE POLICY "Service role can delete room members" ON room_members
  FOR DELETE USING (is_service_role());

-- Motions 테이블 정책
CREATE POLICY "Room members can read motions" ON motions
  FOR SELECT USING (is_room_member(room_id) OR is_service_role());

CREATE POLICY "Room members can create motions" ON motions
  FOR INSERT WITH CHECK (is_room_member(room_id) OR is_service_role());

CREATE POLICY "Motion proposers can update motions" ON motions
  FOR UPDATE USING (auth.uid() = proposer_id OR is_service_role());

CREATE POLICY "Service role can delete motions" ON motions
  FOR DELETE USING (is_service_role());

-- Claims 테이블 정책
CREATE POLICY "Room members can read claims" ON claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM motions m 
      WHERE m.id = motion_id 
      AND is_room_member(m.room_id)
    ) OR is_service_role()
  );

CREATE POLICY "Room members can create claims" ON claims
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM motions m 
      WHERE m.id = motion_id 
      AND is_room_member(m.room_id)
    ) OR is_service_role()
  );

CREATE POLICY "Service role can manage claims" ON claims
  FOR ALL USING (is_service_role());

-- Arguments 테이블 정책
CREATE POLICY "Room members can read arguments" ON arguments
  FOR SELECT USING (is_room_member(room_id) OR is_service_role());

CREATE POLICY "Users can create their own arguments" ON arguments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND is_room_member(room_id) 
    OR is_service_role()
  );

CREATE POLICY "Users can update their own arguments" ON arguments
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND is_room_member(room_id) 
    OR is_service_role()
  );

CREATE POLICY "Service role can delete arguments" ON arguments
  FOR DELETE USING (is_service_role());

-- Rounds 테이블 정책 (시스템 생성 데이터)
CREATE POLICY "Room members can read rounds" ON rounds
  FOR SELECT USING (is_room_member(room_id) OR is_service_role());

CREATE POLICY "Service role can manage rounds" ON rounds
  FOR ALL USING (is_service_role());

-- Debate Turns 테이블 정책 (AI 생성 데이터)
CREATE POLICY "Room members can read debate turns" ON debate_turns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rounds r 
      WHERE r.id = round_id 
      AND is_room_member(r.room_id)
    ) OR is_service_role()
  );

CREATE POLICY "Service role can manage debate turns" ON debate_turns
  FOR ALL USING (is_service_role());

-- Judge Decisions 테이블 정책 (AI 생성 데이터)
CREATE POLICY "Room members can read judge decisions" ON judge_decisions
  FOR SELECT USING (is_room_member(room_id) OR is_service_role());

CREATE POLICY "Service role can manage judge decisions" ON judge_decisions
  FOR ALL USING (is_service_role());

-- Juror Profiles 테이블 정책 (AI 생성 데이터)
CREATE POLICY "Room members can read juror profiles" ON juror_profiles
  FOR SELECT USING (is_room_member(room_id) OR is_service_role());

CREATE POLICY "Service role can manage juror profiles" ON juror_profiles
  FOR ALL USING (is_service_role());

-- Jury Votes 테이블 정책 (AI 생성 데이터)
CREATE POLICY "Room members can read jury votes" ON jury_votes
  FOR SELECT USING (is_room_member(room_id) OR is_service_role());

CREATE POLICY "Service role can manage jury votes" ON jury_votes
  FOR ALL USING (is_service_role());

-- Final Reports 테이블 정책 (AI 생성 데이터)
CREATE POLICY "Room members can read final reports" ON final_reports
  FOR SELECT USING (is_room_member(room_id) OR is_service_role());

CREATE POLICY "Service role can manage final reports" ON final_reports
  FOR ALL USING (is_service_role());

-- Jobs 테이블 정책 (시스템 전용)
CREATE POLICY "Service role can manage jobs" ON jobs
  FOR ALL USING (is_service_role());

-- 읽기 전용 정책 (일반 사용자는 자신과 관련된 작업만 조회 가능)
CREATE POLICY "Users can read their room jobs" ON jobs
  FOR SELECT USING (
    room_id IS NOT NULL 
    AND is_room_member(room_id)
  );

-- 공개 함수들 (RLS 정책에서 사용)
GRANT EXECUTE ON FUNCTION is_room_member(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_room_creator(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_service_role() TO authenticated, anon, service_role;
