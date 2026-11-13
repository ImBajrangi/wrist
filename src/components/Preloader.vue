<script setup>
import { computed, onMounted } from 'vue';
import { store } from '../store/index.js';
import { translate } from '../i18n/index.js';

const text = computed(() => translate(store.locale, 'preloader.text'));
const enterLabel = computed(() => translate(store.locale, 'preloader.enter'));
const arenaLabel = computed(() => translate(store.locale, 'preloader.arena'));

function enterArena() {
  try {
    sessionStorage.setItem('nmm_entered', '1');
  } catch {
    /* storage may be unavailable in private mode */
  }
  store.bootReady = true;
}

onMounted(() => {
  let alreadyEntered = false;
  try {
    alreadyEntered = sessionStorage.getItem('nmm_entered') === '1';
  } catch {
    alreadyEntered = false;
  }
  if (alreadyEntered) store.bootReady = true;
});
</script>

<template>
  <div class="preloader" role="dialog" aria-modal="true" :aria-label="arenaLabel">
    <p class="preloader-text">{{ text }}</p>
    <div class="preloader-bar" aria-hidden="true"><i></i></div>
    <button class="preloader-button" type="button" @click="enterArena">
      <span class="preloader-enter">{{ enterLabel }}</span>
      <span class="preloader-arena">{{ arenaLabel }}</span>
    </button>
  </div>
</template>
