'use client';

import { useState, useEffect } from 'react';
import { 
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ScaleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { Room, RoomStatus } from '@/core/models/room';
import { MESSAGES } from '@/core/constants/messages';
import { Badge } from '@/components/ui/badge';
import Stepper from '@/components/ui/stepper';

interface RoomStatusProps {
  room: Room;
  onRefresh?: () => void;
  showActions?: boolean;
  className?: string;
}

interface StatusInfo {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
  nextAction?: string;
}

const STATUS_INFO: Record<RoomStatus, StatusInfo> = {
  [RoomStatus.WAITING_PARTICIPANT]: {
    icon: UserGroupIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: '참가자를 기다리고 있습니다',
    nextAction: '다른 사용자가 참가할 때까지 대기'
  },
  [RoomStatus.AGENDA_NEGOTIATION]: {
    icon: ChatBubbleLeftRightIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    description: '토론 안건을 협상 중입니다',
    nextAction: '토론 주제와 세부사항을 결정'
  },
  [RoomStatus.ARGUMENTS_SUBMISSION]: {
    icon: ClipboardDocumentIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: '주장을 제출하는 단계입니다',
    nextAction: '양측이 주장과 근거를 제출'
  },
  [RoomStatus.AI_PROCESSING]: {
    icon: ArrowPathIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    description: 'AI 토론이 진행 중입니다',
    nextAction: 'AI가 자동으로 토론을 진행'
  },
  [RoomStatus.COMPLETED]: {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    description: '토론이 완료되었습니다',
    nextAction: '결과를 확인하고 보고서를 열람'
  },
  [RoomStatus.CANCELLED]: {
    icon: ExclamationTriangleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    description: '토론이 취소되었습니다',
  }
};

const STEP_ORDER: RoomStatus[] = [
  RoomStatus.WAITING_PARTICIPANT,
  RoomStatus.AGENDA_NEGOTIATION,
  RoomStatus.ARGUMENTS_SUBMISSION,
  RoomStatus.AI_PROCESSING,
  RoomStatus.COMPLETED
];

export default function RoomStatusComponent({ 
  room, 
  onRefresh, 
  showActions = true, 
  className = '' 
}: RoomStatusProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  const statusInfo = STATUS_INFO[room.status];
  const StatusIcon = statusInfo.icon;
  const currentStepIndex = STEP_ORDER.indexOf(room.status);

  // 자동 새로고침 (진행 중인 상태일 때만)
  useEffect(() => {
    if (!autoRefresh) return;

    const shouldAutoRefresh = [
      RoomStatus.AI_DEBATE_IN_PROGRESS,
      RoomStatus.JUDGE_DECISION_PENDING,
      RoomStatus.JURY_VOTING_PENDING,
      RoomStatus.FINAL_REPORT_PENDING,
      RoomStatus.AI_PROCESSING
    ].includes(room.status);

    if (!shouldAutoRefresh) {
      setAutoRefresh(false);
      return;
    }

    const interval = setInterval(() => {
      if (onRefresh) {
        onRefresh();
        setLastUpdated(new Date());
      }
    }, 10000); // 10초마다 새로고침

    return () => clearInterval(interval);
  }, [autoRefresh, room.status, onRefresh]);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      setLastUpdated(new Date());
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}초 전`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    return `${Math.floor(diffInSeconds / 86400)}일 전`;
  };

  const getProgressPercentage = () => {
    if (room.status === RoomStatus.CANCELLED) return 0;
    if (room.status === RoomStatus.COMPLETED) return 100;
    
    const totalSteps = STEP_ORDER.length - 1; // COMPLETED 제외
    return Math.round((currentStepIndex / totalSteps) * 100);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
              <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {MESSAGES.ROOM.CURRENT_STATUS}
              </h3>
              <Badge status={room.status} />
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleAutoRefresh}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  autoRefresh
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {autoRefresh ? '자동 새로고침 ON' : '자동 새로고침 OFF'}
              </button>
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                title="새로고침"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 상태 정보 */}
      <div className="p-6">
        <div className="mb-6">
          <p className="text-gray-700 mb-2">{statusInfo.description}</p>
          {statusInfo.nextAction && (
            <p className="text-sm text-gray-500">
              <span className="font-medium">다음 단계:</span> {statusInfo.nextAction}
            </p>
          )}
        </div>

        {/* 진행률 표시 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              전체 진행률
            </span>
            <span className="text-sm text-gray-500">
              {getProgressPercentage()}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                room.status === RoomStatus.COMPLETED
                  ? 'bg-green-500'
                  : room.status === RoomStatus.CANCELLED
                  ? 'bg-red-500'
                  : 'bg-primary-accent'
              }`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* 단계별 진행 상황 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {MESSAGES.ROOM.DEBATE_PROGRESS}
          </h4>
          <Stepper 
            currentStep={currentStepIndex}
            steps={STEP_ORDER.map(status => ({
              label: MESSAGES.ROOM_STATUS[status] || status,
              status: status === room.status ? 'current' : 
                     STEP_ORDER.indexOf(status) < currentStepIndex ? 'completed' : 
                     room.status === RoomStatus.CANCELLED ? 'failed' : 'upcoming'
            }))}
          />
        </div>

        {/* 방 정보 */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              생성일시
            </p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(room.created_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              최종 업데이트
            </p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(room.updated_at).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>

        {/* 마지막 새로고침 시간 */}
        {showActions && (
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <ClockIcon className="h-4 w-4" />
              <span>마지막 확인: {getTimeAgo(lastUpdated)}</span>
            </div>
            {autoRefresh && (
              <div className="flex items-center space-x-1">
                <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                <span>10초마다 자동 새로고침</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
