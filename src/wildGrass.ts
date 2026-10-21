export type GrassBlade = { x: number; height: number; lean: number; width: number; phase: number; shade: number; seed: boolean; front: boolean };
const noise = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export function createWildGrass(width: number, height: number): GrassBlade[] {
  const tufts = Math.ceil(width / 17);
  const scale = Math.min(1.3, Math.max(.7, height / 760));
  return Array.from({ length: tufts * 5 }, (_, i) => {
    const clump = Math.floor(i / 5), n = i + 41;
    const front = i % 3 !== 0;
    return { x: (clump + noise(clump + 8) * .9) * width / tufts + (noise(n) - .5) * 22,
      height: (25 + noise(n + 1) ** 1.5 * (front ? 106 : 145)) * scale,
      lean: (noise(n + 2) - .5) * 65, width: (1.1 + noise(n + 3) * 2.5) * scale,
      phase: noise(n + 4) * Math.PI * 2, shade: Math.floor(noise(n + 5) * 4), seed: i % 17 === 0, front };
  });
}

export function drawWildGrass(ctx: CanvasRenderingContext2D, blades: GrassBlade[], height: number, phase: number, strength: number, front: boolean) {
  const colors = front ? ['#537f68', '#769978', '#638b77', '#8da584'] : ['#284e48', '#3a6257', '#365c51', '#477365'];
  for (const b of blades) {
    if (b.front !== front) continue;
    const root = height + 8;
    const sway = strength * b.height * .24 * (Math.sin(phase + b.x * .006) * .8 + Math.sin(phase * .7 + b.phase) * .2);
    const tip = b.x + b.lean + sway, top = root - b.height;
    ctx.fillStyle = colors[b.shade]; ctx.beginPath(); ctx.moveTo(b.x - b.width / 2, root);
    ctx.bezierCurveTo(b.x - b.lean * .12, root - b.height * .35, tip - b.lean * .25, top + b.height * .18, tip, top);
    ctx.bezierCurveTo(tip - b.lean * .12, top + b.height * .32, b.x + b.width * 1.3, root - b.height * .2, b.x + b.width / 2, root);
    ctx.closePath(); ctx.fill();
    if (b.seed) {
      ctx.strokeStyle = colors[b.shade]; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(tip, top + 5); ctx.lineTo(tip + 2, top - 12); ctx.stroke();
      ctx.fillStyle = front ? '#b1b394a6' : '#738f7380';
      for (let s = 0; s < 5; s++) {
        const side = s % 2 ? 1 : -1;
        ctx.beginPath(); ctx.ellipse(tip + side * 2.3, top - s * 2.6, 1.1, 2.7, side * .6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}
