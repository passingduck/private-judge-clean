import { createSupabaseServerClient } from '@/data/supabase/client';
import { User, CreateUser, UpdateUser, UserModel, UserUtils } from '@/core/models/user';

export interface UserServiceInterface {
  // 기본 CRUD 작업
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(userData: CreateUser): Promise<User>;
  update(id: string, userData: UpdateUser): Promise<User>;
  delete(id: string): Promise<void>;
  
  // 검색 및 필터링
  search(searchTerm: string, limit?: number): Promise<User[]>;
  findMany(filters: {
    ids?: string[];
    hasDisplayName?: boolean;
    hasAvatar?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }>;
  
  // 통계 및 분석
  getStats(): Promise<{
    total: number;
    withDisplayName: number;
    withAvatar: number;
    recentlyCreated: number;
  }>;
}

export class UserService implements UserServiceInterface {
  private supabase = createSupabaseServerClient();

  async findById(id: string): Promise<User | null> {
    console.info('[user-service] findById', { userId: id });

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          console.info('[user-service] user not found', { userId: id });
          return null;
        }
        throw error;
      }

      const validation = UserModel.validate(data);
      if (!validation.success) {
        console.error('[user-service] invalid user data', { 
          userId: id, 
          error: validation.error 
        });
        throw new Error(`사용자 데이터 검증 실패: ${validation.error}`);
      }

