import { z } from 'zod';

// 토론 세션 상태 enum
export enum DebateSessionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// 변호사 타입 enum
export enum LawyerType {
  LAWYER_A = 'lawyer_a',
  LAWYER_B = 'lawyer_b'
}

// 측면 enum
export enum Side {
  A = 'A',
  B = 'B'
}

// 변호사 응답 스키마 (LLM 응답과 일치)
export const LawyerResponseSchema = z.object({
  statement: z.string()
    .min(50, '발언 내용은 최소 50자 이상이어야 합니다')
    .max(2000, '발언 내용은 최대 2000자를 초과할 수 없습니다'),
  key_points: z.array(z.string().min(5).max(200))
    .min(2, '핵심 포인트는 최소 2개 이상이어야 합니다')
    .max(5, '핵심 포인트는 최대 5개까지 허용됩니다'),
  counter_arguments: z.array(z.string().min(5).max(300))
    .min(1, '반박 포인트는 최소 1개 이상이어야 합니다')
    .max(3, '반박 포인트는 최대 3개까지 허용됩니다'),
  evidence_references: z.array(z.string().min(3).max(200))
    .max(5, '증거 참조는 최대 5개까지 허용됩니다')
});

// 토론 턴 스키마
export const DebateTurnSchema = z.object({
  id: z.string().uuid('유효하지 않은 토론 턴 ID 형식입니다'),
  round_id: z.string().uuid('유효하지 않은 라운드 ID 형식입니다'),
  turn_number: z.number().int().min(1),
  side: z.nativeEnum(Side),
  lawyer_type: z.nativeEnum(LawyerType),
  content: LawyerResponseSchema,
  status: z.nativeEnum(DebateSessionStatus),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime('유효하지 않은 생성일 형식입니다')
});

// 라운드 스키마
export const RoundSchema = z.object({
  id: z.string().uuid('유효하지 않은 라운드 ID 형식입니다'),
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  round_number: z.number().int().min(1).max(3),
  round_type: z.enum(['first', 'second', 'final']),
  status: z.nativeEnum(DebateSessionStatus),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime('유효하지 않은 생성일 형식입니다')
});

// 토론 세션 스키마 (라운드 + 턴들)
export const DebateSessionSchema = z.object({
  round: RoundSchema,
  turns: z.array(DebateTurnSchema),
  lawyer_a_response: LawyerResponseSchema.nullable(),
  lawyer_b_response: LawyerResponseSchema.nullable(),
  summary: z.object({
    total_turns: z.number().int().min(0),
    completed_turns: z.number().int().min(0),
    duration_seconds: z.number().min(0).nullable(),
    key_exchanges: z.array(z.string()).max(5)
  }).optional()
});

// 토론 세션 생성 스키마
export const CreateDebateSessionSchema = z.object({
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  round_number: z.number().int().min(1).max(3),
  round_type: z.enum(['first', 'second', 'final'])
});

// 타입 추출
export type DebateSession = z.infer<typeof DebateSessionSchema>;
export type Round = z.infer<typeof RoundSchema>;
export type DebateTurn = z.infer<typeof DebateTurnSchema>;
export type LawyerResponse = z.infer<typeof LawyerResponseSchema>;
export type CreateDebateSession = z.infer<typeof CreateDebateSessionSchema>;

// 라운드 타입 매핑
export const ROUND_TYPE_MAPPING = {
  1: 'first' as const,
  2: 'second' as const,
  3: 'final' as const
};

// 라운드별 설명
export const ROUND_DESCRIPTIONS = {
  first: {
    name: '1라운드 - 입장 표명',
    description: '각 측의 기본 입장과 핵심 논거를 제시합니다',
    expected_turns: 2, // A측, B측 각 1턴
    time_limit_minutes: 10
  },
  second: {
    name: '2라운드 - 반박 및 보강',
    description: '상대방 주장에 대한 반박과 자신의 논거를 보강합니다',
    expected_turns: 4, // A측, B측 각 2턴
    time_limit_minutes: 15
  },
  final: {
    name: '3라운드 - 최종 변론',
    description: '최종 입장 정리 및 강력한 마무리 발언을 합니다',
    expected_turns: 2, // A측, B측 각 1턴
    time_limit_minutes: 8
  }
} as const;

// 토론 세션 비즈니스 로직 클래스
export class DebateSessionModel {
  constructor(private data: DebateSession) {}

