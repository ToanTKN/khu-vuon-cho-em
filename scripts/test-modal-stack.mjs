import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let instance;
const listeners = new Set();
const document = { body: { style: { overflow: 'auto' } }, activeElement: null,
  addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
const outside = { isConnected: true, closest: () => null, focus() { document.activeElement = this; } }; outside.focus();
const react = { useRef(value) { const i = instance.cursor++; return instance.hooks[i] ??= { current: value }; }, useEffect(fn) { instance.effects.push(fn); } };
const jsx = (type, props) => ({ type, props });
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/Modal.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, document,
  require(name) { if (name === 'react') return react; if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }; if (name === 'react-dom') return { createPortal: v => v }; if (name === 'framer-motion') return { motion: { div: 'div' } }; throw Error(name); } });
function mount(onClose, variant) {
  instance = { cursor: 0, hooks: [], effects: [] };
  const tree = exports.Modal({ label: 'test', onClose, variant });
  const dialog = { inert: false, attributes: {}, isConnected: true,
    setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; },
    querySelector() { return this.buttons[0]; }, querySelectorAll() { return this.buttons; } };
  dialog.buttons = [0, 1].map(() => ({ isConnected: true, closest: () => dialog.inert ? dialog : null, focus() { document.activeElement = this; } }));
  [tree.props.children].flat().find(child => child?.props?.role === 'dialog').props.ref.current = dialog;
  const cleanup = instance.effects[0]();
  return { dialog, cleanup };
}
function key(key, shiftKey = false) {
  const event = { key, shiftKey, stopped: false, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; } };
  for (const fn of listeners) { fn(event); if (event.stopped) break; }
}
let albumClosed = 0, photoClosed = 0;
const album = mount(() => albumClosed++, 'memory');
const photo = mount(() => photoClosed++, 'photo');
assert.equal(document.body.style.overflow, 'hidden');
assert.equal(album.dialog.inert, true); assert.equal(album.dialog.attributes['aria-hidden'], 'true');
assert.equal(document.activeElement, photo.dialog.buttons[0]);
key('Tab', true); assert.equal(document.activeElement, photo.dialog.buttons[1]);
key('Tab'); assert.equal(document.activeElement, photo.dialog.buttons[0]);
key('Escape'); assert.equal(photoClosed, 1); assert.equal(albumClosed, 0, 'Escape should close only the top photo viewer');
photo.cleanup(); assert.equal(album.dialog.inert, false); assert.equal(document.body.style.overflow, 'hidden');
assert.equal(document.activeElement, album.dialog.buttons[0], 'Focus returns to the album');
key('Escape'); assert.equal(albumClosed, 1);
album.cleanup(); assert.equal(document.body.style.overflow, 'auto'); assert.equal(document.activeElement, outside); assert.equal(listeners.size, 0);
console.log('PASS: nested photo dialog, focus trap, top-only Escape, scroll lock and focus restoration');
