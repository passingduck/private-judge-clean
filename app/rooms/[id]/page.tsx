'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  DocumentTextIcon,
  UserPlusIcon,
  XMarkIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import Stepper from '@/components/ui/stepper';
import JobsProgress from '@/components/room/jobs-progress';
import DebateRounds from '@/components/room/debate-rounds';
import JuryVotes from '@/components/room/jury-votes';
import JudgeDecision from '@/components/room/judge-decision';

interface Room {
  id: string;
  title: string;
  description: string;
  status: string;
  code: string;
  creator: {
    id: string;
    display_name: string;
  };
  participant?: {
    id: string;
    display_name: string;
  };
  created_at: string;
  updated_at: string;
  tags?: string[];
}

interface Motion {
  id: string;
  title: string;
  description: string;
  status: string;
  proposed_by: string;
  created_at: string;
}

interface JuryVote {
  id: string;
  jury_number: number;
  vote: 'A' | 'B';
  confidence: number;
  reasoning: string;
  created_at: string;
}

interface JudgeDecisionData {
  id: string;
  winner: 'A' | 'B';
  score_a: number;
  score_b: number;
  reasoning: string;
  analysis_a: string;
  analysis_b: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  'waiting_participant': '참가자 대기',
  'agenda_negotiation': '안건 협상',
  'arguments_submission': '주장 제출',
  'debate_round_1': '1차 AI 토론 진행',
  'waiting_rebuttal_1': '1차 반론 대기',
  'debate_round_2': '2차 AI 토론 진행',
  'waiting_rebuttal_2': '2차 반론 대기',
  'debate_round_3': '3차 AI 토론 진행',
  'ai_processing': 'AI 판결 진행',
  'completed': '토론 완료',
  'cancelled': '취소됨'
};

const statusVariants: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  'waiting_participant': 'primary',
  'agenda_negotiation': 'warning',
  'arguments_submission': 'warning',
  'debate_round_1': 'primary',
  'waiting_rebuttal_1': 'warning',
  'debate_round_2': 'primary',
  'waiting_rebuttal_2': 'warning',
  'debate_round_3': 'primary',
  'ai_processing': 'primary',
  'completed': 'success',
  'cancelled': 'error'
};

