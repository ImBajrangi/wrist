import { reactive } from 'vue';

/**
 * Global UI store. Mirrors the transient state shapes documented in spec.md
 * §3.1/§10.5 (original implementation, own key names).
 */
export const store = reactive({
  /** Flips true once the 3D stage has rendered its first frame. */
  bootReady: false,
  stageReady: false,
  /** Global mute flag; audio manager reads/writes this (F-P1.6). */
  audioMuted: false,
  /** Active locale: 'en' | 'fr' (F-P1.7). */
  locale: 'en',
  /** Leaderboard drawer visibility. */
  isLeaderboardOpen: false,
  /** Cached leaderboard entries (10 ranked rows). */
  leaderboardRows: [],
  /** Newsletter sticker popin visibility. */
  isNewsletterOpen: false,
  /** Latest earned reward on win screen. */
  lastReward: null,
  /** Player identity + progression (schema per spec.md §10.4). */
  user: {
    name: '',
    streak: 0,
    id: '',
    leaderboardID: '',
    roomID: null,
  },
  /** Player arm cosmetics (schema per spec.md §9.2/§10.4). */
  arm: {
    preset: { skinColor: 0xc9885f, tatooColor: 0x2a2a32, envMapIntensity: 0.7 },
    tatoos: Array(11).fill(null),
    accessories: [],
  },
  /** Session-only flags (spec.md §10.5). */
  session: {
    forceOveride: false,
    isFirst: true,
    michelOpponent: null,
    isInLobby: false,
  },
  /** Match state (schema per spec.md §24.5; simulated in Part 2). */
  game: {
    players: {
      me: { score: 0, cps: 0, roundWon: 0, id: '', name: '', arm: null },
      opponent: { score: 0, cps: 0, roundWon: 0, id: '', name: '', arm: null },
    },
    state: {
      current: 0, // 0 INTRO … 5 ENDED (spec.md §6.2)
      round: 1,
      winner: null,
      clickPoints: 1,
      countdown: null,
    },
  },
});
