/**
 * Analytics helper (spec.md §14/§16/§17, F-P2.1 / F-P3.5 / F-P3.7).
 *
 * Consent contract:
 *   - localStorage `nmm_consent` stores "granted" | "denied"
 *   - window.__ANALYTICS_CONSENT__ mirrors the decision for embedders/tests
 *   - events are always buffered locally, but only forwarded to
 *     window.umami.track after explicit consent (default-deny)
 */

export const CONSENT_KEY = 'nmm_consent';
export const CONSENT_GRANTED = 'granted';
export const CONSENT_DENIED = 'denied';

export const analyticsEvents = [];

/** Returns "granted", "denied", or null when no decision was stored. */
export function getConsent() {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === CONSENT_GRANTED || value === CONSENT_DENIED ? value : null;
  } catch {
    return null; // storage blocked → treat as undecided
  }
}

function syncConsentFlag(consent) {
  if (typeof window === 'undefined') return;
  window.__ANALYTICS_CONSENT__ = consent === CONSENT_GRANTED;
}

/**
 * Persists a decision and mirrors it to window.__ANALYTICS_CONSENT__.
 * Accepts "granted"/"denied" or booleans; returns the normalized value.
 */
export function setConsent(consent) {
  const normalized =
    consent === true || consent === CONSENT_GRANTED ? CONSENT_GRANTED : CONSENT_DENIED;
  try {
    window.localStorage.setItem(CONSENT_KEY, normalized);
  } catch {
    /* non-fatal: the in-memory flag still gates this session */
  }
  syncConsentFlag(normalized);
  return normalized;
}

/**
 * Applies a previously stored decision at boot. Default-deny when nothing is
 * stored, so analytics can never run before the banner is answered.
 */
export function initConsent() {
  const stored = getConsent();
  if (stored) syncConsentFlag(stored);
  else if (typeof window !== 'undefined') window.__ANALYTICS_CONSENT__ = false;
  return stored;
}

export function hasAnalyticsConsent() {
  return typeof window !== 'undefined' && window.__ANALYTICS_CONSENT__ === true;
}

export function trackEvent(name, data = {}) {
  const entry = { name, data, timestamp: Date.now() };
  analyticsEvents.push(entry);
  if (typeof window !== 'undefined') {
    window.__APP__ = window.__APP__ || {};
    window.__APP__.analyticsEvents = analyticsEvents;
    if (hasAnalyticsConsent() && typeof window.umami?.track === 'function') {
      window.umami.track(name, data);
    }
  }
  return entry;
}

export function clearAnalyticsEvents() {
  analyticsEvents.length = 0;
}
