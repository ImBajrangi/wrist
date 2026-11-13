/**
 * Audio sprite manager (F-P1.6, spec.md §11).
 *
 * - Web Audio API based: one AudioContext, one master GainNode.
 * - Sprite-based playback: each sprite is [name, start, duration, loopEnd?].
 * - Mute toggle sets master gain to 0 / restores previous.
 * - Autoplay unlock on first user gesture (click/touch/keydown).
 * - Music layers crossfade between scenes.
 */

import { store } from '../store/index.js';

let _ctx = null;
let _masterGain = null;
let _prevVolume = 1;
let _unlocked = false;
const _buffers = new Map(); // name → AudioBuffer
const _activeSources = new Map(); // name → { source, gain }

/** Lazy-init AudioContext. */
function getContext() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      _masterGain = _ctx.createGain();
      _masterGain.connect(_ctx.destination);
      // Apply stored mute state
      if (store.audioMuted) _masterGain.gain.value = 0;
    } catch {
      return null;
    }
  }
  return _ctx;
}

/** Resume context on first gesture to comply with autoplay policy. */
function unlockAudio() {
  if (_unlocked) return;
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => { });
  }
  _unlocked = true;
}

// Attach unlock listeners once.
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown'];
  const handler = () => {
    unlockAudio();
    events.forEach((e) => window.removeEventListener(e, handler, { capture: true }));
  };
  events.forEach((e) => window.addEventListener(e, handler, { capture: true, once: false }));
}

/** Load an audio file and register it by name. */
export async function loadAudio(name, url) {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf);
    _buffers.set(name, decoded);
  } catch {
    // Missing audio is tolerated (spec.md §11).
  }
}

/** Play a named sound. Options: loop, volume, fadeIn (seconds). */
export function play(name, { loop = false, volume = 1, fadeIn = 0 } = {}) {
  const ctx = getContext();
  if (!ctx) return null;
  const buffer = _buffers.get(name);
  if (!buffer) return null;

  // Stop previous instance of same name
  stop(name);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;

  const gainNode = ctx.createGain();
  gainNode.connect(_masterGain);
  source.connect(gainNode);

  if (fadeIn > 0) {
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeIn);
  } else {
    gainNode.gain.value = volume;
  }

  source.start(0);
  _activeSources.set(name, { source, gain: gainNode });

  source.onended = () => {
    _activeSources.delete(name);
  };

  return { source, gain: gainNode };
}

/** Stop a playing sound with optional fade-out (seconds). */
export function stop(name, fadeOut = 0) {
  const entry = _activeSources.get(name);
  if (!entry) return;
  const ctx = getContext();
  if (fadeOut > 0 && ctx) {
    entry.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOut);
    setTimeout(() => {
      try { entry.source.stop(); } catch { }
      _activeSources.delete(name);
    }, fadeOut * 1000);
  } else {
    try { entry.source.stop(); } catch { }
    _activeSources.delete(name);
  }
}

/** Stop all active sounds. */
export function stopAll(fadeOut = 0) {
  for (const name of [..._activeSources.keys()]) {
    stop(name, fadeOut);
  }
}

/** Toggle mute. Returns new muted state. */
export function toggleMute() {
  const ctx = getContext();
  if (!ctx || !_masterGain) {
    store.audioMuted = !store.audioMuted;
    return store.audioMuted;
  }
  if (store.audioMuted) {
    // Unmute
    _masterGain.gain.value = _prevVolume;
    store.audioMuted = false;
  } else {
    // Mute
    _prevVolume = _masterGain.gain.value || 1;
    _masterGain.gain.value = 0;
    store.audioMuted = true;
  }
  return store.audioMuted;
}

/** Get master gain value (for test assertions). */
export function getMasterGain() {
  return _masterGain ? _masterGain.gain.value : 1;
}

/** Expose for test harness. */
if (typeof window !== 'undefined') {
  window.__APP__ = window.__APP__ || {};
  window.__APP__.audio = { loadAudio, play, stop, stopAll, toggleMute, getMasterGain };
}

