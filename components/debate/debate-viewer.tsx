'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  ClockIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';
import { MESSAGES } from '@/core/constants/messages';
import { Badge } from '@/components/ui/badge';

interface DebateRound {
  id: string;
  round_number: number;
  status: 'preparing' | 'in_progress' | 'completed';
  turns: DebateTurn[];
  started_at: string;
  completed_at?: string;
}

interface DebateTurn {
  id: string;
  turn_number: number;
  side: 'A' | 'B';
  content: string;
  created_at: string;
}

interface DebateSession {
  id: string;
  status: 'preparing' | 'in_progress' | 'completed' | 'cancelled';
  config: {
    max_rounds: number;
    time_limit: number;
    jury_size: number;
  };
  started_at: string;
  completed_at?: string;
}

interface DebateViewerProps {
  roomId: string;
  sessionId?: string;
  autoRefresh?: boolean;
  className?: string;
}

export default function DebateViewer({ 
  roomId, 
  sessionId, 
  autoRefresh = true, 
  className = '' 
}: DebateViewerProps) {
  const [session, setSession] = useState<DebateSession | null>(null);
  const [rounds, setRounds] = useState<DebateRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 모든 턴을 시간순으로 정렬
  const allTurns = rounds
    .flatMap(round => round.turns.map(turn => ({ ...turn, round_number: round.round_number })))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // 토론 데이터 가져오기
  const fetchDebateData = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/rooms/${roomId}/debate`, {
        headers: {
          'Content-Type': 'application/json',
          // TODO: 실제 사용자 인증 헤더 추가
          'x-user-id': 'test-user-id-123',
          'x-user-email': 'test@example.com',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '토론 데이터를 가져올 수 없습니다');
      }

      const data = await response.json();
      setSession(data.session);
      setRounds(data.debate_rounds || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to fetch debate data:', err);
      setError(err.message || '서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchDebateData();
  }, [roomId, sessionId]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh || !session) return;

    const shouldRefresh = session.status === 'in_progress' || session.status === 'preparing';
    if (!shouldRefresh) return;

    intervalRef.current = setInterval(() => {
      fetchDebateData();
    }, 5000); // 5초마다 새로고침

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, session?.status, roomId]);

  // 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rounds, currentTurnIndex]);

  // 재생 제어
  const handlePlay = () => {
    if (allTurns.length === 0) return;

    setIsPlaying(true);
    playbackRef.current = setInterval(() => {
      setCurrentTurnIndex(prev => {
        if (prev >= allTurns.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000 / playbackSpeed); // 속도에 따라 조절
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (playbackRef.current) {
      clearInterval(playbackRef.current);
    }
  };

  const handleReset = () => {
    handlePause();
    setCurrentTurnIndex(0);
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, []);

  // TTS 음성 재생 (실험적 기능)
  const speakText = (text: string) => {
    if (!soundEnabled || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = playbackSpeed;
    window.speechSynthesis.speak(utterance);
  };

  // 현재 턴 변경 시 음성 재생
  useEffect(() => {
    if (isPlaying && soundEnabled && allTurns[currentTurnIndex]) {
      speakText(allTurns[currentTurnIndex].content);
    }
  }, [currentTurnIndex, isPlaying, soundEnabled]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}초 전`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-8 ${className}`}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-accent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-8 ${className}`}>
        <div className="text-center">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">토론 로드 실패</h3>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchDebateData}
            className="px-4 py-2 bg-primary-accent text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-8 ${className}`}>
        <div className="text-center">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">토론 세션 없음</h3>
          <p className="text-gray-500">아직 토론이 시작되지 않았습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary-accent" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI 토론 뷰어</h2>
              <Badge status={session.status} />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <ClockIcon className="h-4 w-4" />
            <span>마지막 업데이트: {getTimeAgo(lastUpdated)}</span>
            {autoRefresh && session.status === 'in_progress' && (
              <div className="flex items-center space-x-1">
                <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                <span>실시간</span>
              </div>
            )}
          </div>
        </div>

        {/* 재생 컨트롤 */}
        {allTurns.length > 0 && (
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                className="p-2 bg-primary-accent text-white rounded-full hover:bg-indigo-700 transition-colors"
              >
                {isPlaying ? (
                  <PauseIcon className="h-5 w-5" />
                ) : (
                  <PlayIcon className="h-5 w-5" />
                )}
              </button>
              
              <button
                onClick={handleReset}
                className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-full transition-colors ${
                  soundEnabled 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                }`}
              >
                {soundEnabled ? (
                  <SpeakerWaveIcon className="h-5 w-5" />
                ) : (
                  <SpeakerXMarkIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">속도:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-600">
                {currentTurnIndex + 1} / {allTurns.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 토론 내용 */}
      <div className="p-6">
        {allTurns.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftRightIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">아직 토론 내용이 없습니다</p>
            <p className="text-gray-400 text-sm mt-2">AI가 토론을 시작하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {allTurns.map((turn, index) => (
              <div
                key={turn.id}
                className={`flex ${turn.side === 'A' ? 'justify-start' : 'justify-end'} ${
                  index <= currentTurnIndex ? 'opacity-100' : 'opacity-30'
                } transition-opacity duration-300`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    turn.side === 'A'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-green-100 text-green-900'
                  } ${
                    index === currentTurnIndex && isPlaying
                      ? 'ring-2 ring-primary-accent shadow-lg'
                      : ''
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <UserIcon className="h-4 w-4" />
                    <span className="font-semibold text-sm">
                      {turn.side}측 변호사 (라운드 {turn.round_number})
                    </span>
                    <span className="text-xs opacity-75">
                      {formatTime(turn.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {turn.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 토론 통계 */}
      {session.status !== 'preparing' && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">토론 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-accent">{rounds.length}</p>
              <p className="text-xs text-gray-600">총 라운드</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-accent">{allTurns.length}</p>
              <p className="text-xs text-gray-600">총 발언</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-accent">
                {allTurns.length > 0 
                  ? Math.round(allTurns.reduce((sum, turn) => sum + turn.content.length, 0) / allTurns.length)
                  : 0
                }
              </p>
              <p className="text-xs text-gray-600">평균 발언 길이</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-accent">
                {session.started_at && session.completed_at
                  ? Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)
                  : session.started_at
                  ? Math.round((new Date().getTime() - new Date(session.started_at).getTime()) / 60000)
                  : 0
                }
              </p>
              <p className="text-xs text-gray-600">소요 시간 (분)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
