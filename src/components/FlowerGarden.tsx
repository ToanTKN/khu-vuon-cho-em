import { useEffect, useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { MusicMotionRef } from '../musicMotion';
export type PlantedFlower = { id: number; x: number; y: number; size: number; palette: number };
const palettes = [
  ['#fff1f8', '#f6b4d2', '#dc86ae', '#bd5f8b'], // Rose milk
  ['#f5efff', '#cbb8f5', '#a38bd6', '#7e65b5'], // Lavender
  ['#fff5e2', '#ffd1ac', '#eba68d', '#cf7f78'], // Peach cream
  ['#effff3', '#b6e3cd', '#83bdac', '#579a91'], // Mint
];
export function initialFlowers(): PlantedFlower[] {
  return Array.from({ length: 26 }, (_, i) => ({ id: i, x: (i + 0.4) / 26,
    y: 0.48 + ((i * 13) % 23) / 60, size: 0.65 + ((i * 7) % 10) / 12, palette: i % 4 }));
}
function drawFlower(ctx: CanvasRenderingContext2D, flower: PlantedFlower, width: number, height: number, bloom: number, sway: number, blossom: HTMLCanvasElement) {
  const x = flower.x * width, y = flower.y * height;
  const radius = Math.min(55, Math.max(22, width / 27)) * flower.size;
  const bottom = height + 25, bend = ((flower.id % 17) - 8) * 5;
  // Keep the root fixed while the whole flower leans gently.
  ctx.save(); ctx.transform(1, 0, sway, 1, -sway * bottom, 0);
  const stem = ctx.createLinearGradient(x, y, x, bottom);
  stem.addColorStop(0, '#98dbabff'); stem.addColorStop(0.45, '#81b8a0'); stem.addColorStop(1, '#3d756b');
  ctx.strokeStyle = stem; ctx.lineWidth = Math.max(1.8, radius * 0.065); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + bend, bottom);
  ctx.bezierCurveTo(x - bend * 1.3, height * 0.82, x + bend, y + 70, x, y); ctx.stroke();

  // Small curved leaves have a visible midrib, instead of long triangular blades.
  for (let i = 0; i < 2; i++) {
    const leafY = y + (height - y) * (0.43 + i * 0.23);
    const side = i === 0 ? -1 : 1, leafSize = radius * (0.72 - i * 0.12);
    ctx.save(); ctx.translate(x + bend * 0.2, leafY); ctx.scale(side, 1);
    const leaf = ctx.createLinearGradient(0, 0, leafSize, -leafSize);
    leaf.addColorStop(0, '#548d7c'); leaf.addColorStop(1, '#a8d6b9'); ctx.fillStyle = leaf;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(leafSize * 0.06, -leafSize * 0.75, leafSize * 0.74, -leafSize * 0.92, leafSize, -leafSize * 1.02);
    ctx.bezierCurveTo(leafSize * 0.93, -leafSize * 0.32, leafSize * 0.36, leafSize * 0.1, 0, 0); ctx.fill();
    ctx.strokeStyle = '#c8e8c78c'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(leafSize * 0.38, -leafSize * 0.4, leafSize * 0.83, -leafSize * 0.85); ctx.stroke(); ctx.restore();
  }

  ctx.save(); ctx.translate(x, y); ctx.scale(bloom, bloom);
  ctx.drawImage(blossom, -radius * 1.65, -radius * 1.65, radius * 3.3, radius * 3.3);
  ctx.restore(); ctx.restore();
}
// Detailed petals are cached once instead of repainted on every music frame.
function drawBlossom(ctx: CanvasRenderingContext2D, flower: PlantedFlower, radius: number) {
  ctx.save();
  ctx.rotate((flower.id % 9 - 4) * 0.05);
  const colors = palettes[flower.palette];
  const halo = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 1.6);
  halo.addColorStop(0, colors[1] + '24'); halo.addColorStop(1, colors[1] + '00');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, radius * 1.6, 0, Math.PI * 2); ctx.fill();

  const petals = [7, 8, 6, 9][flower.palette];
  for (let layer = 0; layer < 2; layer++) {
    const r = radius * (layer === 0 ? 1 : 0.65);
    for (let i = 0; i < petals; i++) {
      ctx.save(); ctx.rotate((i / petals) * Math.PI * 2 + (layer ? Math.PI / petals : 0));
      const gradient = ctx.createLinearGradient(-r * 0.2, 0, r * 0.22, -r * 1.1);
      gradient.addColorStop(0, colors[3]); gradient.addColorStop(0.22, colors[2]);
      gradient.addColorStop(0.55, colors[1]); gradient.addColorStop(0.87, colors[0]); gradient.addColorStop(1, colors[1]);
      ctx.fillStyle = gradient; ctx.shadowColor = colors[2] + '55'; ctx.shadowBlur = layer ? 2 : 4;
      ctx.beginPath(); ctx.moveTo(0, 2);
      ctx.bezierCurveTo(-r * 0.18, -r * 0.32, -r * 0.56, -r * 0.7, -r * 0.34, -r * 0.99);
      ctx.bezierCurveTo(-r * 0.18, -r * 1.2, -r * 0.03, -r * 1.06, 0, -r * 1.07);
      ctx.bezierCurveTo(r * 0.08, -r * 1.2, r * 0.36, -r * 1.12, r * 0.39, -r * 0.87);
      ctx.bezierCurveTo(r * 0.46, -r * 0.57, r * 0.12, -r * 0.16, 0, 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = colors[0] + '73'; ctx.lineWidth = 0.65; ctx.stroke();
      // Delicate petal fold gives the blossom depth without a blurry neon glow.
      ctx.strokeStyle = colors[0] + '55'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -r * 0.15);
      ctx.quadraticCurveTo(-r * 0.07, -r * 0.5, -r * 0.03, -r * 0.91); ctx.stroke(); ctx.restore();
    }
  }
  const heart = ctx.createRadialGradient(-radius * 0.04, -radius * 0.05, 0, 0, 0, radius * 0.2);
  heart.addColorStop(0, '#fff9d9'); heart.addColorStop(0.55, '#f5dca0'); heart.addColorStop(1, '#d6ac70');
  ctx.fillStyle = heart; ctx.shadowColor = '#ffe9b955'; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI * 2 / 12, distance = radius * (i % 2 ? 0.11 : 0.07);
    ctx.fillStyle = i % 2 ? '#fff9df' : '#c79767'; ctx.beginPath();
    ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, Math.max(0.65, radius * 0.021), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
