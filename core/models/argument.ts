import { z } from 'zod';

// 증거 타입 enum
export enum EvidenceType {
  LINK = 'link',
  DOCUMENT = 'document',
  STATISTIC = 'statistic',
  QUOTE = 'quote'
}

// 측면 enum
export enum ArgumentSide {
  A = 'A',
  B = 'B'
}

// 증거 스키마
export const EvidenceSchema = z.object({
  type: z.nativeEnum(EvidenceType),
  title: z.string()
    .min(3, '증거 제목은 최소 3자 이상이어야 합니다')
    .max(200, '증거 제목은 최대 200자까지 허용됩니다'),
  url: z.string().url('유효하지 않은 URL 형식입니다').optional(),
  description: z.string()
    .max(500, '증거 설명은 최대 500자까지 허용됩니다')
    .optional(),
  content: z.string()
    .max(1000, '증거 내용은 최대 1000자까지 허용됩니다')
    .optional()
});

// 기본 주장 스키마
export const ArgumentSchema = z.object({
  id: z.string().uuid('유효하지 않은 주장 ID 형식입니다'),
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  user_id: z.string().uuid('유효하지 않은 사용자 ID 형식입니다'),
  side: z.nativeEnum(ArgumentSide, {
    errorMap: () => ({ message: '유효하지 않은 측면입니다 (A 또는 B)' })
  }),
  title: z.string()
    .min(10, '주장 제목은 최소 10자 이상이어야 합니다')
    .max(200, '주장 제목은 최대 200자까지 허용됩니다'),
  content: z.string()
    .min(100, '주장 내용은 최소 100자 이상이어야 합니다')
    .max(5000, '주장 내용은 최대 5000자까지 허용됩니다'),
  evidence: z.array(EvidenceSchema)
    .max(10, '증거는 최대 10개까지 첨부할 수 있습니다')
    .default([]),
  submitted_at: z.string().datetime('유효하지 않은 제출일 형식입니다'),
  created_at: z.string().datetime('유효하지 않은 생성일 형식입니다'),
  updated_at: z.string().datetime('유효하지 않은 수정일 형식입니다')
});

// 주장 생성 스키마
export const CreateArgumentSchema = z.object({
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  title: z.string()
    .min(10, '주장 제목은 최소 10자 이상이어야 합니다')
    .max(200, '주장 제목은 최대 200자까지 허용됩니다'),
  content: z.string()
    .min(100, '주장 내용은 최소 100자 이상이어야 합니다')
    .max(5000, '주장 내용은 최대 5000자까지 허용됩니다'),
  evidence: z.array(EvidenceSchema)
    .max(10, '증거는 최대 10개까지 첨부할 수 있습니다')
    .default([])
});

// 주장 업데이트 스키마 (제출 전에만 수정 가능)
export const UpdateArgumentSchema = z.object({
  title: z.string()
    .min(10, '주장 제목은 최소 10자 이상이어야 합니다')
    .max(200, '주장 제목은 최대 200자까지 허용됩니다')
    .optional(),
  content: z.string()
    .min(100, '주장 내용은 최소 100자 이상이어야 합니다')
    .max(5000, '주장 내용은 최대 5000자까지 허용됩니다')
    .optional(),
  evidence: z.array(EvidenceSchema)
    .max(10, '증거는 최대 10개까지 첨부할 수 있습니다')
    .optional()
});

// 타입 추출
export type Argument = z.infer<typeof ArgumentSchema>;
export type CreateArgument = z.infer<typeof CreateArgumentSchema>;
export type UpdateArgument = z.infer<typeof UpdateArgumentSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;

// 주장 비즈니스 로직 클래스
export class ArgumentModel {
  constructor(private data: Argument) {}

  // Getter 메서드들
  get id(): string {
    return this.data.id;
  }

  get roomId(): string {
    return this.data.room_id;
  }

  get userId(): string {
    return this.data.user_id;
  }

  get side(): ArgumentSide {
    return this.data.side;
  }

  get title(): string {
    return this.data.title;
  }

  get content(): string {
    return this.data.content;
  }

  get evidence(): Evidence[] {
    return this.data.evidence;
  }

  get submittedAt(): Date {
    return new Date(this.data.submitted_at);
  }

  get createdAt(): Date {
    return new Date(this.data.created_at);
  }

  get updatedAt(): Date {
    return new Date(this.data.updated_at);
  }

