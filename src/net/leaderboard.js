/**
 * Leaderboard Client & Display Logic (F-P3.2, spec.md §9.4/§9.5, T-13).
 *
 * - Top 10 ranked rows + appended local "YOU" row if not in top 10.
 * - Eligibility gate: only calls updateLeaderboard when streak >= streakToBeat (last row's streak).
 * - Payload encrypts user progression snapshot via AES-GCM alongside idToken.
 */

import { encrypt } from '../save/crypto.js';
import { apiRequest } from './matchmaking.js';

/** Synthetic offline fixture matching §21.4 (10 rows, 10th streak 60, top 214). Zero real PII/UIDs. */
export const DEFAULT_LEADERBOARD = [
  { rank: 1, name: 'Cosmic Turbo', streak: 214, leaderboardID: 'LB_SYNTH_01' },
  { rank: 2, name: 'Ferocious Leo', streak: 168, leaderboardID: 'LB_SYNTH_02' },
  { rank: 3, name: 'Blazing Math', streak: 142, leaderboardID: 'LB_SYNTH_03' },
  { rank: 4, name: 'Iron Astrid', streak: 121, leaderboardID: 'LB_SYNTH_04' },
  { rank: 5, name: 'Golden Roro', streak: 105, leaderboardID: 'LB_SYNTH_05' },
  { rank: 6, name: 'Fearless Toon', streak: 93, leaderboardID: 'LB_SYNTH_06' },
  { rank: 7, name: 'Ultra Jael', streak: 81, leaderboardID: 'LB_SYNTH_07' },
  { rank: 8, name: 'Wicked Lou', streak: 74, leaderboardID: 'LB_SYNTH_08' },
  { rank: 9, name: 'Snazzy Louis', streak: 66, leaderboardID: 'LB_SYNTH_09' },
  { rank: 10, name: 'Plucky Arno', streak: 60, leaderboardID: 'LB_SYNTH_10' },
];

export function computeStreakToBeat(rows) {
  if (!Array.isArray(rows) || rows.length < 10) return 0;
  return Number(rows[9]?.streak ?? 60);
}

/** Strips sensitive UID/accessToken fields and normalizes rows + local YOU row. */
export function buildDisplayRows({ rows = DEFAULT_LEADERBOARD, user = {}, youLabel = 'You' } = {}) {
  const top = (rows || []).slice(0, 10).map((r, i) => ({
    rank: r.rank ?? i + 1,
    name: r.name,
    streak: Number(r.streak) || 0,
    leaderboardID: r.leaderboardID || `ROW_${i + 1}`,
    isYou: Boolean(user.leaderboardID && r.leaderboardID === user.leaderboardID),
  }));

  const alreadyOnBoard = top.some((r) => r.isYou);
  if (!alreadyOnBoard && (user.name || user.streak > 0)) {
    top.push({
      rank: '—',
      name: user.name || youLabel,
      streak: Number(user.streak) || 0,
      leaderboardID: user.leaderboardID || 'LOCAL_YOU',
      isYou: true,
    });
  }
  return top;
}

export async function fetchLeaderboard({
  fetchFn = typeof fetch !== 'undefined' ? fetch : null,
  baseUrl = '',
} = {}) {
  if (!baseUrl) {
    return { leaderboard: DEFAULT_LEADERBOARD, streakToBeat: computeStreakToBeat(DEFAULT_LEADERBOARD) };
  }
  const res = await apiRequest('api/leaderboard/getLeaderboard', {
    method: 'GET',
    fetchFn,
    baseUrl,
  });
  const rows = res.ok && Array.isArray(res.data?.leaderboard) ? res.data.leaderboard : DEFAULT_LEADERBOARD;
  return { leaderboard: rows, streakToBeat: computeStreakToBeat(rows) };
}

export async function maybeUpdateLeaderboard({
  user,
  arm,
  idToken,
  streakToBeat = 60,
  fetchFn = typeof fetch !== 'undefined' ? fetch : null,
  baseUrl = '',
} = {}) {
  const streak = Number(user?.streak) || 0;
  if (streak < streakToBeat) {
    return { skipped: true, reason: 'below_threshold' };
  }
  const payloadObj = {
    name: user.name || '',
    leaderboardID: user.leaderboardID || '',
    streak,
    arm: arm || {},
  };
  const USER_REAL_KEY = await encrypt(payloadObj);
  const res = await apiRequest('api/leaderboard/updateLeaderboard', {
    method: 'POST',
    body: { USER_REAL_KEY, idToken },
    fetchFn,
    baseUrl,
  });
  if (res.ok && res.data?.leaderboardID) {
    user.leaderboardID = res.data.leaderboardID;
  }
  return { skipped: false, USER_REAL_KEY, idToken, response: res };
}