const stepperSteps = [
  { id: 'waiting_participant', label: '참가자 대기', title: '참가자 대기' },
  { id: 'agenda_negotiation', label: '안건 협상', title: '안건 협상' },
  { id: 'arguments_submission', label: '주장 제출', title: '주장 제출' },
  { id: 'ai_processing', label: 'AI 토론', title: 'AI 토론' },
  { id: 'completed', label: '완료', title: '완료' }
];

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [motion, setMotion] = useState<Motion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ is_creator: boolean; side: string } | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [bothArgumentsSubmitted, setBothArgumentsSubmitted] = useState(false);
  const [debateStartLoading, setDebateStartLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [debateTurns, setDebateTurns] = useState<any[]>([]);
  const [juryVotes, setJuryVotes] = useState<JuryVote[]>([]);
  const [judgeDecision, setJudgeDecision] = useState<JudgeDecisionData | null>(null);

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails();
      fetchMotion();
      fetchArguments();
      fetchJobs();
      fetchDebateTurns();
    }
  }, [roomId]);

  // Auto-refresh jobs and debate turns when AI is processing
  useEffect(() => {
    const aiProcessingStatuses = [
      'debate_round_1',
      'debate_round_2',
      'debate_round_3',
      'ai_processing'
    ];

    if (room?.status && aiProcessingStatuses.includes(room.status)) {
      const interval = setInterval(() => {
        // Only fetch jobs and debate turns - not room details
        // This prevents unnecessary full page re-renders
        fetchJobs();
        fetchDebateTurns();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [room?.status, roomId]);

  // Check if AI processing is complete and update room status
  useEffect(() => {
    const aiProcessingStatuses = [
      'debate_round_1',
      'debate_round_2',
      'debate_round_3',
      'ai_processing'
    ];

    if (room?.status && aiProcessingStatuses.includes(room.status) && jobs.length > 0) {
      // Check if all jobs are completed (not queued or running)
      const hasActiveJobs = jobs.some(job =>
        job.status === 'queued' || job.status === 'running'
      );

      // If no active jobs and we're still in processing status, refresh room to check if completed
      if (!hasActiveJobs) {
        fetchRoomDetails();
      }
    }
  }, [jobs, room?.status]);

  // Fetch jury votes and judge decision when completed
  useEffect(() => {
    if (room?.status === 'completed') {
      fetchJuryVotes();
      fetchJudgeDecision();
    }
  }, [room?.status, roomId]);

  const fetchRoomDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rooms/${roomId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('존재하지 않는 토론방입니다');
        }
        throw new Error('토론방 정보를 불러오는데 실패했습니다');
      }

      const data = await response.json();
      setRoom(data.room);
      setUserInfo(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchMotion = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/motion`);

      if (response.ok) {
        const data = await response.json();
        setMotion(data.motion);
      }
    } catch (err) {
      // Motion이 없을 수도 있으므로 에러는 무시
      console.log('Motion not found or error fetching motion');
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setJoinError('참가 코드를 입력해주세요');
      return;
    }

    try {
      setJoinLoading(true);
      setJoinError(null);

      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '방 참가에 실패했습니다');
      }

      // 성공 시 방 정보 새로고침
      await fetchRoomDetails();
      setJoinCode('');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!confirm('정말 방에서 나가시겠습니까?')) {
      return;
    }

    try {
      setLeaveLoading(true);

      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '방 나가기에 실패했습니다');
      }

      // 성공 시 토론방 목록으로 이동
      router.push('/rooms');
    } catch (err) {
      alert(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLeaveLoading(false);
    }
  };

  const fetchArguments = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/arguments`);

      if (response.ok) {
        const data = await response.json();
        // Check if both my_argument and opponent_argument are submitted
        const bothSubmitted = !!data.my_argument && !!data.opponent_argument;
        setBothArgumentsSubmitted(bothSubmitted);
      }
    } catch (err) {
      // Arguments may not exist yet, so ignore errors
      console.log('Error fetching arguments:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/jobs`);

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.log('Error fetching jobs:', err);
    }
  };

  const fetchDebateTurns = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/debate-turns`);

      if (response.ok) {
        const data = await response.json();
        setDebateTurns(data.rounds || []);
      }
    } catch (err) {
      console.log('Error fetching debate turns:', err);
    }
  };

  const fetchJuryVotes = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/jury`);

      if (response.ok) {
        const data = await response.json();
        setJuryVotes(data.votes || []);
      }
    } catch (err) {
      console.log('Error fetching jury votes:', err);
    }
  };

  const fetchJudgeDecision = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/judge`);

      if (response.ok) {
        const data = await response.json();
        setJudgeDecision(data.decision || null);
      }
    } catch (err) {
      console.log('Error fetching judge decision:', err);
    }
  };

  const handleStartDebate = async () => {
    if (!confirm('AI 토론을 시작하시겠습니까? 약 10-15분이 소요됩니다.')) {
      return;
    }

    try {
      setDebateStartLoading(true);

      const response = await fetch(`/api/rooms/${roomId}/debate/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'AI 토론 시작에 실패했습니다');
      }

      // 성공 시 방 정보 새로고침
      await fetchRoomDetails();
      alert('AI 토론이 시작되었습니다. 약 10-15분 후 결과를 확인할 수 있습니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setDebateStartLoading(false);
    }
  };

  const getCurrentStepIndex = (status: string) => {
    // Map all debate round statuses to the simplified 5-step progress
    const statusToStepMap: Record<string, string> = {
      'waiting_participant': 'waiting_participant',
      'agenda_negotiation': 'agenda_negotiation',
      'arguments_submission': 'arguments_submission',
      'debate_round_1': 'ai_processing',
      'waiting_rebuttal_1': 'ai_processing',
      'debate_round_2': 'ai_processing',
      'waiting_rebuttal_2': 'ai_processing',
      'debate_round_3': 'ai_processing',
      'ai_processing': 'ai_processing',
      'completed': 'completed',
      'cancelled': 'completed'
    };

    const mappedStatus = statusToStepMap[status] || status;
    const index = stepperSteps.findIndex(step => step.id === mappedStatus);
    return index >= 0 ? index : 0;
  };

  const getStepStatus = (stepIndex: number, currentIndex: number) => {
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">토론방 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={fetchRoomDetails}
              className="bg-primary-accent text-white px-4 py-2 rounded-md hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
            >
              다시 시도
            </button>
            <Link
              href="/rooms"
              className="inline-block bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 active:bg-gray-300 transition-colors"
            >
              토론방 목록
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  const currentStepIndex = getCurrentStepIndex(room.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link
                href="/rooms"
                className="flex items-center text-gray-600 hover:text-primary-accent active:text-indigo-800 transition-colors mr-6"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-1" />
                토론방 목록
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{room.title}</h1>
                <div className="flex items-center mt-1 space-x-4">
                  <Badge variant={statusVariants[room.status] || 'default'}>
                    {statusLabels[room.status] || room.status}
                  </Badge>
                  <span className="text-sm text-gray-500">코드: {room.code}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress Stepper */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">토론 진행 상황</h2>
              <Stepper
                steps={stepperSteps.map((step, index) => ({
                  ...step,
                  status: getStepStatus(index, currentStepIndex)
                }))}
              />
            </div>

            {/* Room Description */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">토론방 설명</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{room.description || '설명이 없습니다.'}</p>

              {room.tags && room.tags.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {room.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Motion */}
            {motion && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <DocumentTextIcon className="h-5 w-5 text-primary-accent mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">토론 안건</h2>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{motion.title}</h3>
                <p className="text-gray-700 whitespace-pre-wrap mb-4">{motion.description}</p>
                <div className="text-sm text-gray-500">
                  제안일: {formatDate(motion.created_at)}
                </div>
              </div>
            )}

            {/* Join Room (if waiting for participant) */}
            {room.status === 'waiting_participant' && !room.participant && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-blue-900">토론방 참가</h2>
                </div>
                <p className="text-blue-800 mb-4">
                  이 토론방에 참가하려면 참가 코드를 입력해주세요.
                </p>

                {joinError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-red-700">{joinError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="참가 코드 입력"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-accent focus:border-transparent"
                    disabled={joinLoading}
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={joinLoading || !joinCode.trim()}
                    className="bg-primary-accent text-white px-6 py-2 rounded-md hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-accent transition-colors flex items-center"
                  >
                    {joinLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        참가 중...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-4 w-4 mr-2" />
                        참가하기
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* AI 토론 결과 */}
            <DebateRounds debateTurns={debateTurns} roomStatus={room.status} />

            {/* 배심원 투표 결과 */}
            <JuryVotes juryVotes={juryVotes} roomStatus={room.status} />

            {/* 최종 판결 */}
            <JudgeDecision judgeDecision={judgeDecision} roomStatus={room.status} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">참가자</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-accent rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                    A
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{room.creator?.display_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">방 생성자</p>
                  </div>
                </div>

                {room.participant ? (
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                      B
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{room.participant.display_name}</p>
                      <p className="text-sm text-gray-500">참가자</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium mr-3">
                      B
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">참가자 대기 중...</p>
                      <p className="text-sm text-gray-400">아직 참가자가 없습니다</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Room Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">방 정보</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">방 코드:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-lg bg-gray-100 px-3 py-1 rounded-md">{room.code}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(room.code);
                        alert('방 코드가 복사되었습니다!');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 active:text-indigo-900 text-sm transition-colors"
                    >
                      복사
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">생성일:</span>
                  <span>{formatDate(room.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">최근 업데이트:</span>
                  <span>{formatDate(room.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">액션</h2>
              <div className="space-y-3">
                {room.status === 'waiting_participant' && (
                  <button
                    onClick={() => setShowJoinModal(true)}
                    disabled={loading}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                  >
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    토론 참가하기
                  </button>
                )}

                {room.status === 'agenda_negotiation' && (
                  <>
                    {motion && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                          <DocumentTextIcon className="h-4 w-4 mr-2" />
                          현재 안건
                        </h3>
                        <p className="text-sm text-gray-700 font-medium mb-1">{motion.title}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${
                            motion.status === 'agreed' ? 'bg-green-100 text-green-700' :
                            motion.status === 'proposed' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {motion.status === 'agreed' ? '합의됨' :
                             motion.status === 'proposed' ? '제안됨' :
                             motion.status}
                          </span>
                        </div>
                      </div>
                    )}
                    <Link
                      href={`/rooms/${room.id}/motion`}
                      className="w-full bg-primary-accent text-white px-4 py-2 rounded-md hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center justify-center"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      {motion ? '안건 수정' : '안건 제안'}
                    </Link>
                  </>
                )}

                {room.status === 'arguments_submission' && (
                  <>
                    <Link
                      href={`/rooms/${room.id}/arguments`}
                      className="w-full bg-primary-accent text-white px-4 py-2 rounded-md hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center justify-center"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      주장 작성
                    </Link>

                    {bothArgumentsSubmitted && (
                      <button
                        onClick={handleStartDebate}
                        disabled={debateStartLoading}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        {debateStartLoading ? 'AI 처리 시작 중...' : 'AI 처리 시작'}
                      </button>
                    )}
                  </>
                )}

                {/* AI 처리 진행 상황 */}
                <JobsProgress jobs={jobs} roomStatus={room.status} />

                {/* 방 나가기 버튼 - 참가자만 표시 */}
                {userInfo && !userInfo.is_creator && room.participant && (
                  <button
                    onClick={handleLeaveRoom}
                    disabled={leaveLoading}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 active:bg-red-800 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    {leaveLoading ? '나가는 중...' : '방 나가기'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 참가 모달 */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">토론방 참가</h3>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                  setJoinError(null);
                }}
                className="text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700 mb-2">
                방 코드를 입력하세요
              </label>
              <input
                type="text"
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="예: ABC123"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                maxLength={6}
              />
              {joinError && (
                <p className="mt-2 text-sm text-red-600">{joinError}</p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                  setJoinError(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={joinLoading || !joinCode.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600 flex items-center justify-center"
              >
                {joinLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    참가 중...
                  </>
                ) : (
                  '참가하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
