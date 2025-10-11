import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/data/supabase/client';
import { Job, JobType, JobStatus } from '@/core/models/job';
import { AIService } from '@/core/services/ai-service';
import { Motion } from '@/core/models/motion';
import { Argument } from '@/core/models/argument';

// POST /api/jobs/process - Job 처리 (개발용 간이 worker)
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  console.info('[jobs-process-api] POST start', { requestId });

  try {
    const supabase = getSupabaseClient(true); // service role
    const aiService = new AIService();

    // 대기 중인 Job 가져오기
    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', JobStatus.QUEUED)
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('[jobs-process-api] POST fetch error', { requestId, error: fetchError.message });
      return NextResponse.json({ error: 'fetch_error', message: 'Job 조회 실패', requestId }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: '처리할 Job이 없습니다', requestId });
    }

    const job: Job = jobs[0];
    console.info('[jobs-process-api] Processing job', { requestId, jobId: job.id, jobType: job.type });

    // Job 상태를 RUNNING으로 변경
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: JobStatus.RUNNING,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .eq('status', JobStatus.QUEUED); // 동시성 제어

    if (updateError) {
      console.error('[jobs-process-api] POST update error', { requestId, error: updateError.message });
      return NextResponse.json({ error: 'update_error', message: 'Job 상태 업데이트 실패', requestId }, { status: 500 });
    }

    // Job 타입별 처리
    let result: any;
    try {
      switch (job.type) {
        case JobType.AI_DEBATE:
          result = await processAIDebate(job, aiService, supabase, requestId);
          break;
        case JobType.AI_JUDGE:
          result = await processAIJudge(job, aiService, supabase, requestId);
          break;
        case JobType.AI_JURY:
          result = await processAIJury(job, aiService, supabase, requestId);
          break;
        default:
          throw new Error(`지원하지 않는 Job 타입: ${job.type}`);
      }

      // Job 완료 처리
      await supabase
        .from('jobs')
        .update({
          status: JobStatus.SUCCEEDED,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          result: result
        })
        .eq('id', job.id);

      console.info('[jobs-process-api] POST success', { requestId, jobId: job.id });
      return NextResponse.json({ message: 'Job 처리 완료', jobId: job.id, result, requestId });

    } catch (processingError) {
      // Job 실패 처리
      const errorMessage = processingError instanceof Error ? processingError.message : String(processingError);
      console.error('[jobs-process-api] POST processing error', { requestId, jobId: job.id, error: errorMessage });

      const retryCount = job.retry_count + 1;
      const shouldRetry = retryCount < (job.max_retries || 3);

      await supabase
        .from('jobs')
        .update({
          status: shouldRetry ? JobStatus.QUEUED : JobStatus.FAILED,
          retry_count: retryCount,
          updated_at: new Date().toISOString(),
          scheduled_at: shouldRetry ? new Date(Date.now() + Math.pow(2, retryCount) * 60000).toISOString() : null,
          error: errorMessage
        })
        .eq('id', job.id);

      return NextResponse.json({
        error: 'processing_error',
        message: `Job 처리 실패: ${errorMessage}`,
        willRetry: shouldRetry,
        requestId
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[jobs-process-api] POST unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json({
      error: 'internal_error',
      message: '서버 내부 오류가 발생했습니다',
      requestId
    }, { status: 500 });
  }
}

// AI 변호사 토론 처리
async function processAIDebate(job: Job, aiService: AIService, supabase: any, requestId: string) {
  const { room_id, round, motion, argument_a, argument_b, previous_sessions } = job.payload;

  console.info('[AI-DEBATE] Starting debate', { requestId, roomId: room_id, round });

  // 변호사 persona 생성
  const lawyerAPersona = {
    id: 'lawyer-a',
    name: 'AI 변호사 A',
    specialty: '논리적 분석',
    style: 'analytical' as const,
    background: '10년 경력의 논리적 사고를 중시하는 변호사'
  };

  const lawyerBPersona = {
    id: 'lawyer-b',
    name: 'AI 변호사 B',
    specialty: '감정적 설득',
    style: 'diplomatic' as const,
    background: '8년 경력의 설득력 있는 변호사'
  };

  // A측 변호사 응답 생성
  const responseA = await aiService.generateLawyerResponse(
    motion,
    argument_b,
    argument_a,
    'A',
    round,
    lawyerAPersona,
    requestId
  );

  // B측 변호사 응답 생성
  const responseB = await aiService.generateLawyerResponse(
    motion,
    argument_a,
    argument_b,
    'B',
    round,
    lawyerBPersona,
    requestId
  );

  // Round 정보 가져오기
  const { data: roundData } = await supabase
    .from('rounds')
    .select('*')
    .eq('room_id', room_id)
    .eq('round_number', round)
    .single();

  if (!roundData) {
    throw new Error('Round 정보를 찾을 수 없습니다');
  }

  // Debate turns 생성
  const turnsData = [
    {
      round_id: roundData.id,
      turn_number: 1,
      side: 'A',
      lawyer_type: 'lawyer_a',
      content: responseA,
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    },
    {
      round_id: roundData.id,
      turn_number: 2,
      side: 'B',
      lawyer_type: 'lawyer_b',
      content: responseB,
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    }
  ];

  const { data: turns, error: turnsError } = await supabase
    .from('debate_turns')
    .insert(turnsData)
    .select();

  if (turnsError) {
    throw new Error(`Debate turns 생성 실패: ${turnsError.message}`);
  }

  // Round 상태 업데이트
  await supabase
    .from('rounds')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', roundData.id);

  // 라운드별 상태 전환
  if (round === 1) {
    // 1차 토론 완료 - 반론 대기 상태로 변경
    await supabase
      .from('rooms')
      .update({ status: 'waiting_rebuttal_1', updated_at: new Date().toISOString() })
      .eq('id', room_id);

    console.info('[AI-DEBATE] Round 1 completed, waiting for rebuttals', { requestId });

  } else if (round === 2) {
    // 2차 토론 완료 - 반론 대기 상태로 변경
    await supabase
      .from('rooms')
      .update({ status: 'waiting_rebuttal_2', updated_at: new Date().toISOString() })
      .eq('id', room_id);

    console.info('[AI-DEBATE] Round 2 completed, waiting for rebuttals', { requestId });

  } else if (round === 3) {
    // 3차 토론 완료 - AI 처리 상태로 변경하고 배심원 투표 Job 생성
    await supabase
      .from('rooms')
      .update({ status: 'ai_processing', updated_at: new Date().toISOString() })
      .eq('id', room_id);

    const juryJobData = {
      type: JobType.AI_JURY,
      room_id: room_id,
      payload: {
        room_id,
        motion,
        argument_a,
        argument_b,
        debate_sessions: [...(previous_sessions || []), { round, turns }]
      },
      max_retries: 3
    };

    await supabase.from('jobs').insert(juryJobData);

    console.info('[AI-DEBATE] Round 3 completed, jury voting scheduled', { requestId });
  }

  return {
    round,
    turns: turns.length,
    responseA: responseA.statement?.substring(0, 100),
    responseB: responseB.statement?.substring(0, 100)
  };
}

// AI 배심원 투표 처리
async function processAIJury(job: Job, aiService: AIService, supabase: any, requestId: string) {
  const { room_id, motion, argument_a, argument_b, debate_sessions } = job.payload;

  console.info('[AI-JURY] Starting jury voting', { requestId, roomId: room_id });

  // 7명의 배심원 투표 생성
  const juryVotes = [];
  for (let i = 1; i <= 7; i++) {
    const jurorPersona = {
      id: `juror-${i}`,
      name: `배심원 ${i}`,
      background: `다양한 관점을 가진 배심원 ${i}`,
      expertise: i <= 3 ? '법률' : i <= 5 ? '사회과학' : '인문학'
    };

    const vote = await aiService.generateJuryVote(
      motion,
      [argument_a],
      [argument_b],
      debate_sessions,
      jurorPersona,
      requestId
    );

    const voteData = {
      room_id,
      juror_number: i,
      vote: vote.data?.vote || vote.vote,
      reasoning: vote.data?.reasoning || vote.reasoning,
      confidence: vote.data?.confidence || vote.confidence
    };

    const { data, error } = await supabase
      .from('jury_votes')
      .insert(voteData)
      .select()
      .single();

    if (error) {
      console.error('[AI-JURY] Vote creation error', { requestId, juror: i, error: error.message });
    } else {
      juryVotes.push(data);
    }
  }

  // 판사 판결 Job 생성
  const judgeJobData = {
    type: JobType.AI_JUDGE,
    room_id: room_id,
    payload: {
      room_id,
      motion,
      argument_a,
      argument_b,
      debate_sessions,
      jury_votes: juryVotes
    },
    max_retries: 3
  };

  await supabase.from('jobs').insert(judgeJobData);

  console.info('[AI-JURY] Jury voting completed, judge decision scheduled', { requestId, votes: juryVotes.length });

  return {
    jury_votes: juryVotes.length,
    votes_summary: juryVotes.map(v => ({ juror: v.juror_number, vote: v.vote, confidence: v.confidence }))
  };
}

// AI 판사 판결 처리
async function processAIJudge(job: Job, aiService: AIService, supabase: any, requestId: string) {
  const { room_id, motion, argument_a, argument_b, debate_sessions, jury_votes } = job.payload;

  console.info('[AI-JUDGE] Starting judge decision', { requestId, roomId: room_id });

  const judgePersona = {
    id: 'judge-1',
    name: 'AI 판사',
    experience: '20년 경력',
    philosophy: 'balanced' as const,
    background: '공정하고 균형잡힌 판결을 내리는 판사'
  };

  const decision = await aiService.generateJudgeDecision(
    motion,
    [argument_a],
    [argument_b],
    debate_sessions,
    judgePersona,
    requestId
  );

  // Extract decision data
  const decisionData = decision.data || decision;

  // 판사 판결 저장
  const judgeDecisionData = {
    room_id,
    decision_type: 'final_verdict',
    content: decisionData,
    reasoning: decisionData.reasoning
  };

  const { data: judgeDecisionRecord, error: judgeError } = await supabase
    .from('judge_decisions')
    .insert(judgeDecisionData)
    .select()
    .single();

  if (judgeError) {
    throw new Error(`판사 판결 저장 실패: ${judgeError.message}`);
  }

  // 최종 판결 저장 (TODO: Create verdicts table first)
  // const verdictData = {
  //   room_id,
  //   winner: decisionData.winner,
  //   reasoning: decisionData.reasoning,
  //   strengths_a: decisionData.analysis_a,
  //   weaknesses_a: decisionData.weaknesses_a.join('\n'),
  //   strengths_b: decisionData.analysis_b,
  //   weaknesses_b: decisionData.weaknesses_b.join('\n'),
  //   confidence_score: Math.round((decisionData.score_a + decisionData.score_b) / 2)
  // };

  // const { error: verdictError } = await supabase
  //   .from('verdicts')
  //   .insert(verdictData);

  // if (verdictError) {
  //   throw new Error(`최종 판결 저장 실패: ${verdictError.message}`);
  // }

  // Room 상태를 COMPLETED로 변경
  await supabase
    .from('rooms')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', room_id);

  console.info('[AI-JUDGE] Judge decision completed', { requestId, winner: decisionData.winner });

  return {
    winner: decisionData.winner,
    scoreA: decisionData.score_a,
    scoreB: decisionData.score_b
  };
}
