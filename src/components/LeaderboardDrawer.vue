<script setup>
import { computed, onMounted } from 'vue';
import { store } from '../store/index.js';
import { translate } from '../i18n/index.js';
import { DEFAULT_LEADERBOARD, buildDisplayRows, fetchLeaderboard } from '../net/leaderboard.js';

const t = (key) => translate(store.locale, key);

onMounted(async () => {
  if (!Array.isArray(store.leaderboardRows) || store.leaderboardRows.length === 0) {
    const res = await fetchLeaderboard();
    store.leaderboardRows = res.leaderboard;
  }
});

const displayRows = computed(() => {
  const source = store.leaderboardRows?.length ? store.leaderboardRows : DEFAULT_LEADERBOARD;
  return buildDisplayRows({
    rows: source,
    user: store.user,
    youLabel: t('global.you'),
  });
});

function splitName(fullName) {
  const idx = (fullName || '').indexOf(' ');
  if (idx > 0) return { alias: fullName.slice(0, idx), nick: fullName.slice(idx + 1) };
  return { alias: '', nick: fullName || '' };
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="store.isLeaderboardOpen" class="leaderboard-backdrop">
        <aside class="leaderboard" role="dialog" aria-modal="true" :aria-label="t('leaderboard.title')">
          <header class="leaderboard-title">
            <span class="leaderboard-title__top">{{ t('leaderboard.top') }}</span>
            <h3 class="leaderboard-title__bottom">{{ t('global.winstreak') }}</h3>
          </header>
          <button
            class="leaderboard-close-button"
            type="button"
            :aria-label="t('leaderboard.close')"
            @click="store.isLeaderboardOpen = false"
          >
            ✕
          </button>
          <ol class="leaderboard-rows">
            <li v-if="displayRows.length === 0" class="leaderboard-empty">—</li>
            <li
              v-for="r in displayRows"
              :key="r.leaderboardID + '-' + r.rank"
              class="leaderboard-row"
              :class="{ 'is-you': r.isYou, 'is-top-one': r.rank === 1 && !r.isYou }"
            >
              <span class="rank">{{ r.rank }}</span>
              <span class="name">
                <em v-if="splitName(r.name).alias" class="row-alias">{{ splitName(r.name).alias }}</em>
                <strong class="row-nick">{{ splitName(r.name).nick }}</strong>
              </span>
              <span class="streak">{{ r.streak }}</span>
            </li>
          </ol>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
