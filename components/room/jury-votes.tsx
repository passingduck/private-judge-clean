import React, { useMemo } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';

interface JuryVote {
  id: string;
  jury_number: number;
  vote: 'A' | 'B';
  confidence: number;
  reasoning: string;
  created_at: string;
}

interface JuryVotesProps {
  juryVotes: JuryVote[];
  roomStatus: string;
}

const JuryVotes = React.memo<JuryVotesProps>(({ juryVotes, roomStatus }) => {
  const juryStats = useMemo(() => {
    if (juryVotes.length === 0) {
      return { totalVotes: 0, votesA: 0, votesB: 0, avgConfidence: 0 };
    }

    const votesA = juryVotes.filter(v => v.vote === 'A').length;
    const votesB = juryVotes.filter(v => v.vote === 'B').length;
    const avgConfidence = juryVotes.reduce((sum, v) => sum + v.confidence, 0) / juryVotes.length;

    return {
      totalVotes: juryVotes.length,
      votesA,
      votesB,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
  }, [juryVotes]);

  if (roomStatus !== 'completed' || juryVotes.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <UserGroupIcon className="h-5 w-5 text-primary-accent mr-2" />
        <h2 className="text-lg font-semibold text-gray-900">배심원 투표 결과</h2>
      </div>

      {/* 투표 통계 */}
      <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">총 투표 수</p>
          <p className="text-2xl font-bold text-gray-900">{juryStats.totalVotes}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">A측 득표</p>
          <p className="text-2xl font-bold text-blue-600">{juryStats.votesA}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">B측 득표</p>
          <p className="text-2xl font-bold text-green-600">{juryStats.votesB}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">평균 신뢰도</p>
          <p className="text-2xl font-bold text-purple-600">{juryStats.avgConfidence}</p>
        </div>
      </div>

      {/* 배심원 투표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {juryVotes
          .sort((a, b) => a.jury_number - b.jury_number)
          .map((vote) => (
            <div
              key={vote.id}
              className={`p-4 rounded-lg border-2 ${
                vote.vote === 'A'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2 ${
                      vote.vote === 'A' ? 'bg-blue-600' : 'bg-green-600'
                    }`}
                  >
                    {vote.jury_number}
                  </div>
                  <span className="font-semibold text-gray-900">배심원 {vote.jury_number}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      vote.vote === 'A'
                        ? 'bg-blue-600 text-white'
                        : 'bg-green-600 text-white'
                    }`}
                  >
                    {vote.vote}측
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    신뢰도: {vote.confidence}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{vote.reasoning}</p>
            </div>
          ))}
      </div>
    </div>
  );
});

JuryVotes.displayName = 'JuryVotes';

export default JuryVotes;
