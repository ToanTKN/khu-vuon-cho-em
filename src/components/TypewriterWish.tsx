import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export function TypewriterWish({ text }: { text: string }) {
  const reducedMotion = useReducedMotion();
  const letters = Array.from(text);
  const [count, setCount] = useState(0);
  const complete = Boolean(reducedMotion) || count >= letters.length;

  useEffect(() => {
    if (reducedMotion) return;
    let frame: number;
    let started: number | undefined;
    const length = Array.from(text).length;
    const tick = (now: number) => {
      started ??= now;
      const next = Math.min(length, Math.floor((now - started) / 24));
      setCount(next);
      if (next < length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, reducedMotion]);

  return <div className="wish-reveal">
    <div className="wish-reveal-body">
      <p className="card-wish wish-layout" aria-hidden="true">{text}</p>
      <p className="card-wish wish-animated" aria-hidden="true">
        {complete ? text : letters.slice(0, count).join('')}
        {!complete && <span className="wish-cursor">♥</span>}
      </p>
      <p className="sr-only">{text}</p>
    </div>
    <p className={`wish-signoff ${complete ? 'is-visible' : ''}`}>
      Happy Woman'S Day <span aria-hidden="true">♥</span>
    </p>
  </div>;
}
