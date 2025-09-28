import { z } from 'zod';

// 승부 결과 enum
export enum Winner {
  A = 'A',
  B = 'B',
  DRAW = 'draw'
}

// 판사 결정 타입 enum
export enum JudgeDecisionType {
  ROUND_SUMMARY = 'round_summary',
  INTERIM_RULING = 'interim_ruling',
  FINAL_VERDICT = 'final_verdict'
}

// 배심원 투표 스키마
export const JuryVoteSchema = z.object({
  id: z.string().uuid('유효하지 않은 배심원 투표 ID 형식입니다'),
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  juror_number: z.number().int().min(1).max(7),
  vote: z.nativeEnum(Winner).refine(val => val !== Winner.DRAW, {
    message: '배심원은 무승부에 투표할 수 없습니다'
  }),
  reasoning: z.string()
    .min(50, '투표 이유는 최소 50자 이상이어야 합니다')
    .max(300, '투표 이유는 최대 300자까지 허용됩니다'),
  confidence: z.number().int().min(1).max(10),
  created_at: z.string().datetime('유효하지 않은 생성일 형식입니다')
});

// 배심원 프로필 스키마
export const JurorProfileSchema = z.object({
  id: z.string().uuid('유효하지 않은 배심원 프로필 ID 형식입니다'),
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  juror_number: z.number().int().min(1).max(7),
  profile: z.object({
    background: z.string().max(200),
    expertise: z.array(z.string()).max(5),
    bias_tendency: z.enum(['neutral', 'slight_a', 'slight_b']),
    decision_style: z.enum(['logical', 'emotional', 'balanced'])
  }),
  created_at: z.string().datetime('유효하지 않은 생성일 형식입니다')
});

// 판사 결정 스키마 (LLM 응답과 일치)
export const JudgeDecisionSchema = z.object({
  id: z.string().uuid('유효하지 않은 판사 결정 ID 형식입니다'),
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  round_id: z.string().uuid().nullable(),
  decision_type: z.nativeEnum(JudgeDecisionType),
  content: z.object({
    summary: z.string()
      .min(100, '판결 요약은 최소 100자 이상이어야 합니다')
      .max(500, '판결 요약은 최대 500자를 초과할 수 없습니다'),
    analysis_a: z.string()
      .min(100, 'A측 분석은 최소 100자 이상이어야 합니다')
      .max(1000, 'A측 분석은 최대 1000자를 초과할 수 없습니다'),
    analysis_b: z.string()
      .min(100, 'B측 분석은 최소 100자 이상이어야 합니다')
      .max(1000, 'B측 분석은 최대 1000자를 초과할 수 없습니다'),
    strengths_a: z.array(z.string().min(10).max(200))
      .min(2, 'A측 강점은 최소 2개 이상이어야 합니다')
      .max(5, 'A측 강점은 최대 5개까지 허용됩니다'),
    weaknesses_a: z.array(z.string().min(10).max(200))
      .min(1, 'A측 약점은 최소 1개 이상이어야 합니다')
      .max(3, 'A측 약점은 최대 3개까지 허용됩니다'),
    strengths_b: z.array(z.string().min(10).max(200))
      .min(2, 'B측 강점은 최소 2개 이상이어야 합니다')
      .max(5, 'B측 강점은 최대 5개까지 허용됩니다'),
    weaknesses_b: z.array(z.string().min(10).max(200))
      .min(1, 'B측 약점은 최소 1개 이상이어야 합니다')
      .max(3, 'B측 약점은 최대 3개까지 허용됩니다'),
    reasoning: z.string()
      .min(200, '판결 근거는 최소 200자 이상이어야 합니다')
      .max(1000, '판결 근거는 최대 1000자를 초과할 수 없습니다'),
    score_a: z.number().int().min(0).max(100),
    score_b: z.number().int().min(0).max(100)
  }),
  reasoning: z.string()
    .min(100, '판사 판단 근거는 최소 100자 이상이어야 합니다')
    .max(2000, '판사 판단 근거는 최대 2000자까지 허용됩니다'),
  created_at: z.string().datetime('유효하지 않은 생성일 형식입니다')
});

