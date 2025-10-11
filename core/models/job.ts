import { z } from 'zod';

// 작업 타입 enum
export enum JobType {
  AI_DEBATE = 'ai_debate',
  AI_JUDGE = 'ai_judge',
  AI_JURY = 'ai_jury',
  NOTIFICATION = 'notification'
}

// 작업 상태 enum
export enum JobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled'
}

// 진행 상태 스키마
export const JobProgressSchema = z.object({
  current_step: z.string(),
  total_steps: z.number().int().min(1),
  completed_steps: z.number().int().min(0),
  estimated_remaining: z.string().optional()
});

// 기본 작업 스키마
export const JobSchema = z.object({
  id: z.string().uuid('유효하지 않은 작업 ID 형식입니다'),
  type: z.nativeEnum(JobType),
  status: z.nativeEnum(JobStatus),
  room_id: z.string().uuid('유효하지 않은 방 ID 형식입니다').nullable(),
  payload: z.record(z.any()),
  result: z.record(z.any()).nullable(),
  error_message: z.string().nullable(),
  retry_count: z.number().int().min(0).default(0),
  max_retries: z.number().int().min(0).default(3),
  progress: JobProgressSchema.nullable().optional(),
  scheduled_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

// 작업 생성 스키마
export const CreateJobSchema = z.object({
  type: z.nativeEnum(JobType),
  room_id: z.string().uuid().nullable(),
  payload: z.record(z.any()),
  scheduled_at: z.string().datetime().optional(),
  max_retries: z.number().int().min(0).max(10).default(3)
});

// 작업 업데이트 스키마
export const UpdateJobSchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  result: z.record(z.any()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  progress: JobProgressSchema.nullable().optional(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional()
});

// 특정 작업 타입별 페이로드 스키마들
export const DebateJobPayloadSchema = z.object({
  room_id: z.string().uuid(),
  round: z.number().int().min(1).max(3),
  argument_a: z.record(z.any()),
  argument_b: z.record(z.any()),
  previous_sessions: z.array(z.record(z.any())).default([])
});

export const JudgeJobPayloadSchema = z.object({
  room_id: z.string().uuid(),
  debate_sessions: z.array(z.record(z.any())),
  jury_votes: z.array(z.record(z.any())).optional()
});

export const JuryJobPayloadSchema = z.object({
  room_id: z.string().uuid(),
  debate_sessions: z.array(z.record(z.any())),
  jury_count: z.number().int().min(7).max(7).default(7)
});

export const NotificationJobPayloadSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(['room_joined', 'debate_completed', 'verdict_ready']),
  message: z.string(),
  room_id: z.string().uuid().optional()
});

// 타입 추출
export type Job = z.infer<typeof JobSchema>;
export type CreateJob = z.infer<typeof CreateJobSchema>;
export type UpdateJob = z.infer<typeof UpdateJobSchema>;
export type JobProgress = z.infer<typeof JobProgressSchema>;
export type DebateJobPayload = z.infer<typeof DebateJobPayloadSchema>;
export type JudgeJobPayload = z.infer<typeof JudgeJobPayloadSchema>;
export type JuryJobPayload = z.infer<typeof JuryJobPayloadSchema>;
export type NotificationJobPayload = z.infer<typeof NotificationJobPayloadSchema>;

// 작업 우선순위 정의
export const JOB_PRIORITIES = {
  [JobType.NOTIFICATION]: 1, // 가장 높은 우선순위
  [JobType.AI_JURY]: 2,
  [JobType.AI_JUDGE]: 2,
  [JobType.AI_DEBATE]: 3 // 가장 낮은 우선순위
} as const;

// 작업 예상 소요 시간 (분 단위)
export const JOB_ESTIMATED_DURATION = {
  [JobType.NOTIFICATION]: 0.1,
  [JobType.AI_JURY]: 5,
  [JobType.AI_JUDGE]: 3,
  [JobType.AI_DEBATE]: 10
} as const;