export function FlowerGarden({ flowers, onPlant, musicMotion }: { flowers: PlantedFlower[]; onPlant: (x: number, y: number) => void; musicMotion: MusicMotionRef }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const flowersRef = useRef(flowers);
  const renderer = useRef<{ update: () => void } | null>(null);
  const reduced = useReducedMotion();

  // Update the existing renderer without clearing or resizing its canvas.
  useLayoutEffect(() => {
    flowersRef.current = flowers;
    renderer.current?.update();
  }, [flowers]);

  useEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    const ctx = surface.getContext('2d'); if (!ctx) return;
    let frame = 0, width = 0, height = 0, pixelRatio = 0;
    let lastPaint = 0, lastTime = performance.now(), phase = 0, strength = 0;
    const samples = new Uint8Array(1024);
    const frequencies = new Uint8Array(512);
    const births = new Map<number, number>();
    const blossoms = new Map<number, HTMLCanvasElement>();

    function synchronize(animate: boolean) {
      const now = performance.now();
      const live = new Set(flowersRef.current.map(f => f.id));
      births.forEach((_, id) => { if (!live.has(id)) births.delete(id); });
      blossoms.forEach((_, id) => { if (!live.has(id)) blossoms.delete(id); });
      flowersRef.current.forEach(f => {
        if (!births.has(f.id)) births.set(f.id, animate && !reduced ? now : now - 1000);
        if (blossoms.has(f.id)) return;
        const radius = Math.min(55, Math.max(22, width / 27)) * f.size;
        const sprite = document.createElement('canvas');
        sprite.width = sprite.height = Math.ceil(radius * 3.3 * 1.5);
        const brush = sprite.getContext('2d');
        if (brush) {
          brush.translate(sprite.width / 2, sprite.height / 2);
          brush.scale(sprite.width / (radius * 3.3), sprite.height / (radius * 3.3));
          drawBlossom(brush, f, radius); blossoms.set(f.id, sprite);
        }
      });
    }

    function render(time: number, force = false) {
      if (!ctx || document.hidden) return;
      const signal = musicMotion.current;
      const moving = signal.playing && !reduced;
      const dt = Math.min(.08, Math.max(0, (time - lastTime) / 1000));
      if (!force && time - lastPaint < 1000 / 30) { frame = requestAnimationFrame(render); return; }
      lastTime = time; lastPaint = time;
      let target = 0, bass = 0;
      if (moving && signal.analyser) {
        signal.analyser.getByteTimeDomainData(samples);
        signal.analyser.getByteFrequencyData(frequencies);
        let energy = 0;
        for (const sample of samples) energy += ((sample - 128) / 128) ** 2;
        for (let i = 1; i < 13; i++) bass += frequencies[i] / (12 * 255);
        const rms = Math.sqrt(energy / samples.length);
        target = Math.min(1, rms * 8 + bass * .35);
      }
      strength += (target - strength) * (1 - Math.exp(-dt * (target > strength ? 9 : 3)));
      phase += dt * (1.8 + bass * 1.2);
      ctx.clearRect(0, 0, width, height);
      let growing = false;
      flowersRef.current.forEach(f => {
        const t = Math.min(1, (time - (births.get(f.id) ?? time)) / 650);
        if (t < 1) growing = true;
        const sway = reduced ? 0 : strength * .045 * (
          Math.sin(phase + f.x * 2.4) * .8 + Math.sin(phase * .7 + f.id % 11) * .2);
        const blossom = blossoms.get(f.id);
        if (blossom) drawFlower(ctx, f, width, height,
          reduced ? 1 : 1 - Math.pow(1 - Math.max(0.03, t), 3), sway, blossom);
      });
      if (growing || (flowersRef.current.length > 0 && (moving || strength > .001))) frame = requestAnimationFrame(render);
    }
    function wake() {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(render);
    }
    function resize() {
      if (!surface || !ctx) return;
      const rect = surface.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (width === rect.width && height === rect.height && pixelRatio === ratio) return;
      if (rect.width <= 0 || rect.height <= 0) return;
      cancelAnimationFrame(frame);
      width = rect.width; height = rect.height; pixelRatio = ratio;
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      blossoms.clear(); synchronize(false);
      // Draw in the same task as a real resize so no empty frame is displayed.
      render(performance.now(), true);
    }
    const controller = { update() { synchronize(true); wake(); } };
    renderer.current = controller;
    const observer = new ResizeObserver(resize); observer.observe(surface); resize();
    let wasPlaying = musicMotion.current.playing;
    const checkMusic = window.setInterval(() => {
      const playing = musicMotion.current.playing;
      if (playing && !wasPlaying && !reduced) wake();
      wasPlaying = playing;
    }, 150);
    document.addEventListener('visibilitychange', wake);
    return () => {
      if (renderer.current === controller) renderer.current = null;
      observer.disconnect(); cancelAnimationFrame(frame); clearInterval(checkMusic);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [reduced, musicMotion]);
  return <canvas className="flower-canvas" ref={canvas}
    aria-label="Khu vườn hoa tương tác. Chạm để trồng hoa, hoặc dùng nút Trồng một bông hoa bằng bàn phím."
    onClick={event => {
      const bounds = event.currentTarget.getBoundingClientRect();
      onPlant(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
        Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)));
    }} />;
}
