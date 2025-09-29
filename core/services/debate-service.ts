import { getSupabaseClient } from '@/data/supabase/client';
import { 
  DebateSession, 
  DebateSessionModel
} from '@/core/models/debate-session';

// 인라인 타입 정의
interface DebateRound {
  id: string;
  roundNumber: number;
  turns: DebateTurn[];
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

interface DebateTurn {
  id: string;
  turnNumber: number;
  side: 'A' | 'B';
  lawyerType: 'lawyer_a' | 'lawyer_b';
  statement: string;
  keyPoints: string[];
  counterArguments: string[];
  evidenceReferences: string[];
  createdAt: string;
}
import { 
  Verdict, 
  VerdictModel,
  JudgeDecision,
  JuryVote 
} from '@/core/models/verdict';
import { Room, RoomStatus } from '@/core/models/room';
import { Argument } from '@/core/models/argument';
import { Job, JobType, JobStatus } from '@/core/models/job';

export interface StartDebateOptions {
  roomId: string;
  userId: string;
  config?: {
    maxRounds?: number;
    timeLimit?: number;
    jurySize?: number;
  };
}

export interface DebateProgress {
  session: DebateSession;
  currentRound?: DebateRound;
  currentTurn?: DebateTurn;
  verdict?: Verdict;
  progress: {
    totalRounds: number;
    completedRounds: number;
    currentRoundNumber: number;
    turnsInCurrentRound: number;
    isComplete: boolean;
  };
}

export class DebateService {
  private supabase = getSupabaseClient(true); // service role

  /**
   * AI 토론을 시작합니다.
   */
  async startDebate(options: StartDebateOptions): Promise<{
    session: DebateSession;
    job: Job;
  }> {
    // 방 상태 확인
    const { data: roomData, error: roomError } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('id', options.roomId)
      .single();

    if (roomError || !roomData) {
      throw new Error('방을 찾을 수 없습니다');
    }

    if (roomData.status !== RoomStatus.ARGUMENTS_SUBMISSION) {
      throw new Error('주장 제출 단계에서만 토론을 시작할 수 있습니다');
    }

    // 권한 확인 (생성자만 토론 시작 가능)
    if (roomData.creator_id !== options.userId) {
      throw new Error('방 생성자만 토론을 시작할 수 있습니다');
    }

    // 양측 주장이 모두 제출되었는지 확인
    const { data: argumentList, error: argsError } = await this.supabase
      .from('arguments')
      .select('side')
      .eq('room_id', options.roomId);

    if (argsError) {
      throw new Error('주장 확인 중 오류가 발생했습니다');
    }

    const sideACount = argumentList?.filter(arg => arg.side === 'A').length || 0;
    const sideBCount = argumentList?.filter(arg => arg.side === 'B').length || 0;

    if (sideACount === 0 || sideBCount === 0) {
      throw new Error('양측 모두 주장을 제출해야 토론을 시작할 수 있습니다');
    }

    // 토론 세션 생성
    const sessionData = {
      room_id: options.roomId,
      status: 'preparing',
      config: {
        max_rounds: options.config?.maxRounds || 3,
        time_limit: options.config?.timeLimit || 300, // 5분
        jury_size: options.config?.jurySize || 5
      },
      started_at: new Date().toISOString()
    };

    const { data: session, error: sessionError } = await this.supabase
      .from('debate_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      throw new Error(`토론 세션 생성 실패: ${sessionError.message}`);
    }

    // 비동기 토론 처리 작업 생성
    const jobData = {
      type: JobType.AI_DEBATE,
      room_id: options.roomId,
      payload: {
        session_id: session.id,
        config: sessionData.config
      },
      scheduled_at: new Date().toISOString()
    };

    const { data: job, error: jobError } = await this.supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      // 세션 삭제 후 에러 throw
      await this.supabase.from('debate_sessions').delete().eq('id', session.id);
      throw new Error(`토론 작업 생성 실패: ${jobError.message}`);
    }

    // 방 상태를 AI 토론 진행중으로 변경
    await this.supabase
      .from('rooms')
      .update({ 
        status: 'ai_debate_in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', options.roomId);

    const sessionValidation = DebateSessionModel.validate(session);
    if (!sessionValidation.success) {
      throw new Error(`토론 세션 데이터 검증 실패: ${sessionValidation.error}`);
    }

    return {
      session: sessionValidation.data,
      job: job as Job
    };
  }