  // Getter 메서드들
  get round(): Round {
    return this.data.round;
  }

  get turns(): DebateTurn[] {
    return this.data.turns;
  }

  get lawyerAResponse(): LawyerResponse | null {
    return this.data.lawyer_a_response;
  }

  get lawyerBResponse(): LawyerResponse | null {
    return this.data.lawyer_b_response;
  }

  get summary() {
    return this.data.summary;
  }

  get roundId(): string {
    return this.data.round.id;
  }

  get roomId(): string {
    return this.data.round.room_id;
  }

  get roundNumber(): number {
    return this.data.round.round_number;
  }

  get roundType(): 'first' | 'second' | 'final' {
    return this.data.round.round_type;
  }

  get status(): DebateSessionStatus {
    return this.data.round.status;
  }

  get startedAt(): Date | null {
    return this.data.round.started_at ? new Date(this.data.round.started_at) : null;
  }

  get completedAt(): Date | null {
    return this.data.round.completed_at ? new Date(this.data.round.completed_at) : null;
  }

  get createdAt(): Date {
    return new Date(this.data.round.created_at);
  }

  // 상태 확인 메서드들
  isPending(): boolean {
    return this.data.round.status === DebateSessionStatus.PENDING;
  }

  isInProgress(): boolean {
    return this.data.round.status === DebateSessionStatus.IN_PROGRESS;
  }

  isCompleted(): boolean {
    return this.data.round.status === DebateSessionStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.data.round.status === DebateSessionStatus.FAILED;
  }

  // 응답 관련 메서드들
  hasLawyerAResponse(): boolean {
    return !!this.data.lawyer_a_response;
  }

  hasLawyerBResponse(): boolean {
    return !!this.data.lawyer_b_response;
  }

  hasBothResponses(): boolean {
    return this.hasLawyerAResponse() && this.hasLawyerBResponse();
  }

  canStart(): boolean {
    return this.isPending();
  }

  canComplete(): boolean {
    return this.isInProgress() && this.hasBothResponses();
  }

  // 턴 관련 메서드들
  getTotalTurns(): number {
    return this.data.turns.length;
  }

  getCompletedTurns(): number {
    return this.data.turns.filter(turn => turn.status === DebateSessionStatus.COMPLETED).length;
  }

  getExpectedTurns(): number {
    return ROUND_DESCRIPTIONS[this.data.round.round_type].expected_turns;
  }

  getTurnsBySide(side: Side): DebateTurn[] {
    return this.data.turns.filter(turn => turn.side === side);
  }

  getLatestTurn(): DebateTurn | null {
    if (this.data.turns.length === 0) return null;
    return this.data.turns[this.data.turns.length - 1];
  }

  getNextTurnNumber(): number {
    return this.data.turns.length + 1;
  }

  // 시간 관련 메서드들
  getDuration(): number | null {
    if (!this.data.round.started_at || !this.data.round.completed_at) return null;
    
    const start = new Date(this.data.round.started_at).getTime();
    const end = new Date(this.data.round.completed_at).getTime();
    
    return Math.floor((end - start) / 1000); // 초 단위
  }

  getTimeLimit(): number {
    return ROUND_DESCRIPTIONS[this.data.round.round_type].time_limit_minutes * 60; // 초 단위
  }

  isOvertime(): boolean {
    const duration = this.getDuration();
    if (duration === null) return false;
    
    return duration > this.getTimeLimit();
  }

  // 진행률 계산
  getProgress(): {
    percentage: number;
    completed: number;
    total: number;
    currentPhase: string;
  } {
    const completed = this.getCompletedTurns();
    const total = this.getExpectedTurns();
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    let currentPhase = '대기 중';
    if (this.isInProgress()) {
      if (completed === 0) {
        currentPhase = 'A측 발언 준비 중';
      } else if (completed === 1 && this.roundType === 'first') {
        currentPhase = 'B측 발언 준비 중';
      } else if (completed < total) {
        currentPhase = `${completed + 1}번째 턴 진행 중`;
      } else {
        currentPhase = '라운드 마무리 중';
      }
    } else if (this.isCompleted()) {
      currentPhase = '라운드 완료';
    } else if (this.isFailed()) {
      currentPhase = '라운드 실패';
    }

    return { percentage, completed, total, currentPhase };
  }