// 재시도 가능한 에러 타입들
export const RETRYABLE_ERRORS = [
  'network_timeout',
  'rate_limit_exceeded',
  'temporary_service_unavailable',
  'openai_api_error',
  'connection_error'
] as const;

// 작업 비즈니스 로직 클래스
export class JobModel {
  constructor(private data: Job) {}

  // Getter 메서드들
  get id(): string {
    return this.data.id;
  }

  get type(): JobType {
    return this.data.type;
  }

  get status(): JobStatus {
    return this.data.status;
  }

  get roomId(): string | null {
    return this.data.room_id;
  }

  get payload(): Record<string, any> {
    return this.data.payload;
  }

  get result(): Record<string, any> | null {
    return this.data.result;
  }

  get errorMessage(): string | null {
    return this.data.error_message;
  }

  get retryCount(): number {
    return this.data.retry_count;
  }

  get maxRetries(): number {
    return this.data.max_retries;
  }

  get progress(): JobProgress | null {
    return this.data.progress ?? null;
  }

  get scheduledAt(): Date {
    return new Date(this.data.scheduled_at);
  }

  get startedAt(): Date | null {
    return this.data.started_at ? new Date(this.data.started_at) : null;
  }

  get completedAt(): Date | null {
    return this.data.completed_at ? new Date(this.data.completed_at) : null;
  }

  get createdAt(): Date {
    return new Date(this.data.created_at);
  }

  get updatedAt(): Date {
    return new Date(this.data.updated_at);
  }

  // 상태 확인 메서드들
  isQueued(): boolean {
    return this.data.status === JobStatus.QUEUED;
  }

  isRunning(): boolean {
    return this.data.status === JobStatus.RUNNING;
  }

  isSucceeded(): boolean {
    return this.data.status === JobStatus.SUCCEEDED;
  }

  isFailed(): boolean {
    return this.data.status === JobStatus.FAILED;
  }

  isRetrying(): boolean {
    return this.data.status === JobStatus.RETRYING;
  }

  isCancelled(): boolean {
    return this.data.status === JobStatus.CANCELLED;
  }

  isCompleted(): boolean {
    return this.isSucceeded() || this.isFailed() || this.isCancelled();
  }

  isActive(): boolean {
    return this.isQueued() || this.isRunning() || this.isRetrying();
  }

  canBeCancelled(): boolean {
    return this.isQueued() || this.isRunning();
  }

