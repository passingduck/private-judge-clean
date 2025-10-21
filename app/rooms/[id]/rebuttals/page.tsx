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

interface Rebuttal {
  id: string;
  side: string;
  round_number: number;
  content: string;
  evidence: Evidence[];
  submitted_at: string;
}

interface RebuttalsData {
  my_rebuttals: Rebuttal[];
  opponent_rebuttals: Rebuttal[];
  user_side: string;
  can_view_opponent: boolean;
}

interface RoomStatus {
  status: string;
  title: string;
}

export default function RebuttalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<RebuttalsData | null>(null);
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [content, setContent] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [newEvidence, setNewEvidence] = useState<Evidence>({
    type: EvidenceType.LINK,
    title: '',
    content: '',
    source_url: ''
  });

  const fetchRoomStatus = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/status`);
      if (response.ok) {
        const data = await response.json();
        setRoomStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch room status:', error);
    }
  };

  const fetchRebuttals = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/rebuttals`);

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else {
        console.error('Failed to fetch rebuttals');
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomStatus();
    fetchRebuttals();
  }, []);

  const handleAddEvidence = () => {
    if (!newEvidence.title || !newEvidence.content) {
      alert('증거 제목과 내용을 입력해주세요');
      return;
    }

    if (evidence.length >= 5) {
      alert('반론 증거는 최대 5개까지 추가할 수 있습니다');
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

    if (content.length < 50 || content.length > 3000) {
      alert('반론 내용은 50자 이상 3000자 이하로 입력해주세요');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/rooms/${roomId}/rebuttals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          evidence
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || '반론이 제출되었습니다');
        router.push(`/rooms/${roomId}`);
      } else {
        alert(result.message || result.error || '반론 제출에 실패했습니다');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('반론 제출 중 오류가 발생했습니다');
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

  if (!data || !roomStatus) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-red-600">데이터를 불러올 수 없습니다</div>
      </div>
    );
  }

  // 현재 라운드 결정
  const currentRound = roomStatus.status === 'waiting_rebuttal_1' ? 1 : 2;
  const currentRoundRebuttal = data.my_rebuttals.find(r => r.round_number === currentRound);
  const opponentCurrentRoundRebuttal = data.opponent_rebuttals.find(r => r.round_number === currentRound);
  const canSubmit = !currentRoundRebuttal && (roomStatus.status === 'waiting_rebuttal_1' || roomStatus.status === 'waiting_rebuttal_2');

  const evidenceTypeLabels = {
    [EvidenceType.LINK]: '링크',
    [EvidenceType.DOCUMENT]: '문서',
    [EvidenceType.STATISTIC]: '통계',
    [EvidenceType.QUOTE]: '인용'
  };

  const roundLabels = {
    1: '1차 토론 후',
    2: '2차 토론 후'
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">반론 제출</h1>
          <p className="text-gray-600 mt-2">{roundLabels[currentRound as keyof typeof roundLabels]} 반론</p>
        </div>
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
        <p className="text-blue-800 mt-1">
          <strong>안건:</strong> {roomStatus.title}
        </p>
      </div>

      {/* 내 반론 */}
      {currentRoundRebuttal && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-800 mb-4">
            ✓ 내 반론 (제출 완료)
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">
                제출일: {new Date(currentRoundRebuttal.submitted_at).toLocaleString('ko-KR')}
              </p>
            </div>
            <div className="bg-white p-4 rounded border">
              <p className="whitespace-pre-wrap">{currentRoundRebuttal.content}</p>
            </div>
            {currentRoundRebuttal.evidence && currentRoundRebuttal.evidence.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">증거 자료 ({currentRoundRebuttal.evidence.length}개)</h4>
                <div className="space-y-2">
                  {currentRoundRebuttal.evidence.map((ev: Evidence, idx: number) => (
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

      {/* 상대방 반론 */}
      {opponentCurrentRoundRebuttal && data.can_view_opponent && (
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            상대방 반론 (Side {opponentCurrentRoundRebuttal.side})
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">
                제출일: {new Date(opponentCurrentRoundRebuttal.submitted_at).toLocaleString('ko-KR')}
              </p>
            </div>
            <div className="bg-white p-4 rounded border">
              <p className="whitespace-pre-wrap">{opponentCurrentRoundRebuttal.content}</p>
            </div>
            {opponentCurrentRoundRebuttal.evidence && opponentCurrentRoundRebuttal.evidence.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">증거 자료 ({opponentCurrentRoundRebuttal.evidence.length}개)</h4>
                <div className="space-y-2">
                  {opponentCurrentRoundRebuttal.evidence.map((ev: Evidence, idx: number) => (
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

      {/* 반론 제출 폼 */}
      {canSubmit && (
        <div className="bg-white border-2 border-blue-400 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">
            {roundLabels[currentRound as keyof typeof roundLabels]} 반론 작성
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-semibold mb-2">
                반론 내용 <span className="text-red-500">*</span>
                <span className="text-sm text-gray-500 ml-2">(50-3000자)</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border rounded-lg p-3 h-64"
                placeholder="상대방의 주장이나 AI 변호사의 논변에 대한 반론을 작성하세요"
                required
                minLength={50}
                maxLength={3000}
              />
              <p className="text-sm text-gray-500 mt-1">{content.length}/3000</p>
            </div>

            {/* 증거 목록 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block font-semibold">
                  증거 자료 <span className="text-sm text-gray-500">(선택, 최대 5개)</span>
                </label>
                {evidence.length < 5 && (
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
                {submitting ? '제출 중...' : '반론 제출'}
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
      {!canSubmit && !currentRoundRebuttal && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">현재 반론을 제출할 수 없습니다.</p>
        </div>
      )}

      {currentRoundRebuttal && !opponentCurrentRoundRebuttal && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">상대방의 반론을 기다리고 있습니다...</p>
        </div>
      )}

      {currentRoundRebuttal && opponentCurrentRoundRebuttal && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-800 font-semibold">
            양측 반론이 모두 제출되었습니다. 다음 라운드가 자동으로 시작됩니다.
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
