import React from 'react';

interface Step {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
}

interface StepperProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export default function Stepper({ 
  steps, 
  orientation = 'horizontal',
  className = '' 
}: StepperProps) {
  const getStepIcon = (status: Step['status'], index: number) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'current':
        return (
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">{index + 1}</span>
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 text-sm font-medium">{index + 1}</span>
          </div>
        );
    }
  };

  const getConnectorClass = (currentStatus: Step['status'], nextStatus?: Step['status']) => {
    if (currentStatus === 'completed') {
      return 'bg-primary-500';
    }
    return 'bg-gray-300';
  };

  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              {getStepIcon(step.status, index)}
              {index < steps.length - 1 && (
                <div className={`w-0.5 h-8 mt-2 ${getConnectorClass(step.status, steps[index + 1]?.status)}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-medium ${
                step.status === 'current' ? 'text-primary-600' : 
                step.status === 'completed' ? 'text-gray-900' :
                step.status === 'error' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {step.title}
              </h3>
              {step.description && (
                <p className="text-sm text-gray-500 mt-1">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <nav className={`flex ${className}`} aria-label="Progress">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => (
          <li key={step.id} className={`relative ${index < steps.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex items-center">
              {getStepIcon(step.status, index)}
              <div className="ml-3 min-w-0">
                <span className={`text-sm font-medium ${
                  step.status === 'current' ? 'text-primary-600' : 
                  step.status === 'completed' ? 'text-gray-900' :
                  step.status === 'error' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {step.description && (
                  <p className="text-xs text-gray-500">{step.description}</p>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="absolute top-4 left-8 w-full -z-10">
                <div className={`h-0.5 ${getConnectorClass(step.status, steps[index + 1]?.status)}`} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