  canBeRetried(): boolean {
    return this.isFailed() && this.data.retry_count < this.data.max_retries;
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

  getDuration(): number | null {
    if (!this.data.started_at) return null;
    
    const start = new Date(this.data.started_at).getTime();
    const end = this.data.completed_at 
      ? new Date(this.data.completed_at).getTime()
      : new Date().getTime();
    
    return Math.floor((end - start) / 1000); // 초 단위
  }

  getWaitTime(): number {
    const scheduled = this.scheduledAt.getTime();
    const started = this.data.started_at 
      ? new Date(this.data.started_at).getTime()
      : new Date().getTime();
    
    return Math.max(0, Math.floor((started - scheduled) / 1000)); // 초 단위
  }

  // 우선순위 및 예상 시간
  getPriority(): number {
    return JOB_PRIORITIES[this.data.type];
  }

  getEstimatedDuration(): number {
    return JOB_ESTIMATED_DURATION[this.data.type];
  }

  // 진행률 계산
  getProgressPercentage(): number {
    if (!this.data.progress) return 0;
    
    const { completed_steps, total_steps } = this.data.progress;
    return Math.round((completed_steps / total_steps) * 100);
  }

  // 남은 예상 시간 계산
  getEstimatedTimeRemaining(): string | null {
    if (!this.data.progress || !this.data.started_at) return null;
    
    const { completed_steps, total_steps } = this.data.progress;
    if (completed_steps === 0) return null;
    
    const elapsed = this.getDuration() || 0;
    const progressRatio = completed_steps / total_steps;
    const totalEstimated = elapsed / progressRatio;
    const remaining = Math.max(0, totalEstimated - elapsed);
    
    if (remaining < 60) return `${Math.round(remaining)}초`;
    if (remaining < 3600) return `${Math.round(remaining / 60)}분`;
    return `${Math.round(remaining / 3600)}시간`;
  }

  // 에러 관련 메서드들
  isRetryableError(): boolean {
    if (!this.data.error_message) return false;
    
    return RETRYABLE_ERRORS.some(errorType => 
      this.data.error_message!.toLowerCase().includes(errorType)
    );
  }

  getNextRetryDelay(): number {
    // 지수 백오프: 1초, 2초, 4초, 8초, ...
    const baseDelay = 1000; // 1초
    return baseDelay * Math.pow(2, this.data.retry_count);
  }

  getNextRetryTime(): Date {
    const delay = this.getNextRetryDelay();
    return new Date(Date.now() + delay);
  }

  // 상태 변경 메서드들
  start(): void {
    if (!this.isQueued() && !this.isRetrying()) {
      throw new Error(`작업을 시작할 수 없는 상태입니다: ${this.data.status}`);
    }
    
    this.data.status = JobStatus.RUNNING;
    this.data.started_at = new Date().toISOString();
    this.data.updated_at = new Date().toISOString();
  }

  succeed(result?: Record<string, any>): void {
    if (!this.isRunning()) {
      throw new Error(`작업을 완료할 수 없는 상태입니다: ${this.data.status}`);
    }
    
    this.data.status = JobStatus.SUCCEEDED;
    this.data.result = result || null;
    this.data.completed_at = new Date().toISOString();
    this.data.updated_at = new Date().toISOString();
  }

  fail(errorMessage: string): void {
    if (!this.isRunning()) {
      throw new Error(`작업을 실패 처리할 수 없는 상태입니다: ${this.data.status}`);
    }
    
    this.data.status = JobStatus.FAILED;
    this.data.error_message = errorMessage;
    this.data.completed_at = new Date().toISOString();
    this.data.updated_at = new Date().toISOString();
  }

  retry(): void {
    if (!this.canBeRetried()) {
      throw new Error('재시도할 수 없는 작업입니다');
    }
    
    this.data.status = JobStatus.RETRYING;
    this.data.retry_count += 1;
    this.data.error_message = null;
    this.data.started_at = null;
    this.data.completed_at = null;
    this.data.updated_at = new Date().toISOString();
  }

  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new Error(`취소할 수 없는 작업 상태입니다: ${this.data.status}`);
    }
    
