import { supabase, supabaseAdmin, Database } from './client';

// 타입 정의
type Tables = Database['public']['Tables'];
type Room = Tables['rooms']['Row'];
type User = Tables['users']['Row'];
type Motion = Tables['motions']['Row'];
type Argument = Tables['arguments']['Row'];
type Job = Tables['jobs']['Row'];
type RoomMember = Tables['room_members']['Row'];

// 에러 타입
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// 사용자 관련 쿼리
export const userQueries = {
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError('Failed to get user', error.code, error);
    }

    return data;
  },

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError('Failed to get user by email', error.code, error);
    }

    return data;
  },

  async create(user: Tables['users']['Insert']): Promise<User> {
    const { data, error } = await supabaseAdmin!
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to create user', error.code, error);
    }

    return data;
  },

  async update(id: string, updates: Tables['users']['Update']): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to update user', error.code, error);
    }

    return data;
  }
};

// 방 관련 쿼리
export const roomQueries = {
  async getById(id: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        creator:users!rooms_creator_id_fkey(id, display_name, email),
        participant:users!rooms_participant_id_fkey(id, display_name, email)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError('Failed to get room', error.code, error);
    }

    return data;
  },

  async getByCode(code: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError('Failed to get room by code', error.code, error);
    }

    return data;
  },

  async getByUserId(userId: string, limit = 20, offset = 0): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        creator:users!rooms_creator_id_fkey(id, display_name),
        participant:users!rooms_participant_id_fkey(id, display_name)
      `)
      .or(`creator_id.eq.${userId},participant_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new DatabaseError('Failed to get user rooms', error.code, error);
    }

    return data || [];
  },

  async create(room: Tables['rooms']['Insert']): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms')
      .insert(room)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to create room', error.code, error);
    }

    return data;
  },

  async update(id: string, updates: Tables['rooms']['Update']): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to update room', error.code, error);
    }

    return data;
  },

  async joinRoom(roomId: string, userId: string): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms')
      .update({ 
        participant_id: userId,
        status: 'agenda_negotiation',
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .eq('participant_id', null) // 아직 참여자가 없는 경우만
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to join room', error.code, error);
    }

    return data;
  }
};

// 안건 관련 쿼리
export const motionQueries = {
  async getByRoomId(roomId: string): Promise<Motion | null> {
    const { data, error } = await supabaseAdmin!
      .from('motions')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError('Failed to get motion', error.code, error);
    }

    return data;
  },

  async create(motion: Tables['motions']['Insert']): Promise<Motion> {
    const { data, error } = await supabaseAdmin!
      .from('motions')
      .insert(motion)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to create motion', error.code, error);
    }

    return data;
  },

  async update(id: string, updates: Tables['motions']['Update']): Promise<Motion> {
    const { data, error } = await supabaseAdmin!
      .from('motions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to update motion', error.code, error);
    }

    return data;
  }
};

// 주장 관련 쿼리
export const argumentQueries = {
  async getByRoomId(roomId: string): Promise<Argument[]> {
    const { data, error } = await supabaseAdmin!
      .from('arguments')
      .select(`
        *,
        user:users!arguments_user_id_fkey(id, display_name)
      `)
      .eq('room_id', roomId)
      .order('submitted_at', { ascending: true });

    if (error) {
      throw new DatabaseError('Failed to get arguments', error.code, error);
    }

    return data || [];
  },

  async getByUserAndRoom(userId: string, roomId: string): Promise<Argument | null> {
    const { data, error } = await supabaseAdmin!
      .from('arguments')
      .select('*')
      .eq('user_id', userId)
      .eq('room_id', roomId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError('Failed to get user argument', error.code, error);
    }

    return data;
  },

  async create(argument: Tables['arguments']['Insert']): Promise<Argument> {
    const { data, error } = await supabaseAdmin!
      .from('arguments')
      .insert(argument)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to create argument', error.code, error);
    }

    return data;
  },

  async update(id: string, updates: Tables['arguments']['Update']): Promise<Argument> {
    const { data, error } = await supabaseAdmin!
      .from('arguments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to update argument', error.code, error);
    }

    return data;
  }
};

