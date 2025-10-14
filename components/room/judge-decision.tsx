import React from 'react';
import { TrophyIcon, ScaleIcon } from '@heroicons/react/24/outline';

interface JudgeDecision {
  id: string;
  winner: 'A' | 'B';
  score_a: number;
  score_b: number;
  reasoning: string;
  analysis_a: string;
  analysis_b: string;
  created_at: string;
}

interface JudgeDecisionProps {
  judgeDecision: JudgeDecision | null;
  roomStatus: string;
}

const JudgeDecision = React.memo<JudgeDecisionProps>(({ judgeDecision, roomStatus }) => {
  if (roomStatus !== 'completed' || !judgeDecision) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
      <div className="flex items-center mb-6">
        <TrophyIcon className="h-6 w-6 text-amber-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-900">최종 판결</h2>
      </div>

      {/* 승자 표시 */}
      <div className="bg-white rounded-lg p-6 mb-6 text-center border-2 border-amber-300">
        <p className="text-lg text-gray-600 mb-2">승자</p>
        <div className="flex items-center justify-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-bold mr-4 ${
              judgeDecision.winner === 'A' ? 'bg-blue-600' : 'bg-green-600'
            }`}
          >
            {judgeDecision.winner}
          </div>
          <span
            className={`text-4xl font-bold ${
              judgeDecision.winner === 'A' ? 'text-blue-600' : 'text-green-600'
            }`}
          >
            {judgeDecision.winner}측 승리
          </span>
        </div>
      </div>

      {/* 점수 표시 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 text-center border-2 border-blue-200">
          <p className="text-sm text-gray-500 mb-1">A측 점수</p>
          <p className="text-3xl font-bold text-blue-600">{judgeDecision.score_a}</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center border-2 border-green-200">
          <p className="text-sm text-gray-500 mb-1">B측 점수</p>
          <p className="text-3xl font-bold text-green-600">{judgeDecision.score_b}</p>
        </div>
      </div>

      {/* 판결 이유 */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
          <ScaleIcon className="h-5 w-5 text-amber-600 mr-2" />
          판결 이유
        </h3>
        <p className="text-gray-700 whitespace-pre-wrap">{judgeDecision.reasoning}</p>
      </div>

      {/* A측 분석 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
        <h3 className="font-semibold text-blue-900 mb-2">A측 분석</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{judgeDecision.analysis_a}</p>
      </div>

      {/* B측 분석 */}
      <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
        <h3 className="font-semibold text-green-900 mb-2">B측 분석</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{judgeDecision.analysis_b}</p>
      </div>
    </div>
  );
});

JudgeDecision.displayName = 'JudgeDecision';

export default JudgeDecision;
