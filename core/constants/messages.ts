// 사적 재판 시스템 한국어 메시지 상수

export const MESSAGES = {
  // 일반 메시지
  COMMON: {
    LOADING: '로딩 중...',
    ERROR: '오류가 발생했습니다',
    SUCCESS: '성공적으로 완료되었습니다',
    CONFIRM: '확인',
    CANCEL: '취소',
    SAVE: '저장',
    DELETE: '삭제',
    EDIT: '수정',
    BACK: '뒤로',
    NEXT: '다음',
    SUBMIT: '제출',
    RETRY: '다시 시도',
    CLOSE: '닫기'
  },

  // 인증 관련
  AUTH: {
    LOGIN: '로그인',
    LOGOUT: '로그아웃',
    SIGNUP: '회원가입',
    EMAIL: '이메일',
    PASSWORD: '비밀번호',
    LOGIN_SUCCESS: '로그인되었습니다',
    LOGOUT_SUCCESS: '로그아웃되었습니다',
    LOGIN_REQUIRED: '로그인이 필요합니다',
    INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다'
  },

  // 방 관련
  ROOM: {
    CREATE: '새 토론 생성',
    JOIN: '토론 참여',
    TITLE: '토론 제목',
    DESCRIPTION: '토론 설명',
    CODE: '방 코드',
    ENTER_CODE: '방 코드를 입력하세요',
    INVALID_CODE: '유효하지 않은 방 코드입니다',
    ROOM_FULL: '이미 참여자가 있는 방입니다',
    ROOM_NOT_FOUND: '방을 찾을 수 없습니다',
    CREATED_SUCCESS: '토론방이 생성되었습니다',
    JOINED_SUCCESS: '토론에 참여했습니다',
    WAITING_PARTICIPANT: '상대방의 참여를 기다리고 있습니다',
    SHARE_CODE: '이 코드를 상대방에게 공유하세요'
  },

  // 안건 관련
  AGENDA: {
    TITLE: '안건 제목',
    DESCRIPTION: '안건 설명',
    PROPOSE: '안건 제안',
    MODIFY: '안건 수정',
    ACCEPT: '안건 수락',
    REJECT: '안건 거절',
    REASON: '사유',
    PROPOSED: '안건이 제안되었습니다',
    MODIFIED: '안건이 수정되었습니다',
    ACCEPTED: '안건이 합의되었습니다',
    REJECTED: '안건이 거절되었습니다',
    NEGOTIATION_ONGOING: '안건 협상이 진행 중입니다'
  },

  // 주장 관련
  ARGUMENT: {
    TITLE: '주장 제목',
    CONTENT: '주장 내용',
    EVIDENCE: '증거 자료',
    SUBMIT: '주장 제출',
    SUBMITTED: '주장이 제출되었습니다',
    WAITING_OPPONENT: '상대방의 주장을 기다리고 있습니다',
    BOTH_SUBMITTED: '양측의 주장이 모두 제출되었습니다',
    ADD_EVIDENCE: '증거 추가',
    EVIDENCE_TYPE: '증거 유형',
    EVIDENCE_LINK: '링크',
    EVIDENCE_DOCUMENT: '문서',
    EVIDENCE_STATISTIC: '통계',
    EVIDENCE_QUOTE: '인용'
  },

  // AI 토론 관련
  DEBATE: {
    START: '토론 시작',
    ROUND_1: '1차 토론',
    ROUND_2: '2차 토론',
    FINAL_ROUND: '최종 토론',
    AI_PROCESSING: 'AI가 토론을 진행하고 있습니다',
    LAWYER_A: 'A측 변호사',
    LAWYER_B: 'B측 변호사',
    JUDGE: '판사',
    JURY: '배심원',
    IN_PROGRESS: '토론 진행 중',
    COMPLETED: '토론 완료',
    ESTIMATED_TIME: '예상 소요 시간',
    MINUTES: '분'
  },

  // 판결 관련
  VERDICT: {
    PENDING: '판결 대기 중',
    IN_PROGRESS: '심의 중',
    COMPLETED: '판결 완료',
    WINNER: '승리자',
    REASONING: '판결 근거',
    STRENGTHS: '강점',
    WEAKNESSES: '약점',
    OVERALL_QUALITY: '전체 토론 품질',
    JURY_VOTES: '배심원 투표',
    VOTE_A: 'A측 지지',
    VOTE_B: 'B측 지지',
    CONFIDENCE: '확신도',
    FINAL_REPORT: '최종 리포트'
  },

  // 상태 관련
  STATUS: {
    WAITING_PARTICIPANT: '참여자 대기',
    AGENDA_NEGOTIATION: '안건 협상',
    ARGUMENTS_SUBMISSION: '주장 제출',
    AI_PROCESSING: 'AI 처리 중',
    COMPLETED: '완료',
    CANCELLED: '취소됨',
    QUEUED: '대기 중',
    RUNNING: '실행 중',
    SUCCEEDED: '성공',
    FAILED: '실패',
    RETRYING: '재시도 중'
  },

  // 에러 메시지
  ERROR: {
    NETWORK: '네트워크 연결을 확인해주세요',
    SERVER: '서버 오류가 발생했습니다',
    VALIDATION: '입력 정보를 확인해주세요',
    PERMISSION: '권한이 없습니다',
    NOT_FOUND: '요청한 정보를 찾을 수 없습니다',
    TIMEOUT: '요청 시간이 초과되었습니다',
    AI_ERROR: 'AI 처리 중 오류가 발생했습니다',
    RETRY_EXCEEDED: '최대 재시도 횟수를 초과했습니다'
  },

  // 알림 메시지
  NOTIFICATION: {
    PARTICIPANT_JOINED: '상대방이 토론에 참여했습니다',
    AGENDA_PROPOSED: '새로운 안건이 제안되었습니다',
    AGENDA_MODIFIED: '안건이 수정되었습니다',
    ARGUMENT_SUBMITTED: '상대방이 주장을 제출했습니다',
    DEBATE_STARTED: 'AI 토론이 시작되었습니다',
    DEBATE_COMPLETED: 'AI 토론이 완료되었습니다',
    VERDICT_READY: '최종 판결이 완료되었습니다',
    RECONNECTED: '연결이 복구되었습니다',
    DISCONNECTED: '연결이 끊어졌습니다'
  },

  // 도움말 메시지
  HELP: {
    ROOM_CODE: '6자리 영숫자 코드를 입력하세요',
    AGENDA_TITLE: '토론하고 싶은 주제를 명확하게 작성하세요',
    AGENDA_DESCRIPTION: '토론 배경과 쟁점을 자세히 설명하세요',
    ARGUMENT_CONTENT: '자신의 입장과 근거를 논리적으로 작성하세요',
    EVIDENCE: '주장을 뒷받침하는 자료를 추가하세요',
    AI_PROCESSING: 'AI가 토론을 진행하는 동안 잠시 기다려주세요',
    RECONNECT: '페이지를 새로고침하거나 나중에 다시 접속하여 결과를 확인할 수 있습니다'
  },

  // 시간 관련
  TIME: {
    JUST_NOW: '방금 전',
    MINUTES_AGO: '분 전',
    HOURS_AGO: '시간 전',
    DAYS_AGO: '일 전',
    ESTIMATED_COMPLETION: '예상 완료 시간',
    REMAINING: '남은 시간'
  }
} as const;

