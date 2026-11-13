<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { store } from '../store/index.js';
import { translate, defaultLocale } from '../i18n/index.js';
import { trackEvent } from '../analytics/index.js';
import { resetAllMatchState } from '../game/match.js';
import TopPromoBar from '../components/TopPromoBar.vue';
import LeaderboardDrawer from '../components/LeaderboardDrawer.vue';

const router = useRouter();
const t = (key) => translate(store.locale, key);

const mockeryText = computed(() => {
  const list = t('lose.mockery');
  return Array.isArray(list) ? list[0] : list;
});

onMounted(() => {
  store.arm.accessories = [];
  store.user.streak = 0;
});

function onRetryYes() {
  trackEvent('Click - Retry (YES)');
  resetAllMatchState();
  router.push(`/${store.locale || defaultLocale}/lobby`);
}

function onRetryNo() {
  trackEvent('Click - Retry (NO)');
  resetAllMatchState();
  router.push(`/${store.locale || defaultLocale}/`);
}
</script>

<template>
  <section class="page page-end-lose">
    <TopPromoBar />
    <div class="result-top-stack">
      <p class="winstreak winstreak--lose" aria-live="polite">
        {{ t('global.winstreak') }}: <span class="winstreak-lose-val">0</span>
      </p>
      <h1 class="result-title result-title--lose">{{ mockeryText }}</h1>
      <p class="lose-subtitle">{{ t('lose.subtitle') }}</p>
    </div>

    <div class="retry-wrapper retry-overlay">
      <p class="neon-wanna">{{ t('lose.retry') }}</p>
      <div class="answers">
        <button class="cta lose-choice lose-choice--yes" type="button" data-umami-event="Click - Retry (YES)" @click="onRetryYes">{{ t('lose.cta.yes') }}</button>
        <button class="cta lose-choice lose-choice--no" type="button" data-umami-event="Click - Retry (NO)" @click="onRetryNo">{{ t('lose.cta.no') }}</button>
      </div>
    </div>

    <button
      class="leaderboard-open-button leaderboard-card-trigger"
      type="button"
      @click="store.isLeaderboardOpen = true"
    >
      <span class="lb-trigger-strip">CLICK HERE CLICK HERE</span>
      <span class="lb-trigger-top">{{ t('leaderboard.top') }}</span>
      <span class="lb-trigger-sub">{{ t('global.winstreak') }}</span>
      <span class="lb-trigger-chevron" aria-hidden="true">⌄</span>
    </button>

    <LeaderboardDrawer />
  </section>
</template>
