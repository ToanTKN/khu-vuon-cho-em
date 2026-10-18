import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({ blocked = false, mediaError = '' } = {}) {
  const control = { blocked, mediaError, sources: 0, oscillators: 0 };
  const tracks = [], gains = [], states = [], timers = new Map();
  let serial = 0;
  class Node { connect() {} disconnect() {} }
  class Context {
    state = 'suspended'; currentTime = 0; destination = {};
    createAnalyser() { return Object.assign(new Node(), { fftSize: 0 }); }
    createGain() { const gain = { value: 0, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; }, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }; gains.push(gain); return Object.assign(new Node(), { gain }); }
    createMediaElementSource() { control.sources++; return new Node(); }
    createOscillator() { control.oscillators++; return Object.assign(new Node(), { frequency: {}, start() {}, stop() {} }); }
    resume() { if (control.blocked) return new Promise(() => {}); this.state = 'running'; this.onstatechange?.(); return Promise.resolve(); }
    async suspend() { this.state = 'suspended'; this.onstatechange?.(); }
    async close() { this.state = 'closed'; }
  }
  class Audio {
    paused = true; ended = false;
    constructor() { tracks.push(this); }
    async play() {
      const name = control.blocked ? 'NotAllowedError' : control.mediaError;
      if (name) throw Object.assign(new Error(name), { name });
      this.paused = false; this.onplaying?.();
    }
    pause() { this.paused = true; this.onpause?.(); }
  }
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/musicPlayer.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, AudioContext: Context, Audio, setInterval: fn => { const id = ++serial; timers.set(id, fn); return id; }, clearInterval: id => timers.delete(id) });
  const player = new exports.MusicPlayer({ url: '/music/song.m4a', volume: .35, onChange: state => states.push(state) });
  return { player, control, tracks, gains, states, timers };
}
async function settled() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
const allowed = fixture(); allowed.player.play(); await settled();
assert.equal(allowed.player.playing, true, 'Allowed autoplay starts the song without a click');
allowed.player.setVolume(.7); assert.equal(allowed.gains[0].value, .7);
allowed.player.setVolume(0); assert.equal(allowed.gains[0].value, 0, 'The slider can mute the actual output gain');
allowed.player.pause(); assert.equal(allowed.player.playing, false); assert.equal(allowed.player.wanted, false);
allowed.tracks[0].paused = false; allowed.tracks[0].onplaying();
assert.equal(allowed.tracks[0].paused, true, 'Late playback must respect a manual stop');
allowed.player.destroy();
const denied = fixture({ blocked: true }); denied.player.play(); await settled();
assert.equal(denied.player.waiting, true); assert.equal(denied.player.playing, false);
assert.equal(denied.control.oscillators, 0, 'An autoplay restriction must not replace the real song with fallback tones');
denied.control.blocked = false; denied.player.play(); await settled();
assert.equal(denied.player.playing, true, 'A user gesture can retry even when the first context.resume is still pending');
assert.equal(denied.control.sources, 1, 'Retries must reuse the same media source');
denied.player.destroy();
const broken = fixture({ mediaError: 'NotSupportedError' }); broken.player.play(); await settled();
assert.equal(broken.player.playing, true); assert.ok(broken.control.oscillators > 0, 'A genuine unsupported song still has a fallback');
broken.player.setVolume(.2); assert.equal(broken.gains[0].value, .2);
broken.player.pause(); assert.equal(broken.timers.size, 0); broken.player.destroy();
console.log('PASS: allowed autoplay, blocked autoplay, hung-resume retry, song preservation, volume/mute, late-play cancellation and fallback cleanup');
