/**
 * Match Coordinator (Part 2 orchestrator: Matchmaking -> Intro -> Game -> Result).
 * Keeps route transitions, bot AI, peer networking, and the state machine in sync.
 */

import { reactive } from 'vue';
import { store } from '../store/index.js';
import { getDictionary, defaultLocale } from '../i18n/index.js';
import { buildDisplayName, pick } from '../identity/name.js';
import { trackEvent } from '../analytics/index.js';
import { selectBot, createBotSimulation } from './bots.js';
import { createMatchEngine, GAME_STATE } from './engine.js';
import { searchOpponent } from '../net/matchmaking.js';
import { createPeerSession } from '../net/peer.js';
import { stage as stageHolder } from '../three/stage-instance.js';

let _router = null;
let _lobbyTimer = null;
let _introEnteredForMatch = false;
let _isBotMatch = true;
let _isHost = true;
let _activeBot = null;
let _botSim = null;
let _peerSession = null;

export const remoteCursor = reactive({
  x: 0.5,
  y: 0.5,
  pressed: false,
  visible: false,
});

function currentLocale() {
  return store.locale || defaultLocale;
}

function navigateToScreen(screen) {
  if (!_router) return;
  const loc = currentLocale();
  const target = `/${loc}/${screen === 'home' ? '' : screen}`;
  if (_router.currentRoute.value?.path !== target) {
    _router.push(target);
  }
}

export const engine = createMatchEngine({
  store,
  onNavigate: navigateToScreen,
  onStateBroadcast: () => _peerSession?.broadcastState?.(),
  onRoundSmash: (meWonRound) => {
    stageHolder.current?.shake?.(meWonRound ? 1.1 : 1.3);
  },
  isHostFn: () => _isHost,
  isBotMatchFn: () => _isBotMatch,
});

export function setMatchRouter(router) {
  _router = router;
}

export function getActiveBot() {
  return _activeBot;
}

export function getBotSimulation() {
  return _botSim;
}

export function getPeerSession() {
  return _peerSession;
}

export function isBotMatch() {
  return _isBotMatch;
}

export function isMatchHost() {
  return _isHost;
}

export function clearLobbyWait() {
  clearTimeout(_lobbyTimer);
  _lobbyTimer = null;
  store.session.isInLobby = false;
}

/**
 * Starts a bot match immediately (used at 12s lobby fallback OR 0ms when ?opponent= is set).
 */
export function launchBotMatch({ forcedId = null, skipNavigate = false } = {}) {
  clearLobbyWait();
  _peerSession?.disconnect?.();
  _peerSession = null;

  _isBotMatch = true;
  _isHost = true;
  _introEnteredForMatch = false;

  const bot = selectBot({
    forcedId: forcedId || store.session.michelOpponent,
    isFirst: store.session.isFirst,
  });
  _activeBot = bot;
  store.session.isFirst = false;

  const aliases = getDictionary(currentLocale()).aliases;
  const oppDisplayName = buildDisplayName(pick(aliases), bot.name);
  const myName = store.user.name || buildDisplayName(pick(aliases), 'Player');
  if (!store.user.name) store.user.name = myName;

  engine.resetMatch(myName, oppDisplayName, {
    meId: store.user.id || 'me',
    oppId: bot.id,
  });
  store.game.players.opponent.arm = bot.arm;

  _botSim = createBotSimulation(bot, {
    onClick: () => {
      engine.addBotClick();
      store.game.players.opponent.cps = _botSim?.getCps() || 0;
    },
    onCursor: (pressed) => {
      remoteCursor.visible = true;
      remoteCursor.pressed = pressed;
    },
  });

  if (!skipNavigate) navigateToScreen('intro');
  return bot;
}

/**
 * Starts Lobby matchmaking (12,000 ms timeout -> bot fallback, or 0 ms when forced).
 */
