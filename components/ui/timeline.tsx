import React from 'react';
import Badge, { StatusBadge } from './badge';

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status?: 'completed' | 'current' | 'pending' | 'error';
  type?: 'user_action' | 'system' | 'ai_processing' | 'milestone';
  actor?: string;
  metadata?: Record<string, any>;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
  showTimestamps?: boolean;
  compact?: boolean;
}

export default function Timeline({ 
  events, 
  className = '',
  showTimestamps = true,
  compact = false 
}: TimelineProps) {
  const getEventIcon = (event: TimelineEvent) => {
    const iconClass = "w-4 h-4";
    
    switch (event.type) {
      case 'user_action':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
      case 'ai_processing':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        );
      case 'milestone':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getEventColor = (event: TimelineEvent) => {
    switch (event.status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'current':
        return 'text-primary-600 bg-primary-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flow-root ${className}`}>
      <ul className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span 
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" 
                  aria-hidden="true" 
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getEventColor(event)}`}>
                    {getEventIcon(event)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {event.title}
                      </p>
                      {event.status && (
                        <StatusBadge status={event.status} />
                      )}
                    </div>
                    {showTimestamps && (
                      <time className="text-sm text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </time>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {event.description}
                    </p>
                  )}
                  
                  {event.actor && (
                    <p className="mt-1 text-xs text-gray-500">
                      by {event.actor}
                    </p>
                  )}
                  
                  {!compact && event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <Badge key={key} variant="default" size="sm">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 특화된 Timeline 컴포넌트들
export function DebateTimeline({ roomId, events }: { roomId: string; events: TimelineEvent[] }) {
  const debateEvents = events.filter(event => 
    ['user_action', 'ai_processing', 'milestone'].includes(event.type || '')
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">토론 진행 상황</h3>
      <Timeline events={debateEvents} />
    </div>
  );
}

export function SystemTimeline({ events }: { events: TimelineEvent[] }) {
  const systemEvents = events.filter(event => event.type === 'system');

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">시스템 로그</h4>
      <Timeline events={systemEvents} compact showTimestamps={false} />
    </div>
  );
}
