import { type CSSProperties, useEffect, useState } from 'react';

const colors = ['#fff0af', '#d0f8dc', '#ead5ff', '#ffdbdf'];
const lights = Array.from({ length: 44 }, (_, i) => ({
  x: 4 + (i * 31.73) % 92,
  y: 13 + (i * 17.39) % 77,
  size: 2.5 + (i % 4) * 0.65,
  dx: (i % 2 ? 1 : -1) * (32 + (i * 13) % 72),
  dy: -28 - (i * 7) % 90,
  duration: 15 + (i * 3) % 17,
  color: colors[i % colors.length],
}));

export function Fireflies() {
  const [paused, setPaused] = useState(document.hidden);
  useEffect(() => {
    const update = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return <div className={`fireflies-layer ${paused ? 'is-paused' : ''}`} aria-hidden="true">
    {lights.map((light, i) => <span className="wandering-firefly" key={i} style={{
      left: `${light.x}%`, top: `${light.y}%`, width: light.size, height: light.size,
      color: light.color, '--flight-x': `${light.dx}px`, '--flight-y': `${light.dy}px`,
      '--flight-time': `${light.duration}s`, '--flight-delay': `${-i * 2.37}s`,
      '--pulse-time': `${3.5 + i % 5}s`, '--pulse-delay': `${-i * 0.71}s`,
    } as CSSProperties}><i className="firefly-core" /></span>)}
  </div>;
}
