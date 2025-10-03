'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface CreateRoomForm {
  title: string;
  description: string;
  tags: string[];
}

export default function CreateRoomPage() {
  const [form, setForm] = useState<CreateRoomForm>({
    title: '',
    description: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim()) {
      setError('토론방 제목을 입력해주세요');
      return;
    }

    if (!form.description.trim()) {
      setError('토론방 설명을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '토론방 생성에 실패했습니다');
      }

      const data = await response.json();
      setSuccess(true);
      
      // 2초 후 생성된 방으로 이동
      setTimeout(() => {
        router.push(`/rooms/${data.id}`);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag) && form.tags.length < 5) {
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">토론방이 생성되었습니다!</h2>
          <p className="text-gray-600 mb-4">잠시 후 토론방으로 이동합니다...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link
              href="/rooms"
              className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors mr-4"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              토론방 목록
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">새 토론방 만들기</h1>
              <p className="text-gray-600 mt-1">토론 주제와 설명을 입력해주세요</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">오류가 발생했습니다</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                토론방 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="예: 인공지능의 윤리적 사용에 대한 토론"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                maxLength={100}
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                {form.title.length}/100자
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                토론방 설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={6}
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="토론 주제에 대한 자세한 설명을 입력해주세요. 어떤 관점에서 토론하고 싶은지, 어떤 결과를 기대하는지 등을 포함하면 좋습니다."
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                maxLength={1000}
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                {form.description.length}/1000자
              </p>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                태그 (선택사항)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-500/10 text-indigo-500"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-indigo-500 hover:text-indigo-700"
                      disabled={loading}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  placeholder="태그를 입력하고 Enter를 누르세요"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={20}
                  disabled={loading || form.tags.length >= 5}
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={!tagInput.trim() || form.tags.length >= 5 || loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  추가
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                최대 5개까지 추가할 수 있습니다 ({form.tags.length}/5)
              </p>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">토론방 생성 가이드라인</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 명확하고 구체적인 토론 주제를 설정해주세요</li>
                <li>• 상대방을 존중하는 건설적인 토론을 지향해주세요</li>
                <li>• 개인적인 공격이나 비방은 금지됩니다</li>
                <li>• 사실에 근거한 논리적인 주장을 펼쳐주세요</li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/rooms"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={loading || !form.title.trim() || !form.description.trim()}
                className="px-6 py-3 bg-indigo-500 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    생성 중...
                  </>
                ) : (
                  '토론방 생성'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
