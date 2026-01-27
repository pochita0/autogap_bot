import { Check, Circle, X, Loader } from 'lucide-react';

export type StepStatus = 'PENDING' | 'ACTIVE' | 'DONE' | 'FAILED';

export interface ExecutionStep {
  id: string;
  label: string;
}

interface ExecutionStepperProps {
  steps: ExecutionStep[];
  statusByStepId: Record<string, StepStatus>;
  currentStep: number;
}

export default function ExecutionStepper({ steps, statusByStepId, currentStep }: ExecutionStepperProps) {
  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'DONE':
        return <Check className="w-4 h-4 text-white" />;
      case 'ACTIVE':
        return <Loader className="w-4 h-4 text-white animate-spin" />;
      case 'FAILED':
        return <X className="w-4 h-4 text-white" />;
      case 'PENDING':
        return <Circle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStepColor = (status: StepStatus) => {
    switch (status) {
      case 'DONE':
        return 'bg-green-600 border-green-500';
      case 'ACTIVE':
        return 'bg-blue-600 border-blue-500';
      case 'FAILED':
        return 'bg-red-600 border-red-500';
      case 'PENDING':
        return 'bg-slate-700 border-slate-600';
    }
  };

  const getStepTextColor = (status: StepStatus) => {
    switch (status) {
      case 'DONE':
        return 'text-green-400';
      case 'ACTIVE':
        return 'text-blue-400 font-semibold';
      case 'FAILED':
        return 'text-red-400';
      case 'PENDING':
        return 'text-slate-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="text-sm text-slate-400">
        진행 상황: <span className="font-semibold text-white">{currentStep}/{steps.length}</span>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const status = statusByStepId[step.id] || 'PENDING';
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Icon */}
              <div className="relative flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${getStepColor(
                    status
                  )}`}
                >
                  {getStepIcon(status)}
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div className="absolute top-8 left-4 w-0.5 h-6 bg-slate-700"></div>
                )}
              </div>

              {/* Label */}
              <div className="flex-1 pt-1">
                <div className={`text-sm ${getStepTextColor(status)}`}>
                  {step.label}
                </div>
                {status === 'FAILED' && (
                  <div className="text-xs text-red-400/80 mt-1">
                    실패 - 재시도 필요
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
