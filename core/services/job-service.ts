import { getSupabaseClient } from '@/data/supabase/client';
import { 
  Job, 
  JobModel, 
  JobType, 
  JobStatus, 
  CreateJob 
} from '@/core/models/job';

export interface JobListOptions {
  roomId?: string;
  type?: JobType;
  status?: JobStatus;
  limit?: number;
  offset?: number;
}

export interface JobExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  retryAfter?: number; // 초 단위
}

export class JobService {
  private supabase = getSupabaseClient(true); // service role

  /**
   * 새로운 작업을 생성합니다.
   */
  async createJob(data: CreateJob): Promise<Job> {
    const validation = JobModel.validateCreate(data);
    if (!validation.success) {
      throw new Error(`작업 생성 데이터 검증 실패: ${validation.error}`);
    }

    const jobData = {
      ...validation.data,
      status: JobStatus.QUEUED,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: job, error } = await this.supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();

    if (error) {
      throw new Error(`작업 생성 실패: ${error.message}`);
    }

    const jobValidation = JobModel.validate(job);
    if (!jobValidation.success) {
      throw new Error(`생성된 작업 데이터 검증 실패: ${jobValidation.error}`);
    }

    return jobValidation.data;
  }

  /**
   * 작업 목록을 조회합니다.
   */
  async getJobs(options: JobListOptions = {}): Promise<{
    jobs: Job[];
    total: number;
  }> {
    let query = this.supabase
      .from('jobs')
      .select(`
        *,
        room:rooms(id, title, creator_id, participant_id)
      `, { count: 'exact' });

    // 필터 적용
    if (options.roomId) {
      query = query.eq('room_id', options.roomId);
    }

    if (options.type) {
      query = query.eq('type', options.type);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    // 정렬 및 페이징
    query = query
      .order('created_at', { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`작업 목록 조회 실패: ${error.message}`);
    }

    const jobs: Job[] = [];
    for (const jobData of data || []) {
      const validation = JobModel.validate(jobData);
      if (validation.success) {
        jobs.push(validation.data);
      }
    }

    return {
      jobs,
      total: count || 0
    };
  }

  /**
   * 특정 작업을 조회합니다.
   */
  async getJobById(jobId: string): Promise<Job | null> {
    const { data, error } = await this.supabase
      .from('jobs')
      .select(`
        *,
        room:rooms(id, title, creator_id, participant_id)
      `)
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`작업 조회 실패: ${error.message}`);
    }

