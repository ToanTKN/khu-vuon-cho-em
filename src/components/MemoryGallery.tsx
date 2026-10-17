import { useCallback, useState, type KeyboardEvent } from 'react';
import { assetUrl } from '../assets';
import { MemoryOrnament } from './MemoryOrnament';
import { Modal } from './Modal';
import { usePhotoSwipe } from '../hooks/usePhotoSwipe';

export function MemoryGallery({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const closePhoto = useCallback(() => setExpanded(false), []);
  const current = photos[active];
  const count = photos.length;
  const move = (direction: number) => { if (count > 1) setActive(i => (i + direction + count) % count); };
  const swipe = usePhotoSwipe(move, count > 1);
  const fullSwipe = usePhotoSwipe(move, count > 1);
  const markFailed = (photo: string) => setFailed(v => v.includes(photo) ? v : [...v, photo]);
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (count < 2) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); event.stopPropagation(); move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }
  const counter = count ? `${String(active + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}` : 'Một góc ký ức';

  return <section className="memory-album" aria-label="Album ảnh kỷ niệm" onKeyDown={keyboard}>
    <div className="album-topline"><span>góc nhỏ của chúng mình</span><span className="album-count" aria-live="polite">{counter}</span></div>
    <div className="album-stage">
      <span className="album-sparkle sparkle-one" aria-hidden="true"><MemoryOrnament /></span>
      <span className="album-sparkle sparkle-two" aria-hidden="true"><MemoryOrnament /></span>
      <div className="album-photo-stack">
        <div className="album-paper-back" aria-hidden="true" />
        <div className="album-photo-frame"><span className="album-tape" aria-hidden="true" />
          {current && !failed.includes(current) ? <button className="album-photo-button" aria-label={`Xem ảnh lớn: ${title}, ảnh ${active + 1}`}
            {...swipe.handlers} onClick={event => { if (event.detail === 0 || !swipe.consumeSwipe()) setExpanded(true); }}>
            <img key={current} className="album-photo" src={assetUrl(current)} alt={`${title} — ảnh ${active + 1}`} draggable={false} onError={() => markFailed(current)} />
            <span className="photo-expand-cue" aria-hidden="true">⤢</span>
          </button> : <div className="album-placeholder"><span aria-hidden="true">♥</span><p>{current ? 'Ảnh đang chờ được thêm lại' : 'Một chỗ dành cho kỷ niệm'}</p><small>{current ? 'Bạn vẫn có thể xem ảnh tiếp theo.' : 'Một kỷ niệm đang chờ ở đây.'}</small></div>}
          <span className="album-print-label">{count ? `một khoảnh khắc nhỏ · ${String(active + 1).padStart(2, '0')}` : 'chờ một điều dễ thương'}</span>
        </div>
      </div>
      {count > 1 && <><button className="album-arrow album-prev" onClick={() => move(-1)} aria-label="Ảnh trước">‹</button>
        <button className="album-arrow album-next" onClick={() => move(1)} aria-label="Ảnh tiếp theo">›</button></>}
    </div>
    {count > 0 && <p className="album-gesture-hint">{count > 1 ? 'Vuốt để xem tiếp · ' : ''}Chạm ảnh để xem lớn</p>}
    {count > 1 && <div className="album-thumbnail-row" role="group" aria-label="Chọn ảnh trong kỷ niệm">
      {photos.map((photo, i) => <button key={`${photo}-${i}`} className={`album-thumbnail ${i === active ? 'selected' : ''}`} onClick={() => setActive(i)} aria-label={`Xem ảnh ${i + 1}`} aria-pressed={i === active}>
        {!failed.includes(photo) ? <img src={assetUrl(photo)} alt="" loading="lazy" onError={() => markFailed(photo)} /> : <span aria-hidden="true">♡</span>}
      </button>)}
    </div>}
    {expanded && <Modal label={`Ảnh lớn — ${title}`} onClose={closePhoto} variant="photo">
      <section className="photo-viewer" onKeyDown={keyboard}>
        <header><span>một khoảnh khắc, nhìn gần hơn</span><h2>{title}</h2></header>
        <div className="photo-viewer-stage" {...fullSwipe.handlers}>
          {current && !failed.includes(current) ? <img src={assetUrl(current)} alt={`${title} — ảnh ${active + 1}`} draggable={false} onError={() => markFailed(current)} /> : <p>Ảnh này chưa tải được. Bạn thử xem ảnh tiếp theo nhé.</p>}
        </div>
        <footer>
          <button onClick={() => move(-1)} disabled={count < 2} aria-label="Ảnh lớn trước">‹</button>
          <span aria-live="polite">{counter}</span>
          <button onClick={() => move(1)} disabled={count < 2} aria-label="Ảnh lớn tiếp theo">›</button>
        </footer>
        <p className="photo-viewer-hint">{count > 1 ? 'Vuốt trái hoặc phải để xem ảnh · ' : ''}Đóng để trở về tấm thiệp</p>
      </section>
    </Modal>}
  </section>;
}
