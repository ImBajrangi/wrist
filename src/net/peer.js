/**
 * Peer-to-peer Match Sync & Disconnect Forfeit (F-P2.7, spec.md §8.2-§8.5, T-17).
 *
 * Message protocol:
 *   - STATE (Host -> Guest): authoritative { state, players }
 *   - SCORE (Guest -> Host): { score, cps }
 *   - CURSOR (Both): { x, y, pressed }
 *   - CONNECTION_STATE (Host -> Guest): { state, connectionData }
 */

import { GAME_STATE } from '../game/engine.js';
import { trackEvent } from '../analytics/index.js';

export const MSG_TYPES = {
  STATE: 'STATE',
  SCORE: 'SCORE',
  CURSOR: 'CURSOR',
  CONNECTION_STATE: 'CONNECTION_STATE',
};

export const DISCONNECT_FORFEIT_MS = 2000;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * BroadcastChannel-backed or custom transport adapter so two pages in a single
 * context (and real same-origin tabs) or mocked channels work uniformly.
 */
export function createChannelTransport(roomID) {
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`nmm_room_${roomID}`) : null;
  const msgListeners = new Set();
  const closeListeners = new Set();
  let closed = false;

  if (bc) {
    bc.onmessage = (ev) => {
      if (closed) return;
      const payload = ev.data;
      if (payload && payload.__control === 'CLOSE') {
        for (const fn of closeListeners) fn();
        return;
      }
      for (const fn of msgListeners) fn(payload);
    };
  }

  return {
    send(msg) {
      if (closed || !bc) return;
      bc.postMessage(msg);
    },
    onMessage(fn) {
      msgListeners.add(fn);
      return () => msgListeners.delete(fn);
    },
    onClose(fn) {
      closeListeners.add(fn);
      return () => closeListeners.delete(fn);
    },
    simulateRemoteClose() {
      if (bc) bc.postMessage({ __control: 'CLOSE' });
    },
    close({ silent = false } = {}) {
      if (closed) return;
      closed = true;
      if (!silent && bc) {
        try { bc.postMessage({ __control: 'CLOSE' }); } catch {}
      }
      try { bc?.close(); } catch {}
      for (const fn of closeListeners) fn();
    },
  };
}

/**
 * Binds a PeerSession to the reactive game store + engine.
 */
export function createPeerSession({
  roomID,
  isHost = true,
  store,
  engine,
  transport = createChannelTransport(roomID),
  onRemoteCursor = () => {},
  onForfeitWin = () => {},
} = {}) {
  let forfeitTimer = null;
  let connected = true;

  function send(type, data) {
    if (!connected) return;
    transport.send({ type, data, fromHost: isHost });
  }

  function broadcastState() {
    if (!isHost || !connected) return;
    send(MSG_TYPES.STATE, {
      state: clone(store.game.state),
      players: {
        me: clone(store.game.players.me),
        opponent: clone(store.game.players.opponent),
      },
    });
  }

  function sendScore(score, cps) {
    if (isHost || !connected) return;
    send(MSG_TYPES.SCORE, { score, cps });
  }

  function sendCursor(x, y, pressed) {
    send(MSG_TYPES.CURSOR, { x, y, pressed });
  }

  function handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    // Ignore messages echoed from our own role when using shared bus
    if (msg.fromHost === isHost) return;

    switch (msg.type) {
      case MSG_TYPES.STATE: {
        if (isHost) return;
        const { state, players } = msg.data || {};
        if (players) {
          // Guest mirrors host's me <-> opponent perspective (spec.md §8.4).
          if (players.opponent) Object.assign(store.game.players.me, players.opponent);
          if (players.me) Object.assign(store.game.players.opponent, players.me);
        }
        if (state) Object.assign(store.game.state, state);
        break;
      }
      case MSG_TYPES.SCORE: {
        if (!isHost) return;
        if (store.session?.forceOveride) return;
        const { score, cps } = msg.data || {};
        if (typeof score === 'number') store.game.players.opponent.score = score;
        if (typeof cps === 'number') store.game.players.opponent.cps = cps;
        engine?.resolveRoundIfNeeded?.();
        broadcastState();
        break;
      }
      case MSG_TYPES.CURSOR: {
        onRemoteCursor(msg.data);
        break;
      }
      case MSG_TYPES.CONNECTION_STATE: {
        if (!isHost && msg.data?.state) {
          Object.assign(store.game.state, msg.data.state);
        }
        break;
      }
    }
  }

  function handleClose() {
    if (!connected) return;
    connected = false;
    const cur = store.game.state.current;
    const alreadyEnded = cur === GAME_STATE.ENDROUND || cur === GAME_STATE.ENDED;
    const delay = alreadyEnded ? 0 : DISCONNECT_FORFEIT_MS;

    clearTimeout(forfeitTimer);
    forfeitTimer = setTimeout(() => {
      if (store.game.state.current === GAME_STATE.ENDED && store.game.state.winner) {
        onForfeitWin(store.game.state.winner);
        return;
      }
      const winnerId = store.game.players.me.id || store.user.id || 'host';
      trackEvent('Opponent Disconnected', { roomID });
      store.game.state.winner = winnerId;
      store.game.state.current = GAME_STATE.ENDED;
      onForfeitWin(winnerId);
    }, delay);
  }

  const unsubMsg = transport.onMessage(handleMessage);
  const unsubClose = transport.onClose(handleClose);

  return {
    roomID,
    isHost,
    transport,
    broadcastState,
    sendScore,
    sendCursor,
    sendConnectionState(connectionData = {}) {
      if (isHost) send(MSG_TYPES.CONNECTION_STATE, { state: clone(store.game.state), connectionData });
    },
    disconnect() {
      clearTimeout(forfeitTimer);
      unsubMsg();
      unsubClose();
      transport.close();
    },
  };
}