    this.data.status = JobStatus.CANCELLED;
    this.data.completed_at = new Date().toISOString();
    this.data.updated_at = new Date().toISOString();
  }

  updateProgress(progress: JobProgress): void {
    this.data.progress = progress;
    this.data.updated_at = new Date().toISOString();
  }

  // 페이로드 검증 메서드들
  validatePayload(): { success: boolean; error?: string } {
    try {
      switch (this.data.type) {
        case JobType.AI_DEBATE:
          DebateJobPayloadSchema.parse(this.data.payload);
          break;
        case JobType.AI_JUDGE:
          JudgeJobPayloadSchema.parse(this.data.payload);
          break;
        case JobType.AI_JURY:
          JuryJobPayloadSchema.parse(this.data.payload);
          break;
        case JobType.NOTIFICATION:
          NotificationJobPayloadSchema.parse(this.data.payload);
          break;
        default:
          return { success: false, error: `알 수 없는 작업 타입: ${this.data.type}` };
      }
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        return { 
          success: false, 
          error: `페이로드 검증 실패: ${firstError.path.join('.')}: ${firstError.message}` 
        };
      }
      return { success: false, error: '페이로드 검증 중 알 수 없는 오류' };
    }
  }

  // 검증 메서드들
  static validate(data: unknown): { success: true; data: Job } | { success: false; error: string } {
    try {
      const validatedData = JobSchema.parse(data);
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

  static validateCreate(data: unknown): { success: true; data: CreateJob } | { success: false; error: string } {
    try {
      const validatedData = CreateJobSchema.parse(data);
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
  static fromData(data: Job): JobModel {
    return new JobModel(data);
  }

  static createNew(createData: CreateJob): Job {
    const now = new Date().toISOString();
    
    return {
      id: crypto.randomUUID(),
      type: createData.type,
      status: JobStatus.QUEUED,
      room_id: createData.room_id,
      payload: createData.payload,
      result: null,
      error_message: null,
      retry_count: 0,
      max_retries: createData.max_retries,
      progress: null,
      scheduled_at: createData.scheduled_at || now,
      started_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now
    };
  }

  // JSON 직렬화
  toJSON(): Job {
    return { ...this.data };
  }

  // 요약 정보 반환
  getSummary() {
    return {
      id: this.data.id,
      type: this.data.type,
      status: this.data.status,
      room_id: this.data.room_id,
      priority: this.getPriority(),
      progress: this.getProgressPercentage(),
      duration: this.getDuration(),
      waitTime: this.getWaitTime(),
      canRetry: this.canBeRetried(),
      canCancel: this.canBeCancelled(),
      estimatedTimeRemaining: this.getEstimatedTimeRemaining(),
      created_at: this.data.created_at
    };
  }

  // 문자열 표현
  toString(): string {
    return `Job(${this.data.id}, ${this.data.type}, ${this.data.status})`;
  }
}

// 작업 유틸리티 함수들
export const JobUtils = {
  // 작업 정렬 함수
  sortJobs(jobs: Job[], sortBy: 'created' | 'scheduled' | 'priority' | 'status' | 'duration' = 'priority'): Job[] {
    return [...jobs].sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'scheduled':
          return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
        case 'priority':
          const priorityA = JOB_PRIORITIES[a.type];
          const priorityB = JOB_PRIORITIES[b.type];
          if (priorityA !== priorityB) return priorityA - priorityB;
          // 같은 우선순위면 예약 시간 순
          return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
        case 'status':
          const statusOrder = {
            [JobStatus.RUNNING]: 1,
            [JobStatus.QUEUED]: 2,
            [JobStatus.RETRYING]: 3,
            [JobStatus.SUCCEEDED]: 4,
            [JobStatus.FAILED]: 5,
            [JobStatus.CANCELLED]: 6
          };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'duration':
          const durationA = new JobModel(a).getDuration() || 0;
          const durationB = new JobModel(b).getDuration() || 0;
          return durationB - durationA;
        default:
          return 0;
      }
    });
  },

  // 작업 필터링
  filterJobs(jobs: Job[], filters: {
    type?: JobType[];
    status?: JobStatus[];
    roomId?: string;
    canRetry?: boolean;
    canCancel?: boolean;
    isOverdue?: boolean;
  }): Job[] {
    return jobs.filter(job => {
      if (filters.type && !filters.type.includes(job.type)) {
        return false;
      }

      if (filters.status && !filters.status.includes(job.status)) {
        return false;
      }

      if (filters.roomId && job.room_id !== filters.roomId) {
        return false;
      }

      if (filters.canRetry !== undefined) {
        const jobModel = new JobModel(job);
        if (jobModel.canBeRetried() !== filters.canRetry) {
          return false;
        }
      }

      if (filters.canCancel !== undefined) {
        const jobModel = new JobModel(job);
        if (jobModel.canBeCancelled() !== filters.canCancel) {
          return false;
        }
      }

      if (filters.isOverdue !== undefined) {
        const isOverdue = new Date(job.scheduled_at) < new Date() && 
                         (job.status === JobStatus.QUEUED || job.status === JobStatus.RETRYING);
        if (isOverdue !== filters.isOverdue) {
          return false;
        }
      }

      return true;
    });
  },

  // 작업 통계
  getJobStats(jobs: Job[]): {
    total: number;
    byType: Record<JobType, number>;
    byStatus: Record<JobStatus, number>;
    averageDuration: number; // 초 단위
    successRate: number; // 백분율
    retryRate: number; // 백분율
    overdueCount: number;
    activeCount: number;
  } {
    const byType = Object.values(JobType).reduce((acc, type) => {
      acc[type] = jobs.filter(j => j.type === type).length;
      return acc;
    }, {} as Record<JobType, number>);

    const byStatus = Object.values(JobStatus).reduce((acc, status) => {
      acc[status] = jobs.filter(j => j.status === status).length;
      return acc;
    }, {} as Record<JobStatus, number>);

    const completedJobs = jobs.filter(j => 
      j.status === JobStatus.SUCCEEDED || j.status === JobStatus.FAILED
    );

    const totalDuration = completedJobs.reduce((sum, job) => {
      const model = new JobModel(job);
      return sum + (model.getDuration() || 0);
    }, 0);

    const successCount = byStatus[JobStatus.SUCCEEDED];
    const totalAttempts = completedJobs.length;
    const retriedJobs = jobs.filter(j => j.retry_count > 0).length;

    const now = new Date();
    const overdueCount = jobs.filter(j => 
      new Date(j.scheduled_at) < now && 
      (j.status === JobStatus.QUEUED || j.status === JobStatus.RETRYING)
    ).length;

    const activeCount = jobs.filter(j => 
      j.status === JobStatus.QUEUED || 
      j.status === JobStatus.RUNNING || 
      j.status === JobStatus.RETRYING
    ).length;

    return {
      total: jobs.length,
      byType,
      byStatus,
      averageDuration: completedJobs.length > 0 ? totalDuration / completedJobs.length : 0,
      successRate: totalAttempts > 0 ? Math.round((successCount / totalAttempts) * 100) : 0,
      retryRate: jobs.length > 0 ? Math.round((retriedJobs / jobs.length) * 100) : 0,
      overdueCount,
      activeCount
    };
  },

  // 큐 관리
  getNextJobsToRun(jobs: Job[], maxConcurrent: number = 5): Job[] {
    const runnableJobs = jobs.filter(job => 
      job.status === JobStatus.QUEUED || job.status === JobStatus.RETRYING
    );

    const currentlyRunning = jobs.filter(job => job.status === JobStatus.RUNNING).length;
    const availableSlots = Math.max(0, maxConcurrent - currentlyRunning);

    if (availableSlots === 0) return [];

    // 우선순위와 예약 시간으로 정렬
    const sortedJobs = JobUtils.sortJobs(runnableJobs, 'priority');
    
    return sortedJobs.slice(0, availableSlots);
  },

  // 배치 상태 업데이트
  updateJobStatuses(jobs: Job[], updates: { jobId: string; status: JobStatus; result?: any; error?: string }[]): Job[] {
    const updateMap = new Map(updates.map(u => [u.jobId, u]));
    
    return jobs.map(job => {
      const update = updateMap.get(job.id);
      if (!update) return job;

      const jobModel = new JobModel(job);
      
      try {
        switch (update.status) {
          case JobStatus.RUNNING:
            jobModel.start();
            break;
          case JobStatus.SUCCEEDED:
            jobModel.succeed(update.result);
            break;
          case JobStatus.FAILED:
            jobModel.fail(update.error || '알 수 없는 오류');
            break;
          case JobStatus.CANCELLED:
            jobModel.cancel();
            break;
        }
      } catch (error) {
        console.warn(`작업 상태 업데이트 실패: ${job.id}`, error);
      }

      return jobModel.toJSON();
    });
  }
};

// 상수 정의
export const JOB_CONSTANTS = {
  MAX_RETRIES: 10,
  DEFAULT_MAX_RETRIES: 3,
  BASE_RETRY_DELAY: 1000, // 1초
  MAX_RETRY_DELAY: 300000, // 5분
  DEFAULT_MAX_CONCURRENT: 5,
  OVERDUE_THRESHOLD: 300, // 5분 (초 단위)
  CLEANUP_COMPLETED_AFTER_DAYS: 7
} as const;
