/**
 * Gameplay Input & CPS Ring Buffer (F-P2.3, spec.md §6.4/§6.5, T-07).
 *
 * Security & Feel Guards:
 * - Only accepts `event.isTrusted === true` (ignores synthetic dispatchEvent).
 * - Ignores interactive elements (INPUT, SELECT, TEXTAREA, A, BUTTON).
 * - Ignores when visualViewport.scale !== 1 (pinch-zoomed).
 * - Rising-edge only: holding Space or mouse does not auto-repeat.
 */

const IGNORED_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'A', 'BUTTON']);
const MAX_CPS_BUFFER = 10;

export function isAcceptedGameplayEvent(event) {
  if (!event || event.isTrusted !== true) return false;
  const tag = event.target?.tagName;
  if (tag && IGNORED_TAGS.has(tag)) return false;
  const scale = typeof window !== 'undefined' ? window.visualViewport?.scale : 1;
  if (typeof scale === 'number' && Math.abs(scale - 1) > 0.05) return false;
  return true;
}

export function createInputController({
  onPress = () => {},
  onPointerMove = () => {},
  onPointerState = () => {},
} = {}) {
  let spaceDown = false;
  let pointerDown = false;
  let enabled = false;
  let activeTouches = 0;

  // Rolling click timestamps (<= 1000 ms) + 10-sample smoothing buffer.
  const timestamps = [];
  const cpsBuffer = [];

  function recordTimestamp(now = Date.now()) {
    timestamps.push(now);
    prune(now);
    const instant = timestamps.length;
    cpsBuffer.push(instant);
    if (cpsBuffer.length > MAX_CPS_BUFFER) cpsBuffer.shift();
  }

  function prune(now = Date.now()) {
    while (timestamps.length > 0 && now - timestamps[0] > 1000) {
      timestamps.shift();
    }
  }

  function getCps(now = Date.now()) {
    prune(now);
    if (timestamps.length === 0) {
      cpsBuffer.length = 0;
      return 0;
    }
    if (cpsBuffer.length === 0) return timestamps.length;
    const sum = cpsBuffer.reduce((a, b) => a + b, 0);
    return Math.round(sum / cpsBuffer.length);
  }

  function reset() {
    timestamps.length = 0;
    cpsBuffer.length = 0;
    spaceDown = false;
    pointerDown = false;
    activeTouches = 0;
  }

  function onMouseDown(e) {
    if (!enabled || !isAcceptedGameplayEvent(e)) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (pointerDown) return;
    pointerDown = true;
    onPointerState(true);
    recordTimestamp();
    onPress();
  }

  function onMouseUp() {
    if (pointerDown) {
      pointerDown = false;
      onPointerState(false);
    }
  }

  function onTouchStart(e) {
    if (!enabled || !isAcceptedGameplayEvent(e)) return;
    const newTouches = e.changedTouches?.length || 1;
    if (activeTouches === 0 && newTouches > 0) {
      activeTouches += newTouches;
      onPointerState(true);
      recordTimestamp();
      onPress();
    } else {
      activeTouches += newTouches;
    }
  }

  function onTouchEnd(e) {
    const ended = e.changedTouches?.length || 1;
    activeTouches = Math.max(0, activeTouches - ended);
    if (activeTouches === 0) onPointerState(false);
  }

  function onKeyDown(e) {
    if (!enabled || !isAcceptedGameplayEvent(e)) return;
    if (e.code !== 'Space' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat || spaceDown) return;
    spaceDown = true;
    onPointerState(true);
    recordTimestamp();
    onPress();
  }

  function onKeyUp(e) {
    if (e.code !== 'Space' && e.key !== ' ') return;
    spaceDown = false;
    onPointerState(false);
  }

  function onMove(e) {
    if (!enabled) return;
    onPointerMove(e.clientX, e.clientY);
  }

  function onBlur() {
    spaceDown = false;
    pointerDown = false;
    activeTouches = 0;
    onPointerState(false);
  }

  function preventContext(e) {
    if (enabled) e.preventDefault();
  }

  function attach() {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('blur', onBlur);
    window.addEventListener('contextmenu', preventContext);
    window.addEventListener('gesturestart', preventContext);
  }

  function detach() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('contextmenu', preventContext);
    window.removeEventListener('gesturestart', preventContext);
  }

  return {
    setEnabled(val) {
      enabled = Boolean(val);
      if (!enabled) {
        spaceDown = false;
        pointerDown = false;
      }
    },
    getCps,
    reset,
    attach,
    detach,
  };
}

