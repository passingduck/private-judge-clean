import { getSupabaseClient } from '@/data/supabase/client';
import { 
  Room, 
  RoomModel, 
  RoomStatus, 
  CreateRoom, 
  UpdateRoom
} from '@/core/models/room';
import { User } from '@/core/models/user';

export interface RoomListOptions {
  status?: RoomStatus;
  creatorId?: string;
  participantId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  includePrivate?: boolean;
  userId?: string; // For filtering accessible private rooms
}

export interface RoomJoinOptions {
  roomId: string;
  userId: string;
  roomCode: string;
}

export interface RoomStatusUpdate {
  roomId: string;
  newStatus: RoomStatus;
  userId: string;
}

export class RoomService {
  private supabase = getSupabaseClient(true); // service role

  /**
   * 새로운 토론방을 생성합니다.
   */
  async createRoom(data: CreateRoom, creatorId: string): Promise<Room> {
    const roomModel = new RoomModel({} as Room);
    const validation = RoomModel.validateCreate(data);
    
    if (!validation.success) {
      throw new Error(`방 생성 데이터 검증 실패: ${validation.error}`);
    }

    // 6자리 고유 코드 생성
    const code = this.generateRoomCode();
    
    // 트랜잭션으로 방과 멤버 생성
    const { data: roomData, error: roomError } = await this.supabase
      .from('rooms')
      .insert({
        title: data.title,
        description: data.description,
        creator_id: creatorId,
        code: code,
        is_private: data.is_private || false,
        status: RoomStatus.WAITING_PARTICIPANT,
        tags: []
      })
      .select()
      .single();

    if (roomError) {
      throw new Error(`방 생성 실패: ${roomError.message}`);
    }

    // 생성자를 멤버로 추가
    const { error: memberError } = await this.supabase
      .from('room_members')
      .insert({
        room_id: roomData.id,
        user_id: creatorId,
        role: 'creator',
        side: 'A'
      });

    if (memberError) {
      // 방 생성은 성공했지만 멤버 추가 실패 시 방 삭제
      await this.supabase.from('rooms').delete().eq('id', roomData.id);
      throw new Error(`방 멤버 추가 실패: ${memberError.message}`);
    }

    const roomValidation = RoomModel.validate(roomData);
    if (!roomValidation.success) {
      throw new Error(`생성된 방 데이터 검증 실패: ${roomValidation.error}`);
    }

    return roomValidation.data;
  }

  /**
   * 방 목록을 조회합니다.
   */
  async getRooms(options: RoomListOptions = {}): Promise<{
    rooms: Room[];
    total: number;
  }> {
    let query = this.supabase
      .from('rooms')
      .select(`
        *,
        creator:users!rooms_creator_id_fkey(id, display_name, avatar_url),
        participant:users!rooms_participant_id_fkey(id, display_name, avatar_url)
      `, { count: 'exact' });

    // 필터 적용
    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.creatorId) {
      query = query.eq('creator_id', options.creatorId);
    }

    if (options.participantId) {
      query = query.eq('participant_id', options.participantId);
    }

    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    // 비공개 방 필터링 (includePrivate가 false이면 공개 방만)
    if (!options.includePrivate) {
      // 공개 방 또는 사용자가 멤버인 방만 조회
      if (options.userId) {
        query = query.or(`is_private.eq.false,and(is_private.eq.true,or(creator_id.eq.${options.userId},participant_id.eq.${options.userId}))`);
      } else {
        query = query.eq('is_private', false);
      }
    }

    // 정렬 및 페이징
    query = query
      .order('updated_at', { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`방 목록 조회 실패: ${error.message}`);
    }

    const rooms: Room[] = [];
    for (const roomData of data || []) {
      const validation = RoomModel.validate(roomData);
      if (validation.success) {
        rooms.push(validation.data);
      }
    }