  /**
   * 토론 진행 상황을 조회합니다.
   */
  async getDebateProgress(roomId: string): Promise<DebateProgress | null> {
    // 토론 세션 조회
    const { data: sessionData, error: sessionError } = await this.supabase
      .from('debate_sessions')
      .select(`
        *,
        rounds:rounds(
          *,
          turns:debate_turns(*)
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return null; // 토론 세션이 없음
      }
      throw new Error(`토론 세션 조회 실패: ${sessionError.message}`);
    }

    const sessionValidation = DebateSessionModel.validate(sessionData);
    if (!sessionValidation.success) {
      throw new Error(`토론 세션 데이터 검증 실패: ${sessionValidation.error}`);
    }

    const session = sessionValidation.data;
    const rounds = sessionData.rounds || [];
    
    // 현재 라운드 및 턴 찾기
    const currentRound = rounds.find((round: any) => round.status === 'in_progress') || 
                        rounds[rounds.length - 1];
    
    const currentTurn = currentRound?.turns?.find((turn: any) => turn.status === 'in_progress') ||
                       currentRound?.turns?.[currentRound.turns.length - 1];

    // 판결 조회
    const { data: verdictData } = await this.supabase
      .from('judge_decisions')
      .select('*')
      .eq('session_id', sessionData.id)
      .single();

    let verdict: Verdict | undefined;
    if (verdictData) {
      const verdictValidation = VerdictModel.validate(verdictData);
      if (verdictValidation.success) {
        verdict = verdictValidation.data;
      }
    }

    // 진행 상황 계산
    const totalRounds = sessionData.config?.max_rounds || 3;
    const completedRounds = rounds.filter((round: any) => round.status === 'completed').length;
    const currentRoundNumber = rounds.length;
    const turnsInCurrentRound = currentRound?.turns?.length || 0;
    const isComplete = sessionData.status === 'completed';

    return {
      session,
      currentRound,
      currentTurn,
      verdict,
      progress: {
        totalRounds,
        completedRounds,
        currentRoundNumber,
        turnsInCurrentRound,
        isComplete
      }
    };
  }

  /**
   * 토론 세션의 상세 정보를 조회합니다.
   */
  async getDebateSession(sessionId: string): Promise<DebateSession | null> {
    const { data, error } = await this.supabase
      .from('debate_sessions')
      .select(`
        *,
        room:rooms(id, title, creator_id, participant_id),
        rounds:rounds(
          *,
          turns:debate_turns(*)
        )
      `)
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`토론 세션 조회 실패: ${error.message}`);
    }

    const validation = DebateSessionModel.validate(data);
    if (!validation.success) {
      throw new Error(`토론 세션 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 토론 라운드를 생성합니다.
   */
  async createDebateRound(sessionId: string, roundNumber: number): Promise<DebateRound> {
    const roundData = {
      session_id: sessionId,
      round_number: roundNumber,
      status: 'preparing',
      started_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('rounds')
      .insert(roundData)
      .select()
      .single();

    if (error) {
      throw new Error(`토론 라운드 생성 실패: ${error.message}`);
    }

    return data as DebateRound;
  }

  /**
   * 토론 턴을 생성합니다.
   */
  async createDebateTurn(
    roundId: string, 
    turnNumber: number, 
    side: 'A' | 'B',
    content: string
  ): Promise<DebateTurn> {
    const turnData = {
      round_id: roundId,
      turn_number: turnNumber,
      side: side,
      content: content,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('debate_turns')
      .insert(turnData)
      .select()
      .single();

    if (error) {
      throw new Error(`토론 턴 생성 실패: ${error.message}`);
    }

    return data as DebateTurn;
  }

  /**
   * 심판 판결을 생성합니다.
   */
  async createJudgeDecision(
    sessionId: string,
    decision: any
  ): Promise<Verdict> {
    const decisionData = {
      session_id: sessionId,
      winner_side: decision.winner_side,
      reasoning: decision.reasoning,
      strengths_a: decision.strengthsA,
      weaknesses_a: decision.weaknessesA,
      strengths_b: decision.strengthsB,
      weaknesses_b: decision.weaknessesB,
      overall_quality: decision.overallQuality,
      fairness_score: decision.fairnessScore,
      clarity_score: decision.clarityScore,
      created_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('judge_decisions')
      .insert(decisionData)
      .select()
      .single();

    if (error) {
      throw new Error(`심판 판결 생성 실패: ${error.message}`);
    }

    const validation = VerdictModel.validate(data);
    if (!validation.success) {
      throw new Error(`심판 판결 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 배심원 투표를 생성합니다.
   */
  async createJuryVote(
    sessionId: string,
    jurorId: string,
    vote: JuryVote
  ): Promise<void> {
    const voteData = {
      session_id: sessionId,
      juror_id: jurorId,
      vote: vote.vote,
      reasoning: vote.reasoning,
      confidence: vote.confidence,
      bias_detected: vote.biasDetected || false,
      created_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('jury_votes')
      .insert(voteData);

    if (error) {
      throw new Error(`배심원 투표 생성 실패: ${error.message}`);
    }
  }

  /**
   * 토론 세션을 완료 처리합니다.
   */
  async completeDebateSession(sessionId: string): Promise<DebateSession> {
    const { data, error } = await this.supabase
      .from('debate_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`토론 세션 완료 처리 실패: ${error.message}`);
    }

    // 방 상태도 완료로 변경
    await this.supabase
      .from('rooms')
      .update({ 
        status: RoomStatus.COMPLETED,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.room_id);

    const validation = DebateSessionModel.validate(data);
    if (!validation.success) {
      throw new Error(`완료된 토론 세션 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 토론 통계를 조회합니다.
   */
  async getDebateStats(sessionId: string): Promise<{
    totalRounds: number;
    totalTurns: number;
    averageTurnLength: number;
    judgeDecision?: JudgeDecision;
    juryVotes: JuryVote[];
    duration: number; // 초 단위
  }> {
    const [session, rounds, turns, judgeDecision, juryVotes] = await Promise.all([
      this.supabase.from('debate_sessions').select('*').eq('id', sessionId).single(),
      this.supabase.from('rounds').select('*').eq('session_id', sessionId),
      this.supabase.from('debate_turns').select('content').eq('session_id', sessionId),
      this.supabase.from('judge_decisions').select('*').eq('session_id', sessionId).single(),
      this.supabase.from('jury_votes').select('*').eq('session_id', sessionId)
    ]);

    const totalRounds = rounds.data?.length || 0;
    const totalTurns = turns.data?.length || 0;
    const averageTurnLength = totalTurns > 0 
      ? Math.round(turns.data!.reduce((sum, turn) => sum + turn.content.length, 0) / totalTurns)
      : 0;

    let duration = 0;
    if (session.data?.started_at && session.data?.completed_at) {
      duration = Math.floor(
        (new Date(session.data.completed_at).getTime() - 
         new Date(session.data.started_at).getTime()) / 1000
      );
    }

    return {
      totalRounds,
      totalTurns,
      averageTurnLength,
      judgeDecision: judgeDecision.data || undefined,
      juryVotes: juryVotes.data || [],
      duration
    };
  }

  /**
   * 사용자의 토론 히스토리를 조회합니다.
   */
  async getUserDebateHistory(userId: string): Promise<DebateSession[]> {
    const { data, error } = await this.supabase
      .from('debate_sessions')
      .select(`
        *,
        room:rooms!inner(creator_id, participant_id, title)
      `)
      .or(`room.creator_id.eq.${userId},room.participant_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`토론 히스토리 조회 실패: ${error.message}`);
    }

    const sessions: DebateSession[] = [];
    for (const sessionData of data || []) {
      const validation = DebateSessionModel.validate(sessionData);
      if (validation.success) {
        sessions.push(validation.data);
      }
    }

    return sessions;
  }

  /**
   * 토론 세션을 취소합니다.
   */
  async cancelDebateSession(sessionId: string, userId: string): Promise<void> {
    // 권한 확인
    const session = await this.getDebateSession(sessionId);
    if (!session) {
      throw new Error('토론 세션을 찾을 수 없습니다');
    }

    // 방 생성자만 취소 가능
    const { data: roomData } = await this.supabase
      .from('rooms')
      .select('creator_id')
      .eq('id', session.room_id)
      .single();

    if (!roomData || roomData.creator_id !== userId) {
      throw new Error('방 생성자만 토론을 취소할 수 있습니다');
    }

    // 이미 완료된 토론은 취소 불가
    if (session.status === 'completed') {
      throw new Error('이미 완료된 토론은 취소할 수 없습니다');
    }

    // 세션 상태 업데이트
    await this.supabase
      .from('debate_sessions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // 관련 작업도 취소
    await this.supabase
      .from('jobs')
      .update({
        status: JobStatus.CANCELLED,
        updated_at: new Date().toISOString()
      })
      .eq('room_id', session.room_id)
      .eq('type', JobType.AI_DEBATE);

    // 방 상태를 주장 제출로 되돌림
    await this.supabase
      .from('rooms')
      .update({
        status: RoomStatus.ARGUMENTS_SUBMISSION,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.room_id);
  }
}
