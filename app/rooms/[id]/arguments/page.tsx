'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EvidenceType } from '@/core/models/argument';

interface Evidence {
  type: EvidenceType;
  title: string;
  content: string;
  source_url?: string;
}

interface Argument {
  id: string;
  side: string;
  title: string;
  content: string;
  evidence: Evidence[];
  submitted_at: string;
}

interface ArgumentsData {
  my_argument: Argument | null;
  opponent_argument: Argument | null;
  user_side: string;
  can_submit: boolean;
}

export default function ArgumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ArgumentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [newEvidence, setNewEvidence] = useState<Evidence>({
    type: EvidenceType.LINK,
    title: '',
    content: '',
    source_url: ''
  });

  const fetchArguments = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/arguments`);

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else {
        console.error('Failed to fetch arguments');
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArguments();
  }, []);

  const handleAddEvidence = () => {
    if (!newEvidence.title || !newEvidence.content) {
      alert('증거 제목과 내용을 입력해주세요');
      return;
    }

    if (evidence.length >= 10) {
      alert('증거는 최대 10개까지 추가할 수 있습니다');
      return;
    }

    setEvidence([...evidence, newEvidence]);
    setNewEvidence({
      type: EvidenceType.LINK,
      title: '',
      content: '',
      source_url: ''
    });
    setShowEvidenceForm(false);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (title.length < 10 || title.length > 200) {
      alert('제목은 10자 이상 200자 이하로 입력해주세요');
      return;
    }

    if (content.length < 100 || content.length > 5000) {
      alert('주장 내용은 100자 이상 5000자 이하로 입력해주세요');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/rooms/${roomId}/arguments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          content,
          evidence
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || '주장이 제출되었습니다');
        if (result.room_status === 'ai_processing') {
          router.push(`/rooms/${roomId}`);
        } else {
          fetchArguments();
        }
      } else {
        alert(result.message || result.error || '주장 제출에 실패했습니다');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('주장 제출 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-red-600">데이터를 불러올 수 없습니다</div>
      </div>
    );
  }

  const evidenceTypeLabels = {
    [EvidenceType.LINK]: '링크',
    [EvidenceType.DOCUMENT]: '문서',
    [EvidenceType.STATISTIC]: '통계',
    [EvidenceType.QUOTE]: '인용'
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">주장 제출</h1>
        <button
          onClick={() => router.push(`/rooms/${roomId}`)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          방으로 돌아가기
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          <strong>내 포지션:</strong> {data.user_side === 'A' ? 'Side A (방 생성자)' : 'Side B (참가자)'}
        </p>
      </div>

      {/* 내 주장 */}
      {data.my_argument && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-800 mb-4">
            ✓ 내 주장 (제출 완료)
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{data.my_argument.title}</h3>
              <p className="text-sm text-gray-500">
                제출일: {new Date(data.my_argument.submitted_at).toLocaleString('ko-KR')}
              </p>
            </div>
            <div className="bg-white p-4 rounded border">
              <p className="whitespace-pre-wrap">{data.my_argument.content}</p>
            </div>
            {data.my_argument.evidence && data.my_argument.evidence.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">증거 자료 ({data.my_argument.evidence.length}개)</h4>
                <div className="space-y-2">
                  {data.my_argument.evidence.map((ev: Evidence, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {evidenceTypeLabels[ev.type]}
                        </span>
                        <span className="font-medium">{ev.title}</span>
                      </div>
                      <p className="text-sm text-gray-600">{ev.content}</p>
                      {ev.source_url && (
                        <a 
                          href={ev.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          출처: {ev.source_url}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 상대방 주장 */}
      {data.opponent_argument && (
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            상대방 주장 (Side {data.opponent_argument.side})
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{data.opponent_argument.title}</h3>
              <p className="text-sm text-gray-500">
                제출일: {new Date(data.opponent_argument.submitted_at).toLocaleString('ko-KR')}
              </p>
            </div>
            <div className="bg-white p-4 rounded border">
              <p className="whitespace-pre-wrap">{data.opponent_argument.content}</p>
            </div>
            {data.opponent_argument.evidence && data.opponent_argument.evidence.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">증거 자료 ({data.opponent_argument.evidence.length}개)</h4>
                <div className="space-y-2">
                  {data.opponent_argument.evidence.map((ev: Evidence, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {evidenceTypeLabels[ev.type]}
                        </span>
                        <span className="font-medium">{ev.title}</span>
                      </div>
                      <p className="text-sm text-gray-600">{ev.content}</p>
                      {ev.source_url && (
                        <a 
                          href={ev.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          출처: {ev.source_url}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 주장 제출 폼 */}
      {data.can_submit && (
        <div className="bg-white border-2 border-blue-400 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">주장 제출</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-semibold mb-2">
                제목 <span className="text-red-500">*</span>
                <span className="text-sm text-gray-500 ml-2">(10-200자)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-lg p-3"
                placeholder="주장의 제목을 입력하세요"
                required
                minLength={10}
                maxLength={200}
              />
              <p className="text-sm text-gray-500 mt-1">{title.length}/200</p>
            </div>

            <div>
              <label className="block font-semibold mb-2">
                주장 내용 <span className="text-red-500">*</span>
                <span className="text-sm text-gray-500 ml-2">(100-5000자)</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border rounded-lg p-3 h-64"
                placeholder="자신의 주장을 상세히 작성하세요"
                required
                minLength={100}
                maxLength={5000}
              />
              <p className="text-sm text-gray-500 mt-1">{content.length}/5000</p>
            </div>

            {/* 증거 목록 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block font-semibold">
                  증거 자료 <span className="text-sm text-gray-500">(선택, 최대 10개)</span>
                </label>
                {evidence.length < 10 && (
                  <button
                    type="button"
                    onClick={() => setShowEvidenceForm(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    + 증거 추가
                  </button>
                )}
              </div>

              {evidence.length > 0 && (
                <div className="space-y-2 mb-4">
                  {evidence.map((ev, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded border flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {evidenceTypeLabels[ev.type]}
                          </span>
                          <span className="font-medium">{ev.title}</span>
                        </div>
                        <p className="text-sm text-gray-600">{ev.content}</p>
                        {ev.source_url && (
                          <p className="text-xs text-blue-600 mt-1">출처: {ev.source_url}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEvidence(idx)}
                        className="ml-3 text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 증거 추가 폼 */}
              {showEvidenceForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block font-semibold mb-1">증거 유형</label>
                    <select
                      value={newEvidence.type}
                      onChange={(e) => setNewEvidence({ ...newEvidence, type: e.target.value as EvidenceType })}
                      className="w-full border rounded p-2"
                    >
                      <option value={EvidenceType.LINK}>링크</option>
                      <option value={EvidenceType.DOCUMENT}>문서</option>
                      <option value={EvidenceType.STATISTIC}>통계</option>
                      <option value={EvidenceType.QUOTE}>인용</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">증거 제목</label>
                    <input
                      type="text"
                      value={newEvidence.title}
                      onChange={(e) => setNewEvidence({ ...newEvidence, title: e.target.value })}
                      className="w-full border rounded p-2"
                      placeholder="증거 자료의 제목"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">증거 내용</label>
                    <textarea
                      value={newEvidence.content}
                      onChange={(e) => setNewEvidence({ ...newEvidence, content: e.target.value })}
                      className="w-full border rounded p-2 h-24"
                      placeholder="증거 자료에 대한 설명"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">출처 URL (선택)</label>
                    <input
                      type="url"
                      value={newEvidence.source_url}
                      onChange={(e) => setNewEvidence({ ...newEvidence, source_url: e.target.value })}
                      className="w-full border rounded p-2"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddEvidence}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEvidenceForm(false);
                        setNewEvidence({
                          type: EvidenceType.LINK,
                          title: '',
                          content: '',
                          source_url: ''
                        });
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? '제출 중...' : '주장 제출'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/rooms/${roomId}`)}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 대기 메시지 */}
      {!data.can_submit && !data.my_argument && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">현재 주장을 제출할 수 없습니다.</p>
        </div>
      )}

      {data.my_argument && !data.opponent_argument && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">상대방의 주장을 기다리고 있습니다...</p>
        </div>
      )}

      {data.my_argument && data.opponent_argument && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-800 font-semibold">
            양측 주장이 모두 제출되었습니다. AI 재판이 진행됩니다.
          </p>
          <button
            onClick={() => router.push(`/rooms/${roomId}`)}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            방 상태 확인하기
          </button>
        </div>
      )}
    </div>
  );
}
