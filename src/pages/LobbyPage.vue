<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { store } from '../store/index.js';
import { translate } from '../i18n/index.js';
import { startLobbyMatchmaking, clearLobbyWait } from '../game/match.js';
import LeaderboardDrawer from '../components/LeaderboardDrawer.vue';
import PlayerNameCard from '../components/PlayerNameCard.vue';

const route = useRoute();
const t = (key) => translate(store.locale, key);
const instructionsLeft = computed(() => t('lobby.instructionsLeft'));
const instructionsRight = computed(() => t('lobby.instructionsRight'));

const idxLeft = ref(0);
const idxRight = ref(0);
let carouselTimer = null;

onMounted(() => {
  carouselTimer = setInterval(() => {
    const leftList = instructionsLeft.value;
    const rightList = instructionsRight.value;
    if (Array.isArray(leftList) && leftList.length > 0) {
      idxLeft.value = (idxLeft.value + 1) % leftList.length;
    }
    if (Array.isArray(rightList) && rightList.length > 0) {
      idxRight.value = (idxRight.value + 1) % rightList.length;
    }
  }, 3200);

  const forcedOpponent = typeof route.query.opponent === 'string' ? route.query.opponent : null;
  startLobbyMatchmaking({ forcedId: forcedOpponent });
});

onBeforeUnmount(() => {
  clearInterval(carouselTimer);
  clearLobbyWait();
});
</script>

<template>
  <section class="page page-lobby">
    <!-- Dark radial vignette creating the glowing circular arena portal around the flexing arm -->
    <div class="lobby-portal-backdrop" aria-hidden="true">
      <div class="lobby-portal-ring"></div>
    </div>

    <div class="lobby-stage-grid">
      <p class="instruction instruction-left" aria-live="polite">
        {{ instructionsLeft[idxLeft % instructionsLeft.length] }}
      </p>

      <div class="name-wrapper lobby-center-card">
        <PlayerNameCard :name="store.user.name || (store.locale === 'fr' ? 'Recrue MYSTERE' : 'Mystery ROOKIE')" size="large" />
        <p class="lobby-hint">{{ t('global.winstreak') }}: {{ store.user.streak }}</p>
      </div>

      <p class="instruction instruction-right" aria-live="polite">
        {{ instructionsRight[idxRight % instructionsRight.length] }}
      </p>
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
