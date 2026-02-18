import { motion } from 'framer-motion';

interface StepHeaderProps {
  title: string;
  subtitle?: string;
  step: number;
}

export function StepHeader({ title, subtitle, step }: StepHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="mb-6"
    >
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xs font-semibold text-brand-500 bg-brand-500/10 rounded-full px-2.5 py-0.5">
          Step {step + 1}
        </span>
      </div>
      <h2 className="text-2xl font-bold text-surface-100">{title}</h2>
      {subtitle && (
        <p className="text-sm text-surface-400 mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}