// 최종 판결 스키마
export const VerdictSchema = z.object({
  id: z.string().uuid('유효하지 않은 판결 ID 형식입니다'),
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  winner: z.nativeEnum(Winner),
  reasoning: z.string()
    .min(200, '판결 근거는 최소 200자 이상이어야 합니다')
    .max(2000, '판결 근거는 최대 2000자까지 허용됩니다'),
  strengths_a: z.string()
    .min(100, 'A측 강점 분석은 최소 100자 이상이어야 합니다')
    .max(1000, 'A측 강점 분석은 최대 1000자까지 허용됩니다'),
  weaknesses_a: z.string()
    .min(50, 'A측 약점 분석은 최소 50자 이상이어야 합니다')
    .max(1000, 'A측 약점 분석은 최대 1000자까지 허용됩니다'),
  strengths_b: z.string()
    .min(100, 'B측 강점 분석은 최소 100자 이상이어야 합니다')
    .max(1000, 'B측 강점 분석은 최대 1000자까지 허용됩니다'),
  weaknesses_b: z.string()
    .min(50, 'B측 약점 분석은 최소 50자 이상이어야 합니다')
    .max(1000, 'B측 약점 분석은 최대 1000자까지 허용됩니다'),
  overall_quality: z.number().int().min(1).max(10),
  jury_summary: z.object({
    votes_a: z.number().int().min(0).max(7),
    votes_b: z.number().int().min(0).max(7),
    average_confidence: z.number().min(1).max(10)
  }),
  generated_at: z.string().datetime('유효하지 않은 생성일 형식입니다'),
  created_at: z.string().datetime('유효하지 않은 생성일 형식입니다')
});

// 최종 보고서 스키마 (모든 정보 통합)
export const FinalReportSchema = z.object({
  verdict: VerdictSchema,
  judge_decisions: z.array(JudgeDecisionSchema),
  jury_votes: z.array(JuryVoteSchema),
  juror_profiles: z.array(JurorProfileSchema),
  statistics: z.object({
    total_debate_duration: z.number().min(0), // 초 단위
    rounds_completed: z.number().int().min(0).max(3),
    judge_score_difference: z.number(),
    jury_consensus_strength: z.number().min(0).max(1), // 0-1 사이
    overall_engagement_score: z.number().min(0).max(100)
  })
});

// 타입 추출
export type Verdict = z.infer<typeof VerdictSchema>;
export type JuryVote = z.infer<typeof JuryVoteSchema>;
export type JurorProfile = z.infer<typeof JurorProfileSchema>;
export type JudgeDecision = z.infer<typeof JudgeDecisionSchema>;
export type FinalReport = z.infer<typeof FinalReportSchema>;

// 판결 비즈니스 로직 클래스
export class VerdictModel {
  constructor(private data: Verdict) {}

  // Getter 메서드들
  get id(): string {
    return this.data.id;
  }

  get roomId(): string {
    return this.data.room_id;
  }

  get winner(): Winner {
    return this.data.winner;
  }

  get reasoning(): string {
    return this.data.reasoning;
  }

  get strengthsA(): string {
    return this.data.strengths_a;
  }

  get weaknessesA(): string {
    return this.data.weaknesses_a;
  }

  get strengthsB(): string {
    return this.data.strengths_b;
  }

  get weaknessesB(): string {
    return this.data.weaknesses_b;
  }

  get overallQuality(): number {
    return this.data.overall_quality;
  }

  get jurySummary() {
    return this.data.jury_summary;
  }

  get generatedAt(): Date {
    return new Date(this.data.generated_at);
  }

  get createdAt(): Date {
    return new Date(this.data.created_at);
  }

  // 승부 결과 확인
  isWinnerA(): boolean {
    return this.data.winner === Winner.A;
  }