// 타입 안전성을 위한 유틸리티 함수
export function getMessage(path: string): string {
  const keys = path.split('.');
  let current: any = MESSAGES;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      console.warn(`Message not found: ${path}`);
      return path;
    }
  }
  
  return typeof current === 'string' ? current : path;
}

// 자주 사용되는 메시지들의 단축 함수
export const msg = {
  common: (key: keyof typeof MESSAGES.COMMON) => MESSAGES.COMMON[key],
  auth: (key: keyof typeof MESSAGES.AUTH) => MESSAGES.AUTH[key],
  room: (key: keyof typeof MESSAGES.ROOM) => MESSAGES.ROOM[key],
  agenda: (key: keyof typeof MESSAGES.AGENDA) => MESSAGES.AGENDA[key],
  argument: (key: keyof typeof MESSAGES.ARGUMENT) => MESSAGES.ARGUMENT[key],
  debate: (key: keyof typeof MESSAGES.DEBATE) => MESSAGES.DEBATE[key],
  verdict: (key: keyof typeof MESSAGES.VERDICT) => MESSAGES.VERDICT[key],
  status: (key: keyof typeof MESSAGES.STATUS) => MESSAGES.STATUS[key],
  error: (key: keyof typeof MESSAGES.ERROR) => MESSAGES.ERROR[key],
  notification: (key: keyof typeof MESSAGES.NOTIFICATION) => MESSAGES.NOTIFICATION[key],
  help: (key: keyof typeof MESSAGES.HELP) => MESSAGES.HELP[key],
  time: (key: keyof typeof MESSAGES.TIME) => MESSAGES.TIME[key]
};
