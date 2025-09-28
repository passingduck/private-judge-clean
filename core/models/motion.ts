import { z } from 'zod';

// 안건 상태 enum
export enum MotionStatus {
  PROPOSED = 'proposed',
  UNDER_NEGOTIATION = 'under_negotiation',
  AGREED = 'agreed',
  REJECTED = 'rejected'
}

// 안건 액션 enum
export enum MotionAction {
  PROPOSED = 'proposed',
  MODIFIED = 'modified',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted'
}

// 협상 히스토리 항목 스키마
export const NegotiationHistoryItemSchema = z.object({
  action: z.nativeEnum(MotionAction),
  user_id: z.string().uuid(),
  changes: z.record(z.any()).optional(),
  reason: z.string().optional(),
  timestamp: z.string().datetime()
});

// 기본 안건 스키마
export const MotionSchema = z.object({
  id: z.string().uuid('유효하지 않은 안건 ID 형식입니다'),
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  title: z.string()
    .min(10, '안건 제목은 최소 10자 이상이어야 합니다')
    .max(300, '안건 제목은 최대 300자까지 허용됩니다'),
  description: z.string()
    .min(50, '안건 설명은 최소 50자 이상이어야 합니다')
    .max(2000, '안건 설명은 최대 2000자까지 허용됩니다'),
  proposer_id: z.string().uuid('유효하지 않은 제안자 ID 형식입니다'),
  status: z.nativeEnum(MotionStatus, {
    errorMap: () => ({ message: '유효하지 않은 안건 상태입니다' })
  }),
  negotiation_history: z.array(NegotiationHistoryItemSchema).default([]),
  agreed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime('유효하지 않은 생성일 형식입니다'),
  updated_at: z.string().datetime('유효하지 않은 수정일 형식입니다')
});

// 안건 생성 스키마
export const CreateMotionSchema = z.object({
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  title: z.string()
    .min(10, '안건 제목은 최소 10자 이상이어야 합니다')
    .max(300, '안건 제목은 최대 300자까지 허용됩니다'),
  description: z.string()
    .min(50, '안건 설명은 최소 50자 이상이어야 합니다')
    .max(2000, '안건 설명은 최대 2000자까지 허용됩니다')
});

// 안건 응답 스키마
export const MotionResponseSchema = z.object({
  action: z.nativeEnum(MotionAction),
  modifications: z.object({
    title: z.string()
      .min(10, '수정된 제목은 최소 10자 이상이어야 합니다')
      .max(300, '수정된 제목은 최대 300자까지 허용됩니다')
      .optional(),
    description: z.string()
      .min(50, '수정된 설명은 최소 50자 이상이어야 합니다')
      .max(2000, '수정된 설명은 최대 2000자까지 허용됩니다')
      .optional()
  }).optional(),
  reason: z.string()
    .min(10, '사유는 최소 10자 이상이어야 합니다')
    .max(500, '사유는 최대 500자까지 허용됩니다')
    .optional()
});

// 타입 추출
export type Motion = z.infer<typeof MotionSchema>;
export type CreateMotion = z.infer<typeof CreateMotionSchema>;
export type MotionResponse = z.infer<typeof MotionResponseSchema>;
export type NegotiationHistoryItem = z.infer<typeof NegotiationHistoryItemSchema>;

// 안건 비즈니스 로직 클래스
export class MotionModel {
  constructor(private data: Motion) {}

  // Getter 메서드들
  get id(): string {
    return this.data.id;
  }

  get roomId(): string {
    return this.data.room_id;
  }

  get title(): string {
    return this.data.title;
  }

  get description(): string {
    return this.data.description;
  }

  get proposerId(): string {
    return this.data.proposer_id;
  }

  get status(): MotionStatus {
    return this.data.status;
  }

  get negotiationHistory(): NegotiationHistoryItem[] {
    return this.data.negotiation_history;
  }

  get agreedAt(): Date | null {
    return this.data.agreed_at ? new Date(this.data.agreed_at) : null;
  }

  get createdAt(): Date {
    return new Date(this.data.created_at);
  }

  get updatedAt(): Date {
    return new Date(this.data.updated_at);
  }

  // 상태 확인 메서드들
  isProposed(): boolean {
    return this.data.status === MotionStatus.PROPOSED;
  }

  isUnderNegotiation(): boolean {
    return this.data.status === MotionStatus.UNDER_NEGOTIATION;
  }

  isAgreed(): boolean {
    return this.data.status === MotionStatus.AGREED;
  }

  isRejected(): boolean {
    return this.data.status === MotionStatus.REJECTED;
  }

  isFinal(): boolean {
    return this.isAgreed() || this.isRejected();
  }

  canBeModified(): boolean {
    return this.isProposed() || this.isUnderNegotiation();
  }

  canBeResponded(): boolean {
    return this.isProposed() || this.isUnderNegotiation();
  }

