<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { store } from '../store/index.js';
import { translate, defaultLocale } from '../i18n/index.js';
import { trackEvent } from '../analytics/index.js';
import { resetAllMatchState } from '../game/match.js';
import { recordWinAndReward } from '../game/rewards.js';
import { maybeUpdateLeaderboard } from '../net/leaderboard.js';
import TopPromoBar from '../components/TopPromoBar.vue';
import LeaderboardDrawer from '../components/LeaderboardDrawer.vue';

const router = useRouter();
const t = (key) => translate(store.locale, key);
const rewardNotice = ref(null);

onMounted(() => {
  if (
    store.game.state.winner &&
    store.game.state.winner !== store.game.players.opponent.id &&
    !store.session.winRecorded
  ) {
    store.session.winRecorded = true;
    const reward = recordWinAndReward({ user: store.user, arm: store.arm });
    store.lastReward = reward;
    rewardNotice.value = reward;
    maybeUpdateLeaderboard({ user: store.user, arm: store.arm }).catch(() => {});
  }
});

function fightAgain() {
  trackEvent('Click - Play Again');
  resetAllMatchState();
  router.push(`/${store.locale || defaultLocale}/lobby`);
}
</script>

<template>
  <section class="page page-end-win">
    <TopPromoBar />
    <div class="result-top-stack">
      <h1 class="sr-only">{{ t('win.title') }}</h1>
      <p class="winstreak" aria-live="polite">
        {{ t('global.winstreak') }}: <span class="winstreak-secondary">{{ store.user.streak }}</span>
      </p>
      <div v-if="rewardNotice" class="sr-only" aria-live="polite">
        <span>{{ t('win.reward') }}:</span>
        <strong>{{ rewardNotice.item }}</strong>
      </div>
    </div>

    <div class="win-bottom-dock">
      <button class="cta cta-pill-3d" type="button" @click="fightAgain">
        <span class="cta-star" aria-hidden="true">★</span>
        <span class="cta-pill-inner">
          <span class="cta-script">{{ t('win.cta.upper') }}</span>
          <span class="cta-heavy">{{ t('win.cta.lower') }}</span>
        </span>
        <span class="cta-star" aria-hidden="true">★</span>
      </button>
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
