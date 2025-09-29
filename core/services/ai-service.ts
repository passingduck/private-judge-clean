import { 
  parseLLMResponse,
  type LLMRole 
} from '@/core/llm/schemas';
import { Argument } from '@/core/models/argument';
import { Motion } from '@/core/models/motion';
// DebateRound and DebateTurn types will be defined inline
interface DebateRound {
  id: string;
  round_number: number;
  turns?: DebateTurn[];
}

interface DebateTurn {
  id: string;
  side: 'A' | 'B';
  content: string;
}

export interface AIDebateConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  retryAttempts: number;
  timeoutMs: number;
}

export interface LawyerPersona {
  id: string;
  name: string;
  specialty: string;
  style: 'aggressive' | 'analytical' | 'diplomatic' | 'creative';
  background: string;
}

export interface JudgePersona {
  id: string;
  name: string;
  experience: string;
  philosophy: 'strict' | 'balanced' | 'progressive' | 'traditional';
  background: string;
}

export interface JurorPersona {
  id: string;
  name: string;
  background: string;
  bias?: string;
  expertise?: string;
}

export class AIService {
  private config: AIDebateConfig;
  private openaiApiKey: string;

  constructor() {
    this.config = {
      model: process.env.OPENAI_MODEL || 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      retryAttempts: 3,
      timeoutMs: 30000
    };
    
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }

  /**
   * AI 변호사가 주장에 대한 반박을 생성합니다.
   */
  async generateLawyerResponse(
    motion: Motion,
    opponentArgument: Argument,
    myArgument: Argument,
    side: 'A' | 'B',
    roundNumber: number,
    persona: LawyerPersona,
    requestId: string
  ): Promise<any> {
    const prompt = this.buildLawyerPrompt(
      motion, 
      opponentArgument, 
      myArgument, 
      side, 
      roundNumber, 
      persona
    );

    console.info(`[ai-service] Generating lawyer response`, {
      requestId,
      side,
      roundNumber,
      persona: persona.name,
      motionTitle: motion.title
    });

    const response = await this.callOpenAI(prompt, requestId);
    
    return parseLLMResponse(response, 'lawyer', { requestId });
  }

  /**
   * AI 심판이 토론에 대한 최종 판결을 내립니다.
   */
  async generateJudgeDecision(
    motion: Motion,
    argumentsA: Argument[],
    argumentsB: Argument[],
    debateRounds: DebateRound[],
    persona: JudgePersona,
    requestId: string
  ): Promise<any> {
    const prompt = this.buildJudgePrompt(
      motion,
      argumentsA,
      argumentsB,
      debateRounds,
      persona
    );

    console.info(`[ai-service] Generating judge decision`, {
      requestId,
      persona: persona.name,
      motionTitle: motion.title,
      totalRounds: debateRounds.length
    });

    const response = await this.callOpenAI(prompt, requestId);
    
    return parseLLMResponse(response, 'judge', { requestId });
  }

  /**
   * AI 배심원이 토론에 대한 투표를 생성합니다.
   */
  async generateJuryVote(
    motion: Motion,
    argumentsA: Argument[],
    argumentsB: Argument[],
    debateRounds: DebateRound[],
    persona: JurorPersona,
    requestId: string
  ): Promise<any> {
    const prompt = this.buildJurorPrompt(
      motion,
      argumentsA,
      argumentsB,
      debateRounds,
      persona
    );

    console.info(`[ai-service] Generating jury vote`, {
      requestId,
      persona: persona.name,
      motionTitle: motion.title
    });

    const response = await this.callOpenAI(prompt, requestId);
    
    return parseLLMResponse(response, 'juror', { requestId });
  }

  /**
   * 최종 보고서를 생성합니다.
   */
  async generateFinalReport(
    motion: Motion,
    judgeDecision: any,
    juryVotes: any[],
    debateStats: any,
    requestId: string
  ): Promise<any> {
    const prompt = this.buildFinalReportPrompt(
      motion,
      judgeDecision,
      juryVotes,
      debateStats
    );

    console.info(`[ai-service] Generating final report`, {
      requestId,
      motionTitle: motion.title,
      juryVotesCount: juryVotes.length
    });

    const response = await this.callOpenAI(prompt, requestId);
    
    return parseLLMResponse(response, 'judge', { requestId }); // Final report uses judge validation
  }

