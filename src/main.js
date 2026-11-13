import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router/index.js';
import { store } from './store/index.js';
import { dictionaries } from './i18n/index.js';
import { restoreSave, startAutoSave } from './save/index.js';
import { toggleMute, getMasterGain } from './audio/index.js';
import {
  analyticsEvents,
  clearAnalyticsEvents,
  trackEvent,
  getConsent,
  setConsent,
  initConsent,
} from './analytics/index.js';
import { setMatchRouter } from './game/match.js';
import * as rewards from './game/rewards.js';
import * as leaderboard from './net/leaderboard.js';
import * as cf from './net/matchmaking.js';
import './styles/tokens.css';
import './styles/base.css';

const params = new URLSearchParams(window.location.search);

if (params.get('oldbrowser') === '1') {
  // Legacy / unsupported-browser gate (spec.md §12.2, T-19): remove #app completely.
  document.getElementById('app')?.remove();
  const fallback = document.createElement('main');
  fallback.className = 'old-browser';
  fallback.innerHTML = `
    <div class="marquee"><p>Loser — Loser — Upgrade your browser — Loser — Loser —</p></div>
    <h1 class="result-title result-title--lose">Upgrade Browser</h1>
    <p class="lose-subtitle">Your browser does not support WebGL2 / modern Web Audio.</p>
  `;
  document.body.appendChild(fallback);
} else {
  // Default-deny analytics until the consent banner is answered (F-P3.7).
  initConsent();

  const app = createApp(App);
  app.use(router);
  setMatchRouter(router);

  // Test/automation hook (documented in spec.md §21): created BEFORE mount so
  // component onMounted hooks can register functions on it. No secrets.
  window.__APP__ = Object.assign(window.__APP__ || {}, {
    version: '0.1.0',
    store,
    dictionaries,
    analyticsEvents,
    clearAnalyticsEvents,
    trackEvent,
    consent: { get: getConsent, set: setConsent },
    rewards,
    leaderboard,
    cf,
    audio: { toggleMute, getMasterGain },
  });

  app.mount('#app');

  // Restore save state after mount, then start auto-save watcher.
  restoreSave().then(() => startAutoSave());

  // Register offline shell service worker cleanly.
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
}