  // 상태 확인 메서드들
  isSubmitted(): boolean {
    return !!this.data.submitted_at;
  }

  canBeModified(): boolean {
    // 제출되지 않은 경우에만 수정 가능
    return !this.isSubmitted();
  }

  // 소유권 확인
  isOwnedBy(userId: string): boolean {
    return this.data.user_id === userId;
  }

  // 증거 관련 메서드들
  hasEvidence(): boolean {
    return this.data.evidence.length > 0;
  }

  getEvidenceCount(): number {
    return this.data.evidence.length;
  }

  getEvidenceByType(type: EvidenceType): Evidence[] {
    return this.data.evidence.filter(e => e.type === type);
  }

  getEvidenceTypes(): EvidenceType[] {
    return [...new Set(this.data.evidence.map(e => e.type))];
  }

  // 링크 증거만 추출
  getLinkEvidence(): Evidence[] {
    return this.getEvidenceByType(EvidenceType.LINK);
  }

  // 문서 증거만 추출
  getDocumentEvidence(): Evidence[] {
    return this.getEvidenceByType(EvidenceType.DOCUMENT);
  }

  // 통계 증거만 추출
  getStatisticEvidence(): Evidence[] {
    return this.getEvidenceByType(EvidenceType.STATISTIC);
  }

  // 인용 증거만 추출
  getQuoteEvidence(): Evidence[] {
    return this.getEvidenceByType(EvidenceType.QUOTE);
  }

  // 내용 분석 메서드들
  getWordCount(): number {
    return this.data.content.split(/\s+/).length;
  }

  getCharacterCount(): number {
    return this.data.content.length;
  }

  getParagraphCount(): number {
    return this.data.content.split(/\n\s*\n/).length;
  }

  // 주장 강도 평가 (간단한 휴리스틱)
  getStrengthScore(): {
    score: number; // 0-100
    factors: {
      contentLength: number;
      evidenceCount: number;
      evidenceVariety: number;
      structureScore: number;
    };
  } {
    const factors = {
      // 내용 길이 점수 (100-5000자 기준)
      contentLength: Math.min(100, Math.max(0, (this.getCharacterCount() - 100) / 49)),
      
      // 증거 개수 점수 (0-10개 기준)
      evidenceCount: Math.min(100, this.getEvidenceCount() * 20),
      
      // 증거 다양성 점수 (타입 개수 기준)
      evidenceVariety: Math.min(100, this.getEvidenceTypes().length * 25),
      
      // 구조 점수 (문단 수 기준)
      structureScore: Math.min(100, Math.max(20, this.getParagraphCount() * 30))
    };

    const score = Math.round(
      (factors.contentLength * 0.3 + 
       factors.evidenceCount * 0.3 + 
       factors.evidenceVariety * 0.2 + 
       factors.structureScore * 0.2)
    );

    return { score, factors };
  }

  // 증거 추가
  addEvidence(evidence: Evidence): void {
    if (this.data.evidence.length >= 10) {
      throw new Error('증거는 최대 10개까지만 첨부할 수 있습니다');
    }
    this.data.evidence.push(evidence);
    this.data.updated_at = new Date().toISOString();
  }

  // 증거 제거
  removeEvidence(index: number): void {
    if (index >= 0 && index < this.data.evidence.length) {
      this.data.evidence.splice(index, 1);
      this.data.updated_at = new Date().toISOString();
    }
  }

  // 주장 제출
  submit(): void {
    if (this.isSubmitted()) {
      throw new Error('이미 제출된 주장입니다');
    }
    
    this.data.submitted_at = new Date().toISOString();
    this.data.updated_at = new Date().toISOString();
  }

