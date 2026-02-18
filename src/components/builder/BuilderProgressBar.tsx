import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useBuilder, STEP_LABELS } from './BuilderContext';

export function BuilderProgressBar() {
  const { currentStep, completedSteps, goToStep, totalSteps } = useBuilder();

  const progressPercent = ((currentStep) / (totalSteps - 1)) * 100;

  return (
    <div className="glass rounded-xl p-4 mb-4">
      {/* Step indicators */}
      <div className="relative flex items-center justify-between">
        {/* Background track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-surface-700 z-0" />

        {/* Animated fill */}
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-brand-500 z-0"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Step dots */}
        {STEP_LABELS.map((label, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;
          const isAccessible = isCompleted || index <= currentStep;

          return (
            <button
              key={index}
              onClick={() => isAccessible && goToStep(index)}
              disabled={!isAccessible}
              className="relative z-10 flex flex-col items-center gap-1.5 group"
            >
              <motion.div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                  ${isCurrent
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : isCompleted
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50'
                    : 'bg-surface-800 text-surface-500 border border-surface-600'
                  }
                  ${isAccessible && !isCurrent ? 'cursor-pointer hover:border-brand-500/50' : ''}
                  ${!isAccessible ? 'cursor-not-allowed' : ''}
                `}
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </motion.div>
              <span
                className={`text-2xs whitespace-nowrap hidden sm:block transition-colors ${
                  isCurrent
                    ? 'text-brand-400 font-semibold'
                    : isCompleted
                    ? 'text-surface-400'
                    : 'text-surface-600'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
