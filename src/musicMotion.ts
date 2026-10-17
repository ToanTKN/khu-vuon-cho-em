import type { RefObject } from 'react';

// Shared audio signal: sampled by the canvas without re-rendering React.
export type MusicMotion = { playing: boolean; analyser: AnalyserNode | null };
export type MusicMotionRef = RefObject<MusicMotion>;
