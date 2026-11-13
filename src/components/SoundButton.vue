<script setup>
import { computed } from 'vue';
import { store } from '../store/index.js';
import { translate } from '../i18n/index.js';
import { toggleMute } from '../audio/index.js';

const label = computed(() =>
  translate(store.locale, store.audioMuted ? 'global.soundOff' : 'global.soundOn'),
);
function toggle() {
  toggleMute();
}
</script>

<template>
  <button class="sound-btn" type="button" :aria-label="label" @click="toggle">
    <figure class="sound-btn__icon" :class="{ muted: store.audioMuted }">
      <svg viewBox="0 0 28 24" width="22" height="20" fill="none" aria-hidden="true">
        <path
          d="M3 8.5h4.5l6.5-4.5v16l-6.5-4.5H3V8.5z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-dasharray="3.2 2"
          stroke-linejoin="round"
        />
        <path
          class="wave"
          d="M17.5 8.2c1.8 1.8 1.8 5.6 0 7.6M21 5.8c3.2 3.4 3.2 9 0 12.4"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-dasharray="2.2 2"
          stroke-linecap="round"
        />
        <path
          class="slash"
          d="M4 2L24 22"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
        />
      </svg>
    </figure>
  </button>
</template>
