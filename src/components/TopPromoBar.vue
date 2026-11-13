<script setup>
import { computed } from 'vue';
import { store } from '../store/index.js';
import { translate } from '../i18n/index.js';

const t = (key) => translate(store.locale, key);
const locale = computed(() => store.locale || 'en');
</script>

<template>
  <header class="top-promo-bar">
    <button
      type="button"
      class="marquee marquee-trigger promo-marquee-btn"
      data-open-popin
      :aria-label="t('mailchimp.title')"
      @click="store.isNewsletterOpen = true"
    >
      <span class="promo-flag"><span>{{ t('home.kicker') }}</span></span>
      <span class="promo-track">
        <span>{{ t('home.marquee') }} &nbsp; {{ t('home.marquee') }} &nbsp; {{ t('home.marquee') }}</span>
      </span>
    </button>
    <div class="studio-badge" aria-hidden="true">
      <span class="studio-by">{{ locale === 'fr' ? 'par' : 'by' }}</span>
      <strong class="studio-name">MERCI-MICHEL</strong>
    </div>
  </header>
</template>
