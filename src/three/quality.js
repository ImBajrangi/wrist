/**
 * Adaptive WebGL quality (F-P1.3, spec.md §3.5).
 *
 * Original implementation of the documented contract:
 *   - quality index 0..5, persisted, applied as a pixel-ratio cap
 *   - rolling frame-time sampling drives decreases under load and slow
 *     increases when there is headroom
 *
 * Per-level values are implementation-defined (spec.md §24.9); the index
 * range, persistence key and adaptive behavior are the contract.
 */
export const STORAGE_KEY = 'nmm_quality';
export const ALT_STORAGE_KEY = 'webgl_quality';
export const MIN_QUALITY = 0;
export const MAX_QUALITY = 5;
/** Pixel-ratio ceiling per quality index. */
export const PIXEL_RATIO_CAPS = [1, 1.25, 1.5, 1.75, 2, 2];

/** Sample window + thresholds (ms). */
const WINDOW = 60;
const DROP_FAST_MS = 50;
const DROP_MS = 33;
const RAISE_MS = 14;

export function clampQuality(index) {
  return Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, Math.round(Number(index) || 0)));
}

export function capFor(index) {
  return PIXEL_RATIO_CAPS[clampQuality(index)];
}

export function loadSavedQuality() {
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      raw = window.localStorage.getItem(ALT_STORAGE_KEY);
    }
    if (raw === null) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? clampQuality(n) : null;
  } catch {
    return null; // storage blocked → non-persistent quality
  }
}

export function saveQuality(index) {
  try {
    const val = String(clampQuality(index));
    window.localStorage.setItem(STORAGE_KEY, val);
    window.localStorage.setItem(ALT_STORAGE_KEY, val);
  } catch {
    /* non-fatal */
  }
}

/**
 * Frame-time controller. Call `sample(dtMs)` once per rendered frame.
 * Emits `onChange(newIndex)` only when the index actually moves.
 */
export function createQualityController({ initial = 3, onChange = () => {} } = {}) {
  let index = clampQuality(initial);
  const samples = new Float64Array(WINDOW);
  let filled = 0;
  let cursor = 0;

  function evaluate() {
    if (filled < WINDOW) return;
    let sum = 0;
    for (let i = 0; i < WINDOW; i++) sum += samples[i];
    const avg = sum / WINDOW;
    let next = index;
    if (avg > DROP_FAST_MS) next = index - 2;
    else if (avg > DROP_MS) next = index - 1;
    else if (avg < RAISE_MS) next = index + 1;
    next = clampQuality(next);
    if (next !== index) {
      index = next;
      onChange(index);
    }
  }

  return {
    get index() {
      return index;
    },
    set index(value) {
      index = clampQuality(value);
    },
    sample(dtMs) {
      samples[cursor] = dtMs;
      cursor = (cursor + 1) % WINDOW;
      if (filled < WINDOW) filled++;
      else evaluate();
    },
  };
}
