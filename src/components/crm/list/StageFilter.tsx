import { motion } from 'framer-motion';
import { useCrmStore } from '../../../store/useCrmStore';
import { PIPELINE_STAGES } from '../shared/stageConfig';
import { staggerContainer, fadeInUp } from '../shared/motionVariants';
import type { PipelineStage } from '../../../types/crm';

export function StageFilter() {
  const stageFilters = useCrmStore((s) => s.stageFilters);
  const toggleStageFilter = useCrmStore((s) => s.toggleStageFilter);
  const setStageFilters = useCrmStore((s) => s.setStageFilters);

  const allSelected = stageFilters.length === 0;

  const handleAllClick = () => {
    setStageFilters([]);
  };

  const handleStageToggle = (stage: PipelineStage) => {
    toggleStageFilter(stage);
  };

  return (
    <motion.div
      className="flex flex-wrap gap-2 items-center"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      role="group"
      aria-label="Filter by pipeline stage"
    >
      {/* All button — clears all checkboxes */}
      <motion.button
        variants={fadeInUp}
        onClick={handleAllClick}
        aria-pressed={allSelected}
        className={`relative px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          allSelected
            ? 'bg-brand-600 text-white'
            : 'bg-surface-700/50 text-surface-400 hover:text-surface-200'
        }`}
      >
        All
      </motion.button>

      {/* Stage checkboxes rendered as pill toggles */}
      {PIPELINE_STAGES.map((stage) => {
        const isChecked = stageFilters.includes(stage.key);
        return (
          <motion.label
            key={stage.key}
            variants={fadeInUp}
            className={`relative flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer select-none ${
              isChecked
                ? `${stage.bgColor} ${stage.color}`
                : 'bg-surface-700/50 text-surface-400 hover:text-surface-200'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={isChecked}
              onChange={() => handleStageToggle(stage.key)}
              aria-label={`Filter by ${stage.label}`}
            />
            {/* Visible checkbox indicator */}
            <span
              className={`inline-flex items-center justify-center w-3 h-3 rounded border transition-colors flex-shrink-0 ${
                isChecked
                  ? `${stage.bgColor} border-current`
                  : 'border-surface-500'
              }`}
              aria-hidden="true"
            >
              {isChecked && (
                <svg className="w-2 h-2" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M1.5 4L3 5.5L6.5 2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {stage.label}
          </motion.label>
        );
      })}
    </motion.div>
  );
}