    return {
      rooms,
      total: count || 0
    };
  }

  /**
   * 특정 방의 상세 정보를 조회합니다.
   */
  async getRoomById(roomId: string, userId?: string): Promise<Room | null> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select(`
        *,
        creator:users!rooms_creator_id_fkey(id, display_name, avatar_url),
        participant:users!rooms_participant_id_fkey(id, display_name, avatar_url),
        room_members(user_id, role, side)
      `)
      .eq('id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`방 조회 실패: ${error.message}`);
    }

    // 사용자 권한 확인 (필요한 경우)
    if (userId) {
      // 권한 체크는 간단히 생략
    }

    const validation = RoomModel.validate(data);
    if (!validation.success) {
      throw new Error(`방 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 방에 참가합니다.
   */
  async joinRoom(options: RoomJoinOptions): Promise<Room> {
    // RPC 함수를 사용한 트랜잭션 처리
    const { data, error } = await this.supabase
      .rpc('join_room_transaction', {
        p_room_id: options.roomId,
        p_user_id: options.userId,
        p_room_code: options.roomCode
      });

    if (error) {
      throw new Error(`방 참가 실패: ${error.message}`);
    }

    if (!data) {
      throw new Error('방 참가에 실패했습니다');
    }

    // 업데이트된 방 정보 조회
    const updatedRoom = await this.getRoomById(options.roomId);
    if (!updatedRoom) {
      throw new Error('참가 후 방 정보를 찾을 수 없습니다');
    }

    return updatedRoom;
  }

  /**
   * 방 상태를 업데이트합니다.
   */
  async updateRoomStatus(options: RoomStatusUpdate): Promise<Room> {
    // 권한 확인
    const room = await this.getRoomById(options.roomId, options.userId);
    if (!room) {
      throw new Error('방을 찾을 수 없습니다');
    }

    const roomModel = new RoomModel(room);
    
    // 상태 전환 가능 여부 확인
    if (!roomModel.canTransitionTo(options.newStatus)) {
      throw new Error(`${room.status}에서 ${options.newStatus}로 전환할 수 없습니다`);
    }

    // 사용자 권한 확인 (생성자만 상태 변경 가능)
    if (room.creator_id !== options.userId) {
      throw new Error('방 생성자만 상태를 변경할 수 있습니다');
    }

    const { data, error } = await this.supabase
      .from('rooms')
      .update({
        status: options.newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', options.roomId)
      .select()
      .single();

    if (error) {
      throw new Error(`방 상태 업데이트 실패: ${error.message}`);
    }

    const validation = RoomModel.validate(data);
    if (!validation.success) {
      throw new Error(`업데이트된 방 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 방을 업데이트합니다.
   */
  async updateRoom(roomId: string, data: UpdateRoom, userId: string): Promise<Room> {
    // 권한 확인
    const room = await this.getRoomById(roomId, userId);
    if (!room) {
      throw new Error('방을 찾을 수 없습니다');
    }

    if (room.creator_id !== userId) {
      throw new Error('방 생성자만 방 정보를 수정할 수 있습니다');
    }

    const validation = RoomModel.validateUpdate(data);
    if (!validation.success) {
      throw new Error(`방 업데이트 데이터 검증 실패: ${validation.error}`);
    }

    const { data: updatedData, error } = await this.supabase
      .from('rooms')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      throw new Error(`방 업데이트 실패: ${error.message}`);
    }

    const roomValidation = RoomModel.validate(updatedData);
    if (!roomValidation.success) {
      throw new Error(`업데이트된 방 데이터 검증 실패: ${roomValidation.error}`);
    }

    return roomValidation.data;
  }

  /**
   * 방을 삭제합니다.
   */
  async deleteRoom(roomId: string, userId: string): Promise<void> {
    // 권한 확인
    const room = await this.getRoomById(roomId, userId);
    if (!room) {
      throw new Error('방을 찾을 수 없습니다');
    }

    if (room.creator_id !== userId) {
      throw new Error('방 생성자만 방을 삭제할 수 있습니다');
    }

    // 진행 중인 토론은 삭제 불가
    if (room.status === RoomStatus.AI_PROCESSING) {
      throw new Error('진행 중인 토론은 삭제할 수 없습니다');
    }

    const { error } = await this.supabase
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (error) {
      throw new Error(`방 삭제 실패: ${error.message}`);
    }
  }

  /**
   * 방 멤버 목록을 조회합니다.
   */
  async getRoomMembers(roomId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('room_members')
      .select(`
        *,
        user:users(id, display_name, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`방 멤버 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 사용자가 참여한 방 목록을 조회합니다.
   */
  async getUserRooms(userId: string): Promise<Room[]> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select(`
        *,
        creator:users!rooms_creator_id_fkey(id, display_name, avatar_url),
        participant:users!rooms_participant_id_fkey(id, display_name, avatar_url)
      `)
      .or(`creator_id.eq.${userId},participant_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`사용자 방 목록 조회 실패: ${error.message}`);
    }

    const rooms: Room[] = [];
    for (const roomData of data || []) {
      const validation = RoomModel.validate(roomData);
      if (validation.success) {
        rooms.push(validation.data);
      }
    }

    return rooms;
  }

  /**
   * 6자리 고유 방 코드를 생성합니다.
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 방 코드의 유효성을 확인합니다.
   */
  async validateRoomCode(roomId: string, code: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('code')
      .eq('id', roomId)
      .single();

    if (error) {
      return false;
    }

    return data.code === code;
  }

  /**
   * 방 통계를 조회합니다.
   */
  async getRoomStats(roomId: string): Promise<{
    totalMembers: number;
    argumentsCount: number;
    debateRounds: number;
    status: RoomStatus;
  }> {
    const [membersResult, argumentsResult, roundsResult, roomResult] = await Promise.all([
      this.supabase.from('room_members').select('id', { count: 'exact' }).eq('room_id', roomId),
      this.supabase.from('arguments').select('id', { count: 'exact' }).eq('room_id', roomId),
      this.supabase.from('rounds').select('id', { count: 'exact' }).eq('room_id', roomId),
      this.supabase.from('rooms').select('status').eq('id', roomId).single()
    ]);

    return {
      totalMembers: membersResult.count || 0,
      argumentsCount: argumentsResult.count || 0,
      debateRounds: roundsResult.count || 0,
      status: roomResult.data?.status || RoomStatus.WAITING_PARTICIPANT
    };
  }
}
