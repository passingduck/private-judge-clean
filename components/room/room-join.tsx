'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserGroupIcon, 
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { MESSAGES } from '@/core/constants/messages';

interface RoomJoinProps {
  roomId?: string;
  onSuccess?: (roomId: string) => void;
  onCancel?: () => void;
  className?: string;
}

export default function RoomJoin({ 
  roomId: initialRoomId, 
  onSuccess, 
  onCancel, 
  className = '' 
}: RoomJoinProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    roomId: initialRoomId || '',
    roomCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // 6자리 코드 패턴 찾기
      const codeMatch = text.match(/[A-Z0-9]{6}/);
      if (codeMatch) {
        setFormData(prev => ({ ...prev, roomCode: codeMatch[0] }));
      } else {
        // UUID 패턴 찾기 (방 ID)
        const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidMatch) {
          setFormData(prev => ({ ...prev, roomId: uuidMatch[0] }));
        }
      }
    } catch (err) {
      console.warn('Failed to read clipboard:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 입력 검증
      if (!formData.roomId.trim()) {
        throw new Error('방 ID를 입력해주세요.');
      }

      if (!formData.roomCode.trim()) {
        throw new Error(MESSAGES.ROOM.ENTER_CODE);
      }

      if (formData.roomCode.length !== 6) {
        throw new Error('방 코드는 6자리여야 합니다.');
      }

      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: 실제 사용자 ID와 이메일을 헤더에 추가해야 합니다.
          'x-user-id': 'test-user-id-123',
          'x-user-email': 'test@example.com',
        },
        body: JSON.stringify({
          roomId: formData.roomId.trim(),
          roomCode: formData.roomCode.trim().toUpperCase(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '방 참가에 실패했습니다');
      }

      const result = await response.json();
      setSuccess(true);
      
      // 성공 메시지를 잠시 보여준 후 이동
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result.room.id);
        } else {
          router.push(`/rooms/${result.room.id}`);
        }
      }, 1500);

    } catch (err: any) {
      console.error('Failed to join room:', err);
      setError(err.message || '서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  if (success) {
    return (
      <div className={`bg-white rounded-lg shadow-md ${className}`}>
        <div className="p-8 text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            참가 완료!
          </h2>
          <p className="text-gray-600">
            방에 성공적으로 참가했습니다. 잠시 후 방으로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <UserGroupIcon className="h-8 w-8 text-primary-accent mr-3" />
          토론방 참가
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          방 ID와 참가 코드를 입력하여 토론방에 참가하세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-start"
            role="alert"
          >
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="font-bold">오류 발생</strong>
              <span className="block sm:inline ml-2">{error}</span>
            </div>
          </div>
        )}

        {/* 방 ID */}
        <div>
          <label
            htmlFor="roomId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            방 ID
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            id="roomId"
            value={formData.roomId}
            onChange={(e) => setFormData(prev => ({ ...prev, roomId: e.target.value }))}
            className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary-accent focus:border-primary-accent sm:text-sm transition-colors"
            placeholder="예: 123e4567-e89b-12d3-a456-426614174000"
            required
            disabled={!!initialRoomId}
          />
          <p className="mt-1 text-xs text-gray-500">
            방 생성자로부터 받은 방 ID를 입력하세요.
          </p>
        </div>

        {/* 참가 코드 */}
        <div>
          <label
            htmlFor="roomCode"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {MESSAGES.ROOM.CODE}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="roomCode"
              value={formData.roomCode}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                roomCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
              }))}
              className="flex-grow px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary-accent focus:border-primary-accent sm:text-sm font-mono text-center text-lg tracking-wider transition-colors"
              placeholder="ABC123"
              required
              maxLength={6}
              style={{ letterSpacing: '0.2em' }}
            />
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="inline-flex items-center px-3 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-accent transition-colors"
              title="클립보드에서 붙여넣기"
            >
              <ClipboardDocumentIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {formData.roomCode.length}/6자 (영문 대문자와 숫자만 입력 가능)
          </p>
        </div>

        {/* 도움말 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            💡 참가 방법
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 방 생성자로부터 방 ID와 참가 코드를 받으세요</li>
            <li>• 참가 코드는 6자리 영문 대문자와 숫자 조합입니다</li>
            <li>• 클립보드 버튼을 눌러 복사된 정보를 자동으로 입력할 수 있습니다</li>
          </ul>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-accent transition-colors"
          >
            {MESSAGES.COMMON.CANCEL}
          </button>
          <button
            type="submit"
            disabled={loading || !formData.roomId.trim() || formData.roomCode.length !== 6}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-accent hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                참가 중...
              </div>
            ) : (
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                {MESSAGES.ROOM.JOIN}
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
e