      console.info('[user-service] findById success', { userId: id });
      return validation.data;
    } catch (error) {
      console.error('[user-service] findById error', { 
        userId: id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    console.info('[user-service] findByEmail', { email });

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.info('[user-service] user not found by email', { email });
          return null;
        }
        throw error;
      }

      const validation = UserModel.validate(data);
      if (!validation.success) {
        console.error('[user-service] invalid user data', { 
          email, 
          error: validation.error 
        });
        throw new Error(`사용자 데이터 검증 실패: ${validation.error}`);
      }

      console.info('[user-service] findByEmail success', { email, userId: validation.data.id });
      return validation.data;
    } catch (error) {
      console.error('[user-service] findByEmail error', { 
        email, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async create(userData: CreateUser): Promise<User> {
    console.info('[user-service] create', { email: userData.email });

    try {
      // 입력 데이터 검증
      const validation = UserModel.validateCreate(userData);
      if (!validation.success) {
        throw new Error(`입력 데이터 검증 실패: ${validation.error}`);
      }

      // 이메일 중복 확인
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('이미 존재하는 이메일입니다');
      }

      // 표시명이 없으면 이메일에서 생성
      const displayName = userData.display_name || 
        UserUtils.generateDisplayNameFromEmail(userData.email);

      const { data, error } = await this.supabase
        .from('users')
        .insert({
          email: userData.email,
          display_name: displayName,
          avatar_url: userData.avatar_url || null
        })
        .select()
        .single();

      if (error) {
        console.error('[user-service] create database error', { 
          email: userData.email, 
          error: error.message 
        });
        throw new Error(`사용자 생성 실패: ${error.message}`);
      }

      const userValidation = UserModel.validate(data);
      if (!userValidation.success) {
        console.error('[user-service] created user validation failed', { 
          email: userData.email, 
          error: userValidation.error 
        });
        throw new Error(`생성된 사용자 데이터 검증 실패: ${userValidation.error}`);
      }

      console.info('[user-service] create success', { 
        email: userData.email, 
        userId: userValidation.data.id 
      });
      return userValidation.data;
    } catch (error) {
      console.error('[user-service] create error', { 
        email: userData.email, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async update(id: string, userData: UpdateUser): Promise<User> {
    console.info('[user-service] update', { userId: id });

    try {
      // 입력 데이터 검증
      const validation = UserModel.validateUpdate(userData);
      if (!validation.success) {
        throw new Error(`입력 데이터 검증 실패: ${validation.error}`);
      }

      // 사용자 존재 확인
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      const { data, error } = await this.supabase
        .from('users')
        .update({
          display_name: userData.display_name,
          avatar_url: userData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[user-service] update database error', { 
          userId: id, 
          error: error.message 
        });
        throw new Error(`사용자 업데이트 실패: ${error.message}`);
      }

      const userValidation = UserModel.validate(data);
      if (!userValidation.success) {
        console.error('[user-service] updated user validation failed', { 
          userId: id, 
          error: userValidation.error 
        });
        throw new Error(`업데이트된 사용자 데이터 검증 실패: ${userValidation.error}`);
      }

      console.info('[user-service] update success', { userId: id });
      return userValidation.data;
    } catch (error) {
      console.error('[user-service] update error', { 
        userId: id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    console.info('[user-service] delete', { userId: id });

    try {
      // 사용자 존재 확인
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      // 관련 데이터 확인 (방 생성자나 참가자인 경우)
      const { data: rooms, error: roomsError } = await this.supabase
        .from('rooms')
        .select('id')
        .or(`creator_id.eq.${id},participant_id.eq.${id}`)
        .limit(1);

      if (roomsError) {
        throw new Error(`관련 데이터 확인 실패: ${roomsError.message}`);
      }

      if (rooms && rooms.length > 0) {
        throw new Error('참여 중인 방이 있어 삭제할 수 없습니다');
      }

      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[user-service] delete database error', { 
          userId: id, 
          error: error.message 
        });
        throw new Error(`사용자 삭제 실패: ${error.message}`);
      }

      console.info('[user-service] delete success', { userId: id });
    } catch (error) {
      console.error('[user-service] delete error', { 
        userId: id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async search(searchTerm: string, limit: number = 20): Promise<User[]> {
    console.info('[user-service] search', { searchTerm, limit });

    try {
      const searchPattern = UserUtils.createSearchQuery(searchTerm);

      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .or(`email.ilike.${searchPattern},display_name.ilike.${searchPattern}`)
        .order('display_name', { ascending: true, nullsFirst: false })
        .order('email', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[user-service] search database error', { 
          searchTerm, 
          error: error.message 
        });
        throw new Error(`사용자 검색 실패: ${error.message}`);
      }

      const users: User[] = [];
      for (const item of data || []) {
        const validation = UserModel.validate(item);
        if (validation.success) {
          users.push(validation.data);
        } else {
          console.warn('[user-service] invalid user in search results', { 
            userId: item.id, 
            error: validation.error 
          });
        }
      }

      console.info('[user-service] search success', { 
        searchTerm, 
        resultCount: users.length 
      });
      return users;
    } catch (error) {
      console.error('[user-service] search error', { 
        searchTerm, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async findMany(filters: {
    ids?: string[];
    hasDisplayName?: boolean;
    hasAvatar?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    console.info('[user-service] findMany', { filters });

    try {
      let query = this.supabase.from('users').select('*', { count: 'exact' });

      // 필터 적용
      if (filters.ids && filters.ids.length > 0) {
        query = query.in('id', filters.ids);
      }

      if (filters.hasDisplayName !== undefined) {
        if (filters.hasDisplayName) {
          query = query.not('display_name', 'is', null);
        } else {
          query = query.is('display_name', null);
        }
      }

      if (filters.hasAvatar !== undefined) {
        if (filters.hasAvatar) {
          query = query.not('avatar_url', 'is', null);
        } else {
          query = query.is('avatar_url', null);
        }
      }

      // 정렬 및 페이지네이션
      query = query
        .order('display_name', { ascending: true, nullsFirst: false })
        .order('email', { ascending: true });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[user-service] findMany database error', { 
          filters, 
          error: error.message 
        });
        throw new Error(`사용자 목록 조회 실패: ${error.message}`);
      }

      const users: User[] = [];
      for (const item of data || []) {
        const validation = UserModel.validate(item);
        if (validation.success) {
          users.push(validation.data);
        } else {
          console.warn('[user-service] invalid user in findMany results', { 
            userId: item.id, 
            error: validation.error 
          });
        }
      }

      console.info('[user-service] findMany success', { 
        filters, 
        resultCount: users.length, 
        total: count 
      });
      return { users, total: count || 0 };
    } catch (error) {
      console.error('[user-service] findMany error', { 
        filters, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async getStats(): Promise<{
    total: number;
    withDisplayName: number;
    withAvatar: number;
    recentlyCreated: number;
  }> {
    console.info('[user-service] getStats');

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [totalResult, withDisplayNameResult, withAvatarResult, recentResult] = 
        await Promise.all([
          this.supabase.from('users').select('*', { count: 'exact', head: true }),
          this.supabase.from('users').select('*', { count: 'exact', head: true })
            .not('display_name', 'is', null),
          this.supabase.from('users').select('*', { count: 'exact', head: true })
            .not('avatar_url', 'is', null),
          this.supabase.from('users').select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo.toISOString())
        ]);

      const stats = {
        total: totalResult.count || 0,
        withDisplayName: withDisplayNameResult.count || 0,
        withAvatar: withAvatarResult.count || 0,
        recentlyCreated: recentResult.count || 0
      };

      console.info('[user-service] getStats success', { stats });
      return stats;
    } catch (error) {
      console.error('[user-service] getStats error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  // 유틸리티 메서드들
  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    
    const result = await this.findMany({ ids });
    return result.users;
  }

  async exists(id: string): Promise<boolean> {
    const user = await this.findById(id);
    return user !== null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  // 배치 작업
  async createMany(usersData: CreateUser[]): Promise<User[]> {
    console.info('[user-service] createMany', { count: usersData.length });

    const results: User[] = [];
    const errors: string[] = [];

    for (const userData of usersData) {
      try {
        const user = await this.create(userData);
        results.push(user);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`${userData.email}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      console.warn('[user-service] createMany partial success', { 
        successCount: results.length, 
        errorCount: errors.length,
        errors: errors.slice(0, 5) // 처음 5개 에러만 로그
      });
    }

    console.info('[user-service] createMany complete', { 
      totalRequested: usersData.length,
      successCount: results.length,
      errorCount: errors.length
    });

    return results;
  }
}

// 싱글톤 인스턴스
export const userService = new UserService();
