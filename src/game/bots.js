/**
 * Opponent Bot Roster & Tuned Click Generator (F-P2.4, spec.md §7).
 * Framework-free so self-check.js can unit-test it directly (T-09).
 */

export const SEEN_BOTS_KEY = 'mm10years_seenBots';

export const DIFFICULTY_RANGES = {
  easy: [176, 216],
  intermediate: [139, 179],
  hard: [110, 150],
  expert: [86, 126],
};

export const FALLOFF_START_MS = 6000;
export const FALLOFF_FACTOR = 0.00073;
export const FALLOFF_CAP_MULT = 2;
export const BOT_CURSOR_PRESS_MS = 55;

const ALLOWED_ACCESSORIES = new Set([
  'bandana', 'bandage', 'bracelet', 'chain', 'diamond', 'nails', 'ring', 'rolex',
]);

/** Full 28-Michel roster (spec.md §7.2). */
export const BOT_ROSTER = [
  { id: 'ad', name: 'Ad', title: 'Savage', level: 'intermediate', isFirst: true, accessories: ['bracelet'], tatoos: ['bolt'] },
  { id: 'alex', name: 'Dark', title: 'Dakumitsu', level: 'easy', isFirst: true, accessories: [], tatoos: [] },
  { id: 'antoine', name: 'Toon', title: 'Chill', level: 'hard', isFirst: false, accessories: ['bandana'], tatoos: ['star'] },
  { id: 'arno', name: 'Arno', title: 'Breathtaking', level: 'expert', isFirst: false, accessories: ['rolex', 'chain'], tatoos: ['flame'] },
  { id: 'astrid', name: 'Horla', title: 'Roguish', level: 'expert', isFirst: false, accessories: ['ring', 'nails'], tatoos: ['crown'] },
  { id: 'etienne', name: 'Etidou', title: 'Sir', level: 'hard', isFirst: false, accessories: ['bandage'], tatoos: [] },
  { id: 'hugo', name: 'Hugo', title: 'Weak', level: 'easy', isFirst: true, accessories: [], tatoos: [] },
  { id: 'jael', name: 'Jael', title: 'Thunderous', level: 'hard', isFirst: false, accessories: ['chain'], tatoos: ['bolt'] },
  { id: 'jean', name: 'Fordman', title: 'Prime', level: 'easy', isFirst: true, accessories: ['bandage'], tatoos: [] },
  { id: 'jordan', name: 'Jojo', title: 'Thunder', level: 'hard', isFirst: false, accessories: ['bracelet'], tatoos: ['anchor'] },
  { id: 'leo', name: 'Dan Hen', title: '3D', level: 'intermediate', isFirst: true, accessories: ['ring'], tatoos: [] },
  { id: 'lou', name: 'Lou', title: 'Angry', level: 'expert', isFirst: false, accessories: ['bandana', 'nails'], tatoos: ['skull'] },
  { id: 'louis', name: 'Louis', title: 'Chunky', level: 'expert', isFirst: false, accessories: ['diamond'], tatoos: ['dragon'] },
  { id: 'marco', name: 'Marco', title: 'Muscular', level: 'easy', isFirst: true, accessories: [], tatoos: ['heart'] },
  { id: 'marie', name: 'Mimie', title: 'Featherweight', level: 'intermediate', isFirst: true, accessories: ['nails'], tatoos: [] },
  { id: 'math', name: 'Math', title: 'Iron', level: 'expert', isFirst: false, accessories: ['chain', 'ring'], tatoos: ['sword'] },
  { id: 'merci', name: 'Michel', title: 'Merci', level: 'expert', isFirst: false, accessories: ['rolex', 'diamond', 'bandana'], tatoos: ['crown', 'flame'] },
  { id: 'nikita', name: 'Nikita', title: 'Vicious', level: 'easy', isFirst: true, accessories: [], tatoos: [] },
  { id: 'nomercy', name: 'Michel', title: 'Nomercy', level: 'intermediate', isFirst: true, accessories: ['bandana'], tatoos: ['rose'] },
  { id: 'paul', name: 'Paul', title: 'Golfy', level: 'intermediate', isFirst: false, accessories: ['bracelet'], tatoos: [] },
  { id: 'pf', name: 'Pif', title: 'Fonky', level: 'easy', isFirst: true, accessories: [], tatoos: [] },
  { id: 'roro', name: 'Roro', title: 'Cool', level: 'expert', isFirst: false, accessories: ['diamond', 'rolex'], tatoos: ['phoenix'] },
  { id: 'rorope', name: 'Rorope', title: 'Rampage', level: 'hard', isFirst: false, accessories: ['chain'], tatoos: ['tiger'] },
  { id: 'thierry', name: 'Thierry', title: 'Tsunami', level: 'easy', isFirst: true, accessories: [], tatoos: [] },
  { id: 'thierryTaz', name: 'Devil', title: 'Tazmanian', level: 'intermediate', isFirst: false, accessories: ['bandage'], tatoos: ['bolt'] },
  { id: 'tonio', name: 'Antoine', title: 'King', level: 'easy', isFirst: true, accessories: [], tatoos: [] },
  { id: 'victorC', name: 'Victor', title: 'C', level: 'expert', isFirst: false, accessories: ['ring', 'rolex'], tatoos: ['serpent'] },
  { id: 'victorJ', name: 'Victor', title: 'J', level: 'hard', isFirst: false, accessories: ['bracelet'], tatoos: ['wing'] },
];

