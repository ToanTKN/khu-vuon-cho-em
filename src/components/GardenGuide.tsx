import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from './Modal';

const steps = [
  { target: '.keepsake-star', title: 'Mỗi vì sao là một kỷ niệm của chúng ta', text: 'Chạm vào 16 ngôi sao trên bầu trời để mở những tấm ảnh và lời nhắn. Trong mỗi thiệp, vuốt để chuyển ảnh, chạm ảnh để xem lớn. Tim nhỏ đánh dấu sao đã ghé.', top: false },
  { target: '.garden-tools button', title: 'Tự tay gieo một khu vườn', text: 'Chạm vào khoảng trống trong vườn: một bông hoa sẽ nở ngay chỗ ấy. Hoặc bấm “Trồng một bông hoa” bên dưới. “Dọn vườn” giúp trồng lại, vẫn giữ các kỷ niệm.', top: true },
  { target: '.keepsake-gift', title: 'Có một lá thư dành riêng cho Cô ấy, nhớ mở ra nhé', text: 'Chạm vào hộp quà để mở lá thư. Có thể mở bất cứ lúc nào; khi ghé đủ 16 sao, một lời nhắn cuối sẽ xuất hiện và hộp quà sáng lên.', top: true },
  { target: '.music-controls', title: 'Bật nhạc, để khu vườn cùng đông đưa theo nhạc nèo!!!', text: 'Bấm nút nhạc để bật hoặc tắt, kéo thanh âm lượng để chỉnh tiếng. Hoa và cỏ sẽ đung đưa theo nhạc. Muốn xem lại các bước này, bấm “Hướng dẫn” ở cuối màn hình nhé.', top: false },
];

export function GardenGuide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const item = steps[step];
  useEffect(() => {
    const target = document.querySelector(item.target);
    if (!target) { setBox(null); return; }
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    const measure = () => {
      const r = target.getBoundingClientRect();
      const left = Math.max(6, r.left - 9), top = Math.max(6, r.top - 9);
      setBox({ left, top, width: Math.max(0, Math.min(window.innerWidth - 6, r.right + 9) - left), height: Math.max(0, Math.min(window.innerHeight - 6, r.bottom + 9) - top) });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(target);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [item]);

  return <>
    {box && createPortal(<div className="guide-highlight" style={box} aria-hidden="true" />, document.body)}
    <Modal label="Hướng dẫn khám phá khu vườn" onClose={onClose} variant="guide">
      <div className={`garden-guide ${item.top ? 'guide-top' : ''}`}>
        <span className="guide-eyebrow">CÙNG GHÉ THĂM KHU VƯỜN · {step + 1}/{steps.length}</span>
        <div role="status" aria-live="polite" aria-atomic="true"><h2>{item.title}</h2><p>{item.text}</p></div>
        <div className="guide-dots" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i === step ? 'active' : ''} />)}</div>
        <div className="guide-actions">
          <button onClick={onClose} className="guide-skip">Bỏ qua</button>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="guide-back">Quay lại</button>}
          <button className="guide-next" onClick={() => step === steps.length - 1 ? onClose() : setStep(s => s + 1)}>{step === steps.length - 1 ? 'Bắt đầu khám phá ♥' : 'Tiếp theo →'}</button>
        </div>
      </div>
    </Modal>
  </>;
}
