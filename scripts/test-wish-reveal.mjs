import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync('src/components/TypewriterWish.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function fixture(reduced = false) {
  let cursor = 0, nextId = 0;
  const hooks = [], frames = new Map(), effects = [], cleanups = [];
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(code, { exports,
    requestAnimationFrame: fn => { frames.set(++nextId, fn); return nextId; },
    cancelAnimationFrame: id => frames.delete(id),
    require: name => name === 'react' ? {
      useState(value) { const i = cursor++; if (!(i in hooks)) hooks[i] = value; return [hooks[i], v => { hooks[i] = v; }]; },
      useEffect(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((d, n) => d !== hooks[i][n])) { cleanups[i]?.(); hooks[i] = deps; effects.push(() => { cleanups[i] = fn(); }); } },
    } : name === 'framer-motion' ? { useReducedMotion: () => reduced } : { jsx, jsxs: jsx },
  });
  return {
    render(text = 'Chúc Thu Thảo zui zẻ 🤭') { cursor = 0; const tree = exports.TypewriterWish({ text }); effects.splice(0).forEach(fn => fn()); return tree; },
    tick(now) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); },
    close() { cleanups.forEach(fn => fn?.()); }, frames,
  };
}
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const find = (tree, cls) => nodes(tree).find(n => n.props?.className?.split(' ').includes(cls));
const f = fixture(); let tree = f.render();
assert.equal(find(tree, 'wish-animated').props.children[0], '');
f.tick(0); f.tick(120); tree = f.render();
assert.equal(find(tree, 'wish-animated').props.children[0], 'Chúc ');
find(tree, 'wish-reveal-skip').props.onClick(); tree = f.render();
assert.equal(find(tree, 'wish-animated').props.children[0], 'Chúc Thu Thảo zui zẻ 🤭');
assert.equal(f.frames.size, 0, 'Skipping cancels animation');
const reopened = fixture(); tree = reopened.render();
assert.equal(find(tree, 'wish-animated').props.children[0], '', 'Opening again starts from the beginning');
reopened.close(); assert.equal(reopened.frames.size, 0, 'Closing cancels pending work');
const quiet = fixture(true); tree = quiet.render();
assert.equal(find(tree, 'wish-animated').props.children[0], 'Chúc Thu Thảo zui zẻ 🤭');
assert.equal(quiet.frames.size, 0, 'Reduced motion shows the complete letter immediately');
const finished = fixture(); finished.render(); finished.tick(0); finished.tick(10000); tree = finished.render();
assert.equal(find(tree, 'wish-reveal-skip').props.disabled, true);
assert.equal(finished.frames.size, 0, 'Animation stops once the whole text is visible');
console.log('PASS: letter reveal, skip, reopen, cleanup, emoji and reduced motion');
