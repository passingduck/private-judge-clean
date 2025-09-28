import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// 환경 변수 인터페이스
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
}

// Job 타입 정의
interface Job {
  id: string;
  type: 'ai_debate' | 'ai_judge' | 'ai_jury' | 'notification';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'retrying';
  room_id: string | null;
  payload: any;
  result: any | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// OpenAI API 호출 함수
async function callOpenAI(prompt: string, model: string, apiKey: string): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: '당신은 사적 재판 시스템의 AI입니다. 주어진 역할에 따라 논리적이고 공정한 응답을 제공하세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// 지수 백오프 재시도 로직
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// AI 토론 처리
async function processAIDebate(job: Job, supabase: any, env: Env): Promise<any> {
  const { round, type, room_id } = job.payload;
  
  console.log(`[AI Debate] Processing round ${round} type ${type} for room ${room_id}`);
  
  // 방 정보와 주장 가져오기
  const { data: room } = await supabase
    .from('rooms')
    .select(`
      *,
      motions(*),
      arguments(*)
    `)
    .eq('id', room_id)
    .single();

  if (!room) {
    throw new Error(`Room ${room_id} not found`);
  }

  // 라운드 생성 또는 업데이트
  const { data: roundData } = await supabase
    .from('rounds')
    .upsert({
      room_id: room_id,
      round_number: round,
      round_type: type,
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  // AI 변호사들의 토론 턴 생성
  const turns = [];
  const motion = room.motions[0];
  const argumentsA = room.arguments.find((arg: any) => arg.side === 'A');
  const argumentsB = room.arguments.find((arg: any) => arg.side === 'B');

  // 10턴의 토론 생성 (각 측 5턴씩)
  for (let i = 0; i < 10; i++) {
    const side = i % 2 === 0 ? 'A' : 'B';
    const lawyerType = side === 'A' ? 'lawyer_a' : 'lawyer_b';
    const currentArgument = side === 'A' ? argumentsA : argumentsB;
    const opponentArgument = side === 'A' ? argumentsB : argumentsA;

    const prompt = `
토론 주제: ${motion.title}
안건 설명: ${motion.description}

${side}측 주장:
제목: ${currentArgument?.title || ''}
내용: ${currentArgument?.content || ''}

상대측 주장:
제목: ${opponentArgument?.title || ''}
내용: ${opponentArgument?.content || ''}

현재 라운드: ${round}차 토론 (${type})
턴 번호: ${i + 1}/10
당신의 역할: ${side}측 변호사

이전 토론 내용을 고려하여 논리적이고 설득력 있는 발언을 해주세요.
응답은 다음 JSON 형식으로 해주세요:
{
  "statement": "발언 내용",
  "key_points": ["핵심 포인트1", "핵심 포인트2"],
  "counter_arguments": ["반박 포인트1", "반박 포인트2"],
  "evidence_references": ["증거 참조1", "증거 참조2"]
}
`;

    try {
      const aiResponse = await withRetry(() => 
        callOpenAI(prompt, env.OPENAI_MODEL, env.OPENAI_API_KEY)
      );
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch {
        // JSON 파싱 실패 시 기본 구조로 래핑
        parsedResponse = {
          statement: aiResponse,
          key_points: [],
          counter_arguments: [],
          evidence_references: []
        };
      }

      const { data: turn } = await supabase
        .from('debate_turns')
        .insert({
          round_id: roundData.id,
          turn_number: i + 1,
          side: side,
          lawyer_type: lawyerType,
          content: parsedResponse,
          status: 'completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      turns.push(turn);
      
      // 턴 간 짧은 지연
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Error processing turn ${i + 1}:`, error);
      throw error;
    }
  }

  // 라운드 완료 처리
  await supabase
    .from('rounds')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', roundData.id);

  return {
    round_id: roundData.id,
    turns_generated: turns.length,
    round_type: type,
    completed_at: new Date().toISOString()
  };
}

// AI 판사 처리
async function processAIJudge(job: Job, supabase: any, env: Env): Promise<any> {
  const { room_id, decision_type, round_id } = job.payload;
  
  console.log(`[AI Judge] Processing ${decision_type} for room ${room_id}`);
  
  // 토론 데이터 가져오기
  const { data: debateData } = await supabase
    .from('rounds')
    .select(`
      *,
      debate_turns(*),
      rooms(
        *,
        motions(*),
        arguments(*)
      )
    `)
    .eq('room_id', room_id)
    .order('round_number', { ascending: true });

  if (!debateData || debateData.length === 0) {
    throw new Error(`No debate data found for room ${room_id}`);
  }

  const room = debateData[0].rooms;
  const motion = room.motions[0];
  
  // 모든 토론 턴 수집
  const allTurns = debateData.flatMap((round: any) => round.debate_turns);
  
  const prompt = `
토론 주제: ${motion.title}
안건 설명: ${motion.description}

전체 토론 내용:
${allTurns.map((turn: any, index: number) => 
  `턴 ${turn.turn_number} (${turn.side}측): ${turn.content.statement || JSON.stringify(turn.content)}`
).join('\n')}

판결 유형: ${decision_type}

공정하고 논리적인 판사로서 다음을 분석해주세요:
1. 양측 주장의 강점과 약점
2. 논리적 일관성과 증거의 질
3. 반박의 효과성
4. 전체적인 설득력

응답은 다음 JSON 형식으로 해주세요:
{
  "summary": "판결 요약",
  "analysis_a": "A측 분석",
  "analysis_b": "B측 분석", 
  "strengths_a": ["A측 강점1", "A측 강점2"],
  "weaknesses_a": ["A측 약점1", "A측 약점2"],
  "strengths_b": ["B측 강점1", "B측 강점2"],
  "weaknesses_b": ["B측 약점1", "B측 약점2"],
  "reasoning": "판결 근거",
  "score_a": 85,
  "score_b": 78
}
`;

  const aiResponse = await withRetry(() => 
    callOpenAI(prompt, env.OPENAI_MODEL, env.OPENAI_API_KEY)
  );
  
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(aiResponse);
  } catch {
    parsedResponse = {
      summary: aiResponse,
      analysis_a: '',
      analysis_b: '',
      strengths_a: [],
      weaknesses_a: [],
      strengths_b: [],
      weaknesses_b: [],
      reasoning: aiResponse,
      score_a: 50,
      score_b: 50
    };
  }

  // 판사 결정 저장
  const { data: decision } = await supabase
    .from('judge_decisions')
    .insert({
      room_id: room_id,
      round_id: round_id,
      decision_type: decision_type,
      content: parsedResponse,
      reasoning: parsedResponse.reasoning || parsedResponse.summary
    })
    .select()
    .single();

  return {
    decision_id: decision.id,
    decision_type: decision_type,
    scores: {
      side_a: parsedResponse.score_a,
      side_b: parsedResponse.score_b
    }
  };
}

// AI 배심원 처리
async function processAIJury(job: Job, supabase: any, env: Env): Promise<any> {
  const { room_id, jury_count = 7 } = job.payload;
  
  console.log(`[AI Jury] Processing ${jury_count} jurors for room ${room_id}`);
  
  // 토론 데이터와 판사 결정 가져오기
  const { data: roomData } = await supabase
    .from('rooms')
    .select(`
      *,
      motions(*),
      arguments(*),
      judge_decisions(*),
      rounds(
        *,
        debate_turns(*)
      )
    `)
    .eq('id', room_id)
    .single();

  if (!roomData) {
    throw new Error(`Room ${room_id} not found`);
  }

  const votes = [];
  
  // 7명의 배심원 생성
  for (let i = 1; i <= jury_count; i++) {
    // 배경이 다른 배심원 프로필 생성
    const jurorProfiles = [
      { background: '법학 전공자', perspective: '법적 관점 중시' },
      { background: '일반 시민', perspective: '상식적 판단 중시' },
      { background: '전문가', perspective: '전문 지식 활용' },
      { background: '학생', perspective: '이론적 접근' },
      { background: '직장인', perspective: '실용적 관점' },
      { background: '은퇴자', perspective: '경험적 판단' },
      { background: '자영업자', perspective: '현실적 고려' }
    ];
    
    const profile = jurorProfiles[i - 1];
    
    // 배심원 프로필 저장
    await supabase
      .from('juror_profiles')
      .upsert({
        room_id: room_id,
        juror_number: i,
        profile: profile
      });

    const motion = roomData.motions[0];
    const judgeDecisions = roomData.judge_decisions;
    
    const prompt = `
배심원 번호: ${i}
배경: ${profile.background}
관점: ${profile.perspective}

토론 주제: ${motion.title}
안건 설명: ${motion.description}

판사의 분석:
${judgeDecisions.map((decision: any) => decision.reasoning).join('\n')}

당신의 배경과 관점을 바탕으로 A측과 B측 중 어느 쪽이 더 설득력 있는지 판단해주세요.

응답은 다음 JSON 형식으로 해주세요:
{
  "vote": "A" 또는 "B",
  "reasoning": "투표 이유 (200자 내외)",
  "confidence": 1-10 사이의 확신도,
  "key_factors": ["결정적 요인1", "결정적 요인2"]
}
`;

    try {
      const aiResponse = await withRetry(() => 
        callOpenAI(prompt, env.OPENAI_MODEL, env.OPENAI_API_KEY)
      );
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch {
        // 파싱 실패 시 기본값
        parsedResponse = {
          vote: Math.random() > 0.5 ? 'A' : 'B',
          reasoning: aiResponse.substring(0, 200),
          confidence: Math.floor(Math.random() * 5) + 5,
          key_factors: []
        };
      }

      // 투표 저장
      const { data: vote } = await supabase
        .from('jury_votes')
        .upsert({
          room_id: room_id,
          juror_number: i,
          vote: parsedResponse.vote,
          reasoning: parsedResponse.reasoning,
          confidence: parsedResponse.confidence
        })
        .select()
        .single();

      votes.push(vote);
      
      // 배심원 간 지연
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`Error processing juror ${i}:`, error);
      throw error;
    }
  }

  // 투표 결과 집계
  const votesA = votes.filter(v => v.vote === 'A').length;
  const votesB = votes.filter(v => v.vote === 'B').length;
  const avgConfidence = votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;

  return {
    total_votes: votes.length,
    votes_a: votesA,
    votes_b: votesB,
    winner: votesA > votesB ? 'A' : votesB > votesA ? 'B' : 'draw',
    average_confidence: Math.round(avgConfidence * 10) / 10,
    votes: votes
  };
}

// 메인 핸들러
Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  
  try {
    console.log(`[${requestId}] Jobs worker started`);
    
    // 환경 변수 확인
    const env: Env = {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL')!,
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY')!,
      OPENAI_MODEL: Deno.env.get('OPENAI_MODEL') || 'gpt-4o'
    };

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.OPENAI_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 요청 파라미터 파싱
    const { take = 1 } = await req.json().catch(() => ({}));

    // 대기 중인 작업 가져오기
    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(take);

    if (fetchError) {
      throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log(`[${requestId}] No pending jobs found`);
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0, 
        message: 'No pending jobs',
        requestId 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    // 각 작업 처리
    for (const job of jobs) {
      console.log(`[${requestId}] Processing job ${job.id} (${job.type})`);
      
      try {
        // 작업 상태를 실행 중으로 변경
        await supabase
          .from('jobs')
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        let result;

        // 작업 타입별 처리
        switch (job.type) {
          case 'ai_debate':
            result = await processAIDebate(job, supabase, env);
            break;
          case 'ai_judge':
            result = await processAIJudge(job, supabase, env);
            break;
          case 'ai_jury':
            result = await processAIJury(job, supabase, env);
            break;
          default:
            throw new Error(`Unknown job type: ${job.type}`);
        }

        // 작업 완료 처리
        await supabase
          .from('jobs')
          .update({
            status: 'succeeded',
            result: result,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        results.push({
          job_id: job.id,
          type: job.type,
          status: 'succeeded',
          result: result
        });

        console.log(`[${requestId}] Job ${job.id} completed successfully`);

      } catch (error) {
        console.error(`[${requestId}] Job ${job.id} failed:`, error);

        const shouldRetry = job.retry_count < job.max_retries;
        const newStatus = shouldRetry ? 'retrying' : 'failed';
        
        await supabase
          .from('jobs')
          .update({
            status: newStatus,
            error_message: error.message,
            retry_count: job.retry_count + 1,
            completed_at: shouldRetry ? null : new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        results.push({
          job_id: job.id,
          type: job.type,
          status: newStatus,
          error: error.message
        });
      }
    }

    console.log(`[${requestId}] Processed ${results.length} jobs`);

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results: results,
      requestId: requestId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${requestId}] Worker error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      requestId: requestId
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