  // 라운드 정보
  getRoundInfo() {
    return ROUND_DESCRIPTIONS[this.data.round.round_type];
  }

  // 응답 품질 분석
  analyzeResponses(): {
    qualityScoreA: number;
    qualityScoreB: number;
    comparison: {
      lengthDifference: number;
      pointsDifference: number;
      counterArgsDifference: number;
      advantageSide: Side | 'tie';
    };
  } {
    const responseA = this.data.lawyer_a_response;
    const responseB = this.data.lawyer_b_response;

    if (!responseA || !responseB) {
      return {
        qualityScoreA: 0,
        qualityScoreB: 0,
        comparison: {
          lengthDifference: 0,
          pointsDifference: 0,
          counterArgsDifference: 0,
          advantageSide: 'tie'
        }
      };
    }

    // 품질 점수 계산 (간단한 휴리스틱)
    const calculateQuality = (response: LawyerResponse): number => {
      let score = 0;
      
      // 발언 길이 점수 (50-2000자 기준)
      const lengthScore = Math.min(100, Math.max(0, (response.statement.length - 50) / 19.5));
      score += lengthScore * 0.4;
      
      // 핵심 포인트 점수
      const pointsScore = Math.min(100, response.key_points.length * 20);
      score += pointsScore * 0.3;
      
      // 반박 포인트 점수
      const counterScore = Math.min(100, response.counter_arguments.length * 33.33);
      score += counterScore * 0.2;
      
      // 증거 참조 점수
      const evidenceScore = Math.min(100, response.evidence_references.length * 20);
      score += evidenceScore * 0.1;
      
      return Math.round(score);
    };

    const qualityScoreA = calculateQuality(responseA);
    const qualityScoreB = calculateQuality(responseB);

    const lengthDifference = responseA.statement.length - responseB.statement.length;
    const pointsDifference = responseA.key_points.length - responseB.key_points.length;
    const counterArgsDifference = responseA.counter_arguments.length - responseB.counter_arguments.length;

    // 전체적인 우세 판단
    let advantageSide: Side | 'tie' = 'tie';
    const scoreDifference = qualityScoreA - qualityScoreB;
    if (scoreDifference > 10) advantageSide = Side.A;
    else if (scoreDifference < -10) advantageSide = Side.B;

    return {
      qualityScoreA,
      qualityScoreB,
      comparison: {
        lengthDifference,
        pointsDifference,
        counterArgsDifference,
        advantageSide
      }
    };
  }

  // 상태 변경 메서드들
  start(): void {
    if (!this.canStart()) {
      throw new Error(`토론 세션을 시작할 수 없는 상태입니다: ${this.data.round.status}`);
    }
    
    this.data.round.status = DebateSessionStatus.IN_PROGRESS;
    this.data.round.started_at = new Date().toISOString();
  }

  complete(): void {
    if (!this.canComplete()) {
      throw new Error('토론 세션을 완료할 수 없습니다 (양측 응답 필요)');
    }
    
    this.data.round.status = DebateSessionStatus.COMPLETED;
    this.data.round.completed_at = new Date().toISOString();
    
    // 요약 정보 업데이트
    this.updateSummary();
  }

  fail(reason?: string): void {
    this.data.round.status = DebateSessionStatus.FAILED;
    this.data.round.completed_at = new Date().toISOString();
  }

  // 응답 설정
  setLawyerResponse(side: Side, response: LawyerResponse): void {
    if (side === Side.A) {
      this.data.lawyer_a_response = response;
    } else {
      this.data.lawyer_b_response = response;
    }
  }

  // 턴 추가
  addTurn(turn: DebateTurn): void {
    this.data.turns.push(turn);
  }

  // 요약 정보 업데이트
  private updateSummary(): void {
    const duration = this.getDuration();
    const keyExchanges: string[] = [];

    // 주요 교환 내용 추출 (간단한 휴리스틱)
    if (this.data.lawyer_a_response && this.data.lawyer_b_response) {
      // A측의 핵심 포인트 중 첫 번째
      if (this.data.lawyer_a_response.key_points.length > 0) {
        keyExchanges.push(`A측: ${this.data.lawyer_a_response.key_points[0]}`);
      }
      
      // B측의 핵심 포인트 중 첫 번째
      if (this.data.lawyer_b_response.key_points.length > 0) {
        keyExchanges.push(`B측: ${this.data.lawyer_b_response.key_points[0]}`);
      }
    }

    this.data.summary = {
      total_turns: this.getTotalTurns(),
      completed_turns: this.getCompletedTurns(),
      duration_seconds: duration,
      key_exchanges: keyExchanges
    };
  }

