'use client';

import { useState, useEffect } from 'react';
import { 
  ScaleIcon,
  UserGroupIcon,
  TrophyIcon,
  DocumentTextIcon,
  ChartBarIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { MESSAGES } from '@/core/constants/messages';
import Badge from '@/components/ui/badge';

interface JudgeDecision {
  id: string;
  winner_side: 'A' | 'B' | 'tie';
  reasoning: string;
  fairness_score: number;
  clarity_score: number;
  evidence_score: number;
  overall_score: number;
  created_at: string;
}

interface JuryVote {
  id: string;
  juror_id: string;
  winner_side: 'A' | 'B' | 'tie';
  confidence: number;
  reasoning: string;
  created_at: string;
}

interface FinalReport {
  id: string;
  final_winner: 'A' | 'B' | 'tie';
  judge_weight: number;
  jury_weight: number;
  summary: string;
  key_arguments: {
    side_a: string[];
    side_b: string[];
  };
  strengths_weaknesses: {
    side_a: { strengths: string[]; weaknesses: string[] };
    side_b: { strengths: string[]; weaknesses: string[] };
  };
  created_at: string;
}

interface VerdictDisplayProps {
  roomId: string;
  showDetails?: boolean;
  className?: string;
}

export default function VerdictDisplay({ 
  roomId, 
  showDetails = true, 
  className = '' 
}: VerdictDisplayProps) {
  const [judgeDecision, setJudgeDecision] = useState<JudgeDecision | null>(null);
  const [juryVotes, setJuryVotes] = useState<JuryVote[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'judge' | 'jury' | 'report'>('overview');

  // 데이터 가져오기
  const fetchVerdictData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 병렬로 모든 데이터 가져오기
      const [judgeResponse, juryResponse] = await Promise.all([
        fetch(`/api/rooms/${roomId}/judge`, {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'test-user-id-123',
            'x-user-email': 'test@example.com',
          },
        }),
        fetch(`/api/rooms/${roomId}/jury`, {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'test-user-id-123',
            'x-user-email': 'test@example.com',
          },
        })
      ]);

      if (judgeResponse.ok) {
        const judgeData = await judgeResponse.json();
        setJudgeDecision(judgeData.decision);
        setFinalReport(judgeData.final_report);
      }

      if (juryResponse.ok) {
        const juryData = await juryResponse.json();
        setJuryVotes(juryData.votes || []);
      }

    } catch (err: any) {
      console.error('Failed to fetch verdict data:', err);
      setError(err.message || '판결 데이터를 가져올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerdictData();
  }, [roomId]);

  // 배심원 투표 통계 계산
  const juryStats = {
    total: juryVotes.length,
    sideA: juryVotes.filter(vote => vote.winner_side === 'A').length,
    sideB: juryVotes.filter(vote => vote.winner_side === 'B').length,
    tie: juryVotes.filter(vote => vote.winner_side === 'tie').length,
    avgConfidence: juryVotes.length > 0 
      ? juryVotes.reduce((sum, vote) => sum + vote.confidence, 0) / juryVotes.length 
      : 0
  };

  const getWinnerInfo = (side: 'A' | 'B' | 'tie') => {
    switch (side) {
      case 'A':
        return { 
          label: 'A측 승리', 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-100',
          icon: TrophyIcon
        };
      case 'B':
        return { 
          label: 'B측 승리', 
          color: 'text-green-600', 
          bgColor: 'bg-green-100',
          icon: TrophyIcon
        };
      case 'tie':
        return { 
          label: '무승부', 
          color: 'text-yellow-600', 
          bgColor: 'bg-yellow-100',
          icon: ScaleIcon
        };
    }
  };

  const renderScoreBar = (score: number, maxScore: number = 10) => {
    const percentage = (score / maxScore) * 100;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-accent h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
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
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">판결 로드 실패</h3>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchVerdictData}
            className="px-4 py-2 bg-primary-accent text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!judgeDecision && juryVotes.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-8 ${className}`}>
        <div className="text-center">
          <ScaleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">판결 대기 중</h3>
          <p className="text-gray-500">아직 판결이 내려지지 않았습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <ScaleIcon className="h-8 w-8 text-primary-accent" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">토론 판결</h2>
            <p className="text-sm text-gray-600">AI 심판과 배심원단의 최종 결정</p>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        {showDetails && (
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: '종합', icon: ChartBarIcon },
              { id: 'judge', label: '심판 판결', icon: ScaleIcon },
              { id: 'jury', label: '배심원 투표', icon: UserGroupIcon },
              { id: 'report', label: '최종 보고서', icon: DocumentTextIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-primary-accent shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="p-6">
        {/* 종합 탭 */}
        {(!showDetails || activeTab === 'overview') && (
          <div className="space-y-6">
            {/* 최종 승자 */}
            {finalReport && (
              <div className="text-center">
                {(() => {
                  const winnerInfo = getWinnerInfo(finalReport.final_winner);
                  const WinnerIcon = winnerInfo.icon;
                  return (
                    <div className={`inline-flex items-center space-x-3 px-6 py-4 rounded-lg ${winnerInfo.bgColor}`}>
                      <WinnerIcon className={`h-8 w-8 ${winnerInfo.color}`} />
                      <div>
                        <h3 className={`text-2xl font-bold ${winnerInfo.color}`}>
                          {winnerInfo.label}
                        </h3>
                        <p className="text-sm text-gray-600">최종 판결</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 판결 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 심판 판결 */}
              {judgeDecision && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <ScaleIcon className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">AI 심판 판결</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">승자:</span>
                      <span className="font-medium text-blue-900">
                        {getWinnerInfo(judgeDecision.winner_side).label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">종합 점수:</span>
                      <span className="font-medium text-blue-900">
                        {judgeDecision.overall_score}/10
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 배심원 투표 */}
              {juryVotes.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <UserGroupIcon className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">배심원 투표</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">A측:</span>
                      <span className="font-medium text-green-900">
                        {juryStats.sideA}표 ({Math.round((juryStats.sideA / juryStats.total) * 100)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">B측:</span>
                      <span className="font-medium text-green-900">
                        {juryStats.sideB}표 ({Math.round((juryStats.sideB / juryStats.total) * 100)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">평균 확신도:</span>
                      <span className="font-medium text-green-900">
                        {juryStats.avgConfidence.toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 심판 판결 탭 */}
        {showDetails && activeTab === 'judge' && judgeDecision && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">심판 판결 상세</h3>
              
              {/* 점수 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-blue-700 mb-1">공정성</p>
                  <p className="text-xl font-bold text-blue-900">{judgeDecision.fairness_score}/10</p>
                  {renderScoreBar(judgeDecision.fairness_score)}
                </div>
                <div>
                  <p className="text-sm text-blue-700 mb-1">명확성</p>
                  <p className="text-xl font-bold text-blue-900">{judgeDecision.clarity_score}/10</p>
                  {renderScoreBar(judgeDecision.clarity_score)}
                </div>
                <div>
                  <p className="text-sm text-blue-700 mb-1">증거력</p>
                  <p className="text-xl font-bold text-blue-900">{judgeDecision.evidence_score}/10</p>
                  {renderScoreBar(judgeDecision.evidence_score)}
                </div>
                <div>
                  <p className="text-sm text-blue-700 mb-1">종합</p>
                  <p className="text-xl font-bold text-blue-900">{judgeDecision.overall_score}/10</p>
                  {renderScoreBar(judgeDecision.overall_score)}
                </div>
              </div>

              {/* 판결 이유 */}
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">판결 이유</h4>
                <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">
                  {judgeDecision.reasoning}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 배심원 투표 탭 */}
        {showDetails && activeTab === 'jury' && juryVotes.length > 0 && (
          <div className="space-y-6">
            {/* 투표 통계 */}
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-4">배심원 투표 통계</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{juryStats.sideA}</p>
                  <p className="text-sm text-gray-600">A측 투표</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{juryStats.sideB}</p>
                  <p className="text-sm text-gray-600">B측 투표</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{juryStats.tie}</p>
                  <p className="text-sm text-gray-600">무승부</p>
                </div>
              </div>

              {/* 투표 분포 */}
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div className="flex h-4 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500" 
                    style={{ width: `${(juryStats.sideA / juryStats.total) * 100}%` }}
                  />
                  <div 
                    className="bg-green-500" 
                    style={{ width: `${(juryStats.sideB / juryStats.total) * 100}%` }}
                  />
                  <div 
                    className="bg-yellow-500" 
                    style={{ width: `${(juryStats.tie / juryStats.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 개별 투표 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">개별 배심원 투표</h4>
              {juryVotes.map((vote, index) => (
                <div key={vote.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">배심원 #{index + 1}</span>
                    <div className="flex items-center space-x-2">
                      <Badge status={vote.winner_side === 'A' ? 'primary' : vote.winner_side === 'B' ? 'success' : 'warning'} />
                      <div className="flex items-center space-x-1">
                        <StarIcon className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">{vote.confidence}/10</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {vote.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최종 보고서 탭 */}
        {showDetails && activeTab === 'report' && finalReport && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">최종 보고서</h3>
              
              {/* 요약 */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">토론 요약</h4>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {finalReport.summary}
                </p>
              </div>

              {/* 주요 논점 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-blue-900 mb-3">A측 주요 논점</h4>
                  <ul className="space-y-2">
                    {finalReport.key_arguments.side_a.map((arg, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{arg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-green-900 mb-3">B측 주요 논점</h4>
                  <ul className="space-y-2">
                    {finalReport.key_arguments.side_b.map((arg, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{arg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 강점과 약점 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-blue-900 mb-3">A측 분석</h4>
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-green-700 mb-1">강점</h5>
                      <ul className="space-y-1">
                        {finalReport.strengths_weaknesses.side_a.strengths.map((strength, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start space-x-1">
                            <span className="text-green-500 mt-1">+</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-red-700 mb-1">약점</h5>
                      <ul className="space-y-1">
                        {finalReport.strengths_weaknesses.side_a.weaknesses.map((weakness, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start space-x-1">
                            <span className="text-red-500 mt-1">-</span>
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-green-900 mb-3">B측 분석</h4>
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-green-700 mb-1">강점</h5>
                      <ul className="space-y-1">
                        {finalReport.strengths_weaknesses.side_b.strengths.map((strength, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start space-x-1">
                            <span className="text-green-500 mt-1">+</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-red-700 mb-1">약점</h5>
                      <ul className="space-y-1">
                        {finalReport.strengths_weaknesses.side_b.weaknesses.map((weakness, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start space-x-1">
                            <span className="text-red-500 mt-1">-</span>
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