  /**
   * OpenAI API를 호출합니다.
   */
  private async callOpenAI(prompt: string, requestId: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.info(`[ai-service] OpenAI API call attempt ${attempt}`, {
          requestId,
          model: this.config.model,
          temperature: this.config.temperature
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert AI assistant specialized in legal debates and argumentation. Always respond in valid JSON format according to the specified schema.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            response_format: { type: 'json_object' }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
          throw new Error('No response choices from OpenAI API');
        }

        const content = data.choices[0].message?.content;
        if (!content) {
          throw new Error('Empty response content from OpenAI API');
        }

        console.info(`[ai-service] OpenAI API call successful`, {
          requestId,
          attempt,
          tokensUsed: data.usage?.total_tokens || 0
        });

        return content;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(`[ai-service] OpenAI API call failed (attempt ${attempt})`, {
          requestId,
          error: lastError.message,
          willRetry: attempt < this.config.retryAttempts
        });

        if (attempt < this.config.retryAttempts) {
          // 지수 백오프
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`[ai-service] All OpenAI API attempts failed`, {
      requestId,
      totalAttempts: this.config.retryAttempts,
      finalError: lastError?.message
    });

    throw new Error(`OpenAI API 호출 실패 (${this.config.retryAttempts}회 시도): ${lastError?.message}`);
  }

  /**
   * 변호사 프롬프트를 구성합니다.
   */
  private buildLawyerPrompt(
    motion: Motion,
    opponentArgument: Argument,
    myArgument: Argument,
    side: 'A' | 'B',
    roundNumber: number,
    persona: LawyerPersona
  ): string {
    return `
당신은 ${persona.name}이라는 ${persona.specialty} 전문 변호사입니다.
배경: ${persona.background}
스타일: ${persona.style}

현재 다음 안건에 대해 토론 중입니다:
제목: ${motion.title}
설명: ${motion.description}

당신은 ${side}측을 대변하고 있으며, 현재 ${roundNumber}라운드입니다.

우리측 초기 주장:
${myArgument.content}

상대측 주장:
${opponentArgument.content}

상대측 주장에 대한 반박을 작성해주세요. 다음 JSON 형식으로 응답해주세요:

{
  "argument": "논리적이고 설득력 있는 반박 (50-2000자)",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "counterArguments": ["반박 논리 1", "반박 논리 2", "반박 논리 3"],
  "evidenceAnalysis": "증거 분석 및 해석 (50-1000자)",
  "confidenceScore": 8,
  "tone": "formal"
}

주의사항:
- 논리적이고 객관적인 근거를 제시하세요
- 상대방을 존중하는 어조를 유지하세요
- 감정적 공격보다는 논리적 반박에 집중하세요
- 한국어로 작성하세요
`;
  }

  /**
   * 심판 프롬프트를 구성합니다.
   */
  private buildJudgePrompt(
    motion: Motion,
    argumentsA: Argument[],
    argumentsB: Argument[],
    debateRounds: DebateRound[],
    persona: JudgePersona
  ): string {
    const argumentsAText = argumentsA.map(arg => arg.content).join('\n\n');
    const argumentsBText = argumentsB.map(arg => arg.content).join('\n\n');
    
    const roundsText = debateRounds.map((round, index) => {
      const turns = round.turns || [];
      const turnsText = turns.map((turn: any) => 
        `${turn.side}측: ${turn.content}`
      ).join('\n');
      return `라운드 ${index + 1}:\n${turnsText}`;
    }).join('\n\n');

    return `
당신은 ${persona.name}이라는 경험 많은 심판입니다.
경험: ${persona.experience}
철학: ${persona.philosophy}
배경: ${persona.background}

다음 안건에 대한 토론을 심판해주세요:
제목: ${motion.title}
설명: ${motion.description}

A측 초기 주장:
${argumentsAText}

B측 초기 주장:
${argumentsBText}

토론 과정:
${roundsText}

공정하고 객관적인 판결을 내려주세요. 다음 JSON 형식으로 응답해주세요:

{
  "winner": "A",
  "reasoning": "판결 근거 (100-3000자)",
  "strengthsA": "A측의 강점 분석 (50-1000자)",
  "weaknessesA": "A측의 약점 분석 (50-1000자)",
  "strengthsB": "B측의 강점 분석 (50-1000자)",
  "weaknessesB": "B측의 약점 분석 (50-1000자)",
  "overallQuality": 8,
  "fairnessScore": 9,
  "clarityScore": 7
}

평가 기준:
- 논리의 일관성과 타당성
- 증거의 신뢰성과 관련성
- 반박의 효과성
- 전체적인 설득력
- 한국어로 작성하세요
`;
  }

  /**
   * 배심원 프롬프트를 구성합니다.
   */
  private buildJurorPrompt(
    motion: Motion,
    argumentsA: Argument[],
    argumentsB: Argument[],
    debateRounds: DebateRound[],
    persona: JurorPersona
  ): string {
    const argumentsAText = argumentsA.map(arg => arg.content).join('\n\n');
    const argumentsBText = argumentsB.map(arg => arg.content).join('\n\n');
    
    const roundsText = debateRounds.map((round, index) => {
      const turns = round.turns || [];
      const turnsText = turns.map((turn: any) => 
        `${turn.side}측: ${turn.content}`
      ).join('\n');
      return `라운드 ${index + 1}:\n${turnsText}`;
    }).join('\n\n');

    return `
당신은 ${persona.name}이라는 배심원입니다.
배경: ${persona.background}
${persona.expertise ? `전문 분야: ${persona.expertise}` : ''}
${persona.bias ? `개인적 성향: ${persona.bias}` : ''}

다음 안건에 대한 토론을 듣고 투표해주세요:
제목: ${motion.title}
설명: ${motion.description}

A측 주장:
${argumentsAText}

B측 주장:
${argumentsBText}

토론 과정:
${roundsText}

일반 시민의 관점에서 어느 쪽이 더 설득력 있는지 투표해주세요. 다음 JSON 형식으로 응답해주세요:

{
  "vote": "A",
  "reasoning": "투표 이유 (50-1000자)",
  "confidence": 7,
  "biasDetected": false
}

고려사항:
- 일반인이 이해하기 쉬운 설명인가?
- 실생활에 미치는 영향은?
- 상식적으로 납득할 수 있는가?
- 한국어로 작성하세요
`;
  }

  /**
   * 최종 보고서 프롬프트를 구성합니다.
   */
  private buildFinalReportPrompt(
    motion: Motion,
    judgeDecision: any,
    juryVotes: any[],
    debateStats: any
  ): string {
    const juryVotesText = juryVotes.map((vote, index) => 
      `배심원 ${index + 1}: ${vote.vote}표 (신뢰도: ${vote.confidence}/10)\n이유: ${vote.reasoning}`
    ).join('\n\n');

    return `
다음 토론에 대한 최종 보고서를 작성해주세요:

안건: ${motion.title}
설명: ${motion.description}

심판 판결:
승자: ${judgeDecision.winner}
판결 이유: ${judgeDecision.reasoning}

배심원 투표 결과:
${juryVotesText}

토론 통계:
- 총 라운드: ${debateStats.totalRounds}
- 총 발언: ${debateStats.totalTurns}
- 평균 발언 길이: ${debateStats.averageTurnLength}자
- 토론 시간: ${Math.floor(debateStats.duration / 60)}분

종합적인 분석과 권고사항을 포함한 최종 보고서를 작성해주세요. 다음 JSON 형식으로 응답해주세요:

{
  "finalVerdict": {
    "winner": "${judgeDecision.winner}",
    "reasoning": "최종 판결 요약 (100-3000자)",
    "strengthsA": "A측 종합 평가 (50-1000자)",
    "weaknessesA": "A측 개선점 (50-1000자)",
    "strengthsB": "B측 종합 평가 (50-1000자)",
    "weaknessesB": "B측 개선점 (50-1000자)",
    "overallQuality": 8,
    "fairnessScore": 9,
    "clarityScore": 7
  },
  "jurySummary": {
    "votesA": 2,
    "votesB": 3,
    "draws": 0,
    "averageConfidence": 7.5,
    "consensusLevel": "medium"
  },
  "recommendations": [
    "향후 토론 개선 방안 1",
    "향후 토론 개선 방안 2"
  ],
  "keyTakeaways": [
    "주요 학습 포인트 1",
    "주요 학습 포인트 2",
    "주요 학습 포인트 3"
  ]
}

- 한국어로 작성하세요
- 건설적이고 교육적인 내용으로 구성하세요
`;
  }

  /**
   * 기본 변호사 페르소나들을 반환합니다.
   */
  static getDefaultLawyerPersonas(): LawyerPersona[] {
    return [
      {
        id: 'lawyer_analytical',
        name: '김분석',
        specialty: '논리 분석',
        style: 'analytical',
        background: '20년 경력의 논리 분석 전문가로, 데이터와 사실에 기반한 냉철한 분석을 특기로 합니다.'
      },
      {
        id: 'lawyer_diplomatic',
        name: '이외교',
        specialty: '협상 및 중재',
        style: 'diplomatic',
        background: '국제 협상 경험이 풍부한 외교관 출신 변호사로, 균형잡힌 시각과 설득력 있는 논증을 구사합니다.'
      }
    ];
  }

  /**
   * 기본 심판 페르소나를 반환합니다.
   */
  static getDefaultJudgePersona(): JudgePersona {
    return {
      id: 'judge_balanced',
      name: '박공정',
      experience: '30년 경력의 대법관',
      philosophy: 'balanced',
      background: '다양한 분야의 사건을 다룬 경험이 풍부하며, 법리와 상식을 균형있게 고려하는 공정한 판단으로 유명합니다.'
    };
  }

  /**
   * 기본 배심원 페르소나들을 반환합니다.
   */
  static getDefaultJurorPersonas(): JurorPersona[] {
    return [
      {
        id: 'juror_citizen',
        name: '최시민',
        background: '30대 직장인, 평범한 시민의 관점에서 판단',
        expertise: '일반 상식'
      },
      {
        id: 'juror_academic',
        name: '정교수',
        background: '40대 대학교수, 학술적 관점에서 접근',
        expertise: '교육학'
      },
      {
        id: 'juror_business',
        name: '한사장',
        background: '50대 기업인, 실무적 관점에서 판단',
        expertise: '경영학'
      },
      {
        id: 'juror_youth',
        name: '윤청년',
        background: '20대 대학생, 젊은 세대의 시각으로 접근',
        expertise: '디지털 문화'
      },
      {
        id: 'juror_senior',
        name: '노어른',
        background: '60대 은퇴자, 인생 경험을 바탕으로 판단',
        expertise: '인생 경험'
      }
    ];
  }
}
