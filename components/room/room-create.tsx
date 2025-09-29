'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, TagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MESSAGES } from '@/core/constants/messages';
import { CreateRoom } from '@/core/models/room';

interface RoomCreateProps {
  onSuccess?: (roomId: string) => void;
  onCancel?: () => void;
  className?: string;
}

export default function RoomCreate({ 
  onSuccess, 
  onCancel, 
  className = '' 
}: RoomCreateProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 클라이언트 측 유효성 검사
      if (!formData.title || !formData.description) {
        throw new Error('제목과 설명을 모두 입력해주세요.');
      }

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: 실제 사용자 ID와 이메일을 헤더에 추가해야 합니다.
          'x-user-id': 'test-user-id-123',
          'x-user-email': 'test@example.com',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || MESSAGES.ROOM.CREATE_FAILED);
      }

      const newRoom = await response.json();
      
      if (onSuccess) {
        onSuccess(newRoom.id);
      } else {
        router.push(`/rooms/${newRoom.id}`);
      }
    } catch (err: any) {
      console.error('Failed to create room:', err);
      if (err.name === 'ZodError') {
        setError(
          err.errors.map((e: any) => e.message).join(', ') ||
            MESSAGES.COMMON.INVALID_INPUT
        );
      } else {
        setError(err.message || MESSAGES.COMMON.SERVER_ERROR);
      }
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

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">
          {MESSAGES.CREATE_ROOM.TITLE}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          새로운 토론방을 생성하여 다른 사용자와 토론을 시작하세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <strong className="font-bold">{MESSAGES.COMMON.ERROR_OCCURRED}</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {/* 방 제목 */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {MESSAGES.CREATE_ROOM.ROOM_TITLE_LABEL}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary-accent focus:border-primary-accent sm:text-sm transition-colors"
            placeholder={MESSAGES.CREATE_ROOM.ROOM_TITLE_PLACEHOLDER}
            required
            maxLength={200}
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.title.length}/200자
          </p>
        </div>

        {/* 방 설명 */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {MESSAGES.CREATE_ROOM.ROOM_DESCRIPTION_LABEL}
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary-accent focus:border-primary-accent sm:text-sm transition-colors resize-none"
            placeholder={MESSAGES.CREATE_ROOM.ROOM_DESCRIPTION_PLACEHOLDER}
            maxLength={1000}
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.description.length}/1000자
          </p>
        </div>

        {/* 태그 */}
        <div>
          <label
            htmlFor="tags"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {MESSAGES.CREATE_ROOM.TAGS_LABEL}
          </label>
          <div className="flex items-center mb-3">
            <input
              type="text"
              id="newTag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-primary-accent focus:border-primary-accent sm:text-sm"
              placeholder={MESSAGES.CREATE_ROOM.ADD_TAG_PLACEHOLDER}
              maxLength={20}
              disabled={formData.tags.length >= 10}
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!newTag.trim() || formData.tags.length >= 10}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PlusIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          
          {/* 태그 목록 */}
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-accent text-white"
              >
                <TagIcon className="h-4 w-4 mr-1" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 -mr-0.5 h-4 w-4 rounded-full hover:bg-indigo-700 flex items-center justify-center text-white transition-colors"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          
          <p className="mt-1 text-xs text-gray-500">
            {formData.tags.length}/10개 태그
          </p>
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
            disabled={loading || !formData.title.trim()}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-accent hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                생성 중...
              </div>
            ) : (
              MESSAGES.CREATE_ROOM.SUBMIT_BUTTON
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