  // 검증 메서드들
  static validate(data: unknown): { success: true; data: DebateSession } | { success: false; error: string } {
    try {
      const validatedData = DebateSessionSchema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        return { 
          success: false, 
          error: `${firstError.path.join('.')}: ${firstError.message}` 
        };
      }
      return { success: false, error: '알 수 없는 검증 오류' };
    }
  }

  static validateCreate(data: unknown): { success: true; data: CreateDebateSession } | { success: false; error: string } {
    try {
      const validatedData = CreateDebateSessionSchema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        return { 
          success: false, 
          error: `${firstError.path.join('.')}: ${firstError.message}` 
        };
      }
      return { success: false, error: '알 수 없는 검증 오류' };
    }
  }

  // 팩토리 메서드
  static fromData(data: DebateSession): DebateSessionModel {
    return new DebateSessionModel(data);
  }

  static createNew(createData: CreateDebateSession): DebateSession {
    const now = new Date().toISOString();
    
    const round: Round = {
      id: crypto.randomUUID(),
      room_id: createData.room_id,
      round_number: createData.round_number,
      round_type: createData.round_type,
      status: DebateSessionStatus.PENDING,
      started_at: null,
      completed_at: null,
      created_at: now
    };

    return {
      round,
      turns: [],
      lawyer_a_response: null,
      lawyer_b_response: null,
      summary: undefined
    };
  }

  // JSON 직렬화
  toJSON(): DebateSession {
    return { ...this.data };
  }

  // 요약 정보 반환
  getSummary() {
    const progress = this.getProgress();
    const analysis = this.analyzeResponses();
    
    return {
      roundId: this.data.round.id,
      roundNumber: this.data.round.round_number,
      roundType: this.data.round.round_type,
      status: this.data.round.status,
      progress,
      duration: this.getDuration(),
      isOvertime: this.isOvertime(),
      qualityScores: {
        A: analysis.qualityScoreA,
        B: analysis.qualityScoreB
      },
      advantageSide: analysis.comparison.advantageSide,
      hasBothResponses: this.hasBothResponses(),
      created_at: this.data.round.created_at
    };
  }

  // 문자열 표현
  toString(): string {
    return `DebateSession(${this.data.round.id}, Round ${this.data.round.round_number}, ${this.data.round.status})`;
  }
}

