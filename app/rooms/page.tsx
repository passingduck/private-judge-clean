'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  UserGroupIcon,
  ClockIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';

interface Room {
  id: string;
  title: string;
  description: string;
  status: string;
  creator: {
    display_name: string;
  };
  participant?: {
    display_name: string;
  };
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  'waiting_participant': '참가자 대기',
  'agenda_negotiation': '안건 협상',
  'arguments_submission': '주장 제출',
  'ai_debate_in_progress': 'AI 토론 진행',
  'completed': '토론 완료',
  'cancelled': '취소됨'
};

const statusVariants: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  'waiting_participant': 'primary',
  'agenda_negotiation': 'warning',
  'arguments_submission': 'warning',
  'ai_debate_in_progress': 'primary',
  'completed': 'success',
  'cancelled': 'error'
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rooms');
      
      if (!response.ok) {
        throw new Error('방 목록을 불러오는데 실패했습니다');
      }

      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // 로그아웃 성공 시 홈페이지로 리다이렉트
        router.push('/');
      } else {
        console.error('로그아웃 실패');
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setJoinError('방 코드를 입력해주세요.');
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    try {
      const response = await fetch(`/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('참가 성공:', data);
        setShowJoinModal(false);
        setJoinCode('');
        // 토론방 목록 새로고침
        await fetchRooms();
        // 참가한 토론방으로 이동
        router.push(`/rooms/${data.id}`);
      } else {
        const errorData = await response.json();
        console.error('참가 실패:', errorData);
        setJoinError(errorData.message || '토론방 참가에 실패했습니다.');
      }
    } catch (error) {
      console.error('참가 중 오류 발생:', error);
      setJoinError('토론방 참가 중 오류가 발생했습니다.');
    } finally {
      setJoinLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">방 목록을 불러오는 중...</p>
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
          <button
            onClick={fetchRooms}
            className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-indigo-500 transition-colors">
                Private Judge
              </Link>
              <p className="text-gray-600 mt-1">토론방 목록</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                로그아웃
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center mr-3"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                토론방 참가
              </button>
              <Link
                href="/rooms/create"
                className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                새 토론방 만들기
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="토론방 제목이나 설명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">모든 상태</option>
              <option value="waiting_participant">참가자 대기</option>
              <option value="agenda_negotiation">안건 협상</option>
              <option value="arguments_submission">주장 제출</option>
              <option value="ai_debate_in_progress">AI 토론 진행</option>
              <option value="completed">토론 완료</option>
            </select>
          </div>
        </div>

        {/* Room List */}
        {filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다' : '아직 토론방이 없습니다'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? '다른 검색어나 필터를 시도해보세요' 
                : '첫 번째 토론방을 만들어보세요'}
            </p>
            <Link
              href="/rooms/create"
              className="bg-indigo-500 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              토론방 만들기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room) => (
              <div key={room.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {room.title}
                    </h3>
                    <Badge variant={statusVariants[room.status] || 'default'}>
                      {statusLabels[room.status] || room.status}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {room.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      <span>생성자: {room.creator.display_name}</span>
                    </div>
                    {room.participant && (
                      <div className="flex items-center text-sm text-gray-500">
                        <UserGroupIcon className="h-4 w-4 mr-2" />
                        <span>참가자: {room.participant.display_name}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-500">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      <span>생성: {formatDate(room.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      업데이트: {formatDate(room.updated_at)}
                    </span>
                    <Link
                      href={`/rooms/${room.id}`}
                      className="bg-indigo-500 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors flex items-center"
                    >
                      입장하기
                      <ArrowRightIcon className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                className="text-gray-400 hover:text-gray-600"
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
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={joinLoading || !joinCode.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
