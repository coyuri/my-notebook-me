'use client';

export type ProgressStep =
  | 'idle'
  | 'fetching'
  | 'analyzing'
  | 'generating_text'
  | 'generating_voice'
  | 'done'
  | 'error';

interface Step {
  id: ProgressStep;
  label: string;
  icon: string;
}

const STEPS: Step[] = [
  { id: 'fetching',          label: 'コンテンツ取得',   icon: '🌐' },
  { id: 'analyzing',         label: 'AI解析中',         icon: '🤖' },
  { id: 'generating_text',   label: '解説テキスト生成', icon: '📝' },
  { id: 'generating_voice',  label: '音声生成',         icon: '🎙️' },
];

const STEP_ORDER: ProgressStep[] = [
  'fetching',
  'analyzing',
  'generating_text',
  'generating_voice',
  'done',
];

function stepIndex(step: ProgressStep): number {
  return STEP_ORDER.indexOf(step);
}

interface ProgressBarProps {
  status: ProgressStep;
  message?: string;
}

export default function ProgressBar({ status, message }: ProgressBarProps) {
  if (status === 'idle') return null;

  const currentIndex = stepIndex(status);
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-4">
        {STEPS.map((step, idx) => {
          const stepIdx = stepIndex(step.id);
          const isCompleted = isDone || currentIndex > stepIdx;
          const isActive = !isDone && currentIndex === stepIdx;
          const isPending = !isDone && currentIndex < stepIdx;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              {/* Connector line (not before first) */}
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div
                    className={`h-1 flex-1 transition-colors ${
                      isCompleted || (idx <= currentIndex)
                        ? 'bg-brand-500'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
                {/* Circle */}
                <div
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center text-base
                    border-2 transition-all duration-300 shrink-0
                    ${isCompleted
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : isActive && !isError
                      ? 'bg-white border-brand-500 text-brand-600 animate-pulse-slow'
                      : isError
                      ? 'bg-red-100 border-red-400 text-red-500'
                      : 'bg-white border-gray-200 text-gray-300'}
                  `}
                >
                  {isCompleted ? '✓' : step.icon}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-1 flex-1 transition-colors ${
                      currentIndex > stepIdx + 1 || isDone
                        ? 'bg-brand-500'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
              {/* Label */}
              <span
                className={`mt-1 text-xs text-center leading-tight
                  ${isActive && !isError ? 'text-brand-600 font-semibold' : ''}
                  ${isCompleted ? 'text-brand-600' : ''}
                  ${isPending ? 'text-gray-400' : ''}
                  ${isError ? 'text-red-500' : ''}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`mt-2 px-4 py-2 rounded-lg text-sm text-center
            ${isError
              ? 'bg-red-50 text-red-700 border border-red-200'
              : isDone
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-brand-50 text-brand-700 border border-brand-200'}
          `}
        >
          {isDone ? '生成完了！' : isError ? `エラー: ${message}` : message}
        </div>
      )}
    </div>
  );
}
