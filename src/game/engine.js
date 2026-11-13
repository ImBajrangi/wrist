/**
 * Authoritative Match State Machine & Scoring Engine (F-P2.2, F-P2.5, spec.md §6).
 *
 * State Enum:
 *   INTRO (0) -> 5,000 ms ->
 *   STARTING (1) -> 2,000 ms ->
 *   COUNTDOWN (2) [READY at 150ms, FIGHT at 1100ms, ACTIVE at 2100ms] ->
 *   ACTIVE (3) [clickPoints: 1 -> 3 at 2000ms -> 4 at 6000ms] ->
 *   ENDROUND (4) [score diff >= 40; roundWon < 2 -> 2000ms -> STARTING] ->
 *   ENDED (5) [roundWon === 2 -> 1000ms -> EndWin / EndLose]
 */

export const GAME_STATE = {
  INTRO: 0,
  STARTING: 1,
  COUNTDOWN: 2,
  ACTIVE: 3,
  ENDROUND: 4,
  ENDED: 5,
};

export const TIMINGS = {
  INTRO_MS: 5000,
  STARTING_MS: 2000,
  READY_MS: 150,
  FIGHT_MS: 1100,
  ACTIVE_MS: 2100,
  CLICK_POINTS_3_MS: 2000,
  CLICK_POINTS_4_MS: 6000,
  WIN_THRESHOLD: 40,
  ENDROUND_MS: 2000,
  ENDED_MS: 1000,
};

/**
 * Pure state-machine / round-resolution controller operating on a store-like object.
 * Designed so timers work cleanly with Playwright page.clock and unit tests.
 */
