import { z } from 'zod';
import { ArgumentSide, EvidenceSchema, Evidence } from './argument';

// 반론 라운드 enum (1차 토론 후 반론, 2차 토론 후 반론)
export enum RebuttalRound {
  AFTER_ROUND_1 = 1,
  AFTER_ROUND_2 = 2
}

// 반론 스키마
export const RebuttalSchema = z.object({
  id: z.string().uuid('유효하지 않은 반론 ID 형식입니다'),
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  user_id: z.string().uuid('유효하지 않은 사용자 ID 형식입니다'),
  side: z.nativeEnum(ArgumentSide, {
    errorMap: () => ({ message: '유효하지 않은 측면입니다 (A 또는 B)' })
  }),
  round_number: z.nativeEnum(RebuttalRound),
  content: z.string()
    .min(50, '반론 내용은 최소 50자 이상이어야 합니다')
    .max(3000, '반론 내용은 최대 3000자까지 허용됩니다'),
  evidence: z.array(EvidenceSchema)
    .max(5, '반론 증거는 최대 5개까지 첨부할 수 있습니다')
    .default([]),
  submitted_at: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

// 반론 생성 스키마
export const CreateRebuttalSchema = z.object({
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  round_number: z.nativeEnum(RebuttalRound),
  content: z.string()
    .min(50, '반론 내용은 최소 50자 이상이어야 합니다')
    .max(3000, '반론 내용은 최대 3000자까지 허용됩니다'),
  evidence: z.array(EvidenceSchema)
    .max(5, '반론 증거는 최대 5개까지 첨부할 수 있습니다')
    .default([])
});

// 타입 추출
export type Rebuttal = z.infer<typeof RebuttalSchema>;
export type CreateRebuttal = z.infer<typeof CreateRebuttalSchema>;

// 반론 비즈니스 로직 클래스
export class RebuttalModel {
  constructor(private data: Rebuttal) {}

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

  get roundNumber(): RebuttalRound {
    return this.data.round_number;
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

  // 내용 분석 메서드들
  getWordCount(): number {
    return this.data.content.split(/\s+/).length;
  }

  getCharacterCount(): number {
    return this.data.content.length;
  }

  // 검증 메서드들
  static validate(data: unknown): { success: true; data: Rebuttal } | { success: false; error: string } {
    try {
      const validatedData = RebuttalSchema.parse(data);
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

  static validateCreate(data: unknown): { success: true; data: CreateRebuttal } | { success: false; error: string } {
    try {
      const validatedData = CreateRebuttalSchema.parse(data);
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
  static fromData(data: Rebuttal): RebuttalModel {
    return new RebuttalModel(data);
  }

  static createNew(createData: CreateRebuttal, userId: string, side: ArgumentSide): Rebuttal {
    const now = new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      room_id: createData.room_id,
      user_id: userId,
      side,
      round_number: createData.round_number,
      content: createData.content,
      evidence: createData.evidence || [],
      submitted_at: now,
      created_at: now,
      updated_at: now
    };
  }

  // JSON 직렬화
  toJSON(): Rebuttal {
    return { ...this.data };
  }

  // 요약 정보 반환
  getSummary() {
    return {
      id: this.data.id,
      side: this.data.side,
      round_number: this.data.round_number,
      user_id: this.data.user_id,
      wordCount: this.getWordCount(),
      evidenceCount: this.getEvidenceCount(),
      submitted_at: this.data.submitted_at
    };
  }

  // 문자열 표현
  toString(): string {
    return `Rebuttal(${this.data.id}, ${this.data.side}, Round ${this.data.round_number})`;
  }
}

// 상수 정의
export const REBUTTAL_CONSTANTS = {
  MIN_CONTENT_LENGTH: 50,
  MAX_CONTENT_LENGTH: 3000,
  MAX_EVIDENCE_COUNT: 5
} as const;
