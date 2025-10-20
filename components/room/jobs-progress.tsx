import React from 'react';

interface Job {
  id: string;
  type: string;
  status: string;
  payload?: {
    round?: number;
  };
  error_message?: string;
  started_at?: string;
}

interface JobsProgressProps {
  jobs: Job[];
  roomStatus: string;
}

const JobsProgress = React.memo<JobsProgressProps>(({ jobs, roomStatus }) => {
  const aiProcessingStatuses = [
    'debate_round_1',
    'debate_round_2',
    'debate_round_3',
    'ai_processing'
  ];

  // Only show if there are active jobs (queued or running)
  const activeJobs = jobs.filter(job => job.status === 'queued' || job.status === 'running');

  if (!aiProcessingStatuses.includes(roomStatus) || activeJobs.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
        <h3 className="font-semibold text-blue-900">AI 토론 진행 중</h3>
      </div>

      {activeJobs.length > 0 ? (
        <div className="space-y-2">
          {activeJobs.map((job) => (
              <div key={job.id} className="bg-white rounded p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">
                    {job.type === 'ai_debate' && `${job.payload?.round || 1}차 토론`}
                    {job.type === 'ai_judge' && '판결 생성'}
                    {job.type === 'ai_jury' && '배심원 투표'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    job.status === 'queued' ? 'bg-gray-100 text-gray-700' :
                    job.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {job.status === 'queued' && '대기 중'}
                    {job.status === 'running' && '실행 중'}
                  </span>
                </div>
                {job.error_message && (
                  <p className="text-red-600 text-xs mt-1">{job.error_message}</p>
                )}
                {job.started_at && (
                  <p className="text-gray-500 text-xs mt-1">
                    시작: {new Date(job.started_at).toLocaleTimeString('ko-KR')}
                  </p>
                )}
              </div>
            ))}
        </div>
      ) : (
        <p className="text-blue-700 text-sm">작업 정보를 불러오는 중...</p>
      )}

      <p className="text-blue-700 text-xs mt-3">
        AI 토론은 약 10-15분이 소요됩니다. 페이지를 나가셔도 처리는 계속됩니다.
      </p>
    </div>
  );
});

JobsProgress.displayName = 'JobsProgress';

export default JobsProgress;