// 토론 세션 유틸리티 함수들
export const DebateSessionUtils = {
  // 세션 정렬 함수
  sortSessions(sessions: DebateSession[], sortBy: 'round' | 'created' | 'duration' | 'quality' = 'round'): DebateSession[] {
    return [...sessions].sort((a, b) => {
      switch (sortBy) {
        case 'round':
          return a.round.round_number - b.round.round_number;
        case 'created':
          return new Date(b.round.created_at).getTime() - new Date(a.round.created_at).getTime();
        case 'duration':
          const durationA = new DebateSessionModel(a).getDuration() || 0;
          const durationB = new DebateSessionModel(b).getDuration() || 0;
          return durationB - durationA;
        case 'quality':
          const qualityA = new DebateSessionModel(a).analyzeResponses().qualityScoreA;
          const qualityB = new DebateSessionModel(b).analyzeResponses().qualityScoreA;
          return qualityB - qualityA;
        default:
          return 0;
      }
    });
  },

  // 세션 필터링
  filterSessions(sessions: DebateSession[], filters: {
    status?: DebateSessionStatus[];
    roundType?: ('first' | 'second' | 'final')[];
    roomId?: string;
    hasResponses?: boolean;
    isOvertime?: boolean;
  }): DebateSession[] {
    return sessions.filter(session => {
      if (filters.status && !filters.status.includes(session.round.status)) {
        return false;
      }

      if (filters.roundType && !filters.roundType.includes(session.round.round_type)) {
        return false;
      }

      if (filters.roomId && session.round.room_id !== filters.roomId) {
        return false;
      }

      if (filters.hasResponses !== undefined) {
        const sessionModel = new DebateSessionModel(session);
        if (sessionModel.hasBothResponses() !== filters.hasResponses) {
          return false;
        }
      }

      if (filters.isOvertime !== undefined) {
        const sessionModel = new DebateSessionModel(session);
        if (sessionModel.isOvertime() !== filters.isOvertime) {
          return false;
        }
      }

      return true;
    });
  },

  // 토론 통계
  getDebateStats(sessions: DebateSession[]): {
    total: number;
    byStatus: Record<DebateSessionStatus, number>;
    byRoundType: Record<'first' | 'second' | 'final', number>;
    averageDuration: number; // 초 단위
    completionRate: number; // 백분율
    overtimeRate: number; // 백분율
    averageQualityScore: number;
  } {
    const byStatus = Object.values(DebateSessionStatus).reduce((acc, status) => {
      acc[status] = sessions.filter(s => s.round.status === status).length;
      return acc;
    }, {} as Record<DebateSessionStatus, number>);

    const byRoundType = {
      first: sessions.filter(s => s.round.round_type === 'first').length,
      second: sessions.filter(s => s.round.round_type === 'second').length,
      final: sessions.filter(s => s.round.round_type === 'final').length
    };

    const completedSessions = sessions.filter(s => s.round.status === DebateSessionStatus.COMPLETED);
    
    const totalDuration = completedSessions.reduce((sum, session) => {
      const model = new DebateSessionModel(session);
      return sum + (model.getDuration() || 0);
    }, 0);

    const overtimeSessions = completedSessions.filter(session => {
      const model = new DebateSessionModel(session);
      return model.isOvertime();
    });

    const totalQualityScore = sessions.reduce((sum, session) => {
      const analysis = new DebateSessionModel(session).analyzeResponses();
      return sum + ((analysis.qualityScoreA + analysis.qualityScoreB) / 2);
    }, 0);

    return {
      total: sessions.length,
      byStatus,
      byRoundType,
      averageDuration: completedSessions.length > 0 ? totalDuration / completedSessions.length : 0,
      completionRate: sessions.length > 0 ? Math.round((byStatus[DebateSessionStatus.COMPLETED] / sessions.length) * 100) : 0,
      overtimeRate: completedSessions.length > 0 ? Math.round((overtimeSessions.length / completedSessions.length) * 100) : 0,
      averageQualityScore: sessions.length > 0 ? Math.round(totalQualityScore / sessions.length) : 0
    };
  },

  // 라운드별 분석
  analyzeByRounds(sessions: DebateSession[]): {
    first: { count: number; avgDuration: number; avgQuality: number };
    second: { count: number; avgDuration: number; avgQuality: number };
    final: { count: number; avgDuration: number; avgQuality: number };
  } {
    const analyzeRoundType = (roundType: 'first' | 'second' | 'final') => {
      const roundSessions = sessions.filter(s => s.round.round_type === roundType);
      
      const totalDuration = roundSessions.reduce((sum, session) => {
        const model = new DebateSessionModel(session);
        return sum + (model.getDuration() || 0);
      }, 0);

      const totalQuality = roundSessions.reduce((sum, session) => {
        const analysis = new DebateSessionModel(session).analyzeResponses();
        return sum + ((analysis.qualityScoreA + analysis.qualityScoreB) / 2);
      }, 0);

      return {
        count: roundSessions.length,
        avgDuration: roundSessions.length > 0 ? totalDuration / roundSessions.length : 0,
        avgQuality: roundSessions.length > 0 ? totalQuality / roundSessions.length : 0
      };
    };

    return {
      first: analyzeRoundType('first'),
      second: analyzeRoundType('second'),
      final: analyzeRoundType('final')
    };
  }
};

// 상수 정의
export const DEBATE_SESSION_CONSTANTS = {
  MAX_ROUNDS: 3,
  MIN_STATEMENT_LENGTH: 50,
  MAX_STATEMENT_LENGTH: 2000,
  MIN_KEY_POINTS: 2,
  MAX_KEY_POINTS: 5,
  MIN_COUNTER_ARGUMENTS: 1,
  MAX_COUNTER_ARGUMENTS: 3,
  MAX_EVIDENCE_REFERENCES: 5,
  ROUND_TIME_LIMITS: {
    first: 10 * 60, // 10분
    second: 15 * 60, // 15분
    final: 8 * 60 // 8분
  },
  QUALITY_SCORE_WEIGHTS: {
    statement: 0.4,
    key_points: 0.3,
    counter_arguments: 0.2,
    evidence_references: 0.1
  }
} as const;
