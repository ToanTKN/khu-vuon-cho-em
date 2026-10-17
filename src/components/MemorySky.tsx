import { type CSSProperties, useCallback, useState } from 'react';
import { giftConfig } from '../config';
import { Modal } from './Modal';
import { MemoryGallery } from './MemoryGallery';
import { memoryThemes } from '../memoryThemes';
// Vị trí so le tự nhiên; x/y là % trên máy tính, mx/my dành cho điện thoại.
const stars = [
  { x:7, y:27, mx:12, my:20, size:29 },
  { x:15, y:39, mx:34, my:22, size:25 },
  { x:20, y:21, mx:59, my:19, size:31 },
  { x:29, y:30, mx:86, my:21, size:27 },
  { x:35, y:18, mx:16, my:27, size:26 },
  { x:40, y:41, mx:40, my:29, size:30 },
  { x:47, y:29, mx:66, my:26, size:25 },
  { x:54, y:16, mx:88, my:28, size:32 },
  { x:58, y:38, mx:10, my:34, size:28 },
  { x:65, y:25, mx:34, my:36, size:30 },
  { x:72, y:17, mx:58, my:33, size:26 },
  { x:75, y:42, mx:83, my:35, size:29 },
  { x:81, y:31, mx:16, my:41, size:31 },
  { x:87, y:20, mx:41, my:43, size:27 },
  { x:91, y:40, mx:66, my:40, size:25 },
  { x:95, y:28, mx:89, my:42, size:29 },
];
// Đoạn nối ngắn gợi chòm sao, giữ nhiều khoảng trời thoáng.
const clusters = [[0, 2, 3], [4, 6, 7], [8, 9, 10], [11, 12, 13, 15]];
const threads = clusters.map(indices => indices.map((index, i) =>
  `${i ? 'L' : 'M'}${stars[index].x} ${stars[index].y}`).join(' '));
export function MemorySky({ visited, onVisit }: { visited: number[]; onVisit: (index: number) => void }) {
  const [memory, setMemory] = useState<number | null>(null);
  const close = useCallback(() => setMemory(null), []);
  const item = memory === null ? null : giftConfig.memories[memory];
  const theme = memoryThemes[(memory ?? 0) % memoryThemes.length];
  const memoryCount = giftConfig.memories.length;
  function select(index: number) { setMemory(index); onVisit(index); }
  return <>
    <div className="star-dust" aria-hidden="true">{Array.from({ length: 75 }, (_, i) => <i key={i} style={{
      left: `${(i * 37.71 + 2) % 100}%`, top: `${(i * 19.27 + 3) % 93}%`,
      width: i % 7 === 0 ? 4 : 2, height: i % 7 === 0 ? 4 : 2,
      animationDelay: `${i % 11 * 0.6}s`, animationDuration: `${4 + i % 4}s`,
    }} />)}</div>
    <nav className="memory-sky" aria-label="Bầu trời kỷ niệm">
      <svg className="sky-thread" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {threads.map((d, i) => <path key={i} d={d} vectorEffect="non-scaling-stroke" />)}
      </svg>
      {giftConfig.memories.map((entry, i) => <button key={i} className={`keepsake-star ${visited.includes(i) ? 'visited' : ''}`}
        style={{ '--star-x': `${stars[i % stars.length].x}%`, '--star-y': `${stars[i % stars.length].y}%`,
          '--star-mobile-x': `${stars[i % stars.length].mx}%`, '--star-mobile-y': `${stars[i % stars.length].my}%`,
          '--star-size': `${stars[i % stars.length].size}px`,
          animationDelay: `${i * 0.65}s` } as CSSProperties}
        onClick={() => select(i)} aria-label={`Mở kỷ niệm: ${entry.title}${visited.includes(i) ? ", đã ghé" : ""}`}>
        <span className="star-shape" aria-hidden="true">✦</span><span className="star-number" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>
        {visited.includes(i) && <span className="star-visited-heart" aria-hidden="true">♥</span>}
      </button>)}
    </nav>
    {item && memory !== null && <Modal label={item.title} onClose={close} variant="memory"><div className={`memory-card memory-design-${memory}`} style={{
      '--memory-start':theme.colors[0], '--memory-end':theme.colors[1], '--memory-accent':theme.colors[2], '--memory-back':theme.colors[3],
    } as CSSProperties}>
      <MemoryGallery key={memory} photos={item.images?.length ? item.images : item.image ? [item.image] : []} title={item.title} />
      <div className="memory-copy"><span className="card-eyebrow"><span aria-hidden="true">♥</span> NGÔI SAO {String(memory + 1).padStart(2,'0')} / {String(memoryCount).padStart(2,'0')} {item.date && `· ${item.date}`}</span>
      <h2>{item.title}</h2><p className="memory-caption">{item.caption}</p>
      <div className="memory-controls"><button className="card-secondary" onClick={() => select((memory + memoryCount - 1) % memoryCount)}>← Kỷ niệm trước</button>
        <button className="card-secondary" onClick={() => select((memory + 1) % memoryCount)}>Kỷ niệm sau →</button></div>
      </div>
    </div></Modal>}
  </>;
}
