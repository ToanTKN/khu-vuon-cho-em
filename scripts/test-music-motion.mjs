import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual components with deterministic audio and canvas adapters.
function runtime(reduced = false) {
  let time = 1000, serial = 0, cursor = 0;
  const state = [], effects = [], layouts = [], cleanups = [], resizeCallbacks = [], frames = new Map(), intervals = new Map();
  const transforms = [], gains = [], storage = new Map();
  const stats = { dimensionWrites: 0, sprites: 0, paints: 0 };
  const bounds = { width: 1200, height: 800 };
  const context = () => new Proxy({}, { get: (_, name) => {
    if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (name === 'transform') return (...args) => transforms.push(args);
    if (name === 'clearRect') return () => { stats.paints++; };
    return () => {};
  }, set: () => true });
  const canvas = { set width(value) { stats.dimensionWrites++; }, set height(value) { stats.dimensionWrites++; }, getContext: context, getBoundingClientRect: () => bounds };
  const react = {
    useRef(value) { const i = cursor++; return state[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in state)) state[i] = typeof value === "function" ? value() : value; return [state[i], v => { state[i] = typeof v === "function" ? v(state[i]) : v; }]; },
    useLayoutEffect(fn, deps) { const i = cursor++; if (!state[i] || deps.some((d, n) => d !== state[i][n])) { state[i] = deps; layouts.push(fn); } },
    useEffect(fn, deps) { const i = cursor++; if (!state[i] || deps.some((d, n) => d !== state[i][n])) { state[i] = deps; effects.push(fn); } },
  };
  const interval = fn => { const id = ++serial; intervals.set(id, fn); return id; };
  class Node { connect(to) { this.connected = to; } disconnect() {} }
  class AudioContext {
    destination = {}; currentTime = 0; state = 'running';
    createAnalyser() { return Object.assign(new Node(), { getByteTimeDomainData: a => a.fill(148), getByteFrequencyData: a => a.fill(100) }); }
    createMediaElementSource(track) { this.track = track; return new Node(); }
    createOscillator() { return Object.assign(new Node(), { frequency: {}, start() {}, stop() {} }); }
    createGain() { const gain = { value: 0, setTargetAtTime(value) { this.value = value; }, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }; gains.push(gain); return Object.assign(new Node(), { gain }); }
    async resume() { this.state = 'running'; } async suspend() { this.state = 'suspended'; } async close() { this.state = 'closed'; }
  }
  class Audio { static instances = []; constructor() { Audio.instances.push(this); } async play() { this.onplaying?.(); } pause() { this.onpause?.(); } }
  const scope = { exports: {}, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, AudioContext, Audio, Uint8Array, performance: { now: () => time },
    setInterval: interval, clearInterval: id => intervals.delete(id),
    requestAnimationFrame: fn => { const id = ++serial; frames.set(id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class { constructor(callback) { resizeCallbacks.push(callback); } observe() {} disconnect() {} },
    document: { hidden: false, createElement: () => { stats.sprites++; return { getContext: context }; }, addEventListener() {}, removeEventListener() {} },
    window: { devicePixelRatio: 1, setInterval: interval },
    require(name) { if (name === 'react') return react; if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }; if (name === 'framer-motion') return { useReducedMotion: () => reduced }; if (name === '../config') return { giftConfig: { musicUrl: '/music/test.mp4' } }; if (name === '../assets') return { assetUrl: p => '.' + p }; throw Error(name); },
  };
  return { state, transforms, frames, intervals, Audio, gains, storage, stats, bounds, resizeCallbacks,
    load(file) { scope.exports = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, scope); return scope.exports; },
    render(component, props) { cursor = 0; return component(props); },
    mount() { if (state[0]?.current === null) state[0].current = canvas; for (const fn of layouts.splice(0)) fn(); for (const fn of effects.splice(0)) cleanups.push(fn()); },
    tick() { time += 40; [...intervals.values()].forEach(fn => fn()); const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); },
    wake() { [...intervals.values()].forEach(fn => fn()); },
    unmount() { cleanups.forEach(fn => fn?.()); },
  };
}
const signal = { current: { playing: false, analyser: null } };
const music = runtime(); const { Music } = music.load('src/components/Music.tsx');
let controls = music.render(Music, { musicMotion: signal });
let button = controls.props.children[0]; music.mount();
await button.props.onClick();
// onClick intentionally returns void, let playback's promise chain settle.
for (let i = 0; i < 6; i++) await Promise.resolve();
assert.equal(signal.current.playing, true); assert.ok(signal.current.analyser);
assert.equal(music.Audio.instances[0].loop, true);
assert.equal(music.gains[0].value, .35);
controls = music.render(Music, { musicMotion: signal });
controls.props.children[1].props.children[1].props.onChange({ target: { value: '68' } });
music.render(Music, { musicMotion: signal }); music.mount();
assert.equal(music.gains[0].value, .68);
assert.equal(music.storage.get('your-night-garden-volume-v1'), '0.68');
button = music.render(Music, { musicMotion: signal }).props.children[0];
assert.equal(button.props['aria-pressed'], true);
const garden = runtime(); const { FlowerGarden, initialFlowers } = garden.load('src/components/FlowerGarden.tsx');
let planted = initialFlowers();
garden.render(FlowerGarden, { flowers: planted, onPlant() {}, musicMotion: signal }); garden.mount();
for (let i = 0; i < 40; i++) garden.tick();
assert.ok(garden.transforms.some(t => Math.abs(t[2]) > .005), 'Audible music should move flowers');
const originalDimensionWrites = garden.stats.dimensionWrites;
const originalSprites = garden.stats.sprites;
const originalSway = garden.transforms.at(-planted.length)[2];
planted = [...planted, { id: 2000000000000, x: .5, y: .6, size: 1, palette: 1 }];
garden.render(FlowerGarden, { flowers: planted, onPlant() {}, musicMotion: signal }); garden.mount(); garden.tick();
assert.equal(garden.stats.dimensionWrites, originalDimensionWrites, 'Planting must not blank the canvas by resetting its dimensions');
assert.equal(garden.stats.sprites, originalSprites + 1, 'Planting should only draw a single new blossom sprite');
assert.equal(garden.resizeCallbacks.length, 1, 'Planting must not replace the rendering engine');
assert.ok(Math.abs(garden.transforms.at(-planted.length)[2] - originalSway) < .006, 'Planting must preserve the music sway phase');
garden.resizeCallbacks[0]();
assert.equal(garden.stats.dimensionWrites, originalDimensionWrites, 'Repeated resize notifications with identical bounds must not blank the canvas');
const beforeRealResize = garden.stats.paints;
garden.bounds.width = 1000; garden.resizeCallbacks[0]();
assert.equal(garden.stats.paints, beforeRealResize + 1, 'A real resize must repaint immediately without a blank frame');
await button.props.onClick(); assert.equal(signal.current.playing, false);
for (let i = 0; i < 100; i++) garden.tick();
assert.equal(garden.frames.size, 0, 'Canvas should stop repainting after music settles');
// Starting again must wake a previously resting garden.
button = music.render(Music, { musicMotion: signal }).props.children[0]; await button.props.onClick();
for (let i = 0; i < 6; i++) await Promise.resolve();
garden.wake(); garden.tick(); assert.ok(garden.frames.size > 0);
garden.unmount(); music.unmount();
assert.equal(garden.frames.size, 0); assert.equal(signal.current.playing, false);
const still = runtime(true); const component = still.load('src/components/FlowerGarden.tsx');
signal.current.playing = true;
still.render(component.FlowerGarden, { flowers: component.initialFlowers(), onPlant() {}, musicMotion: signal }); still.mount(); still.tick();
assert.ok(still.transforms.every(t => t[2] === 0), 'Reduced motion should keep flowers still'); assert.equal(still.frames.size, 0); still.unmount();
console.log('PASS: stable planting, incremental blossoms, continuous sway, immediate resize, persistent volume, playback, audio-driven sway, settling, restart, reduced motion and cleanup');

