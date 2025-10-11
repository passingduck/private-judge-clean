'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  DocumentTextIcon,
  ScaleIcon,
  UserPlusIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import Stepper from '@/components/ui/stepper';

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

interface JudgeDecision {
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
  'ai_processing': 'AI 토론 진행',
  'completed': '토론 완료',
  'cancelled': '취소됨'
};

const statusVariants: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  'waiting_participant': 'primary',
  'agenda_negotiation': 'warning',
  'arguments_submission': 'warning',
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
  const [judgeDecision, setJudgeDecision] = useState<JudgeDecision | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails();
      fetchMotion();
      fetchArguments();
      fetchJobs();
      fetchDebateTurns();
    }
  }, [roomId]);

  // Auto-refresh jobs and debate turns when ai_processing or completed
  useEffect(() => {
    if (room?.status === 'ai_processing' || room?.status === 'completed') {
      const interval = setInterval(() => {
        fetchJobs();
        fetchDebateTurns();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [room?.status, roomId]);

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

  const toggleRound = (roundId: string) => {
    setExpandedRounds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roundId)) {
        newSet.delete(roundId);
      } else {
        newSet.add(roundId);
      }
      return newSet;
    });
  };

  const getCurrentStepIndex = (status: string) => {
    const index = stepperSteps.findIndex(step => step.id === status);
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

  const calculateJuryStats = () => {
    if (juryVotes.length === 0) return { totalVotes: 0, votesA: 0, votesB: 0, avgConfidence: 0 };

    const votesA = juryVotes.filter(v => v.vote === 'A').length;
    const votesB = juryVotes.filter(v => v.vote === 'B').length;
    const avgConfidence = juryVotes.reduce((sum, v) => sum + v.confidence, 0) / juryVotes.length;

    return {
      totalVotes: juryVotes.length,
      votesA,
      votesB,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
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
  const juryStats = calculateJuryStats();

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
            {(room.status === 'ai_processing' || room.status === 'completed') && debateTurns.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <ScaleIcon className="h-5 w-5 text-primary-accent mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">AI 토론 결과</h2>
                </div>

                <div className="space-y-4">
                  {debateTurns.map((round) => {
                    const isExpanded = expandedRounds.has(round.id);
                    return (
                      <div key={round.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleRound(round.id)}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <h3 className="font-semibold text-gray-900">
                              {round.round_number}차 토론
                            </h3>
                            {round.status === 'completed' && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">완료</span>
                            )}
                            {round.status === 'in_progress' && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">진행 중</span>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="p-4">
                            {round.turns && round.turns.length > 0 ? (
                              <div className="space-y-4">
                                {round.turns.map((turn: any) => (
                                  <div key={turn.id} className={`p-4 rounded-lg ${
                                    turn.side === 'A' ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-green-50 border-l-4 border-green-500'
                                  }`}>
                                    <div className="flex items-center mb-2">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 ${
                                        turn.side === 'A' ? 'bg-primary-accent' : 'bg-green-500'
                                      }`}>
                                        {turn.side}
                                      </div>
                                      <span className="font-medium text-gray-900">
                                        {turn.side === 'A' ? 'AI 변호사 A' : 'AI 변호사 B'}
                                      </span>
                                    </div>

                                    {turn.content?.data?.statement && (
                                      <p className="text-gray-700 whitespace-pre-wrap mb-3">{turn.content.data.statement}</p>
                                    )}

                                    {turn.content?.data?.key_points && turn.content.data.key_points.length > 0 && (
                                      <div className="mb-3">
                                        <p className="text-sm font-semibold text-gray-700 mb-1">핵심 포인트:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                          {turn.content.data.key_points.map((point: string, idx: number) => (
                                            <li key={idx}>{point}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {turn.content?.data?.counter_arguments && turn.content.data.counter_arguments.length > 0 && (
                                      <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-1">반박 논리:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                          {turn.content.data.counter_arguments.map((arg: string, idx: number) => (
                                            <li key={idx}>{arg}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">토론 내용을 불러오는 중...</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 배심원 투표 결과 */}
            {room.status === 'completed' && juryVotes.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <UserGroupIcon className="h-5 w-5 text-primary-accent mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">배심원 투표 결과</h2>
                </div>

                {/* 투표 통계 */}
                <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">총 투표 수</p>
                    <p className="text-2xl font-bold text-gray-900">{juryStats.totalVotes}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">A측 득표</p>
                    <p className="text-2xl font-bold text-blue-600">{juryStats.votesA}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">B측 득표</p>
                    <p className="text-2xl font-bold text-green-600">{juryStats.votesB}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">평균 신뢰도</p>
                    <p className="text-2xl font-bold text-purple-600">{juryStats.avgConfidence}</p>
                  </div>
                </div>

                {/* 배심원 투표 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {juryVotes
                    .sort((a, b) => a.jury_number - b.jury_number)
                    .map((vote) => (
                      <div
                        key={vote.id}
                        className={`p-4 rounded-lg border-2 ${
                          vote.vote === 'A'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2 ${
                              vote.vote === 'A' ? 'bg-blue-600' : 'bg-green-600'
                            }`}>
                              {vote.jury_number}
                            </div>
                            <span className="font-semibold text-gray-900">배심원 {vote.jury_number}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              vote.vote === 'A'
                                ? 'bg-blue-600 text-white'
                                : 'bg-green-600 text-white'
                            }`}>
                              {vote.vote}측
                            </span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              신뢰도: {vote.confidence}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{vote.reasoning}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 최종 판결 */}
            {room.status === 'completed' && judgeDecision && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
                <div className="flex items-center mb-6">
                  <TrophyIcon className="h-6 w-6 text-amber-600 mr-2" />
                  <h2 className="text-2xl font-bold text-gray-900">최종 판결</h2>
                </div>

                {/* 승자 표시 */}
                <div className="bg-white rounded-lg p-6 mb-6 text-center border-2 border-amber-300">
                  <p className="text-lg text-gray-600 mb-2">승자</p>
                  <div className="flex items-center justify-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-bold mr-4 ${
                      judgeDecision.winner === 'A' ? 'bg-blue-600' : 'bg-green-600'
                    }`}>
                      {judgeDecision.winner}
                    </div>
                    <span className={`text-4xl font-bold ${
                      judgeDecision.winner === 'A' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {judgeDecision.winner}측 승리
                    </span>
                  </div>
                </div>

                {/* 점수 표시 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 text-center border-2 border-blue-200">
                    <p className="text-sm text-gray-500 mb-1">A측 점수</p>
                    <p className="text-3xl font-bold text-blue-600">{judgeDecision.score_a}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center border-2 border-green-200">
                    <p className="text-sm text-gray-500 mb-1">B측 점수</p>
                    <p className="text-3xl font-bold text-green-600">{judgeDecision.score_b}</p>
                  </div>
                </div>

                {/* 판결 이유 */}
                <div className="bg-white rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <ScaleIcon className="h-5 w-5 text-amber-600 mr-2" />
                    판결 이유
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{judgeDecision.reasoning}</p>
                </div>

                {/* A측 분석 */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
                  <h3 className="font-semibold text-blue-900 mb-2">A측 분석</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{judgeDecision.analysis_a}</p>
                </div>

                {/* B측 분석 */}
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  <h3 className="font-semibold text-green-900 mb-2">B측 분석</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{judgeDecision.analysis_b}</p>
                </div>
              </div>
            )}
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
                  <Link
                    href={`/rooms/${room.id}/motion`}
                    className="w-full bg-primary-accent text-white px-4 py-2 rounded-md hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center justify-center"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    안건 관리
                  </Link>
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
                {room.status === 'ai_processing' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                      <h3 className="font-semibold text-blue-900">AI 토론 진행 중</h3>
                    </div>

                    {jobs.length > 0 ? (
                      <div className="space-y-2">
                        {jobs
                          .filter(job => job.status === 'queued' || job.status === 'running')
                          .map((job, index) => (
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
                )}

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
