<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { store } from '../store/index.js';
import { translate, getDictionary, defaultLocale } from '../i18n/index.js';
import { sanitizeNickname, isValidNickname, buildDisplayName, pick } from '../identity/name.js';
import { stage as stageHolder } from '../three/stage-instance.js';
import TopPromoBar from '../components/TopPromoBar.vue';
import LeaderboardDrawer from '../components/LeaderboardDrawer.vue';

const router = useRouter();
const route = useRoute();
const locale = computed(() => route.meta?.locale || defaultLocale);
const t = (key) => translate(locale.value, key);

const nickname = ref('');
const hasError = ref(false);
let submitLock = false;

function onFocus() {
  stageHolder.current?.shake?.(0.35);
}

function onInput(event) {
  const clean = sanitizeNickname(event.target.value);
  if (clean !== event.target.value) event.target.value = clean;
  nickname.value = clean;
  if (hasError.value && clean.length > 0) hasError.value = false;
}

function onSubmit() {
  if (submitLock) return;
  if (!isValidNickname(nickname.value)) {
    hasError.value = true;
    stageHolder.current?.shake?.(0.6);
    return;
  }
  submitLock = true;
  stageHolder.current?.shake?.(0.8);
  const aliases = getDictionary(locale.value).aliases;
  store.user.name = buildDisplayName(pick(aliases), nickname.value);
  router.push({ path: `/${locale.value}/lobby`, query: route.query });
}
</script>

<template>
  <section class="page page-home">
    <TopPromoBar />

    <div class="home-bottom-dock">
      <form class="home-form" action="" novalidate @submit.prevent="onSubmit">
        <div class="input-wrapper" :class="{ 'has-error': hasError }">
          <input
            class="home-input"
            :class="{ 'input-error': hasError }"
            type="text"
            name="nickname"
            :placeholder="t('home.form')"
            maxlength="10"
            pattern="\w{1,10}"
            autocomplete="off"
            data-1p-ignore
            aria-label="Nickname"
            :value="nickname"
            @focus="onFocus"
            @input="onInput"
          />
          <button class="cta cta-circle" type="submit" data-umami-event="Click - Start game">
            <span class="cta-text">{{ t('home.cta') }}</span>
          </button>
        </div>
        <Transition name="error">
          <div v-if="hasError" class="error-text" role="alert">{{ t('home.error') }}</div>
        </Transition>
      </form>
    </div>

    <button
      class="leaderboard-open-button leaderboard-card-trigger"
      type="button"
      @click="store.isLeaderboardOpen = true"
    >
      <span class="lb-trigger-strip">CLICK HERE CLICK HERE CLICK HERE</span>
      <span class="lb-trigger-top">{{ t('leaderboard.top') }}</span>
      <span class="lb-trigger-sub">{{ t('global.winstreak') }}</span>
      <span class="lb-trigger-chevron" aria-hidden="true">⌄</span>
    </button>

    <LeaderboardDrawer />
  </section>
</template>
