import { z } from 'zod';

// 사용자 프로필 스키마
const UserProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  avatar_url: z.string().optional()
});
import { UserProfile } from './user';

// 방 상태 enum
export enum RoomStatus {
  WAITING_PARTICIPANT = 'waiting_participant',
  AGENDA_NEGOTIATION = 'agenda_negotiation',
  ARGUMENTS_SUBMISSION = 'arguments_submission',
  AI_PROCESSING = 'ai_processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// 방 코드 생성 함수
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 기본 방 스키마
export const RoomSchema = z.object({
  id: z.string().uuid('유효하지 않은 방 ID 형식입니다'),
  code: z.string()
    .regex(/^[A-Z0-9]{6}$/, '방 코드는 6자리 영숫자 조합이어야 합니다'),
  creator_id: z.string().uuid('유효하지 않은 생성자 ID 형식입니다'),
  participant_id: z.string().uuid('유효하지 않은 참가자 ID 형식입니다').nullable(),
  title: z.string()
    .min(5, '방 제목은 최소 5자 이상이어야 합니다')
    .max(200, '방 제목은 최대 200자까지 허용됩니다'),
  description: z.string()
    .max(1000, '방 설명은 최대 1000자까지 허용됩니다')
    .nullable(),
  is_private: z.boolean().default(false).optional(),
  status: z.nativeEnum(RoomStatus),
  created_at: z.string(),
  updated_at: z.string()
});

// 방 생성 스키마
export const CreateRoomSchema = z.object({
  title: z.string()
    .min(5, '방 제목은 최소 5자 이상이어야 합니다')
    .max(200, '방 제목은 최대 200자까지 허용됩니다'),
  description: z.string()
    .max(1000, '방 설명은 최대 1000자까지 허용됩니다')
    .optional(),
  is_private: z.boolean().default(false).optional()
});

// 방 업데이트 스키마
export const UpdateRoomSchema = z.object({
  title: z.string()
    .min(5, '방 제목은 최소 5자 이상이어야 합니다')
    .max(200, '방 제목은 최대 200자까지 허용됩니다')
    .optional(),
  description: z.string()
    .max(1000, '방 설명은 최대 1000자까지 허용됩니다')
    .nullable()
    .optional(),
  status: z.nativeEnum(RoomStatus).optional()
});

// 방 상세 정보 스키마 (관계 데이터 포함)
export const RoomDetailSchema = RoomSchema.extend({
  creator: UserProfileSchema.optional(),
  participant: UserProfileSchema.optional(),
  member_count: z.number().int().min(1).max(2),
  motion: z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    status: z.enum(['proposed', 'under_negotiation', 'agreed', 'rejected']),
    agreed_at: z.string().datetime().nullable()
  }).optional(),
  arguments_count: z.number().int().min(0),
  rounds_count: z.number().int().min(0),
  progress: z.object({
    current_step: z.string(),
    total_steps: z.number().int(),
    completed_steps: z.number().int(),
    estimated_completion: z.string().datetime().nullable()
  }).optional()
});

// 타입 추출
export type Room = z.infer<typeof RoomSchema>;
export type CreateRoom = z.infer<typeof CreateRoomSchema>;
export type UpdateRoom = z.infer<typeof UpdateRoomSchema>;
export type RoomDetail = z.infer<typeof RoomDetailSchema>;

// 방 진행 단계 정의
export const ROOM_STEPS = {
  [RoomStatus.WAITING_PARTICIPANT]: {
    name: '참가자 대기',
    description: '상대방이 방에 참가하기를 기다리는 중입니다',
    order: 1,
    nextSteps: [RoomStatus.AGENDA_NEGOTIATION, RoomStatus.CANCELLED]
  },
  [RoomStatus.AGENDA_NEGOTIATION]: {
    name: '안건 협상',
    description: '토론 주제에 대해 양측이 합의하는 중입니다',
    order: 2,
    nextSteps: [RoomStatus.ARGUMENTS_SUBMISSION, RoomStatus.CANCELLED]
  },
  [RoomStatus.ARGUMENTS_SUBMISSION]: {
    name: '주장 제출',
    description: '양측이 각자의 주장을 작성하고 있습니다',
    order: 3,
    nextSteps: [RoomStatus.AI_PROCESSING, RoomStatus.CANCELLED]
  },
  [RoomStatus.AI_PROCESSING]: {
    name: 'AI 토론 진행',
    description: 'AI가 토론을 진행하고 판결을 내리는 중입니다',
    order: 4,
    nextSteps: [RoomStatus.COMPLETED, RoomStatus.CANCELLED]
  },
  [RoomStatus.COMPLETED]: {
    name: '완료',
    description: '토론이 완료되고 최종 판결이 나왔습니다',
    order: 5,
    nextSteps: []
  },
  [RoomStatus.CANCELLED]: {
    name: '취소됨',
    description: '토론이 취소되었습니다',
    order: -1,
    nextSteps: []
  }
} as const;