// 작업 큐 관련 쿼리 (테이블이 존재하지 않아 주석 처리)
/*
export const jobQueries = {
  async create(job: Tables['jobs']['Insert']): Promise<Job> {
    const { data, error } = await supabaseAdmin!
      .from('jobs')
      .insert(job)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to create job', error.code, error);
    }

    return data;
  },

  async getById(id: string): Promise<Job | null> {
    const { data, error } = await supabaseAdmin!
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError('Failed to get job', error.code, error);
    }

    return data;
  },

  async getByRoomId(roomId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError('Failed to get room jobs', error.code, error);
    }

    return data || [];
  },

  async getNextPending(limit = 1): Promise<Job[]> {
    const { data, error } = await supabaseAdmin!
      .from('jobs')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new DatabaseError('Failed to get pending jobs', error.code, error);
    }

    return data || [];
  },

  async updateStatus(
    id: string, 
    status: Job['status'], 
    result?: any, 
    errorMessage?: string
  ): Promise<Job> {
    const updates: Tables['jobs']['Update'] = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'running') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'succeeded' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    if (result !== undefined) {
      updates.result = result;
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    if (status === 'retrying') {
      const job = await this.getById(id);
      if (job) {
        updates.retry_count = (job.retry_count || 0) + 1;
      }
    }

    const { data, error } = await supabaseAdmin!
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to update job status', error.code, error);
    }

    return data;
  }
};
*/

// 반론 관련 쿼리
export const rebuttalQueries = {
  async getByRoomId(roomId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin!
      .from('rebuttals')
      .select(`
        *,
        user:users!rebuttals_user_id_fkey(id, display_name)
      `)
      .eq('room_id', roomId)
      .order('round_number', { ascending: true })
      .order('submitted_at', { ascending: true });

    if (error) {
      throw new DatabaseError('Failed to get rebuttals', error.code, error);
    }

    return data || [];
  },

  async getByRoomIdAndRound(roomId: string, roundNumber: number): Promise<any[]> {
    const { data, error } = await supabaseAdmin!
      .from('rebuttals')
      .select(`
        *,
        user:users!rebuttals_user_id_fkey(id, display_name)
      `)
      .eq('room_id', roomId)
      .eq('round_number', roundNumber)
      .order('submitted_at', { ascending: true });

    if (error) {
      throw new DatabaseError('Failed to get rebuttals by round', error.code, error);
    }

    return data || [];
  },

  async getByUserRoomAndRound(userId: string, roomId: string, roundNumber: number): Promise<any | null> {
    const { data, error } = await supabaseAdmin!
      .from('rebuttals')
      .select('*')
      .eq('user_id', userId)
      .eq('room_id', roomId)
      .eq('round_number', roundNumber)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError('Failed to get user rebuttal', error.code, error);
    }

    return data;
  },

  async create(rebuttal: any): Promise<any> {
    const { data, error } = await supabaseAdmin!
      .from('rebuttals')
      .insert(rebuttal)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to create rebuttal', error.code, error);
    }

    return data;
  },

  async update(id: string, updates: any): Promise<any> {
    const { data, error } = await supabaseAdmin!
      .from('rebuttals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to update rebuttal', error.code, error);
    }

    return data;
  }
};

// 통계 및 집계 쿼리
export const statsQueries = {
  async getRoomStats(roomId: string) {
    // 방의 전체 통계 정보 조회 (존재하지 않는 테이블들 제거)
    const room = await roomQueries.getById(roomId);

    return {
      room,
      motion: null, // 테이블이 존재하지 않음
      arguments: [], // 테이블이 존재하지 않음
      jobs: {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0
      }
    };
  },

  async getUserStats(userId: string) {
    const rooms = await roomQueries.getByUserId(userId, 100);

    return {
      totalRooms: rooms.length,
      createdRooms: rooms.filter(r => r.creator_id === userId).length,
      participatedRooms: rooms.filter(r => r.participant_id === userId).length,
      completedRooms: rooms.filter(r => r.status === 'completed').length,
      activeRooms: rooms.filter(r =>
        ['agenda_negotiation', 'arguments_submission', 'ai_processing'].includes(r.status)
      ).length
    };
  }
};
