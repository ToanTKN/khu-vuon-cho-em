import { useEffect, useRef, useState } from 'react';
import { giftConfig } from '../config';
import { assetUrl } from '../assets';
import { MusicPlayer } from '../musicPlayer';
import type { MusicMotionRef } from '../musicMotion';

export function Music({ musicMotion }: { musicMotion: MusicMotionRef }) {
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('your-night-garden-volume-v1');
      const value = saved === null ? NaN : Number(saved);
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .35;
    } catch { return .35; }
  });
  const volumeRef = useRef(volume);
  const player = useRef<MusicPlayer | null>(null);
  const [status, setStatus] = useState({ playing: false, waiting: false, wanted: true });

  useEffect(() => {
    const engine = new MusicPlayer({ url: assetUrl(giftConfig.musicUrl), volume: volumeRef.current,
      onChange(state) {
        musicMotion.current = { playing: state.playing, analyser: state.analyser };
        setStatus({ playing: state.playing, waiting: state.waiting, wanted: state.wanted });
      },
    });
    player.current = engine;
    const unlock = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('.music-controls')) return;
      if (event instanceof KeyboardEvent && (event.repeat || event.ctrlKey || event.metaKey || event.altKey)) return;
      if (engine.wanted && engine.waiting) engine.play();
    };
    document.addEventListener('click', unlock, true);
    document.addEventListener('keydown', unlock, true);
    engine.play();
    return () => {
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      engine.destroy();
      if (player.current === engine) player.current = null;
      musicMotion.current = { playing: false, analyser: null };
    };
  }, [musicMotion]);

  function changeVolume(value: number) {
    const next = Math.max(0, Math.min(1, value));
    volumeRef.current = next;
    player.current?.setVolume(next);
    setVolume(next);
    try { localStorage.setItem('your-night-garden-volume-v1', String(next)); } catch { /* Keep this volume for this visit. */ }
    if (player.current?.wanted && player.current.waiting) player.current.play();
  }

  function toggle() {
    const engine = player.current;
    if (!engine) return;
    if (engine.wanted && !engine.waiting) engine.pause();
    else engine.play();
  }

  return <div className="music-controls"><button className="music" onClick={toggle}
    aria-pressed={status.playing} aria-label={status.wanted && !status.waiting ? 'Tắt nhạc' : 'Bật nhạc'}>
    <span aria-hidden="true">{status.playing ? '♫' : '♪'}</span>
    <span>{status.playing ? 'Nhạc đang bật' : status.waiting ? 'Bật nhạc' : status.wanted ? 'Đang mở nhạc…' : 'Bật nhạc'}</span>
  </button>
    <label className="music-volume"><span>Âm lượng</span>
      <input type="range" min="0" max="100" step="1" value={Math.round(volume * 100)}
        aria-label="Âm lượng nhạc" aria-valuetext={`${Math.round(volume * 100)} phần trăm`}
        onChange={event => changeVolume(Number(event.target.value) / 100)} />
      <output>{Math.round(volume * 100)}%</output>
    </label>
    {status.waiting && <span className="music-unlock-hint">Chạm vào khu vườn để nghe nhạc</span>}
  </div>;
}
