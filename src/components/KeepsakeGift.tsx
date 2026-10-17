import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { assetUrl } from '../assets';

export function KeepsakeGift({ opened, onOpen, highlighted = false }: { opened: boolean; onOpen: () => void; highlighted?: boolean }) {
  const [opening, setOpening] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function openGift() {
    if (timer.current !== null) return;
    setOpening(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      onOpen();
      setOpening(false);
    }, reduced ? 0 : 450);
  }

  return <div className={`keepsake-gift-area ${highlighted ? "gift-complete" : ""}`}><button className="keepsake-gift" onClick={openGift}
    disabled={opening} aria-busy={opening}
    aria-label={opened ? 'Mở lại hộp quà và tấm thiệp' : 'Mở hộp quà và tấm thiệp'}>
    <span className="gift-aura" aria-hidden="true" />
    <span className="gift-illustration" aria-hidden="true">
      <img className="gift-body-image" src={assetUrl('/image/hop.png')} width="268" height="178" alt="" draggable={false} />
      <motion.img className="gift-lid-image" src={assetUrl('/image/nap.png')} width="300" height="145" alt="" draggable={false}
        initial={false}
        animate={{ y: opening ? -42 : opened ? -18 : 0, x: opening ? -9 : opened ? -4 : 0, rotate: opening ? -12 : opened ? -5 : 0 }}
        transition={{ duration: reduced ? 0 : 0.4, ease: 'easeInOut' }} />
    </span><span className="gift-caption">{opening ? 'Một lời chúc đang mở ra…' : opened ? 'Đọc lại tấm thiệp' : 'Một món quà dành cho em'}</span>
    <small>{opened ? 'Lời chúc vẫn luôn ở đây' : 'Chạm nhẹ để mở'}</small>
  </button></div>;
}
