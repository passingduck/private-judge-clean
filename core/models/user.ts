import { z } from 'zod';

// 기본 사용자 스키마
export const UserSchema = z.object({
  id: z.string().uuid('유효하지 않은 사용자 ID 형식입니다'),
  email: z.string().email('유효하지 않은 이메일 형식입니다'),
  display_name: z.string().nullable().optional(),
  avatar_url: z.string().url('유효하지 않은 아바타 URL 형식입니다').nullable().optional(),
  created_at: z.string().datetime('유효하지 않은 생성일 형식입니다'),
  updated_at: z.string().datetime('유효하지 않은 수정일 형식입니다')
});

// 사용자 생성 스키마 (입력용)
export const CreateUserSchema = z.object({
  email: z.string().email('유효하지 않은 이메일 형식입니다'),
  display_name: z.string()
    .min(2, '표시명은 최소 2자 이상이어야 합니다')
    .max(50, '표시명은 최대 50자까지 허용됩니다')
    .optional(),
  avatar_url: z.string().url('유효하지 않은 아바타 URL 형식입니다').optional()
});

// 사용자 업데이트 스키마
export const UpdateUserSchema = z.object({
  display_name: z.string()
    .min(2, '표시명은 최소 2자 이상이어야 합니다')
    .max(50, '표시명은 최대 50자까지 허용됩니다')
    .optional(),
  avatar_url: z.string().url('유효하지 않은 아바타 URL 형식입니다').nullable().optional()
});

// 사용자 프로필 스키마 (공개 정보만)
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable()
});

// 타입 추출
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

// 사용자 역할 enum
export enum UserRole {
  CREATOR = 'creator',
  PARTICIPANT = 'participant'
}

// 사용자 측면 enum (토론에서의 위치)
export enum UserSide {
  A = 'A',
  B = 'B'
}

// 사용자 상태 enum
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

// 사용자 비즈니스 로직 클래스
export class UserModel {
  constructor(private data: User) {}

  // Getter 메서드들
  get id(): string {
    return this.data.id;
  }

  get email(): string {
    return this.data.email;
  }

  get displayName(): string | null {
    return this.data.display_name || null;
  }

  get avatarUrl(): string | null {
    return this.data.avatar_url || null;
  }

  get createdAt(): Date {
    return new Date(this.data.created_at);
  }

  get updatedAt(): Date {
    return new Date(this.data.updated_at);
  }

  // 공개 프로필 반환
  getPublicProfile(): UserProfile {
    return {
      id: this.data.id,
      display_name: this.data.display_name || null,
      avatar_url: this.data.avatar_url || null
    };
  }

  // 표시명 또는 이메일 반환 (표시명 우선)
  getDisplayNameOrEmail(): string {
    return this.data.display_name || this.data.email;
  }

  // 아바타 URL 또는 기본 아바타 반환
  getAvatarUrlOrDefault(): string {
    return this.data.avatar_url || this.generateDefaultAvatar();
  }

  // 기본 아바타 생성 (이니셜 기반)
  private generateDefaultAvatar(): string {
    const name = this.data.display_name || this.data.email;
    const initials = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
    
    // 간단한 색상 해시 생성
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    const colorIndex = this.data.id.charCodeAt(0) % colors.length;
    const backgroundColor = colors[colorIndex];
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor.slice(1)}&color=fff&size=128`;
  }

  // 사용자 데이터 검증
  static validate(data: unknown): { success: true; data: User } | { success: false; error: string } {
    try {
      const validatedData = UserSchema.parse(data);
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

  // 생성 데이터 검증
  static validateCreate(data: unknown): { success: true; data: CreateUser } | { success: false; error: string } {
    try {
      const validatedData = CreateUserSchema.parse(data);
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

  // 업데이트 데이터 검증
  static validateUpdate(data: unknown): { success: true; data: UpdateUser } | { success: false; error: string } {
    try {
      const validatedData = UpdateUserSchema.parse(data);
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
  static fromData(data: User): UserModel {
    return new UserModel(data);
  }

  // JSON 직렬화
  toJSON(): User {
    return { ...this.data };
  }

  // 문자열 표현
  toString(): string {
    return `User(${this.data.id}, ${this.getDisplayNameOrEmail()})`;
  }
}

// 사용자 유틸리티 함수들
export const UserUtils = {
  // 이메일에서 기본 표시명 생성
  generateDisplayNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    return localPart
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  // 사용자 검색 쿼리 생성 (이메일, 표시명 모두 검색)
  createSearchQuery(searchTerm: string): string {
    const term = searchTerm.toLowerCase().trim();
    return `%${term}%`;
  },

  // 사용자 정렬 함수
  sortUsers(users: User[], sortBy: 'name' | 'email' | 'created' = 'name'): User[] {
    return [...users].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = a.display_name || a.email;
          const nameB = b.display_name || b.email;
          return nameA.localeCompare(nameB, 'ko');
        case 'email':
          return a.email.localeCompare(b.email);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
  },

  // 사용자 필터링
  filterUsers(users: User[], filters: {
    searchTerm?: string;
    hasDisplayName?: boolean;
    hasAvatar?: boolean;
  }): User[] {
    return users.filter(user => {
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchesEmail = user.email.toLowerCase().includes(term);
        const matchesName = user.display_name?.toLowerCase().includes(term) || false;
        if (!matchesEmail && !matchesName) return false;
      }

      if (filters.hasDisplayName !== undefined) {
        const hasName = !!user.display_name;
        if (hasName !== filters.hasDisplayName) return false;
      }

      if (filters.hasAvatar !== undefined) {
        const hasAvatar = !!user.avatar_url;
        if (hasAvatar !== filters.hasAvatar) return false;
      }

      return true;
    });
  },

  // 사용자 통계
  getUserStats(users: User[]): {
    total: number;
    withDisplayName: number;
    withAvatar: number;
    recentlyCreated: number; // 최근 7일
  } {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      total: users.length,
      withDisplayName: users.filter(u => !!u.display_name).length,
      withAvatar: users.filter(u => !!u.avatar_url).length,
      recentlyCreated: users.filter(u => new Date(u.created_at) > weekAgo).length
    };
  }
};

// 상수 정의
export const USER_CONSTANTS = {
  MIN_DISPLAY_NAME_LENGTH: 2,
  MAX_DISPLAY_NAME_LENGTH: 50,
  DEFAULT_AVATAR_SIZE: 128,
  AVATAR_COLORS: [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
  ]
} as const;
