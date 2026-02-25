import { useState, useEffect } from 'react';
import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

/** Re-export for components */
export const useReducedMotion = useFramerReducedMotion;

/** Mobile breakpoint (Tailwind sm) */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false)
  );
  useEffect(() => {
    const m = window.matchMedia('(max-width: 639px)');
    const handler = () => setIsMobile(m.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

/** Spring config for modals (panel slide, bottom sheet) */
export const modalTransition = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 300,
};

/** Spring for view / page switch */
export const pageTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

/** Quick tween for backdrop, overlays */
export const quickTransition = {
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1] as const,
};

/** Returns reduced transition (instant) or full transition when reduced motion is preferred */
export function getTransition(
  reducedMotion: boolean | null,
  full: typeof modalTransition | typeof pageTransition | typeof quickTransition
) {
  if (reducedMotion) {
    return { duration: 0.01 };
  }
  return full;
}