// 방 비즈니스 로직 클래스
export class RoomModel {
  constructor(private data: Room) {}

  // Getter 메서드들
  get id(): string {
    return this.data.id;
  }

  get code(): string {
    return this.data.code;
  }

  get creatorId(): string {
    return this.data.creator_id;
  }

  get participantId(): string | null {
    return this.data.participant_id;
  }

  get title(): string {
    return this.data.title;
  }

  get description(): string | null {
    return this.data.description;
  }

  get status(): RoomStatus {
    return this.data.status;
  }

  get createdAt(): Date {
    return new Date(this.data.created_at);
  }

  get updatedAt(): Date {
    return new Date(this.data.updated_at);
  }

  get isPrivate(): boolean {
    return this.data.is_private ?? false;
  }

  // 상태 확인 메서드들
  isWaitingForParticipant(): boolean {
    return this.data.status === RoomStatus.WAITING_PARTICIPANT;
  }

  isInProgress(): boolean {
    return [
      RoomStatus.AGENDA_NEGOTIATION,
      RoomStatus.ARGUMENTS_SUBMISSION,
      RoomStatus.AI_PROCESSING
    ].includes(this.data.status);
  }

  isCompleted(): boolean {
    return this.data.status === RoomStatus.COMPLETED;
  }

  isCancelled(): boolean {
    return this.data.status === RoomStatus.CANCELLED;
  }

  isActive(): boolean {
    return !this.isCompleted() && !this.isCancelled();
  }

  // 참가자 관련 메서드들
  hasParticipant(): boolean {
    return !!this.data.participant_id;
  }

  isFull(): boolean {
    return this.hasParticipant();
  }

  canJoin(): boolean {
    return this.isWaitingForParticipant() && !this.hasParticipant();
  }

  isUserMember(userId: string): boolean {
    return userId === this.data.creator_id || userId === this.data.participant_id;
  }

  isCreator(userId: string): boolean {
    return userId === this.data.creator_id;
  }

  isParticipant(userId: string): boolean {
    return userId === this.data.participant_id;
  }

  getUserSide(userId: string): 'A' | 'B' | null {
    if (userId === this.data.creator_id) return 'A';
    if (userId === this.data.participant_id) return 'B';
    return null;
  }

  // 상태 전환 메서드들
  canTransitionTo(newStatus: RoomStatus): boolean {
    const currentStep = ROOM_STEPS[this.data.status];
    return ([...currentStep.nextSteps] as RoomStatus[]).includes(newStatus);
  }

  getNextPossibleStatuses(): RoomStatus[] {
    return [...ROOM_STEPS[this.data.status].nextSteps];
  }

  getCurrentStepInfo() {
    return ROOM_STEPS[this.data.status];
  }

  getProgress(): { current: number; total: number; percentage: number } {
    const currentOrder = ROOM_STEPS[this.data.status].order;
    const totalSteps = 5; // 총 5단계 (취소 제외)
    
    if (currentOrder === -1) { // 취소된 경우
      return { current: 0, total: totalSteps, percentage: 0 };
    }

    return {
      current: currentOrder,
      total: totalSteps,
      percentage: Math.round((currentOrder / totalSteps) * 100)
    };
  }

  // 시간 관련 메서드들
  getAge(): { days: number; hours: number; minutes: number } {
    const now = new Date();
    const created = this.createdAt;
    const diffMs = now.getTime() - created.getTime();
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  }

  getAgeString(): string {
    const { days, hours, minutes } = this.getAge();
    
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  }