  isWinnerB(): boolean {
    return this.data.winner === Winner.B;
  }

  isDraw(): boolean {
    return this.data.winner === Winner.DRAW;
  }

  // 배심원 투표 분석
  getJuryVoteMargin(): number {
    return Math.abs(this.data.jury_summary.votes_a - this.data.jury_summary.votes_b);
  }

  getJuryConsensusStrength(): number {
    const totalVotes = this.data.jury_summary.votes_a + this.data.jury_summary.votes_b;
    if (totalVotes === 0) return 0;
    
    const majorityVotes = Math.max(this.data.jury_summary.votes_a, this.data.jury_summary.votes_b);
    return majorityVotes / totalVotes;
  }

  isCloseDecision(): boolean {
    return this.getJuryVoteMargin() <= 1; // 1표 차이 이하
  }

  isUnanimous(): boolean {
    return this.getJuryVoteMargin() === 7; // 7-0
  }

  // 품질 평가
  getQualityGrade(): 'S' | 'A' | 'B' | 'C' | 'D' {
    const quality = this.data.overall_quality;
    if (quality >= 9) return 'S';
    if (quality >= 8) return 'A';
    if (quality >= 6) return 'B';
    if (quality >= 4) return 'C';
    return 'D';
  }

  isHighQuality(): boolean {
    return this.data.overall_quality >= 8;
  }

  // 신뢰도 평가
  getCredibilityScore(): number {
    let score = 0;
    
    // 배심원 확신도 (40%)
    const confidenceScore = (this.data.jury_summary.average_confidence / 10) * 40;
    score += confidenceScore;
    
    // 전체 품질 (30%)
    const qualityScore = (this.data.overall_quality / 10) * 30;
    score += qualityScore;
    
    // 합의 강도 (20%)
    const consensusScore = this.getJuryConsensusStrength() * 20;
    score += consensusScore;
    
    // 투표 참여도 (10%)
    const totalVotes = this.data.jury_summary.votes_a + this.data.jury_summary.votes_b;
    const participationScore = (totalVotes / 7) * 10;
    score += participationScore;
    
    return Math.round(score);
  }

