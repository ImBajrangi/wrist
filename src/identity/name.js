/**
 * Identity helpers (F-P1.4, spec.md §10/§13.4).
 *
 * Framework-free so the self-check harness can unit-test them directly.
 * Display-name grammar: "<alias> <nickname>" — nickname is 1..10 word
 * characters; an empty nickname falls back to a roster-style first name.
 */

/** Strips non-word characters and clamps to 10 characters. */
export function sanitizeNickname(raw) {
  return String(raw ?? '')
    .replace(/[^\w]+/g, '')
    .slice(0, 10);
}

/** A nickname is valid when at least one word character survives. */
export function isValidNickname(raw) {
  return sanitizeNickname(raw).length > 0;
}

/** Uniformly random pick from a non-empty list. */
export function pick(list, rng = Math.random) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list[Math.floor(rng() * list.length)];
}

/**
 * Builds "<alias> <nickname>", collapsing whitespace. When the nickname is
 * empty, a fallback name (roster-style first name) is used instead.
 */
export function buildDisplayName(alias, nickname, fallbackNames = ['Rookie', 'Champ', 'Bandit'], rng = Math.random) {
  const a = String(alias ?? '').trim();
  const nick = String(nickname ?? '').trim() || pick(fallbackNames, rng);
  return `${a} ${nick}`.replace(/\s+/g, ' ').trim();
}

/** Splits a display name into { alias, nickname } at the first space. */
export function splitDisplayName(name) {
  const n = String(name ?? '');
  const i = n.indexOf(' ');
  if (i <= 0) return { alias: '', nickname: n };
  return { alias: n.slice(0, i), nickname: n.slice(i + 1) };
}
