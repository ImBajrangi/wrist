<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { store } from '../store/index.js';
import { translate, getDictionary, defaultLocale } from '../i18n/index.js';
import { sanitizeNickname, isValidNickname, buildDisplayName, pick } from '../identity/name.js';

const router = useRouter();
const route = useRoute();
const locale = computed(() => route.meta?.locale || defaultLocale);
const t = (key) => translate(locale.value, key);

const nickname = ref('');
const hasError = ref(false);
let submitLock = false;

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
    return;
  }
  submitLock = true;
  const aliases = getDictionary(locale.value).aliases;
  store.user.name = buildDisplayName(pick(aliases), nickname.value);
  router.push(`/${locale.value}/lobby`);
}
</script>

<template>
  <section class="page page-login">
    <h1 class="login-title">{{ t('home.headlineTop') }}</h1>
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
          @input="onInput"
        />
        <button class="cta cta-circle" type="submit">
          <span class="cta-text">{{ t('home.cta') }}</span>
        </button>
      </div>
      <Transition name="error">
        <div v-if="hasError" class="error-text" role="alert">{{ t('home.error') }}</div>
      </Transition>
    </form>
  </section>
</template>