  // 검증 메서드들
  static validate(data: unknown): { success: true; data: Verdict } | { success: false; error: string } {
    try {
      const validatedData = VerdictSchema.parse(data);
      
      // 추가 비즈니스 로직 검증
      const totalVotes = validatedData.jury_summary.votes_a + validatedData.jury_summary.votes_b;
      if (totalVotes > 7) {
        return { success: false, error: '배심원 투표 수가 7을 초과할 수 없습니다' };
      }
      
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

  static validateJuryVote(data: unknown): { success: true; data: JuryVote } | { success: false; error: string } {
    try {
      const validatedData = JuryVoteSchema.parse(data);
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

  static validateJudgeDecision(data: unknown): { success: true; data: JudgeDecision } | { success: false; error: string } {
    try {
      const validatedData = JudgeDecisionSchema.parse(data);
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
  static fromData(data: Verdict): VerdictModel {
    return new VerdictModel(data);
  }

  static createFromJudgeAndJury(
    roomId: string,
    judgeDecision: JudgeDecision,
    juryVotes: JuryVote[]
  ): Verdict {
    const now = new Date().toISOString();
    
    // 배심원 투표 집계
    const votesA = juryVotes.filter(vote => vote.vote === Winner.A).length;
    const votesB = juryVotes.filter(vote => vote.vote === Winner.B).length;
    
    // 승자 결정
    let winner: Winner;
    if (votesA > votesB) {
      winner = Winner.A;
    } else if (votesB > votesA) {
      winner = Winner.B;
    } else {
      // 동점인 경우 판사 점수로 결정
      const judgeContent = judgeDecision.content;
      if (judgeContent.score_a > judgeContent.score_b) {
        winner = Winner.A;
      } else if (judgeContent.score_b > judgeContent.score_a) {
        winner = Winner.B;
      } else {
        winner = Winner.DRAW;
      }
    }
    
    // 평균 확신도 계산
    const averageConfidence = juryVotes.length > 0
      ? juryVotes.reduce((sum, vote) => sum + vote.confidence, 0) / juryVotes.length
      : 5;
    
    // 전체 품질 점수 계산 (판사 점수와 배심원 확신도 조합)
    const judgeAvgScore = (judgeDecision.content.score_a + judgeDecision.content.score_b) / 2;
    const overallQuality = Math.round((judgeAvgScore / 10) + (averageConfidence / 10) * 10) / 2;
    
    return {
      id: crypto.randomUUID(),
      room_id: roomId,
      winner,
      reasoning: judgeDecision.content.reasoning,
      strengths_a: judgeDecision.content.strengths_a.join('. '),
      weaknesses_a: judgeDecision.content.weaknesses_a.join('. '),
      strengths_b: judgeDecision.content.strengths_b.join('. '),
      weaknesses_b: judgeDecision.content.weaknesses_b.join('. '),
      overall_quality: Math.min(10, Math.max(1, Math.round(overallQuality))),
      jury_summary: {
        votes_a: votesA,
        votes_b: votesB,
        average_confidence: Math.round(averageConfidence * 10) / 10
      },
      generated_at: now,
      created_at: now
    };
  }

  // JSON 직렬화
  toJSON(): Verdict {
    return { ...this.data };
  }

  // 요약 정보 반환
  getSummary() {
    return {
      id: this.data.id,
      winner: this.data.winner,
      quality: this.getQualityGrade(),
      credibility: this.getCredibilityScore(),
      juryMargin: this.getJuryVoteMargin(),
      isClose: this.isCloseDecision(),
      isUnanimous: this.isUnanimous(),
      averageConfidence: this.data.jury_summary.average_confidence,
      generated_at: this.data.generated_at
    };
  }

  // 문자열 표현
  toString(): string {
    return `Verdict(${this.data.id}, Winner: ${this.data.winner}, Quality: ${this.getQualityGrade()})`;
  }
}

// 최종 보고서 비즈니스 로직 클래스
export class FinalReportModel {
  constructor(private data: FinalReport) {}

  get verdict(): VerdictModel {
    return new VerdictModel(this.data.verdict);
  }

  get judgeDecisions(): JudgeDecision[] {
    return this.data.judge_decisions;
  }

  get juryVotes(): JuryVote[] {
    return this.data.jury_votes;
  }

  get jurorProfiles(): JurorProfile[] {
    return this.data.juror_profiles;
  }

  get statistics() {
    return this.data.statistics;
  }

  // 종합 분석
  getComprehensiveAnalysis(): {
    debateQuality: 'excellent' | 'good' | 'fair' | 'poor';
    decisionReliability: 'high' | 'medium' | 'low';
    participationLevel: 'full' | 'partial' | 'minimal';
    consensusLevel: 'strong' | 'moderate' | 'weak';
    highlights: string[];
    concerns: string[];
  } {
    const verdict = this.verdict;
    const stats = this.data.statistics;
    
    // 토론 품질 평가
    let debateQuality: 'excellent' | 'good' | 'fair' | 'poor';
    if (stats.overall_engagement_score >= 85) debateQuality = 'excellent';
    else if (stats.overall_engagement_score >= 70) debateQuality = 'good';
    else if (stats.overall_engagement_score >= 50) debateQuality = 'fair';
    else debateQuality = 'poor';
    
    // 결정 신뢰도
    const credibility = verdict.getCredibilityScore();
    let decisionReliability: 'high' | 'medium' | 'low';
    if (credibility >= 80) decisionReliability = 'high';
    else if (credibility >= 60) decisionReliability = 'medium';
    else decisionReliability = 'low';
    
    // 참여도
    const totalVotes = verdict.jurySummary.votes_a + verdict.jurySummary.votes_b;
    let participationLevel: 'full' | 'partial' | 'minimal';
    if (totalVotes === 7) participationLevel = 'full';
    else if (totalVotes >= 5) participationLevel = 'partial';
    else participationLevel = 'minimal';
    
    // 합의 수준
    const consensusStrength = verdict.getJuryConsensusStrength();
    let consensusLevel: 'strong' | 'moderate' | 'weak';
    if (consensusStrength >= 0.8) consensusLevel = 'strong';
    else if (consensusStrength >= 0.6) consensusLevel = 'moderate';
    else consensusLevel = 'weak';
    
    // 하이라이트 및 우려사항
    const highlights: string[] = [];
    const concerns: string[] = [];
    
    if (verdict.isHighQuality()) {
      highlights.push('높은 품질의 토론이 진행되었습니다');
    }
    
    if (verdict.isUnanimous()) {
      highlights.push('배심원들의 만장일치 결정이었습니다');
    }
    
    if (stats.rounds_completed === 3) {
      highlights.push('모든 라운드가 성공적으로 완료되었습니다');
    }
    
    if (verdict.isCloseDecision()) {
      concerns.push('매우 근소한 차이의 결정이었습니다');
    }
    
    if (participationLevel !== 'full') {
      concerns.push('일부 배심원의 투표가 누락되었습니다');
    }
    
    if (credibility < 70) {
      concerns.push('결정의 신뢰도가 다소 낮습니다');
    }
    
    return {
      debateQuality,
      decisionReliability,
      participationLevel,
      consensusLevel,
      highlights,
      concerns
    };
  }

  // 팩토리 메서드
  static fromData(data: FinalReport): FinalReportModel {
    return new FinalReportModel(data);
  }
}

// 판결 유틸리티 함수들
export const VerdictUtils = {
  // 판결 정렬 함수
  sortVerdicts(verdicts: Verdict[], sortBy: 'created' | 'quality' | 'credibility' | 'margin' = 'created'): Verdict[] {
    return [...verdicts].sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'quality':
          return b.overall_quality - a.overall_quality;
        case 'credibility':
          const credibilityA = new VerdictModel(a).getCredibilityScore();
          const credibilityB = new VerdictModel(b).getCredibilityScore();
          return credibilityB - credibilityA;
        case 'margin':
          const marginA = new VerdictModel(a).getJuryVoteMargin();
          const marginB = new VerdictModel(b).getJuryVoteMargin();
          return marginB - marginA; // 큰 차이부터
        default:
          return 0;
      }
    });
  },

  // 판결 필터링
  filterVerdicts(verdicts: Verdict[], filters: {
    winner?: Winner[];
    minQuality?: number;
    minCredibility?: number;
    isClose?: boolean;
    isUnanimous?: boolean;
  }): Verdict[] {
    return verdicts.filter(verdict => {
      if (filters.winner && !filters.winner.includes(verdict.winner)) {
        return false;
      }

      if (filters.minQuality && verdict.overall_quality < filters.minQuality) {
        return false;
      }

      if (filters.minCredibility) {
        const credibility = new VerdictModel(verdict).getCredibilityScore();
        if (credibility < filters.minCredibility) {
          return false;
        }
      }

      if (filters.isClose !== undefined) {
        const isClose = new VerdictModel(verdict).isCloseDecision();
        if (isClose !== filters.isClose) {
          return false;
        }
      }

      if (filters.isUnanimous !== undefined) {
        const isUnanimous = new VerdictModel(verdict).isUnanimous();
        if (isUnanimous !== filters.isUnanimous) {
          return false;
        }
      }

      return true;
    });
  },

  // 판결 통계
  getVerdictStats(verdicts: Verdict[]): {
    total: number;
    byWinner: Record<Winner, number>;
    averageQuality: number;
    averageCredibility: number;
    closeDecisions: number;
    unanimousDecisions: number;
    highQualityRate: number; // 백분율
  } {
    const byWinner = Object.values(Winner).reduce((acc, winner) => {
      acc[winner] = verdicts.filter(v => v.winner === winner).length;
      return acc;
    }, {} as Record<Winner, number>);

    const totalQuality = verdicts.reduce((sum, verdict) => sum + verdict.overall_quality, 0);
    
    const totalCredibility = verdicts.reduce((sum, verdict) => {
      return sum + new VerdictModel(verdict).getCredibilityScore();
    }, 0);

    const closeDecisions = verdicts.filter(verdict => 
      new VerdictModel(verdict).isCloseDecision()
    ).length;

    const unanimousDecisions = verdicts.filter(verdict => 
      new VerdictModel(verdict).isUnanimous()
    ).length;

    const highQualityDecisions = verdicts.filter(verdict => 
      new VerdictModel(verdict).isHighQuality()
    ).length;

    return {
      total: verdicts.length,
      byWinner,
      averageQuality: verdicts.length > 0 ? Math.round((totalQuality / verdicts.length) * 10) / 10 : 0,
      averageCredibility: verdicts.length > 0 ? Math.round(totalCredibility / verdicts.length) : 0,
      closeDecisions,
      unanimousDecisions,
      highQualityRate: verdicts.length > 0 ? Math.round((highQualityDecisions / verdicts.length) * 100) : 0
    };
  },

  // 배심원 투표 분석
  analyzeJuryVoting(juryVotes: JuryVote[]): {
    totalVotes: number;
    byChoice: Record<Winner, number>;
    averageConfidence: number;
    confidenceDistribution: { low: number; medium: number; high: number };
    mostConfidentVote: JuryVote | null;
    leastConfidentVote: JuryVote | null;
  } {
    const byChoice = {
      [Winner.A]: juryVotes.filter(v => v.vote === Winner.A).length,
      [Winner.B]: juryVotes.filter(v => v.vote === Winner.B).length,
      [Winner.DRAW]: 0 // 배심원은 무승부 투표 불가
    };

    const totalConfidence = juryVotes.reduce((sum, vote) => sum + vote.confidence, 0);
    const averageConfidence = juryVotes.length > 0 ? totalConfidence / juryVotes.length : 0;

    const confidenceDistribution = {
      low: juryVotes.filter(v => v.confidence <= 3).length,
      medium: juryVotes.filter(v => v.confidence >= 4 && v.confidence <= 7).length,
      high: juryVotes.filter(v => v.confidence >= 8).length
    };

    const sortedByConfidence = [...juryVotes].sort((a, b) => b.confidence - a.confidence);
    const mostConfidentVote = sortedByConfidence[0] || null;
    const leastConfidentVote = sortedByConfidence[sortedByConfidence.length - 1] || null;

    return {
      totalVotes: juryVotes.length,
      byChoice,
      averageConfidence: Math.round(averageConfidence * 10) / 10,
      confidenceDistribution,
      mostConfidentVote,
      leastConfidentVote
    };
  }
};

// 상수 정의
export const VERDICT_CONSTANTS = {
  MAX_JURORS: 7,
  MIN_REASONING_LENGTH: 200,
  MAX_REASONING_LENGTH: 2000,
  MIN_ANALYSIS_LENGTH: 100,
  MAX_ANALYSIS_LENGTH: 1000,
  MIN_VOTE_REASONING_LENGTH: 50,
  MAX_VOTE_REASONING_LENGTH: 300,
  MIN_CONFIDENCE: 1,
  MAX_CONFIDENCE: 10,
  MIN_QUALITY_SCORE: 1,
  MAX_QUALITY_SCORE: 10,
  HIGH_QUALITY_THRESHOLD: 8,
  HIGH_CREDIBILITY_THRESHOLD: 80,
  CLOSE_DECISION_MARGIN: 1,
  QUALITY_GRADES: {
    S: { min: 9, name: '최우수' },
    A: { min: 8, name: '우수' },
    B: { min: 6, name: '양호' },
    C: { min: 4, name: '보통' },
    D: { min: 1, name: '미흡' }
  }
} as const;