/** Drops unknown accessory ids (spec.md §7.3). */
export function sanitizeBotArm(bot) {
  return {
    preset: { skinColor: 0xc9885f, tatooColor: 0x2a2a32, envMapIntensity: 0.7 },
    accessories: (bot.accessories || []).filter((id) => ALLOWED_ACCESSORIES.has(id)),
    tatoos: [...(bot.tatoos || [])],
  };
}

export function getBaseIntervalForLevel(level, rng = Math.random) {
  const [min, max] = DIFFICULTY_RANGES[level] || DIFFICULTY_RANGES.easy;
  return min + rng() * (max - min);
}

/** Read seen-bot IDs safely from a storage-like object. */
export function loadSeenBots(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    const raw = storage?.getItem(SEEN_BOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSeenBots(ids, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    storage?.setItem(SEEN_BOTS_KEY, JSON.stringify(ids));
  } catch {
    /* non-fatal */
  }
}

/**
 * Picks a bot according to spec.md §7.3:
 * - forcedId is matched case-insensitively; unknown ID falls back to random easy bot.
 * - isFirst prefers easy/intermediate bots.
 * - tracks seen bots in localStorage, resetting after all 28 unique IDs have been seen.
 */
export function selectBot({
  forcedId = null,
  isFirst = false,
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
  rng = Math.random,
} = {}) {
  let chosen = null;

  if (forcedId) {
    const target = String(forcedId).trim().toLowerCase();
    chosen = BOT_ROSTER.find((b) => b.id.toLowerCase() === target) || null;
    if (!chosen) {
      const easyBots = BOT_ROSTER.filter((b) => b.level === 'easy');
      chosen = easyBots[Math.floor(rng() * easyBots.length)];
    }
  } else {
    let seen = loadSeenBots(storage);
    if (seen.length >= BOT_ROSTER.length) {
      seen = [];
    }
    const seenSet = new Set(seen);
    let pool = BOT_ROSTER.filter((b) => !seenSet.has(b.id));
    if (isFirst) {
      const firstPool = pool.filter((b) => b.isFirst && (b.level === 'easy' || b.level === 'intermediate'));
      if (firstPool.length > 0) pool = firstPool;
    }
    if (pool.length === 0) pool = BOT_ROSTER;
    chosen = pool[Math.floor(rng() * pool.length)];
  }

  // Update seen list without duplicates
  const prevSeen = loadSeenBots(storage);
  const baseSeen = prevSeen.length >= BOT_ROSTER.length ? [] : prevSeen;
  if (!baseSeen.includes(chosen.id)) {
    saveSeenBots([...baseSeen, chosen.id], storage);
  }

  const baseInterval = getBaseIntervalForLevel(chosen.level, rng);
  return {
    ...chosen,
    interval: baseInterval,
    arm: sanitizeBotArm(chosen),
  };
}

/**
 * Creates a deterministic bot simulation controller driven by clock ticks.
 */
export function createBotSimulation(bot, { onClick = () => {}, onCursor = () => {}, rng = Math.random } = {}) {
  const baseInterval = bot.interval || getBaseIntervalForLevel(bot.level, rng);
  let currentInterval = baseInterval;
  let accumMs = 0;
  let activeElapsedMs = 0;
  let running = false;

  const clickSamples = [];

  function recordClick(nowMs) {
    clickSamples.push(nowMs);
    while (clickSamples.length > 0 && nowMs - clickSamples[0] > 1000) {
      clickSamples.shift();
    }
    if (clickSamples.length > 10) clickSamples.shift();
  }

  function nextJitteredInterval() {
    const jitter = 0.9 + rng() * 0.2; // ±10%
    return currentInterval * jitter;
  }

  let targetNextMs = nextJitteredInterval();

  return {
    get level() {
      return bot.level;
    },
    get baseInterval() {
      return baseInterval;
    },
    get currentInterval() {
      return currentInterval;
    },
    start() {
      running = true;
      accumMs = 0;
      activeElapsedMs = 0;
      currentInterval = baseInterval;
      targetNextMs = nextJitteredInterval();
      clickSamples.length = 0;
    },
    stop() {
      running = false;
    },
    resetRound() {
      accumMs = 0;
      activeElapsedMs = 0;
      currentInterval = baseInterval;
      targetNextMs = nextJitteredInterval();
      clickSamples.length = 0;
    },
    getCps(nowMs = Date.now()) {
      while (clickSamples.length > 0 && nowMs - clickSamples[0] > 1000) {
        clickSamples.shift();
      }
      return clickSamples.length;
    },
    step(dtMs, nowMs = Date.now()) {
      if (!running) return;
      activeElapsedMs += dtMs;
      accumMs += dtMs;

      if (activeElapsedMs >= FALLOFF_START_MS) {
        const ticks = dtMs / 16.667;
        currentInterval = Math.min(
          baseInterval * FALLOFF_CAP_MULT,
          currentInterval * (1 + FALLOFF_FACTOR * ticks),
        );
      }

      while (accumMs >= targetNextMs) {
        accumMs -= targetNextMs;
        targetNextMs = nextJitteredInterval();
        recordClick(nowMs);
        onClick();
        onCursor(true);
        setTimeout(() => onCursor(false), BOT_CURSOR_PRESS_MS);
      }
    },
  };
}

