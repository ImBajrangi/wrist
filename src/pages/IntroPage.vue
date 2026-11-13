<script setup>
import { onBeforeRouteLeave } from 'vue-router';
import { onMounted, ref } from 'vue';
import { store } from '../store/index.js';
import { translate } from '../i18n/index.js';
import { beginIntroIfNeeded, engine } from '../game/match.js';
import PlayerNameCard from '../components/PlayerNameCard.vue';

const t = (key) => translate(store.locale, key);
const cardsVisible = ref(false);

onMounted(() => {
  beginIntroIfNeeded();
  setTimeout(() => {
    cardsVisible.value = true;
  }, 150);
});

onBeforeRouteLeave((to) => {
  if (!to.path.includes('/game')) {
    engine.stop();
  }
});
</script>

<template>
  <section class="page page-intro">
    <p class="round-label intro-round-pill">{{ t('game.round') }} {{ store.game.state.round }}</p>

    <div class="versus-stage" :class="{ 'is-visible': cardsVisible }">
      <div class="versus versus-center-emblem">
        <span class="versus-mark" aria-hidden="true">VS</span>
      </div>
    </div>

    <div class="intro-corners" :class="{ 'is-visible': cardsVisible }">
      <div class="intro-card intro-card--left">
        <PlayerNameCard :name="store.game.players.me.name || store.user.name || 'Mystery Rookie'" size="medium" />
        <p class="intro-streak">{{ t('global.winstreak') }}: {{ store.user.streak || 0 }}</p>
      </div>
      <div class="intro-card intro-card--right">
        <PlayerNameCard :name="store.game.players.opponent.name || 'Mystery Michel'" size="medium" />
        <p class="intro-streak">{{ t('global.winstreak') }}: {{ store.game.players.opponent.streak ?? 9 }}</p>
      </div>
    </div>

    <p class="taunt intro-taunt">{{ t('game.taunt')[0] }}</p>
  </section>
</template>