  // 검증 메서드들
  static validate(data: unknown): { success: true; data: Argument } | { success: false; error: string } {
    try {
      const validatedData = ArgumentSchema.parse(data);
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

  static validateCreate(data: unknown): { success: true; data: CreateArgument } | { success: false; error: string } {
    try {
      const validatedData = CreateArgumentSchema.parse(data);
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

  static validateUpdate(data: unknown): { success: true; data: UpdateArgument } | { success: false; error: string } {
    try {
      const validatedData = UpdateArgumentSchema.parse(data);
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

  static validateEvidence(data: unknown): { success: true; data: Evidence } | { success: false; error: string } {
    try {
      const validatedData = EvidenceSchema.parse(data);
      
      // 추가 검증: 링크 타입인 경우 URL 필수
      if (validatedData.type === EvidenceType.LINK && !validatedData.url) {
        return { success: false, error: '링크 타입 증거에는 URL이 필요합니다' };
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

  // 팩토리 메서드
  static fromData(data: Argument): ArgumentModel {
    return new ArgumentModel(data);
  }

  static createNew(createData: CreateArgument, userId: string, side: ArgumentSide): Argument {
    const now = new Date().toISOString();
    
    return {
      id: crypto.randomUUID(),
      room_id: createData.room_id,
      user_id: userId,
      side,
      title: createData.title,
      content: createData.content,
      evidence: createData.evidence || [],
      submitted_at: now, // 생성 시 바로 제출됨
      created_at: now,
      updated_at: now
    };
  }

  // JSON 직렬화
  toJSON(): Argument {
    return { ...this.data };
  }

  // 요약 정보 반환
  getSummary() {
    const strength = this.getStrengthScore();
    
    return {
      id: this.data.id,
      title: this.data.title,
      side: this.data.side,
      user_id: this.data.user_id,
      wordCount: this.getWordCount(),
      evidenceCount: this.getEvidenceCount(),
      evidenceTypes: this.getEvidenceTypes(),
      strengthScore: strength.score,
      isSubmitted: this.isSubmitted(),
      submitted_at: this.data.submitted_at
    };
  }

  // 문자열 표현
  toString(): string {
    return `Argument(${this.data.id}, ${this.data.side}, ${this.data.title})`;
  }
}

// 주장 유틸리티 함수들
export const ArgumentUtils = {
  // 주장 정렬 함수
  sortArguments(arguments: Argument[], sortBy: 'created' | 'submitted' | 'title' | 'side' | 'strength' = 'submitted'): Argument[] {
    return [...arguments].sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'submitted':
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title, 'ko');
        case 'side':
          return a.side.localeCompare(b.side);
        case 'strength':
          const strengthA = new ArgumentModel(a).getStrengthScore().score;
          const strengthB = new ArgumentModel(b).getStrengthScore().score;
          return strengthB - strengthA;
        default:
          return 0;
      }
    });
  },

  // 주장 필터링
  filterArguments(arguments: Argument[], filters: {
    side?: ArgumentSide[];
    searchTerm?: string;
    userId?: string;
    roomId?: string;
    hasEvidence?: boolean;
    evidenceType?: EvidenceType;
    minStrength?: number;
  }): Argument[] {
    return arguments.filter(argument => {
      if (filters.side && !filters.side.includes(argument.side)) {
        return false;
      }

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchesTitle = argument.title.toLowerCase().includes(term);
        const matchesContent = argument.content.toLowerCase().includes(term);
        if (!matchesTitle && !matchesContent) {
          return false;
        }
      }

      if (filters.userId && argument.user_id !== filters.userId) {
        return false;
      }

      if (filters.roomId && argument.room_id !== filters.roomId) {
        return false;
      }

      if (filters.hasEvidence !== undefined) {
        const hasEvidence = argument.evidence.length > 0;
        if (hasEvidence !== filters.hasEvidence) {
          return false;
        }
      }

      if (filters.evidenceType) {
        const hasEvidenceType = argument.evidence.some(e => e.type === filters.evidenceType);
        if (!hasEvidenceType) {
          return false;
        }
      }

      if (filters.minStrength !== undefined) {
        const argumentModel = new ArgumentModel(argument);
        const strength = argumentModel.getStrengthScore().score;
        if (strength < filters.minStrength) {
          return false;
        }
      }

      return true;
    });
  },

  // 주장 통계
  getArgumentStats(arguments: Argument[]): {
    total: number;
    bySide: Record<ArgumentSide, number>;
    byEvidenceType: Record<EvidenceType, number>;
    averageWordCount: number;
    averageEvidenceCount: number;
    averageStrengthScore: number;
    strongArguments: number; // 강도 80 이상
  } {
    const bySide = Object.values(ArgumentSide).reduce((acc, side) => {
      acc[side] = arguments.filter(a => a.side === side).length;
      return acc;
    }, {} as Record<ArgumentSide, number>);

    const byEvidenceType = Object.values(EvidenceType).reduce((acc, type) => {
      acc[type] = arguments.filter(a => 
        a.evidence.some(e => e.type === type)
      ).length;
      return acc;
    }, {} as Record<EvidenceType, number>);

    const totalWords = arguments.reduce((sum, arg) => {
      const model = new ArgumentModel(arg);
      return sum + model.getWordCount();
    }, 0);

    const totalEvidence = arguments.reduce((sum, arg) => sum + arg.evidence.length, 0);

    const totalStrength = arguments.reduce((sum, arg) => {
      const model = new ArgumentModel(arg);
      return sum + model.getStrengthScore().score;
    }, 0);

    const strongArguments = arguments.filter(arg => {
      const model = new ArgumentModel(arg);
      return model.getStrengthScore().score >= 80;
    }).length;

    return {
      total: arguments.length,
      bySide,
      byEvidenceType,
      averageWordCount: arguments.length > 0 ? Math.round(totalWords / arguments.length) : 0,
      averageEvidenceCount: arguments.length > 0 ? Math.round(totalEvidence / arguments.length * 10) / 10 : 0,
      averageStrengthScore: arguments.length > 0 ? Math.round(totalStrength / arguments.length) : 0,
      strongArguments
    };
  },

  // 대결 분석 (A vs B)
  analyzeDebate(argumentsA: Argument[], argumentsB: Argument[]): {
    sideA: {
      count: number;
      totalWords: number;
      totalEvidence: number;
      averageStrength: number;
      strongestArgument: Argument | null;
    };
    sideB: {
      count: number;
      totalWords: number;
      totalEvidence: number;
      averageStrength: number;
      strongestArgument: Argument | null;
    };
    comparison: {
      wordCountDifference: number;
      evidenceCountDifference: number;
      strengthDifference: number;
      advantageSide: ArgumentSide | 'tie';
    };
  } {
    const analyzeArguments = (args: Argument[]) => {
      if (args.length === 0) {
        return {
          count: 0,
          totalWords: 0,
          totalEvidence: 0,
          averageStrength: 0,
          strongestArgument: null
        };
      }

      const models = args.map(arg => new ArgumentModel(arg));
      const totalWords = models.reduce((sum, model) => sum + model.getWordCount(), 0);
      const totalEvidence = args.reduce((sum, arg) => sum + arg.evidence.length, 0);
      const strengths = models.map(model => model.getStrengthScore().score);
      const averageStrength = strengths.reduce((sum, s) => sum + s, 0) / strengths.length;
      
      const strongestIndex = strengths.indexOf(Math.max(...strengths));
      const strongestArgument = args[strongestIndex];

      return {
        count: args.length,
        totalWords,
        totalEvidence,
        averageStrength: Math.round(averageStrength),
        strongestArgument
      };
    };

    const sideA = analyzeArguments(argumentsA);
    const sideB = analyzeArguments(argumentsB);

    const wordCountDifference = sideA.totalWords - sideB.totalWords;
    const evidenceCountDifference = sideA.totalEvidence - sideB.totalEvidence;
    const strengthDifference = sideA.averageStrength - sideB.averageStrength;

    let advantageSide: ArgumentSide | 'tie' = 'tie';
    const totalAdvantage = 
      (wordCountDifference > 0 ? 1 : wordCountDifference < 0 ? -1 : 0) +
      (evidenceCountDifference > 0 ? 1 : evidenceCountDifference < 0 ? -1 : 0) +
      (strengthDifference > 5 ? 1 : strengthDifference < -5 ? -1 : 0);

    if (totalAdvantage > 0) advantageSide = ArgumentSide.A;
    else if (totalAdvantage < 0) advantageSide = ArgumentSide.B;

    return {
      sideA,
      sideB,
      comparison: {
        wordCountDifference,
        evidenceCountDifference,
        strengthDifference,
        advantageSide
      }
    };
  }
};

// 상수 정의
export const ARGUMENT_CONSTANTS = {
  MIN_TITLE_LENGTH: 10,
  MAX_TITLE_LENGTH: 200,
  MIN_CONTENT_LENGTH: 100,
  MAX_CONTENT_LENGTH: 5000,
  MAX_EVIDENCE_COUNT: 10,
  MIN_EVIDENCE_TITLE_LENGTH: 3,
  MAX_EVIDENCE_TITLE_LENGTH: 200,
  MAX_EVIDENCE_DESCRIPTION_LENGTH: 500,
  MAX_EVIDENCE_CONTENT_LENGTH: 1000,
  STRONG_ARGUMENT_THRESHOLD: 80 // 강한 주장 기준 점수
} as const;
