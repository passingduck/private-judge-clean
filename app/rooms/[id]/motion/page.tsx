'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';

interface Motion {
  id: string;
  title: string;
  description: string;
  status: string;
  proposed_by: string;
  negotiation_history: Array<{
    action: string;
    user_id: string;
    reason?: string;
    modifications?: { title?: string; description?: string };
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  'proposed': '제안됨',
  'under_negotiation': '협상 중',
  'agreed': '합의 완료',
  'rejected': '거절됨'
};

const actionLabels: Record<string, string> = {
  'proposed': '제안',
  'accepted': '동의',
  'rejected': '거절',
  'modified': '수정 제안'
};

export default function MotionPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [motion, setMotion] = useState<Motion | null>(null);
  const [canPropose, setCanPropose] = useState(false);
  const [canRespond, setCanRespond] = useState(false);
  const [isProposer, setIsProposer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 제안 폼 상태
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // 응답 폼 상태
  const [responseAction, setResponseAction] = useState<'accepted' | 'modified' | 'rejected'>('accepted');
  const [reason, setReason] = useState('');
  const [modTitle, setModTitle] = useState('');
  const [modDescription, setModDescription] = useState('');

  useEffect(() => {
    if (roomId) {
      fetchMotion();
    }
  }, [roomId]);

  const fetchMotion = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/rooms/${roomId}/motion`);

      if (!response.ok) {
        throw new Error('안건 정보를 불러오는데 실패했습니다');
      }

      const data = await response.json();
      setMotion(data.motion);
      setCanPropose(data.can_propose || false);
      setCanRespond(data.can_respond || false);
      setIsProposer(data.is_proposer || false);

      // 수정 제안 폼 초기값 설정
      if (data.motion) {
        setModTitle(data.motion.title);
        setModDescription(data.motion.description);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleProposeMotion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError('제목과 설명을 모두 입력해주세요');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/rooms/${roomId}/motion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          room_id: roomId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '안건 제안에 실패했습니다');
      }

      // 성공 시 페이지 새로고침
      await fetchMotion();
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespondMotion = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      const payload: any = {
        action: responseAction,
        reason: reason.trim() || undefined
      };

      if (responseAction === 'modified') {
        payload.modifications = {
          title: modTitle.trim() !== motion?.title ? modTitle.trim() : undefined,
          description: modDescription.trim() !== motion?.description ? modDescription.trim() : undefined
        };
      }

      const response = await fetch(`/api/rooms/${roomId}/motion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '응답에 실패했습니다');
      }

      // 동의 시 Arguments 페이지로 이동
      if (responseAction === 'ACCEPTED') {
        router.push(`/rooms/${roomId}`);
      } else {
        // 그 외에는 페이지 새로고침
        await fetchMotion();
        setReason('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-accent mx-auto mb-4"></div>
          <p className="text-gray-600">안건 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link
                href={`/rooms/${roomId}`}
                className="flex items-center text-gray-600 hover:text-primary-accent transition-colors mr-6"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-1" />
                토론방으로 돌아가기
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">안건 협상</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 안건이 없는 경우: 제안 폼 */}
        {!motion && canPropose && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">토론 안건 제안</h2>
            <p className="text-gray-600 mb-6">
              토론할 주제와 세부 내용을 제안해주세요. 상대방이 동의하면 토론이 시작됩니다.
            </p>

            <form onSubmit={handleProposeMotion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  안건 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 기본소득제도 도입 찬반"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-accent focus:border-transparent"
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  안건 설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="토론할 주제에 대한 구체적인 설명을 입력해주세요"
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-accent focus:border-transparent"
                  disabled={submitting}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !title.trim() || !description.trim()}
                className="w-full bg-primary-accent text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submitting ? '제안 중...' : '안건 제안하기'}
              </button>
            </form>
          </div>
        )}

        {/* 안건이 없고 제안 권한도 없는 경우 */}
        {!motion && !canPropose && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-600">아직 안건이 제안되지 않았습니다. 상대방이 안건을 제안할 때까지 기다려주세요.</p>
          </div>
        )}

        {/* 안건이 있는 경우: 안건 정보 + 응답 폼 */}
        {motion && (
          <div className="space-y-6">
            {/* 현재 안건 정보 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">현재 안건</h2>
                <Badge variant={motion.status === 'agreed' ? 'success' : 'warning'}>
                  {statusLabels[motion.status] || motion.status}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{motion.title}</h3>
                </div>
                <div>
                  <p className="text-gray-700 whitespace-pre-wrap">{motion.description}</p>
                </div>
              </div>
            </div>

            {/* 협상 히스토리 */}
            {motion.negotiation_history && motion.negotiation_history.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">협상 과정</h3>
                <div className="space-y-3">
                  {motion.negotiation_history.map((item, index) => (
                    <div key={index} className="border-l-4 border-gray-300 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          {actionLabels[item.action] || item.action}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(item.timestamp).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      {item.reason && (
                        <p className="text-sm text-gray-600 mb-2">{item.reason}</p>
                      )}
                      {item.modifications && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {item.modifications.title && (
                            <p><strong>제목 수정:</strong> {item.modifications.title}</p>
                          )}
                          {item.modifications.description && (
                            <p><strong>설명 수정:</strong> {item.modifications.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 응답 폼 (응답 가능한 경우에만) */}
            {canRespond && motion.status !== 'agreed' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">안건에 응답하기</h3>

                <form onSubmit={handleRespondMotion} className="space-y-4">
                  {/* 응답 유형 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      응답 유형 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setResponseAction('accepted')}
                        className={`py-3 px-4 rounded-lg border-2 transition-colors ${
                          responseAction === 'accepted'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <CheckCircleIcon className="h-5 w-5 mx-auto mb-1" />
                        동의
                      </button>
                      <button
                        type="button"
                        onClick={() => setResponseAction('modified')}
                        className={`py-3 px-4 rounded-lg border-2 transition-colors ${
                          responseAction === 'modified'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <PencilIcon className="h-5 w-5 mx-auto mb-1" />
                        수정 제안
                      </button>
                      <button
                        type="button"
                        onClick={() => setResponseAction('rejected')}
                        className={`py-3 px-4 rounded-lg border-2 transition-colors ${
                          responseAction === 'rejected'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <XMarkIcon className="h-5 w-5 mx-auto mb-1" />
                        거절
                      </button>
                    </div>
                  </div>

                  {/* 수정 제안인 경우 수정 내용 입력 */}
                  {responseAction === 'modified' && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          수정된 제목
                        </label>
                        <input
                          type="text"
                          value={modTitle}
                          onChange={(e) => setModTitle(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-accent focus:border-transparent"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          수정된 설명
                        </label>
                        <textarea
                          value={modDescription}
                          onChange={(e) => setModDescription(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-accent focus:border-transparent"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}

                  {/* 이유 입력 (선택사항) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이유 (선택사항)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="응답 이유를 입력해주세요"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-accent focus:border-transparent"
                      disabled={submitting}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary-accent text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {submitting ? '제출 중...' : '응답 제출하기'}
                  </button>
                </form>
              </div>
            )}

            {/* 안건 합의 완료 */}
            {motion.status === 'agreed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-2">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-green-900">안건 합의 완료</h3>
                </div>
                <p className="text-green-700 mb-4">
                  안건이 합의되었습니다. 이제 주장을 제출할 수 있습니다.
                </p>
                <Link
                  href={`/rooms/${roomId}`}
                  className="inline-block bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  토론방으로 이동
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