  // 권한 확인 메서드들
  isProposer(userId: string): boolean {
    return userId === this.data.proposer_id;
  }

  canUserRespond(userId: string): boolean {
    return !this.isProposer(userId) && this.canBeResponded();
  }

  canUserModify(userId: string): boolean {
    return this.isProposer(userId) && this.canBeModified();
  }

  // 협상 히스토리 관련 메서드들
  getLatestAction(): NegotiationHistoryItem | null {
    if (this.data.negotiation_history.length === 0) return null;
    return this.data.negotiation_history[this.data.negotiation_history.length - 1];
  }

  getActionsByUser(userId: string): NegotiationHistoryItem[] {
    return this.data.negotiation_history.filter(item => item.user_id === userId);
  }

  getActionCount(): number {
    return this.data.negotiation_history.length;
  }

  hasUserResponded(userId: string): boolean {
    return this.getActionsByUser(userId).length > 0;
  }

  getModificationCount(): number {
    return this.data.negotiation_history.filter(
      item => item.action === MotionAction.MODIFIED
    ).length;
  }

  // 협상 진행 상황
  getNegotiationProgress(): {
    totalActions: number;
    modifications: number;
    lastAction: NegotiationHistoryItem | null;
    daysSinceProposed: number;
    isStale: boolean; // 3일 이상 응답 없음
  } {
    const now = new Date();
    const created = this.createdAt;
    const daysSinceProposed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    const lastAction = this.getLatestAction();
    const lastActionDate = lastAction ? new Date(lastAction.timestamp) : created;
    const daysSinceLastAction = Math.floor((now.getTime() - lastActionDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      totalActions: this.getActionCount(),
      modifications: this.getModificationCount(),
      lastAction,
      daysSinceProposed,
      isStale: daysSinceLastAction >= 3 && !this.isFinal()
    };
  }

  // 협상 히스토리 추가
  addNegotiationAction(
    action: MotionAction,
    userId: string,
    changes?: Record<string, any>,
    reason?: string
  ): NegotiationHistoryItem {
    const historyItem: NegotiationHistoryItem = {
      action,
      user_id: userId,
      changes,
      reason,
      timestamp: new Date().toISOString()
    };

    this.data.negotiation_history.push(historyItem);
    return historyItem;
  }

  // 안건 수정 적용
  applyModifications(modifications: { title?: string; description?: string }): void {
    if (modifications.title) {
      this.data.title = modifications.title;
    }
    if (modifications.description) {
      this.data.description = modifications.description;
    }
    this.data.updated_at = new Date().toISOString();
  }

  // 상태 변경
  changeStatus(newStatus: MotionStatus): void {
    this.data.status = newStatus;
    this.data.updated_at = new Date().toISOString();
    
    if (newStatus === MotionStatus.AGREED) {
      this.data.agreed_at = new Date().toISOString();
    }
  }

  // 검증 메서드들
  static validate(data: unknown): { success: true; data: Motion } | { success: false; error: string } {
    try {
      const validatedData = MotionSchema.parse(data);
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

  static validateCreate(data: unknown): { success: true; data: CreateMotion } | { success: false; error: string } {
    try {
      const validatedData = CreateMotionSchema.parse(data);
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

  static validateResponse(data: unknown): { success: true; data: MotionResponse } | { success: false; error: string } {
    try {
      const validatedData = MotionResponseSchema.parse(data);
      
      // 추가 비즈니스 로직 검증
      if (validatedData.action === MotionAction.MODIFIED && !validatedData.modifications) {
        return { success: false, error: '수정 액션에는 modifications가 필요합니다' };
      }
      
      if ((validatedData.action === MotionAction.REJECTED || validatedData.action === MotionAction.MODIFIED) 
          && !validatedData.reason) {
        return { success: false, error: '거절 또는 수정 액션에는 사유가 필요합니다' };
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
  static fromData(data: Motion): MotionModel {
    return new MotionModel(data);
  }

  static createNew(createData: CreateMotion, proposerId: string): Motion {
    const now = new Date().toISOString();
    
    return {
      id: crypto.randomUUID(),
      room_id: createData.room_id,
      title: createData.title,
      description: createData.description,
      proposer_id: proposerId,
      status: MotionStatus.PROPOSED,
      negotiation_history: [{
        action: MotionAction.PROPOSED,
        user_id: proposerId,
        timestamp: now
      }],
      agreed_at: null,
      created_at: now,
      updated_at: now
    };
  }

  // JSON 직렬화
  toJSON(): Motion {
    return { ...this.data };
  }

  // 요약 정보 반환
  getSummary() {
    const progress = this.getNegotiationProgress();
    
    return {
      id: this.data.id,
      title: this.data.title,
      status: this.data.status,
      proposer_id: this.data.proposer_id,
      totalActions: progress.totalActions,
      modifications: progress.modifications,
      isStale: progress.isStale,
      daysSinceProposed: progress.daysSinceProposed,
      agreed_at: this.data.agreed_at
    };
  }

  // 문자열 표현
  toString(): string {
    return `Motion(${this.data.id}, ${this.data.title}, ${this.data.status})`;
  }
}

// 안건 유틸리티 함수들
export const MotionUtils = {
  // 안건 정렬 함수
  sortMotions(motions: Motion[], sortBy: 'created' | 'updated' | 'title' | 'status' = 'updated'): Motion[] {
    return [...motions].sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title, 'ko');
        case 'status':
          const statusOrder = {
            [MotionStatus.PROPOSED]: 1,
            [MotionStatus.UNDER_NEGOTIATION]: 2,
            [MotionStatus.AGREED]: 3,
            [MotionStatus.REJECTED]: 4
          };
          return statusOrder[a.status] - statusOrder[b.status];
        default:
          return 0;
      }
    });
  },

  // 안건 필터링
  filterMotions(motions: Motion[], filters: {
    status?: MotionStatus[];
    searchTerm?: string;
    proposerId?: string;
    roomId?: string;
    isStale?: boolean;
  }): Motion[] {
    return motions.filter(motion => {
      if (filters.status && !filters.status.includes(motion.status)) {
        return false;
      }

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchesTitle = motion.title.toLowerCase().includes(term);
        const matchesDescription = motion.description.toLowerCase().includes(term);
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      if (filters.proposerId && motion.proposer_id !== filters.proposerId) {
        return false;
      }

      if (filters.roomId && motion.room_id !== filters.roomId) {
        return false;
      }

      if (filters.isStale !== undefined) {
        const motionModel = new MotionModel(motion);
        const progress = motionModel.getNegotiationProgress();
        if (progress.isStale !== filters.isStale) {
          return false;
        }
      }

      return true;
    });
  },

  // 안건 통계
  getMotionStats(motions: Motion[]): {
    total: number;
    byStatus: Record<MotionStatus, number>;
    averageNegotiationTime: number; // 시간 단위
    staleCount: number;
    agreedCount: number;
    rejectedCount: number;
  } {
    const byStatus = Object.values(MotionStatus).reduce((acc, status) => {
      acc[status] = motions.filter(m => m.status === status).length;
      return acc;
    }, {} as Record<MotionStatus, number>);

    // 합의된 안건들의 평균 협상 시간 계산
    const agreedMotions = motions.filter(m => m.status === MotionStatus.AGREED && m.agreed_at);
    const totalNegotiationTime = agreedMotions.reduce((sum, motion) => {
      const created = new Date(motion.created_at).getTime();
      const agreed = new Date(motion.agreed_at!).getTime();
      return sum + (agreed - created);
    }, 0);

    const staleCount = motions.filter(motion => {
      const motionModel = new MotionModel(motion);
      return motionModel.getNegotiationProgress().isStale;
    }).length;

    return {
      total: motions.length,
      byStatus,
      averageNegotiationTime: agreedMotions.length > 0 
        ? totalNegotiationTime / agreedMotions.length / (1000 * 60 * 60) 
        : 0,
      staleCount,
      agreedCount: byStatus[MotionStatus.AGREED],
      rejectedCount: byStatus[MotionStatus.REJECTED]
    };
  },

  // 협상 히스토리 분석
  analyzeNegotiationHistory(motions: Motion[]): {
    totalActions: number;
    averageActionsPerMotion: number;
    mostActiveUsers: { userId: string; actionCount: number }[];
    commonRejectionReasons: string[];
  } {
    const allActions = motions.flatMap(m => m.negotiation_history);
    const userActionCounts = new Map<string, number>();
    const rejectionReasons: string[] = [];

    allActions.forEach(action => {
      // 사용자별 액션 수 집계
      const currentCount = userActionCounts.get(action.user_id) || 0;
      userActionCounts.set(action.user_id, currentCount + 1);

      // 거절 사유 수집
      if (action.action === MotionAction.REJECTED && action.reason) {
        rejectionReasons.push(action.reason);
      }
    });

    const mostActiveUsers = Array.from(userActionCounts.entries())
      .map(([userId, actionCount]) => ({ userId, actionCount }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);

    return {
      totalActions: allActions.length,
      averageActionsPerMotion: motions.length > 0 ? allActions.length / motions.length : 0,
      mostActiveUsers,
      commonRejectionReasons: rejectionReasons.slice(0, 5) // 최근 5개
    };
  }
};

// 상수 정의
export const MOTION_CONSTANTS = {
  MIN_TITLE_LENGTH: 10,
  MAX_TITLE_LENGTH: 300,
  MIN_DESCRIPTION_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 2000,
  MIN_REASON_LENGTH: 10,
  MAX_REASON_LENGTH: 500,
  STALE_DAYS: 3, // 3일 이상 응답 없으면 stale
  MAX_MODIFICATIONS: 5 // 최대 수정 횟수
} as const;
