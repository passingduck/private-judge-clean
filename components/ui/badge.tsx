import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '' 
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary-100 text-primary-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

// 상태별 특화 Badge 컴포넌트들
export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const statusConfig = {
    waiting_participant: { variant: 'warning' as const, text: '참여자 대기' },
    agenda_negotiation: { variant: 'info' as const, text: '안건 협상' },
    arguments_submission: { variant: 'primary' as const, text: '주장 제출' },
    ai_processing: { variant: 'info' as const, text: 'AI 처리 중' },
    completed: { variant: 'success' as const, text: '완료' },
    cancelled: { variant: 'error' as const, text: '취소됨' },
    
    // Job 상태
    queued: { variant: 'default' as const, text: '대기 중' },
    running: { variant: 'primary' as const, text: '실행 중' },
    succeeded: { variant: 'success' as const, text: '성공' },
    failed: { variant: 'error' as const, text: '실패' },
    retrying: { variant: 'warning' as const, text: '재시도 중' },
    
    // 토론 라운드
    first: { variant: 'info' as const, text: '1차 토론' },
    second: { variant: 'info' as const, text: '2차 토론' },
    final: { variant: 'primary' as const, text: '최종 토론' },
    
    // 판결
    pending: { variant: 'default' as const, text: '판결 대기' },
    in_progress: { variant: 'primary' as const, text: '심의 중' },
    verdict_ready: { variant: 'success' as const, text: '판결 완료' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || { 
    variant: 'default' as const, 
    text: status 
  };

  return (
    <Badge variant={config.variant} className={className}>
      {config.text}
    </Badge>
  );
}

// 우선순위 Badge
export function PriorityBadge({ priority, className = '' }: { priority: 'low' | 'medium' | 'high' | 'urgent'; className?: string }) {
  const priorityConfig = {
    low: { variant: 'default' as const, text: '낮음' },
    medium: { variant: 'info' as const, text: '보통' },
    high: { variant: 'warning' as const, text: '높음' },
    urgent: { variant: 'error' as const, text: '긴급' }
  };

  const config = priorityConfig[priority];

  return (
    <Badge variant={config.variant} size="sm" className={className}>
      {config.text}
    </Badge>
  );
}
