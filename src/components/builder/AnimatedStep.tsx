import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { useBuilder } from './BuilderContext';

interface AnimatedStepProps {
  children: ReactNode;
  stepKey: number;
}

const variants = {
  enter: (direction: 'forward' | 'back') => ({
    x: direction === 'forward' ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 'forward' | 'back') => ({
    x: direction === 'forward' ? -80 : 80,
    opacity: 0,
  }),
};

const transition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

export function AnimatedStep({ children, stepKey }: AnimatedStepProps) {
  const { direction } = useBuilder();

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
