import React, { useState, useCallback } from 'react';
import { ScaleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface DebateTurn {
  id: string;
  side: 'A' | 'B';
  content?: {
    data?: {
      statement?: string;
      key_points?: string[];
      counter_arguments?: string[];
    };
  };
}

interface DebateRound {
  id: string;
  round_number: number;
  status: string;
  turns?: DebateTurn[];
}

interface DebateRoundsProps {
  debateTurns: DebateRound[];
  roomStatus: string;
}

const DebateRounds = React.memo<DebateRoundsProps>(({ debateTurns, roomStatus }) => {
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

  // Debug logging
  React.useEffect(() => {
    console.log('[DebateRounds] Props updated:', {
      roomStatus,
      debateTurnsCount: debateTurns.length,
      debateTurns: debateTurns.map(r => ({
        id: r.id,
        round_number: r.round_number,
        status: r.status,
        turnsCount: r.turns?.length || 0
      }))
    });
  }, [debateTurns, roomStatus]);

  const toggleRound = useCallback((roundId: string) => {
    setExpandedRounds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roundId)) {
        newSet.delete(roundId);
      } else {
        newSet.add(roundId);
      }
      return newSet;
    });
  }, []);

  const relevantStatuses = [
    'debate_round_1',
    'waiting_rebuttal_1',
    'debate_round_2',
    'waiting_rebuttal_2',
    'debate_round_3',
    'ai_processing',
    'completed'
  ];

  if (!relevantStatuses.includes(roomStatus) || debateTurns.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <ScaleIcon className="h-5 w-5 text-primary-accent mr-2" />
        <h2 className="text-lg font-semibold text-gray-900">AI 토론 결과</h2>
      </div>

      <div className="space-y-4">
        {debateTurns.map((round) => {
          const isExpanded = expandedRounds.has(round.id);
          return (
            <div key={round.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleRound(round.id)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center">
                  <h3 className="font-semibold text-gray-900">
                    {round.round_number}차 토론
                  </h3>
                  {round.status === 'completed' && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">완료</span>
                  )}
                  {round.status === 'in_progress' && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">진행 중</span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4">
                  {round.turns && round.turns.length > 0 ? (
                    <div className="space-y-4">
                      {round.turns.map((turn) => (
                        <div
                          key={turn.id}
                          className={`p-4 rounded-lg ${
                            turn.side === 'A'
                              ? 'bg-blue-50 border-l-4 border-blue-500'
                              : 'bg-green-50 border-l-4 border-green-500'
                          }`}
                        >
                          <div className="flex items-center mb-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 ${
                                turn.side === 'A' ? 'bg-primary-accent' : 'bg-green-500'
                              }`}
                            >
                              {turn.side}
                            </div>
                            <span className="font-medium text-gray-900">
                              {turn.side === 'A' ? 'AI 변호사 A' : 'AI 변호사 B'}
                            </span>
                          </div>

                          {turn.content?.data?.statement && (
                            <p className="text-gray-700 whitespace-pre-wrap mb-3">
                              {turn.content.data.statement}
                            </p>
                          )}

                          {turn.content?.data?.key_points && turn.content.data.key_points.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-gray-700 mb-1">핵심 포인트:</p>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {turn.content.data.key_points.map((point, idx) => (
                                  <li key={idx}>{point}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {turn.content?.data?.counter_arguments &&
                            turn.content.data.counter_arguments.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">반박 논리:</p>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {turn.content.data.counter_arguments.map((arg, idx) => (
                                    <li key={idx}>{arg}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">토론 내용을 불러오는 중...</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

DebateRounds.displayName = 'DebateRounds';

export default DebateRounds;
