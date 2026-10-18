export type PlaybackState = {
  playing: boolean;
  waiting: boolean;
  wanted: boolean;
  analyser: AnalyserNode | null;
};

export class MusicPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private media: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private voices = new Set<OscillatorNode>();
  private disposed = false;
  private fallback = false;
  private buffering = false;
  private blocked = false;
  private volume: number;
  analyser: AnalyserNode | null = null;
  wanted = true;
  playing = false;
  waiting = false;

  constructor(private options: { url: string; volume: number; onChange: (state: PlaybackState) => void }) {
    this.volume = options.volume;
    this.fallback = !options.url;
  }

  private sync() {
    if (this.disposed) return;
    this.playing = this.wanted && this.context?.state === 'running' && (
      this.fallback ? this.timer !== null : !!this.media && !this.media.paused && !this.media.ended && !this.buffering);
    this.waiting = this.wanted && !this.playing && (this.blocked || this.context?.state !== 'running');
    this.options.onChange({ playing: this.playing, waiting: this.waiting, wanted: this.wanted, analyser: this.analyser });
  }

  private prepare() {
    if (this.context) return this.context;
    const context = new AudioContext();
    this.context = context;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = .75;
    this.master = context.createGain();
    this.master.gain.value = this.volume;
    this.analyser.connect(this.master);
    this.master.connect(context.destination);
    context.onstatechange = () => {
      if (this.disposed) return;
      if (this.wanted && this.fallback && context.state === 'running') this.melody();
      this.sync();
    };
    return context;
  }

  private prepareMedia(context: AudioContext) {
    if (this.media) return this.media;
    const track = new Audio();
    track.crossOrigin = 'anonymous';
    track.src = this.options.url;
    track.loop = true;
    track.autoplay = true;
    track.preload = 'auto';
    track.volume = 1;
    this.media = track;
    this.source = context.createMediaElementSource(track);
    this.source.connect(this.analyser!);
    track.onplaying = () => {
      if (this.disposed || !this.wanted) { track.pause(); return; }
      this.buffering = false; this.blocked = false; this.sync();
    };
    track.onpause = () => this.sync();
    track.onwaiting = () => { this.buffering = true; this.sync(); };
    track.onerror = () => this.useMelody();
    return track;
  }

  // Permission failures wait for a gesture and keep the real song selected.
  play() {
    if (this.disposed) return;
    this.wanted = true;
    this.blocked = false;
    try {
      const context = this.prepare();
      // Start both calls within the user gesture; do not await a blocked resume.
      void context.resume().then(() => {
        if (this.disposed || !this.wanted) return;
        if (this.fallback) this.melody();
        this.sync();
      }).catch(() => { if (!this.disposed && this.wanted) { this.blocked = true; this.sync(); } });
      if (this.fallback) {
        if (context.state === 'running') this.melody();
      } else {
        void this.prepareMedia(context).play().then(() => {
          if (this.disposed || !this.wanted) return;
          this.sync();
        }).catch((error: unknown) => {
          if (this.disposed || !this.wanted) return;
          const name = (error as { name?: string })?.name;
          if (name === 'NotAllowedError' || name === 'AbortError') { this.blocked = true; this.sync(); }
          else this.useMelody();
        });
      }
      this.sync();
    } catch { this.blocked = true; this.sync(); }
  }

  private useMelody() {
    if (this.disposed || this.fallback || !this.wanted) return;
    this.fallback = true;
    this.media?.pause();
    this.play();
  }

  private melody() {
    const context = this.context;
    if (this.disposed || !this.wanted || !context || context.state !== 'running' || this.timer !== null) return;
    let n = 0;
    const notes = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66];
    const note = () => {
      if (!this.wanted || this.disposed) return;
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = notes[n++ % notes.length];
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(.1, context.currentTime + .08);
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + 1.8);
      oscillator.connect(gain); gain.connect(this.analyser!);
      this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(); oscillator.stop(context.currentTime + 2);
    };
    note(); this.timer = setInterval(note, 1100);
  }

  setVolume(value: number) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .03);
    }
  }

  private silence() {
    this.media?.pause();
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.voices.forEach(voice => { try { voice.stop(); } catch { /* Already ended. */ } });
    this.voices.clear();
  }

  pause() {
    this.wanted = false; this.blocked = false;
    this.silence();
    void this.context?.suspend().catch(() => {});
    this.sync();
  }

  destroy() {
    this.disposed = true; this.wanted = false; this.silence();
    if (this.media) this.media.onplaying = this.media.onpause = this.media.onwaiting = this.media.onerror = null;
    if (this.context) { this.context.onstatechange = null; void this.context.close().catch(() => {}); }
    this.source?.disconnect(); this.analyser?.disconnect(); this.master?.disconnect();
  }
}