  // 검증 메서드들
  static validate(data: unknown): { success: true; data: Room } | { success: false; error: string } {
    try {
      const validatedData = RoomSchema.parse(data);
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

  static validateCreate(data: unknown): { success: true; data: CreateRoom } | { success: false; error: string } {
    try {
      const validatedData = CreateRoomSchema.parse(data);
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

  static validateUpdate(data: unknown): { success: true; data: UpdateRoom } | { success: false; error: string } {
    try {
      const validatedData = UpdateRoomSchema.parse(data);
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
  static fromData(data: Room): RoomModel {
    return new RoomModel(data);
  }

  // JSON 직렬화
  toJSON(): Room {
    return { ...this.data };
  }

  // 요약 정보 반환
  getSummary() {
    return {
      id: this.data.id,
      code: this.data.code,
      title: this.data.title,
      status: this.data.status,
      hasParticipant: this.hasParticipant(),
      progress: this.getProgress(),
      age: this.getAgeString()
    };
  }

  // 문자열 표현
  toString(): string {
    return `Room(${this.data.code}, ${this.data.title}, ${this.data.status})`;
  }
}

// 방 유틸리티 함수들
export const RoomUtils = {
  // 방 코드 유효성 검사
  isValidRoomCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code);
  },

  // 고유한 방 코드 생성 (충돌 방지)
  generateUniqueCode(existingCodes: string[] = []): string {
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = generateRoomCode();
      attempts++;
      
      if (attempts > maxAttempts) {
        throw new Error('고유한 방 코드 생성에 실패했습니다');
      }
    } while (existingCodes.includes(code));

    return code;
  },

  // 방 정렬 함수
  sortRooms(rooms: Room[], sortBy: 'created' | 'updated' | 'title' | 'status' = 'updated'): Room[] {
    return [...rooms].sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title, 'ko');
        case 'status':
          const orderA = ROOM_STEPS[a.status].order;
          const orderB = ROOM_STEPS[b.status].order;
          return orderB - orderA;
        default:
          return 0;
      }
    });
  },

  // 방 필터링
  filterRooms(rooms: Room[], filters: {
    status?: RoomStatus[];
    searchTerm?: string;
    creatorId?: string;
    participantId?: string;
    hasParticipant?: boolean;
    isPrivate?: boolean;
    userId?: string; // For filtering accessible rooms
  }): Room[] {
    return rooms.filter(room => {
      if (filters.status && !filters.status.includes(room.status)) {
        return false;
      }

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchesTitle = room.title.toLowerCase().includes(term);
        const matchesCode = room.code.toLowerCase().includes(term);
        const matchesDescription = room.description?.toLowerCase().includes(term) || false;
        if (!matchesTitle && !matchesCode && !matchesDescription) {
          return false;
        }
      }

      if (filters.creatorId && room.creator_id !== filters.creatorId) {
        return false;
      }

      if (filters.participantId && room.participant_id !== filters.participantId) {
        return false;
      }

      if (filters.hasParticipant !== undefined) {
        const hasParticipant = !!room.participant_id;
        if (hasParticipant !== filters.hasParticipant) {
          return false;
        }
      }

      if (filters.isPrivate !== undefined && room.is_private !== filters.isPrivate) {
        return false;
      }

      // Filter out private rooms unless user is a member
      if (filters.userId && room.is_private) {
        const isMember = room.creator_id === filters.userId || room.participant_id === filters.userId;
        if (!isMember) {
          return false;
        }
      }

      return true;
    });
  },

  // 방 통계
  getRoomStats(rooms: Room[]): {
    total: number;
    byStatus: Record<RoomStatus, number>;
    withParticipant: number;
    recentlyCreated: number; // 최근 24시간
    averageAge: number; // 시간 단위
  } {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const byStatus = Object.values(RoomStatus).reduce((acc, status) => {
      acc[status] = rooms.filter(r => r.status === status).length;
      return acc;
    }, {} as Record<RoomStatus, number>);

    const totalAge = rooms.reduce((sum, room) => {
      return sum + (now.getTime() - new Date(room.created_at).getTime());
    }, 0);

    return {
      total: rooms.length,
      byStatus,
      withParticipant: rooms.filter(r => !!r.participant_id).length,
      recentlyCreated: rooms.filter(r => new Date(r.created_at) > dayAgo).length,
      averageAge: rooms.length > 0 ? totalAge / rooms.length / (1000 * 60 * 60) : 0
    };
  },

  // 상태 전환 가능성 체크
  canTransitionBatch(rooms: Room[], targetStatus: RoomStatus): { 
    canTransition: Room[]; 
    cannotTransition: Room[] 
  } {
    const canTransition: Room[] = [];
    const cannotTransition: Room[] = [];

    rooms.forEach(room => {
      const roomModel = new RoomModel(room);
      if (roomModel.canTransitionTo(targetStatus)) {
        canTransition.push(room);
      } else {
        cannotTransition.push(room);
      }
    });

    return { canTransition, cannotTransition };
  }
};

// 상수 정의
export const ROOM_CONSTANTS = {
  MIN_TITLE_LENGTH: 5,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  CODE_LENGTH: 6,
  CODE_PATTERN: /^[A-Z0-9]{6}$/,
  MAX_PARTICIPANTS: 2,
  CODE_GENERATION_MAX_ATTEMPTS: 100
} as const;
