import { useEffect, useRef, useState } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';

export function useAnimatedCounter(target: number, duration = 1) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  const [display, setDisplay] = useState('0');
  const prevTarget = useRef(0);

  useEffect(() => {
    const unsub = rounded.on('change', (v) => {
      setDisplay(v.toLocaleString());
    });
    return unsub;
  }, [rounded]);

  useEffect(() => {
    const controls = animate(motionValue, target, {
      duration,
      ease: 'easeOut',
    });
    prevTarget.current = target;
    return controls.stop;
  }, [target, duration, motionValue]);

  return display;
}
