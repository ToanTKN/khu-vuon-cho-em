import { useEffect, useRef, useState } from 'react';
import { giftConfig } from '../config';
import { assetUrl } from '../assets';
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
  const master = useRef<GainNode | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const context = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const source = useRef<MediaElementAudioSourceNode | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallback = useRef(false);
  const pending = useRef(false);
  const mounted = useRef(true);

  function stop() {
    musicMotion.current.playing = false;
    audio.current?.pause();
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    void context.current?.suspend();
  }

  async function prepare() {
    const ctx = context.current ?? new AudioContext();
    context.current = ctx;
    if (!analyser.current) {
      analyser.current = ctx.createAnalyser();
      analyser.current.fftSize = 1024;
      analyser.current.smoothingTimeConstant = .75;
      master.current = ctx.createGain();
      master.current.gain.value = volumeRef.current;
      analyser.current.connect(master.current);
      master.current.connect(ctx.destination);
    }
    musicMotion.current.analyser = analyser.current;
    await ctx.resume();
    return ctx;
  }

  function melody(ctx: AudioContext) {
    let n = 0;
    const notes = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66];
    const play = () => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = notes[n++ % notes.length];
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(.1, ctx.currentTime + .08);
      gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + 1.8);
      oscillator.connect(gain); gain.connect(analyser.current!);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(); oscillator.stop(ctx.currentTime + 2);
    };
    play(); timer.current = setInterval(play, 1100);
  }

  async function toggle() {
    if (pending.current) return;
    if (enabled) { stop(); setEnabled(false); return; }
    pending.current = true; setBusy(true);
    try {
      const ctx = await prepare();
      if (!mounted.current) return;
      if (giftConfig.musicUrl && !fallback.current) {
        if (!audio.current) {
          const track = new Audio();
          track.crossOrigin = 'anonymous';
          track.src = assetUrl(giftConfig.musicUrl);
          track.loop = true; track.volume = 1;
          track.onpause = () => { musicMotion.current.playing = false; };
          track.onplaying = () => { musicMotion.current.playing = true; };
          track.onwaiting = () => { musicMotion.current.playing = false; };
          audio.current = track;
          source.current = ctx.createMediaElementSource(track);
          source.current.connect(analyser.current!);
        }
        try { await audio.current.play(); }
        catch { audio.current.pause(); fallback.current = true; melody(ctx); }
      } else melody(ctx);
      if (mounted.current) { musicMotion.current.playing = true; setEnabled(true); }
      else stop();
    } catch { stop(); if (mounted.current) setEnabled(false); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }

  useEffect(() => {
    volumeRef.current = volume;
    if (master.current && context.current) {
      master.current.gain.setTargetAtTime(volume, context.current.currentTime, .05);
    }
    try { localStorage.setItem('your-night-garden-volume-v1', String(volume)); } catch { /* Keep this volume in memory. */ }
  }, [volume]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; stop();
      if (audio.current) {
        audio.current.onpause = null; audio.current.onplaying = null; audio.current.onwaiting = null;
      }
      source.current?.disconnect(); analyser.current?.disconnect(); master.current?.disconnect();
      void context.current?.close(); musicMotion.current.analyser = null;
    };
  }, [musicMotion]);

  return <div className="music-controls"><button className="music" onClick={() => void toggle()} disabled={busy}
    aria-pressed={enabled} aria-label={enabled ? 'Tắt nhạc' : 'Bật nhạc'}>
    <span aria-hidden="true">{enabled ? '♫' : '♪'}</span>
    <span>{busy ? 'Đang mở nhạc…' : enabled ? 'Nhạc đang bật' : 'Bật nhạc'}</span>
  </button>
    <label className="music-volume"><span>Âm lượng</span>
      <input type="range" min="0" max="100" step="1" value={Math.round(volume * 100)}
        aria-label="Âm lượng nhạc" aria-valuetext={`${Math.round(volume * 100)} phần trăm`}
        onChange={event => setVolume(Number(event.target.value) / 100)} />
      <output>{Math.round(volume * 100)}%</output>
    </label>
  </div>;
}
