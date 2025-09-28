import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// 환경 변수 인터페이스
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
}

// OpenAI API 호출 함수
async function callOpenAI(prompt: string, model: string, apiKey: string): Promise<string> {
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
          content: '당신은 사적 재판 시스템의 최종 보고서를 작성하는 AI입니다. 공정하고 객관적인 분석을 제공하세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // 일관성을 위해 낮은 온도
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// 최종 리포트 생성 및 완료 처리
Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  
  try {
    console.log(`[${requestId}] Report finalizer started`);
    
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
    const { room_id } = await req.json();

    if (!room_id) {
      throw new Error('room_id is required');
    }

    console.log(`[${requestId}] Finalizing report for room ${room_id}`);

    // 모든 토론 데이터 수집
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select(`
        *,
        motions(*),
        arguments(*),
        rounds(
          *,
          debate_turns(*)
        ),
        judge_decisions(*),
        jury_votes(*),
        juror_profiles(*)
      `)
      .eq('id', room_id)
      .single();

    if (roomError || !roomData) {
      throw new Error(`Failed to fetch room data: ${roomError?.message || 'Room not found'}`);
    }

    // 기존 리포트가 있는지 확인
    const { data: existingReport } = await supabase
      .from('final_reports')
      .select('id')
      .eq('room_id', room_id)
      .single();

    if (existingReport) {
      console.log(`[${requestId}] Report already exists for room ${room_id}`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Report already exists',
        report_id: existingReport.id,
        requestId: requestId
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 배심원 투표 집계
    const juryVotes = roomData.jury_votes || [];
    const votesA = juryVotes.filter((vote: any) => vote.vote === 'A').length;
    const votesB = juryVotes.filter((vote: any) => vote.vote === 'B').length;
    const totalVotes = juryVotes.length;
    const avgConfidence = totalVotes > 0 
      ? juryVotes.reduce((sum: number, vote: any) => sum + vote.confidence, 0) / totalVotes 
      : 0;

    // 승자 결정
    let winner: 'A' | 'B' | 'draw';
    if (votesA > votesB) {
      winner = 'A';
    } else if (votesB > votesA) {
      winner = 'B';
    } else {
      winner = 'draw';
    }

    // 판사 결정 수집
    const judgeDecisions = roomData.judge_decisions || [];
    const motion = roomData.motions?.[0];
    const argumentsA = roomData.arguments?.find((arg: any) => arg.side === 'A');
    const argumentsB = roomData.arguments?.find((arg: any) => arg.side === 'B');

    // 토론 턴 수집
    const allTurns = roomData.rounds?.flatMap((round: any) => round.debate_turns || []) || [];

    // AI를 통한 최종 분석 생성
    const analysisPrompt = `
토론 주제: ${motion?.title || ''}
안건 설명: ${motion?.description || ''}

A측 주장:
제목: ${argumentsA?.title || ''}
내용: ${argumentsA?.content || ''}

B측 주장:
제목: ${argumentsB?.title || ''}
내용: ${argumentsB?.content || ''}

판사의 분석:
${judgeDecisions.map((decision: any) => decision.reasoning).join('\n')}

배심원 투표 결과:
- 총 투표수: ${totalVotes}
- A측 득표: ${votesA}표
- B측 득표: ${votesB}표
- 평균 확신도: ${avgConfidence.toFixed(1)}/10
- 승자: ${winner}

배심원별 투표 이유:
${juryVotes.map((vote: any, index: number) => 
  `배심원 ${vote.juror_number}: ${vote.vote}측 (확신도 ${vote.confidence}/10) - ${vote.reasoning}`
).join('\n')}

전체 토론 과정을 종합하여 다음을 분석해주세요:

1. 최종 승부 결과와 그 근거
2. A측의 강점과 약점 (구체적으로)
3. B측의 강점과 약점 (구체적으로)  
4. 전체 토론의 품질 평가 (1-10점)
5. 핵심 쟁점과 결정적 요인들

응답은 다음 JSON 형식으로 해주세요:
{
  "final_reasoning": "최종 판결 근거 (300자 내외)",
  "strengths_a": "A측 강점 분석 (200자 내외)",
  "weaknesses_a": "A측 약점 분석 (200자 내외)",
  "strengths_b": "B측 강점 분석 (200자 내외)",
  "weaknesses_b": "B측 약점 분석 (200자 내외)",
  "overall_quality": 8,
  "key_factors": ["결정적 요인1", "결정적 요인2", "결정적 요인3"],
  "debate_highlights": ["토론 하이라이트1", "토론 하이라이트2"],
  "improvement_suggestions": ["개선 제안1", "개선 제안2"]
}
`;

    console.log(`[${requestId}] Generating final analysis with AI`);
    
    const aiAnalysis = await callOpenAI(analysisPrompt, env.OPENAI_MODEL, env.OPENAI_API_KEY);
    
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(aiAnalysis);
    } catch (parseError) {
      console.warn(`[${requestId}] Failed to parse AI analysis, using fallback`);
      parsedAnalysis = {
        final_reasoning: aiAnalysis.substring(0, 300),
        strengths_a: '논리적 구성과 증거 제시',
        weaknesses_a: '반박에 대한 대응 부족',
        strengths_b: '실용적 접근과 현실성',
        weaknesses_b: '이론적 근거 부족',
        overall_quality: Math.floor(avgConfidence),
        key_factors: ['논리적 일관성', '증거의 질', '설득력'],
        debate_highlights: ['핵심 쟁점 부각', '효과적인 반박'],
        improvement_suggestions: ['더 구체적인 증거 필요', '상대방 입장 고려 필요']
      };
    }

    // 배심원 요약 데이터 생성
    const jurySummary = {
      total_votes: totalVotes,
      votes_a: votesA,
      votes_b: votesB,
      winner: winner,
      average_confidence: Math.round(avgConfidence * 10) / 10,
      vote_distribution: juryVotes.map((vote: any) => ({
        juror_number: vote.juror_number,
        vote: vote.vote,
        confidence: vote.confidence,
        reasoning_summary: vote.reasoning.substring(0, 100)
      })),
      key_factors: parsedAnalysis.key_factors || [],
      confidence_range: {
        min: Math.min(...juryVotes.map((v: any) => v.confidence)),
        max: Math.max(...juryVotes.map((v: any) => v.confidence))
      }
    };

    // 최종 리포트 생성
    const { data: finalReport, error: reportError } = await supabase
      .from('final_reports')
      .insert({
        room_id: room_id,
        winner: winner,
        reasoning: parsedAnalysis.final_reasoning,
        strengths_a: parsedAnalysis.strengths_a,
        weaknesses_a: parsedAnalysis.weaknesses_a,
        strengths_b: parsedAnalysis.strengths_b,
        weaknesses_b: parsedAnalysis.weaknesses_b,
        overall_quality: parsedAnalysis.overall_quality,
        jury_summary: jurySummary,
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (reportError) {
      throw new Error(`Failed to create final report: ${reportError.message}`);
    }

    // 방 상태를 완료로 변경
    await supabase
      .from('rooms')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', room_id);

    console.log(`[${requestId}] Final report created successfully: ${finalReport.id}`);

    return new Response(JSON.stringify({
      success: true,
      report_id: finalReport.id,
      room_id: room_id,
      winner: winner,
      jury_summary: {
        total_votes: totalVotes,
        votes_a: votesA,
        votes_b: votesB,
        average_confidence: Math.round(avgConfidence * 10) / 10
      },
      overall_quality: parsedAnalysis.overall_quality,
      message: 'Final report generated successfully',
      requestId: requestId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${requestId}] Report finalizer error:`, error);
    
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
