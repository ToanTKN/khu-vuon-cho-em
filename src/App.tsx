import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { giftConfig as config, personal } from './config';
import { FlowerGarden, initialFlowers, type PlantedFlower } from './components/FlowerGarden';
import { MemorySky } from './components/MemorySky';
import { Fireflies } from './components/Fireflies';
import { KeepsakeGift } from './components/KeepsakeGift';
import { Modal } from './components/Modal';
import { Music } from './components/Music';
import { TypewriterWish } from './components/TypewriterWish';

import type { MusicMotion } from './musicMotion';
import { readVisited } from './memoryProgress';

const storageKey = 'your-night-garden-v2';
type GardenState = { flowers: PlantedFlower[]; giftOpened: boolean; visited: number[] };
function loadGarden(): GardenState {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (value && Array.isArray(value.flowers)) {
      const flowers = value.flowers.filter((f: PlantedFlower) => f &&
        Number.isFinite(f.x) && f.x >= 0 && f.x <= 1 &&
        Number.isFinite(f.y) && f.y >= 0 && f.y <= 1 &&
        Number.isFinite(f.size) && f.size >= 0.5 && f.size <= 1.5 &&
        Number.isInteger(f.palette) && f.palette >= 0 && f.palette < 4 && Number.isFinite(f.id)
      ).slice(-180);
      return { flowers, giftOpened: value.giftOpened === true, visited: readVisited(value.visited, config.memories.length) };
    }
  } catch { /* Storage may be disabled. */ }
  return { flowers: initialFlowers(), giftOpened: false, visited: [] };
}

export default function App() {
  const musicMotion = useRef<MusicMotion>({ playing: false, analyser: null });
  const [garden, setGarden] = useState(loadGarden);
  const [showGift, setShowGift] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const closeGift = useCallback(() => setShowGift(false), []);
  const closeClear = useCallback(() => setShowClear(false), []);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(garden)); }
    catch { setStorageFailed(true); }
  }, [garden]);
  const allVisited = config.memories.length > 0 && garden.visited.length === config.memories.length;
  function visit(index: number) {
    setGarden(g => g.visited.includes(index) ? g : { ...g, visited: [...g.visited, index] });
  }
  function plant(x: number, y: number) {
    const flower: PlantedFlower = { id: Date.now() + Math.random(), x, y,
      size: 0.7 + Math.random() * 0.6, palette: Math.floor(Math.random() * 4) };
    setGarden(g => ({ ...g, flowers: [...g.flowers.slice(-179), flower] }));
    setAnnouncement('Một bông hoa mới vừa nở trong khu vườn.');
  }
  return <MotionConfig reducedMotion="user"><main className="night-garden">
    <FlowerGarden flowers={garden.flowers} onPlant={plant} musicMotion={musicMotion} />
    <div className="garden-vignette" aria-hidden="true" />
    <header className="night-header">
      <div className="garden-heading">
        <span className="night-eyebrow">MỘT MÓN QUÀ NHỎ · {config.giftDate}</span>
        <h1>Một khu vườn <em>dành riêng cho Cô ấy</em></h1>
        <p>Gửi {config.recipient}</p>
      </div><Music musicMotion={musicMotion} />
    </header>
    <MemorySky visited={garden.visited} onVisit={visit} />
    <Fireflies />
    <div className="plant-invitation">
      <span className="invitation-line" aria-hidden="true" /><p>{personal(config.gardenHint)}</p>
      <small>Chạm vào một vì sao để mở một kỷ niệm</small>
      <div className={`memory-progress ${allVisited ? 'complete' : ''}`} role="status" aria-live="polite" aria-atomic="true">
        <span><span aria-hidden="true">♡</span> Đã ghé {garden.visited.length}/{config.memories.length} kỷ niệm</span>
        {allVisited && <p className="completion-message">{personal('Cảm ơn vì đã ghé qua những kỷ niệm mà tôi không thể quên.')}<span>Một lời chúc vẫn đang chờ trong hộp quà.</span></p>}
      </div>
    </div>
    <KeepsakeGift highlighted={allVisited} opened={garden.giftOpened} onOpen={() => {
      setGarden(g => ({ ...g, giftOpened: true })); setShowGift(true);
    }} />
    <footer className="night-footer">
      <div className="garden-tools">
        <button className="quiet-button" onClick={() => plant(0.1 + Math.random() * 0.8, 0.42 + Math.random() * 0.4)}>
          <span aria-hidden="true">♥</span> Trồng một bông hoa
        </button>
        <button className="quiet-button clear-button" onClick={() => setShowClear(true)}>Dọn vườn</button>
      </div><span className="garden-count">{garden.flowers.length} bông hoa đang nở</span>
    </footer>
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    {storageFailed && <p className="night-storage-note" role="status">Thiết bị đang chặn lưu trữ; hoa và các kỷ niệm đã ghé chỉ giữ trong lần mở này.</p>}
    {showGift && <Modal label="Tấm thiệp dành cho em" onClose={closeGift} variant="wish">
      <motion.article className="wish-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="wish-floating-hearts" aria-hidden="true">
          {Array.from({ length: 14 }, (_, index) => <span key={index} style={{
            left: `${5 + (index * 29) % 87}%`,
            top: `${7 + (index * 19) % 88}%`,
            fontSize: `${14 + (index % 4) * 3}px`,
            animationDelay: `${-index * 0.85}s`,
            animationDuration: `${5 + (index % 4)}s`,
          }}>♥</span>)}
        </div>
        <div className="card-flower" aria-hidden="true">♥</div>
        <span className="card-eyebrow">MỘT TẤM THIỆP · {config.giftDate}</span>
        <h2>{personal(config.cardTitle)}</h2><p className="card-recipient">Gửi {config.recipient},</p>
        <TypewriterWish text={personal(config.wish)} />
        <button className="card-button" onClick={closeGift}>Cất thiệp, trở về khu vườn</button>
      </motion.article>
    </Modal>}
    {showClear && <Modal label="Dọn khu vườn" onClose={closeClear} variant="clear">
      <div className="clear-dialog"><span className="card-flower" aria-hidden="true">♥</span>
        <h2>Gieo lại một khu vườn mới?</h2>
        <p>Những bông hoa hiện tại sẽ được dọn đi để {config.pronouns.recipient} trồng lại từ đầu. Kỷ niệm và tấm thiệp vẫn ở đây.</p>
        <div className="clear-actions"><button className="card-secondary" onClick={closeClear}>Giữ những bông hoa</button>
          <button className="card-button" onClick={() => {
            setGarden(g => ({ ...g, flowers: [] })); setShowClear(false);
            setAnnouncement('Khu vườn đã được dọn. Bạn có thể trồng hoa mới.');
          }}>Dọn vườn</button></div>
      </div>
    </Modal>}
  </main></MotionConfig>;
}
