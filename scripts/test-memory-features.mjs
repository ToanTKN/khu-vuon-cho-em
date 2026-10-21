import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const find = (tree, predicate) => nodes(tree).find(predicate);
const text = tree => [tree?.props?.children].flat(Infinity).map(v => typeof v === 'object' ? text(v) : v ?? '').join('');
function fixture(storage = new Map()) {
  const hooks = [], effects = [], cleanups = [], cache = new Map();
  let cursor = 0, now = 1000;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial; return [hooks[i], v => { hooks[i] = typeof v === 'function' ? v(hooks[i]) : v; }]; },
    useRef(value) { const i = cursor++; return hooks[i] ??= { current: value }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((d, n) => d !== hooks[i][n])) { hooks[i] = deps; effects.push(fn); } },
  };
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    const require = name => {
      if (name === 'react') return react;
      if (name.endsWith('/assets')) return { assetUrl: p => '.' + p };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'framer-motion') return { MotionConfig: 'MotionConfig', motion: { article: 'article' } };
      if (name.endsWith('/Modal')) return { Modal: 'Modal' };
      if (name.endsWith('/FlowerGarden')) return { FlowerGarden: 'FlowerGarden', initialFlowers: () => [{ id: 0, x: .5, y: .5, size: 1, palette: 0 }] };
      if (/\/(MemorySky|Fireflies|KeepsakeGift|Music|MemoryOrnament|GardenGuide)$/.test(name)) { const n = name.split('/').at(-1); return { [n]: n }; }
      const target = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(target + '.ts') ? target + '.ts' : target + '.tsx');
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText,
      { exports, require, performance: { now: () => now }, localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) }, console });
    cache.set(file, exports); return exports;
  }
  return { load, storage, advance() { now += 500; },
    render(component, props = {}) { cursor = 0; return component(props); },
    flush() { for (const effect of effects.splice(0)) cleanups.push(effect()); },
  };
}
const f = fixture(); const { readVisited } = f.load('src/memoryProgress.ts');
assert.deepEqual([...readVisited([0, 0, 15, 16, -1, '2', null, 1.2], 16)], [0, 15]);
assert.equal(readVisited({}, 16).length, 0);
const old = { flowers: [{ id: 0, x: .5, y: .5, size: 1, palette: 0 }], giftOpened: true };
f.storage.set('your-night-garden-v2', JSON.stringify(old));
const App = f.load('src/App.tsx').default;
let app = f.render(App); f.flush();
assert.equal(find(app, n => n.type === 'KeepsakeGift').props.opened, true, 'Migration preserves the opened gift');
assert.equal(find(app, n => n.type === 'KeepsakeGift').props.highlighted, false);
for (let i = 0; i < 16; i++) {
  find(app, n => n.type === 'MemorySky').props.onVisit(i);
  app = f.render(App); f.flush();
}
assert.match(text(find(app, n => n.props?.className?.includes('memory-progress'))), /Đã ghé 16\/16/);
assert.ok(find(app, n => n.props?.className === 'completion-message'));
assert.equal(find(app, n => n.type === 'KeepsakeGift').props.highlighted, true);
find(app, n => n.type === 'MemorySky').props.onVisit(5); app = f.render(App); f.flush();
assert.equal(JSON.parse(f.storage.get('your-night-garden-v2')).visited.length, 16, 'Revisits do not increase progress');
const reloaded = fixture(f.storage); const reloadedApp = reloaded.render(reloaded.load('src/App.tsx').default);
assert.equal(find(reloadedApp, n => n.type === 'KeepsakeGift').props.highlighted, true, 'Completion persists after reload');
const fresh = fixture(); const freshApp = fresh.render(fresh.load('src/App.tsx').default);
assert.equal(typeof find(freshApp, n => n.type === 'KeepsakeGift').props.onOpen, 'function', 'Gift remains available at zero visits');
assert.ok(find(freshApp, n => n.type === 'GardenGuide'), 'First visit shows the guide');
find(freshApp, n => n.type === 'GardenGuide').props.onClose();
const freshComponent = fresh.load('src/App.tsx').default;
let guidedApp = fresh.render(freshComponent);
assert.equal(find(guidedApp, n => n.type === 'GardenGuide'), undefined);
const returning = fixture(fresh.storage);
assert.equal(find(returning.render(returning.load('src/App.tsx').default), n => n.type === 'GardenGuide'), undefined, 'Closing the guide is remembered after reload');
find(guidedApp, n => n.props?.className?.includes('guide-button')).props.onClick();
guidedApp = fresh.render(freshComponent);
assert.ok(find(guidedApp, n => n.type === 'GardenGuide'), 'The footer can reopen the guide');

const album = fixture(); const { MemoryGallery } = album.load('src/components/MemoryGallery.tsx');
const props = { photos: ['/1.jpg', '/2.jpg', '/3.jpg'], title: 'Kỷ niệm' };
let gallery = album.render(MemoryGallery, props);
const photoButton = () => find(gallery, n => n.props?.className === 'album-photo-button');
const pointer = (x, y, extra = {}) => ({ pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y, currentTarget: { setPointerCapture() {} }, ...extra });
photoButton().props.onPointerDown(pointer(230, 80)); photoButton().props.onPointerUp(pointer(90, 86));
photoButton().props.onClick({ detail: 1 }); gallery = album.render(MemoryGallery, props);
assert.match(find(gallery, n => n.props?.className === 'album-photo').props.src, /2.jpg$/);
assert.equal(find(gallery, n => n.type === 'Modal'), undefined, 'Swiping must not accidentally open the viewer');
photoButton().props.onPointerDown(pointer(90, 80)); photoButton().props.onPointerUp(pointer(93, 200)); gallery = album.render(MemoryGallery, props);
assert.match(find(gallery, n => n.props?.className === 'album-photo').props.src, /2.jpg$/, 'Vertical scrolling must not change photos');
album.advance(); photoButton().props.onClick({ detail: 1 }); gallery = album.render(MemoryGallery, props);
let viewer = find(gallery, n => n.type === 'Modal'); assert.equal(viewer.props.variant, 'photo');
find(viewer, n => n.props?.['aria-label'] === 'Ảnh lớn tiếp theo').props.onClick(); gallery = album.render(MemoryGallery, props);
viewer = find(gallery, n => n.type === 'Modal');
assert.match(find(viewer, n => n.type === 'img').props.src, /3.jpg$/);
viewer.props.onClose(); gallery = album.render(MemoryGallery, props);
assert.equal(find(gallery, n => n.type === 'Modal'), undefined);
assert.match(find(gallery, n => n.props?.className === 'album-photo').props.src, /3.jpg$/, 'Closing the viewer preserves the selected photo');
const { swipeDirection } = album.load('src/hooks/usePhotoSwipe.ts');
assert.equal(swipeDirection(100, 3), -1); assert.equal(swipeDirection(-100, 3), 1); assert.equal(swipeDirection(20, 2), 0);
console.log('PASS: progress persistence, storage migration, 16-star completion, open gift, swipe, vertical scroll, full photo navigation and return');