export function startLobbyMatchmaking({ forcedId = null } = {}) {
  clearLobbyWait();
  const effectiveForced = forcedId || store.session.michelOpponent;
  if (effectiveForced) {
    trackEvent('Game Start - vs Bot', { forced: true });
    launchBotMatch({ forcedId: effectiveForced });
    return;
  }

  store.session.isInLobby = true;

  // Fire matchmaking lookup (non-blocking). In standalone/mocked empty mode, falls back at 12s.
  searchOpponent({
    accessToken: store.user.id || 'anon',
    user: { name: store.user.name, streak: store.user.streak },
  }).then((res) => {
    if (!store.session.isInLobby) return;
    if (res?.roomID) {
      clearLobbyWait();
      connectPeerMatch({ roomID: res.roomID, isHost: true });
    }
  });

  _lobbyTimer = setTimeout(() => {
    if (!store.session.isInLobby) return;
    store.session.isInLobby = false;
    trackEvent('Game Start - vs Bot', { forced: false });
    launchBotMatch();
  }, 12000);
}

/**
 * Joins or hosts a peer-to-peer multiplayer match.
 */
export function connectPeerMatch({
  roomID,
  isHost = true,
  opponentName = 'Rival',
  opponentId = 'peer-opp',
  transport,
  skipNavigate = false,
} = {}) {
  clearLobbyWait();
  _peerSession?.disconnect?.();

  _isBotMatch = false;
  _isHost = Boolean(isHost);
  _activeBot = null;
  _botSim = null;
  _introEnteredForMatch = false;
  store.user.roomID = roomID;

  if (_isHost) {
    engine.resetMatch(store.user.name || 'Host', opponentName, {
      meId: store.user.id || 'host',
      oppId: opponentId,
    });
  }

  _peerSession = createPeerSession({
    roomID,
    isHost: _isHost,
    store,
    engine,
    transport,
    onRemoteCursor: (cur) => {
      if (!cur) return;
      remoteCursor.visible = true;
      if (typeof cur.x === 'number') remoteCursor.x = cur.x;
      if (typeof cur.y === 'number') remoteCursor.y = cur.y;
      remoteCursor.pressed = Boolean(cur.pressed);
    },
    onForfeitWin: () => {
      navigateToScreen('end-win');
    },
  });

  if (!skipNavigate) navigateToScreen('intro');
  return _peerSession;
}

/**
 * Called once by IntroPage on mount so duplicate Intro mounts do not reset timers.
 */
export function beginIntroIfNeeded({ skipRoute = false } = {}) {
  if (_introEnteredForMatch) return false;
  _introEnteredForMatch = true;
  if (!_isBotMatch && !_peerSession) {
    engine.resetMatch(store.user.name || 'You', 'Michel');
  }
  engine.enterIntro({ skipRoute });
  return true;
}

export function handleLocalGameplayClick(cps) {
  store.game.players.me.cps = cps;
  if (_isHost) {
    engine.addLocalClick();
    _peerSession?.broadcastState?.();
  } else {
    if (store.game.state.current === GAME_STATE.ACTIVE) {
      store.game.players.me.score += store.game.state.clickPoints || 1;
      _peerSession?.sendScore?.(store.game.players.me.score, cps);
    }
  }
  stageHolder.current?.shake?.(Math.min(1, (store.game.state.clickPoints || 1) * 0.2));
}

export function resetAllMatchState() {
  clearLobbyWait();
  engine.stop();
  _botSim?.stop?.();
  _peerSession?.disconnect?.();
  _peerSession = null;
  _introEnteredForMatch = false;
}

// Expose stable test surface
if (typeof window !== 'undefined') {
  window.__APP__ = window.__APP__ || {};
  window.__APP__.match = {
    engine,
    startLobbyMatchmaking,
    launchBotMatch,
    connectPeerMatch,
    beginIntroIfNeeded,
    getActiveBot,
    getBotSimulation,
    getPeerSession,
    resetAllMatchState,
    GAME_STATE,
  };
}

