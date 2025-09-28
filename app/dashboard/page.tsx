'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlusIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  TrophyIcon,
  ArrowRightIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface Room {
  id: string;
  code: string;
  title: string;
  status: string;
  created_at: string;
  creator?: {
    display_name: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
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

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'waiting_participant': '참가자 대기',
      'agenda_negotiation': '안건 협상',
      'arguments_submission': '주장 제출',
      'ai_processing': 'AI 처리중',
      'completed': '완료',
      'cancelled': '취소됨'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'waiting_participant': 'bg-yellow-100 text-yellow-800',
      'agenda_negotiation': 'bg-blue-100 text-blue-800',
      'arguments_submission': 'bg-purple-100 text-purple-800',
      'ai_processing': 'bg-indigo-100 text-indigo-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PJ</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Private Judge</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/rooms"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                토론방
              </Link>
              <button 
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 font-medium flex items-center"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h1>
          <p className="text-gray-600">토론 활동을 한눈에 확인하고 새로운 토론을 시작해보세요.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/rooms/create"
            className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:-translate-y-1"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <PlusIcon className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">토론방 만들기</h3>
                <p className="text-gray-600">새로운 토론 주제로 시작</p>
              </div>
              <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </Link>

          <Link
            href="/rooms"
            className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:-translate-y-1"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <UserGroupIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">토론방 둘러보기</h3>
                <p className="text-gray-600">진행 중인 토론 참가</p>
              </div>
              <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </Link>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrophyIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">토론 실력</h3>
                <p className="text-gray-600">레벨 1 (초보자)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Rooms */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">최근 토론방</h2>
          </div>
          
          {error ? (
            <div className="p-6">
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={fetchRooms}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-6">
              <div className="text-center py-8">
                <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">아직 참여한 토론이 없습니다</h3>
                <p className="text-gray-600 mb-4">첫 번째 토론을 시작해보세요!</p>
                <Link
                  href="/rooms/create"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  토론방 만들기
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {rooms.map((room) => (
                <div key={room.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          <Link href={`/rooms/${room.id}`} className="hover:text-indigo-600">
                            {room.title}
                          </Link>
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                          {getStatusText(room.status)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <span className="font-medium">방 코드:</span>
                          <span className="ml-1 font-mono">{room.code}</span>
                        </span>
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {new Date(room.created_at).toLocaleDateString('ko-KR')}
                        </span>
                        {room.creator && (
                          <span>생성자: {room.creator.display_name}</span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/rooms/${room.id}`}
                      className="flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      입장하기
                      <ArrowRightIcon className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
