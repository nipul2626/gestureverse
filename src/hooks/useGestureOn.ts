// src/hooks/useGestureOn.ts
// Re-exports the useGestureOn hook from gestureEngine for clean imports.
// Consumers can import directly from this hooks file rather than lib/.

export { useGestureOn, useGesturesOn, useLastGestureEvent } from '../lib/gestureEngine'
export type { GestureHandler, GestureHandlerOptions } from '../lib/gestureEngine'