    const validation = JobModel.validate(data);
    if (!validation.success) {
      throw new Error(`작업 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 다음 실행할 작업을 가져옵니다.
   */
  async getNextJob(types?: JobType[]): Promise<Job | null> {
    let query = this.supabase
      .from('jobs')
      .select('*')
      .eq('status', JobStatus.PENDING)
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (types && types.length > 0) {
      query = query.in('type', types);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`다음 작업 조회 실패: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    const validation = JobModel.validate(data[0]);
    if (!validation.success) {
      throw new Error(`작업 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 작업을 시작 상태로 변경합니다.
   */
  async startJob(jobId: string): Promise<Job> {
    const job = await this.getJobById(jobId);
    if (!job) {
      throw new Error('작업을 찾을 수 없습니다');
    }

    const jobModel = new JobModel(job);
    if (!jobModel.canStart()) {
      throw new Error(`작업을 시작할 수 없습니다. 현재 상태: ${job.status}`);
    }

    const { data, error } = await this.supabase
      .from('jobs')
      .update({
        status: JobStatus.RUNNING,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`작업 시작 실패: ${error.message}`);
    }

    const validation = JobModel.validate(data);
    if (!validation.success) {
      throw new Error(`업데이트된 작업 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 작업을 완료 처리합니다.
   */
  async completeJob(jobId: string, result: any): Promise<Job> {
    const job = await this.getJobById(jobId);
    if (!job) {
      throw new Error('작업을 찾을 수 없습니다');
    }

    const jobModel = new JobModel(job);
    if (!jobModel.isActive()) {
      throw new Error(`실행 중이 아닌 작업은 완료할 수 없습니다. 현재 상태: ${job.status}`);
    }

    const { data, error } = await this.supabase
      .from('jobs')
      .update({
        status: JobStatus.COMPLETED,
        result: result,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`작업 완료 처리 실패: ${error.message}`);
    }

    const validation = JobModel.validate(data);
    if (!validation.success) {
      throw new Error(`완료된 작업 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 작업을 실패 처리합니다.
   */
  async failJob(jobId: string, errorMessage: string, shouldRetry: boolean = true): Promise<Job> {
    const job = await this.getJobById(jobId);
    if (!job) {
      throw new Error('작업을 찾을 수 없습니다');
    }

    const jobModel = new JobModel(job);
    const newRetryCount = job.retry_count + 1;
    const maxRetries = job.max_retries || 3;

    let newStatus: JobStatus;
    let scheduledAt: string | null = null;

    if (shouldRetry && newRetryCount <= maxRetries) {
      // 재시도 가능
      newStatus = JobStatus.PENDING;
      // 지수 백오프: 2^retry_count 분 후 재시도
      const retryDelayMinutes = Math.pow(2, newRetryCount);
      scheduledAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000).toISOString();
    } else {
      // 재시도 불가 또는 최대 재시도 횟수 초과
      newStatus = JobStatus.FAILED;
    }

    const updateData: any = {
      status: newStatus,
      error_message: errorMessage,
      retry_count: newRetryCount,
      updated_at: new Date().toISOString()
    };

    if (scheduledAt) {
      updateData.scheduled_at = scheduledAt;
    }

    if (newStatus === JobStatus.FAILED) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`작업 실패 처리 실패: ${error.message}`);
    }

    const validation = JobModel.validate(data);
    if (!validation.success) {
      throw new Error(`실패 처리된 작업 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 작업을 취소합니다.
   */
  async cancelJob(jobId: string, userId?: string): Promise<Job> {
    const job = await this.getJobById(jobId);
    if (!job) {
      throw new Error('작업을 찾을 수 없습니다');
    }

    const jobModel = new JobModel(job);
    if (!jobModel.canBeCancelled()) {
      throw new Error(`작업을 취소할 수 없습니다. 현재 상태: ${job.status}`);
    }

    // 권한 확인 (방 생성자만 취소 가능)
    if (userId && job.room_id) {
      const { data: roomData } = await this.supabase
        .from('rooms')
        .select('creator_id')
        .eq('id', job.room_id)
        .single();

      if (roomData && roomData.creator_id !== userId) {
        throw new Error('방 생성자만 작업을 취소할 수 있습니다');
      }
    }

    const { data, error } = await this.supabase
      .from('jobs')
      .update({
        status: JobStatus.CANCELLED,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`작업 취소 실패: ${error.message}`);
    }

    const validation = JobModel.validate(data);
    if (!validation.success) {
      throw new Error(`취소된 작업 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 작업 진행률을 업데이트합니다.
   */
  async updateJobProgress(jobId: string, progress: number): Promise<Job> {
    if (progress < 0 || progress > 100) {
      throw new Error('진행률은 0-100 사이의 값이어야 합니다');
    }

    const job = await this.getJobById(jobId);
    if (!job) {
      throw new Error('작업을 찾을 수 없습니다');
    }

    const jobModel = new JobModel(job);
    if (!jobModel.isActive()) {
      throw new Error(`실행 중이 아닌 작업의 진행률은 업데이트할 수 없습니다. 현재 상태: ${job.status}`);
    }

    const { data, error } = await this.supabase
      .from('jobs')
      .update({
        progress: progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`작업 진행률 업데이트 실패: ${error.message}`);
    }

    const validation = JobModel.validate(data);
    if (!validation.success) {
      throw new Error(`업데이트된 작업 데이터 검증 실패: ${validation.error}`);
    }

    return validation.data;
  }

  /**
   * 특정 방의 활성 작업들을 조회합니다.
   */
  async getActiveJobsByRoom(roomId: string): Promise<Job[]> {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('*')
      .eq('room_id', roomId)
      .in('status', [JobStatus.PENDING, JobStatus.RUNNING])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`방의 활성 작업 조회 실패: ${error.message}`);
    }

    const jobs: Job[] = [];
    for (const jobData of data || []) {
      const validation = JobModel.validate(jobData);
      if (validation.success) {
        jobs.push(validation.data);
      }
    }

    return jobs;
  }

  /**
   * 오래된 완료/실패 작업들을 정리합니다.
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await this.supabase
      .from('jobs')
      .delete()
      .in('status', [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED])
      .lt('completed_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      throw new Error(`오래된 작업 정리 실패: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * 작업 통계를 조회합니다.
   */
  async getJobStats(roomId?: string): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageExecutionTime: number; // 초 단위
  }> {
    let query = this.supabase.from('jobs').select('status, started_at, completed_at');
    
    if (roomId) {
      query = query.eq('room_id', roomId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`작업 통계 조회 실패: ${error.message}`);
    }

    const stats = {
      total: data?.length || 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      averageExecutionTime: 0
    };

    let totalExecutionTime = 0;
    let completedJobsCount = 0;

    for (const job of data || []) {
      switch (job.status) {
        case JobStatus.PENDING:
          stats.pending++;
          break;
        case JobStatus.RUNNING:
          stats.running++;
          break;
        case JobStatus.COMPLETED:
          stats.completed++;
          if (job.started_at && job.completed_at) {
            const executionTime = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
            totalExecutionTime += executionTime;
            completedJobsCount++;
          }
          break;
        case JobStatus.FAILED:
          stats.failed++;
          break;
        case JobStatus.CANCELLED:
          stats.cancelled++;
          break;
      }
    }

    if (completedJobsCount > 0) {
      stats.averageExecutionTime = Math.round(totalExecutionTime / completedJobsCount / 1000);
    }

    return stats;
  }

  /**
   * 작업 실행 결과를 처리합니다.
   */
  async processJobResult(jobId: string, result: JobExecutionResult): Promise<Job> {
    if (result.success) {
      return await this.completeJob(jobId, result.result);
    } else {
      const shouldRetry = !result.retryAfter || result.retryAfter > 0;
      return await this.failJob(jobId, result.error || '알 수 없는 오류', shouldRetry);
    }
  }

  /**
   * 특정 타입의 대기 중인 작업 수를 조회합니다.
   */
  async getPendingJobCount(type?: JobType, roomId?: string): Promise<number> {
    let query = this.supabase
      .from('jobs')
      .select('id', { count: 'exact' })
      .eq('status', JobStatus.PENDING);

    if (type) {
      query = query.eq('type', type);
    }

    if (roomId) {
      query = query.eq('room_id', roomId);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`대기 중인 작업 수 조회 실패: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * 작업 큐의 상태를 조회합니다.
   */
  async getQueueStatus(): Promise<{
    totalPending: number;
    totalRunning: number;
    byType: Record<JobType, { pending: number; running: number }>;
    oldestPendingJob?: Date;
    averageWaitTime: number; // 초 단위
  }> {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('type, status, created_at, started_at')
      .in('status', [JobStatus.PENDING, JobStatus.RUNNING]);

    if (error) {
      throw new Error(`큐 상태 조회 실패: ${error.message}`);
    }

    const status = {
      totalPending: 0,
      totalRunning: 0,
      byType: {} as Record<JobType, { pending: number; running: number }>,
      oldestPendingJob: undefined as Date | undefined,
      averageWaitTime: 0
    };

    let totalWaitTime = 0;
    let startedJobsCount = 0;

    for (const job of data || []) {
      // 타입별 통계 초기화
      if (!status.byType[job.type as JobType]) {
        status.byType[job.type as JobType] = { pending: 0, running: 0 };
      }

      if (job.status === JobStatus.PENDING) {
        status.totalPending++;
        status.byType[job.type as JobType].pending++;
        
        const jobDate = new Date(job.created_at);
        if (!status.oldestPendingJob || jobDate < status.oldestPendingJob) {
          status.oldestPendingJob = jobDate;
        }
      } else if (job.status === JobStatus.RUNNING) {
        status.totalRunning++;
        status.byType[job.type as JobType].running++;
        
        if (job.started_at) {
          const waitTime = new Date(job.started_at).getTime() - new Date(job.created_at).getTime();
          totalWaitTime += waitTime;
          startedJobsCount++;
        }
      }
    }

    if (startedJobsCount > 0) {
      status.averageWaitTime = Math.round(totalWaitTime / startedJobsCount / 1000);
    }

    return status;
  }
}