export function createMatchEngine({
  store,
  onNavigate = () => {},
  onStateBroadcast = () => {},
  onRoundSmash = () => {},
  onCountdownCue = () => {},
  isHostFn = () => true,
  isBotMatchFn = () => true,
} = {}) {
  const timers = new Set();
  let matchActive = false;
  let disableBotClicks = false;

  function schedule(fn, delayMs) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, delayMs);
    timers.add(id);
    return id;
  }

  function clearTimers() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
  }

  function resetScoresForRound() {
    store.game.players.me.score = 0;
    store.game.players.me.cps = 0;
    store.game.players.opponent.score = 0;
    store.game.players.opponent.cps = 0;
    store.game.state.clickPoints = 1;
    store.game.state.countdown = null;
  }

  function resetMatch(meName, opponentName, { meId = 'me', oppId = 'bot' } = {}) {
    clearTimers();
    matchActive = true;
    store.game.players.me = {
      score: 0,
      cps: 0,
      roundWon: 0,
      id: meId,
      name: meName || store.user.name || 'You',
      arm: null,
    };
    store.game.players.opponent = {
      score: 0,
      cps: 0,
      roundWon: 0,
      id: oppId,
      name: opponentName || 'Michel',
      arm: null,
    };
    store.game.state.current = GAME_STATE.INTRO;
    store.game.state.round = 1;
    store.game.state.winner = null;
    store.game.state.clickPoints = 1;
    store.game.state.countdown = null;
    if (store.session) store.session.winRecorded = false;
    onStateBroadcast();
  }

  function enterIntro({ skipRoute = false } = {}) {
    clearTimers();
    matchActive = true;
    store.game.state.current = GAME_STATE.INTRO;
    onStateBroadcast();
    if (isHostFn()) {
      schedule(() => {
        if (!matchActive) return;
        enterStarting();
        if (!skipRoute) onNavigate('game');
      }, TIMINGS.INTRO_MS);
    }
  }

  function enterStarting() {
    clearTimers();
    resetScoresForRound();
    store.game.state.current = GAME_STATE.STARTING;
    onStateBroadcast();
    if (isHostFn()) {
      schedule(() => {
        if (!matchActive) return;
        enterCountdown();
      }, TIMINGS.STARTING_MS);
    }
  }

  function enterCountdown() {
    clearTimers();
    store.game.state.current = GAME_STATE.COUNTDOWN;
    store.game.state.countdown = null;
    onStateBroadcast();
    if (isHostFn()) {
      schedule(() => {
        if (!matchActive || store.game.state.current !== GAME_STATE.COUNTDOWN) return;
        store.game.state.countdown = 1; // READY
        onCountdownCue('ready');
        onStateBroadcast();
      }, TIMINGS.READY_MS);

      schedule(() => {
        if (!matchActive || store.game.state.current !== GAME_STATE.COUNTDOWN) return;
        store.game.state.countdown = 0; // FIGHT
        onCountdownCue('fight');
        onStateBroadcast();
      }, TIMINGS.FIGHT_MS);

      schedule(() => {
        if (!matchActive || store.game.state.current !== GAME_STATE.COUNTDOWN) return;
        store.game.state.countdown = -1;
        enterActive();
      }, TIMINGS.ACTIVE_MS);
    }
  }

  function enterActive() {
    clearTimers();
    resetScoresForRound();
    store.game.state.current = GAME_STATE.ACTIVE;
    store.game.state.clickPoints = 1;
    onStateBroadcast();

    if (isHostFn()) {
      schedule(() => {
        if (store.game.state.current === GAME_STATE.ACTIVE) {
          store.game.state.clickPoints = 3;
          onStateBroadcast();
        }
      }, TIMINGS.CLICK_POINTS_3_MS);

      schedule(() => {
        if (store.game.state.current === GAME_STATE.ACTIVE) {
          store.game.state.clickPoints = 4;
          onStateBroadcast();
        }
      }, TIMINGS.CLICK_POINTS_4_MS);
    }
  }

  function resolveRoundIfNeeded() {
    if (!isHostFn()) return false;
    if (store.game.state.current !== GAME_STATE.ACTIVE) return false;
    if (store.session?.forceOveride) return false;

    const me = store.game.players.me;
    const opp = store.game.players.opponent;
    const diff = me.score - opp.score;
    if (Math.abs(diff) < TIMINGS.WIN_THRESHOLD) return false;

    const meWonRound = diff > 0;
    const roundWinner = meWonRound ? me : opp;
    roundWinner.roundWon += 1;
    onRoundSmash(meWonRound);

    if (roundWinner.roundWon < 2) {
      clearTimers();
      store.game.state.current = GAME_STATE.ENDROUND;
      store.game.state.round += 1;
      onStateBroadcast();
      schedule(() => {
        if (!matchActive) return;
        enterStarting();
      }, TIMINGS.ENDROUND_MS);
    } else {
      finishMatch(meWonRound ? (me.id || store.user.id || 'me') : (opp.id || 'opponent'), meWonRound);
    }
    return true;
  }

  function finishMatch(winnerId, localWon) {
    clearTimers();
    store.game.state.winner = winnerId;
    store.game.state.current = GAME_STATE.ENDED;
    onStateBroadcast();
    schedule(() => {
      matchActive = false;
      onNavigate(localWon ? 'end-win' : 'end-lose');
    }, TIMINGS.ENDED_MS);
  }

  function addLocalClick() {
    if (store.game.state.current !== GAME_STATE.ACTIVE) return;
    store.game.players.me.score += store.game.state.clickPoints || 1;
    resolveRoundIfNeeded();
  }

  function addBotClick() {
    if (disableBotClicks) return;
    if (store.game.state.current !== GAME_STATE.ACTIVE) return;
    if (!isBotMatchFn()) return;
    store.game.players.opponent.score += store.game.state.clickPoints || 1;
    resolveRoundIfNeeded();
  }

  function stop() {
    matchActive = false;
    clearTimers();
  }

  return {
    resetMatch,
    enterIntro,
    enterStarting,
    enterCountdown,
    enterActive,
    resolveRoundIfNeeded,
    finishMatch,
    addLocalClick,
    addBotClick,
    stop,
    setBotClicksDisabled(val) {
      disableBotClicks = Boolean(val);
    },
    isBotClicksDisabled: () => disableBotClicks,
    isActive: () => matchActive,
  };
}
