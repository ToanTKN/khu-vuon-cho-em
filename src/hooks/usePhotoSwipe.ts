import { useRef, type PointerEvent } from 'react';

export function swipeDirection(dx: number, dy: number): number {
  return Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.35 ? (dx < 0 ? 1 : -1) : 0;
}

// Keep vertical scrolling and native pinch zoom available on touch screens.
export function usePhotoSwipe(move: (direction: number) => void, enabled: boolean) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressUntil = useRef(0);
  return {
    consumeSwipe: () => performance.now() < suppressUntil.current,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (!event.isPrimary || event.button !== 0) { start.current = null; return; }
        if (!enabled) return;
        start.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerUp(event: PointerEvent<HTMLElement>) {
        const origin = start.current;
        start.current = null;
        if (!origin || origin.id !== event.pointerId) return;
        const direction = swipeDirection(event.clientX - origin.x, event.clientY - origin.y);
        if (direction) { suppressUntil.current = performance.now() + 400; move(direction); }
      },
      onPointerCancel() { start.current = null; },
    },
  };
}
