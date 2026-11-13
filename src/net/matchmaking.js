/**
 * Matchmaking & API Client (F-P2.1, F-P3.6, spec.md §8.1/§14).
 *
 * Includes required VV-Access-Token header, clean error envelope normalization,
 * and zero secret logging. Falls back cleanly to pending/bot mode when offline.
 */

export const MATCHMAKING_TIMEOUT_MS = 12000;

/** Configured non-secret runtime endpoints & public environment token holder. */
const DEFAULT_BASE_URL = '';
let _envAccessToken = 'public-demo-env-token';

export function setApiConfig({ envToken } = {}) {
  if (typeof envToken === 'string' && envToken.length > 0) {
    _envAccessToken = envToken;
  }
}

export function normalizeErrorEnvelope(errPayload) {
  const err = errPayload?.error || errPayload || {};
  return {
    status: err.status || 'UNKNOWN',
    code: err.code || 'ERR_UNKNOWN',
    id: err.id || '',
    message: err.message || 'Request failed',
    details: err.details && typeof err.details === 'object' ? err.details : {},
  };
}

export async function apiRequest(
  path,
  {
    method = 'GET',
    body = undefined,
    fetchFn = typeof fetch !== 'undefined' ? fetch : null,
    baseUrl = DEFAULT_BASE_URL,
  } = {},
) {
  if (!fetchFn || !baseUrl) {
    return { ok: false, offline: true, data: null };
  }
  const url = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const headers = {
    'Content-Type': 'application/json',
    'VV-Access-Token': _envAccessToken,
  };
  try {
    const res = await fetchFn(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) {
      return { ok: false, error: normalizeErrorEnvelope(json) };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, offline: true, error: normalizeErrorEnvelope({ message: 'Network unavailable' }) };
  }
}

export async function searchOpponent({
  accessToken,
  user,
  userRealKey,
  fetchFn = typeof fetch !== 'undefined' ? fetch : null,
  baseUrl = DEFAULT_BASE_URL,
} = {}) {
  if (!baseUrl) {
    // Local standalone mode: no backend configured -> immediately yield pending (no roomID).
    return { userID: accessToken || 'local-player', roomID: null };
  }
  const res = await apiRequest('api/lobby/searchOpponent', {
    method: 'POST',
    body: { accessToken, user, USER_REAL_KEY: userRealKey },
    fetchFn,
    baseUrl,
  });
  if (res.ok && res.data) {
    return { userID: res.data.userID || accessToken || 'local-player', roomID: res.data.roomID || null };
  }
  return { userID: accessToken || 'local-player', roomID: null, error: res.error };
}

export async function isUserInGame({
  accessToken,
  roomID,
  userID,
  fetchFn = typeof fetch !== 'undefined' ? fetch : null,
  baseUrl = DEFAULT_BASE_URL,
} = {}) {
  if (!roomID || !baseUrl) return false;
  const res = await apiRequest('api/isUserInGame', {
    method: 'POST',
    body: { accessToken, roomID, userID },
    fetchFn,
    baseUrl,
  });
  return Boolean(res.ok && (res.data === true || res.data?.inGame === true));
}

