/**
 * Save-state manager (F-P1.5, spec.md §10.3/§10.4).
 *
 * - Writes are debounced to one per 100 ms burst.
 * - On boot, the save is decrypted and validated.
 * - Corrupt saves are discarded → fresh state.
 * - Framework-free: reads/writes the store directly.
 */

import { watch } from 'vue';
import { store } from '../store/index.js';
import { encrypt, decrypt } from './crypto.js';

const STORAGE_KEY = 'mm10years_savestate';
const DEBOUNCE_MS = 100;
const SEEN_BOTS_KEY = 'mm10years_seenBots';

let _debounceTimer = null;

/** Shape of a serializable save object (spec.md §10.4). */
function extractSave() {
  return {
    user: { ...store.user },
    game: {
      players: {
        me: { ...store.game.players.me },
        opponent: { ...store.game.players.opponent },
      },
      state: { ...store.game.state },
    },
    arm: {
      preset: { ...store.arm.preset },
      tatoos: [...store.arm.tatoos],
      accessories: [...store.arm.accessories],
    },
  };
}

/** Validate a decoded save has the minimum required fields. */
function isValidSave(obj) {
  return Boolean(
    obj &&
      typeof obj === 'object' &&
      obj.user &&
      typeof obj.user.name === 'string' &&
      obj.game &&
      obj.game.state,
  );
}

/** Hydrate the reactive store from a validated save. */
function hydrate(save) {
  if (save.user) Object.assign(store.user, save.user);
  if (save.game?.players?.me) Object.assign(store.game.players.me, save.game.players.me);
  if (save.game?.players?.opponent)
    Object.assign(store.game.players.opponent, save.game.players.opponent);
  if (save.game?.state) Object.assign(store.game.state, save.game.state);
  if (save.arm) {
    if (save.arm.preset) Object.assign(store.arm.preset, save.arm.preset);
    if (Array.isArray(save.arm.tatoos)) store.arm.tatoos = [...save.arm.tatoos];
    if (Array.isArray(save.arm.accessories)) store.arm.accessories = [...save.arm.accessories];
  }
}

/** Write the current state to localStorage (debounced). */
async function persistNow() {
  try {
    const saveID = await encrypt(extractSave());
    const envelope = JSON.stringify({ saveID, savedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, envelope);
  } catch {
    // Storage full or crypto unavailable — swallow silently.
  }
}

function debouncedPersist() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(persistNow, DEBOUNCE_MS);
}

/** Boot: restore from localStorage if valid. */
export async function restoreSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const envelope = JSON.parse(raw);
    if (!envelope?.saveID) return false;
    const save = await decrypt(envelope.saveID);
    if (!isValidSave(save)) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    hydrate(save);
    return true;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

/** Start watching the store for changes. Call once after boot. */
export function startAutoSave() {
  watch(
    () => [store.user, store.game.players, store.game.state, store.arm],
    debouncedPersist,
    { deep: true },
  );
}

/** Full reset: wipe saved state and reinitialize defaults. */
export function resetSavestate() {
  clearTimeout(_debounceTimer);
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SEEN_BOTS_KEY);
  store.user.name = '';
  store.user.streak = 0;
  store.user.id = '';
  store.user.leaderboardID = '';
  store.user.roomID = null;
  store.arm.tatoos = Array(11).fill(null);
  store.arm.accessories = [];
}

/** Expose for test harness. */
if (typeof window !== 'undefined') {
  window.__APP__ = window.__APP__ || {};
  window.__APP__.save = { restoreSave, startAutoSave, resetSavestate, extractSave, persistNow };
}

