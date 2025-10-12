import { createClient } from '@supabase/supabase-js';

// 환경 변수 검증
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// 클라이언트용 Supabase 클라이언트 (브라우저에서 사용 금지 - 헌법 준수)
// 이 클라이언트는 서버 사이드에서만 사용해야 함
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // 서버 사이드에서는 세션 저장하지 않음
    autoRefreshToken: false,
  },
});

// 서비스 롤 클라이언트 (시스템 작업용)
export const supabaseAdmin = supabaseServiceRole 
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// 타입 정의
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          code: string;
          creator_id: string;
          participant_id: string | null;
          title: string;
          description: string | null;
          status: 'waiting_participant' | 'agenda_negotiation' | 'arguments_submission' | 'debate_round_1' | 'waiting_rebuttal_1' | 'debate_round_2' | 'waiting_rebuttal_2' | 'debate_round_3' | 'ai_processing' | 'completed' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code?: string;
          creator_id: string;
          participant_id?: string | null;
          title: string;
          description?: string | null;
          status?: 'waiting_participant' | 'agenda_negotiation' | 'arguments_submission' | 'debate_round_1' | 'waiting_rebuttal_1' | 'debate_round_2' | 'waiting_rebuttal_2' | 'debate_round_3' | 'ai_processing' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          creator_id?: string;
          participant_id?: string | null;
          title?: string;
          description?: string | null;
          status?: 'waiting_participant' | 'agenda_negotiation' | 'arguments_submission' | 'debate_round_1' | 'waiting_rebuttal_1' | 'debate_round_2' | 'waiting_rebuttal_2' | 'debate_round_3' | 'ai_processing' | 'completed' | 'cancelled';
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          type: 'ai_debate' | 'ai_judge' | 'ai_jury' | 'notification';
          status: 'queued' | 'running' | 'succeeded' | 'failed' | 'retrying';
          room_id: string | null;
          payload: any;
          result: any | null;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
          scheduled_at: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: 'ai_debate' | 'ai_judge' | 'ai_jury' | 'notification';
          status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'retrying';
          room_id?: string | null;
          payload: any;
          result?: any | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          scheduled_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: 'ai_debate' | 'ai_judge' | 'ai_jury' | 'notification';
          status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'retrying';
          room_id?: string | null;
          payload?: any;
          result?: any | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          scheduled_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      motions: {
        Row: {
          id: string;
          room_id: string;
          title: string;
          description: string;
          proposer_id: string;
          status: 'proposed' | 'under_negotiation' | 'agreed' | 'rejected';
          negotiation_history: any[];
          agreed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          title: string;
          description: string;
          proposer_id: string;
          status?: 'proposed' | 'under_negotiation' | 'agreed' | 'rejected';
          negotiation_history?: any[];
          agreed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          status?: 'proposed' | 'under_negotiation' | 'agreed' | 'rejected';
          negotiation_history?: any[];
          agreed_at?: string | null;
          updated_at?: string;
        };
      };
      arguments: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          side: 'A' | 'B';
          title: string;
          content: string;
          evidence: any[];
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          side: 'A' | 'B';
          title: string;
          content: string;
          evidence?: any[];
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          evidence?: any[];
          updated_at?: string;
        };
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: 'creator' | 'participant';
          side: 'A' | 'B';
          joined_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          role: 'creator' | 'participant';
          side: 'A' | 'B';
          joined_at?: string;
          created_at?: string;
        };
        Update: {
          role?: 'creator' | 'participant';
          side?: 'A' | 'B';
        };
      };
    };
  };
};

// 헬퍼 함수들
export function getSupabaseClient(useServiceRole = false) {
  if (useServiceRole) {
    if (!supabaseAdmin) {
      throw new Error('Service role client not available');
    }
    return supabaseAdmin;
  }
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

export function isServiceRoleConfigured(): boolean {
  return !!(supabaseServiceRole && supabaseAdmin);
}
