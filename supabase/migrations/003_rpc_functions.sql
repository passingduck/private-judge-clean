-- RPC 함수들 정의

-- 방 입장 트랜잭션 함수
CREATE OR REPLACE FUNCTION join_room_transaction(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room RECORD;
  v_result JSON;
BEGIN
  -- 방 정보 조회 및 락
  SELECT * INTO v_room
  FROM rooms
  WHERE id = p_room_id
  FOR UPDATE;

  -- 방이 존재하지 않는 경우
  IF NOT FOUND THEN
    RAISE EXCEPTION 'room_not_found';
  END IF;

  -- 방이 참가자 대기 상태가 아닌 경우
  IF v_room.status != 'waiting_participant' THEN
    RAISE EXCEPTION 'room_not_waiting';
  END IF;

  -- 이미 참가자가 있는 경우
  IF v_room.participant_id IS NOT NULL THEN
    RAISE EXCEPTION 'room_full';
  END IF;

  -- 생성자가 자신의 방에 입장하려는 경우
  IF v_room.creator_id = p_user_id THEN
    RAISE EXCEPTION 'creator_cannot_join';
  END IF;

  -- 방 업데이트 (참가자 추가 및 상태 변경)
  UPDATE rooms
  SET 
    participant_id = p_user_id,
    status = 'agenda_negotiation',
    updated_at = NOW()
  WHERE id = p_room_id;

  -- 방 멤버 추가 (참가자)
  INSERT INTO room_members (room_id, user_id, role, side)
  VALUES (p_room_id, p_user_id, 'participant', 'B');

  -- 성공 결과 반환
  v_result := json_build_object(
    'success', true,
    'room_id', p_room_id,
    'user_id', p_user_id,
    'new_status', 'agenda_negotiation'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- 에러 발생 시 롤백되고 에러 메시지 반환
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- 방 상태 업데이트 함수
CREATE OR REPLACE FUNCTION update_room_status(
  p_room_id UUID,
  p_new_status TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room RECORD;
  v_valid_transitions TEXT[];
  v_result JSON;
BEGIN
  -- 방 정보 조회
  SELECT * INTO v_room
  FROM rooms
  WHERE id = p_room_id;

  -- 방이 존재하지 않는 경우
  IF NOT FOUND THEN
    RAISE EXCEPTION 'room_not_found';
  END IF;

  -- 사용자 권한 확인 (생성자 또는 참가자만 가능)
  IF p_user_id IS NOT NULL AND 
     v_room.creator_id != p_user_id AND 
     v_room.participant_id != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- 상태 전환 유효성 검사
  CASE v_room.status
    WHEN 'waiting_participant' THEN
      v_valid_transitions := ARRAY['agenda_negotiation', 'cancelled'];
    WHEN 'agenda_negotiation' THEN
      v_valid_transitions := ARRAY['arguments_submission', 'cancelled'];
    WHEN 'arguments_submission' THEN
      v_valid_transitions := ARRAY['ai_processing', 'cancelled'];
    WHEN 'ai_processing' THEN
      v_valid_transitions := ARRAY['completed', 'cancelled'];
    ELSE
      v_valid_transitions := ARRAY[]::TEXT[];
  END CASE;

  -- 유효하지 않은 상태 전환인 경우
  IF NOT (p_new_status = ANY(v_valid_transitions)) THEN
    RAISE EXCEPTION 'invalid_status_transition: % -> %', v_room.status, p_new_status;
  END IF;

  -- 방 상태 업데이트
  UPDATE rooms
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_room_id;

  -- 성공 결과 반환
  v_result := json_build_object(
    'success', true,
    'room_id', p_room_id,
    'old_status', v_room.status,
    'new_status', p_new_status,
    'updated_at', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- 사용자의 활성 방 확인 함수
CREATE OR REPLACE FUNCTION get_user_active_rooms(p_user_id UUID)
RETURNS TABLE (
  room_id UUID,
  room_code TEXT,
  room_title TEXT,
  room_status TEXT,
  user_role TEXT,
  user_side TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as room_id,
    r.code as room_code,
    r.title as room_title,
    r.status as room_status,
    rm.role as user_role,
    rm.side as user_side
  FROM rooms r
  INNER JOIN room_members rm ON r.id = rm.room_id
  WHERE rm.user_id = p_user_id
    AND r.status IN ('waiting_participant', 'agenda_negotiation', 'arguments_submission', 'ai_processing')
  ORDER BY r.updated_at DESC;
END;
$$;

-- 방 통계 조회 함수
CREATE OR REPLACE FUNCTION get_room_statistics(p_room_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room RECORD;
  v_stats JSON;
  v_motion_count INTEGER;
  v_argument_count INTEGER;
  v_round_count INTEGER;
  v_job_count INTEGER;
BEGIN
  -- 방 정보 조회
  SELECT * INTO v_room
  FROM rooms
  WHERE id = p_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'room_not_found';
  END IF;

  -- 관련 데이터 개수 조회
  SELECT COUNT(*) INTO v_motion_count
  FROM motions
  WHERE room_id = p_room_id;

  SELECT COUNT(*) INTO v_argument_count
  FROM arguments
  WHERE room_id = p_room_id;

  SELECT COUNT(*) INTO v_round_count
  FROM rounds
  WHERE room_id = p_room_id;

  SELECT COUNT(*) INTO v_job_count
  FROM jobs
  WHERE room_id = p_room_id;

  -- 통계 JSON 구성
  v_stats := json_build_object(
    'room_id', p_room_id,
    'status', v_room.status,
    'created_at', v_room.created_at,
    'updated_at', v_room.updated_at,
    'has_participant', (v_room.participant_id IS NOT NULL),
    'motion_count', v_motion_count,
    'argument_count', v_argument_count,
    'round_count', v_round_count,
    'job_count', v_job_count,
    'duration_hours', EXTRACT(EPOCH FROM (NOW() - v_room.created_at)) / 3600
  );

  RETURN v_stats;
END;
$$;

-- 방 코드 중복 확인 함수
CREATE OR REPLACE FUNCTION is_room_code_available(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM rooms WHERE code = UPPER(p_code)
  ) INTO v_exists;

  RETURN NOT v_exists;
END;
$$;
