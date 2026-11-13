<script setup>
import { ref } from 'vue';
import { store } from '../store/index.js';
import { translate } from '../i18n/index.js';

const t = (key) => translate(store.locale, key);

const MAILCHIMP_HOST = 'https://merci-michel.us1.list-manage.com/subscribe/post-json';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const email = ref('');
const errorMsg = ref('');
const submitted = ref(false);
const loading = ref(false);

async function onSubmit() {
  if (loading.value) return;
  const val = email.value.trim();
  if (!val) {
    errorMsg.value = t('mailchimp.empty');
    return;
  }
  if (!EMAIL_RE.test(val)) {
    errorMsg.value = t('mailchimp.invalid');
    return;
  }
  errorMsg.value = '';
  loading.value = true;
  try {
    const targetUrl = `${MAILCHIMP_HOST}?u=arena&id=stickers&EMAIL=${encodeURIComponent(val)}`;
    await fetch(targetUrl, { method: 'GET', mode: 'no-cors' });
    submitted.value = true;
  } catch {
    errorMsg.value = t('mailchimp.invalid');
  } finally {
    loading.value = false;
  }
}

function closePopin() {
  store.isNewsletterOpen = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="error">
      <div v-if="store.isNewsletterOpen" class="popin-wrapper" role="dialog" aria-modal="true" :aria-label="t('mailchimp.title')">
        <div class="content" :class="{ 'unvalidate-content': !submitted }">
          <div class="popin-seal" aria-hidden="true">M</div>

          <button class="popin-close" type="button" :aria-label="t('mailchimp.close')" @click="closePopin">
            ✕
          </button>

          <h2 class="popin-title">{{ t('mailchimp.title') }}</h2>
          <p class="popin-sub">{{ t('mailchimp.subtitle') }}</p>

          <!-- 6 original die-cut white-bordered SVG stickers positioned around card -->
          <div class="stickers" aria-hidden="true">
            <svg class="sticker s1" viewBox="0 0 88 44" width="84" height="42">
              <rect x="3" y="3" width="82" height="38" rx="12" fill="#ffffff" />
              <text x="44" y="28" text-anchor="middle" font-family="Yellowtail, cursive" font-size="20" fill="#1b2434">Carpe Diem</text>
            </svg>
            <svg class="sticker s2" viewBox="0 0 64 64" width="60" height="60">
              <polygon points="32,4 40,22 60,24 45,37 49,58 32,48 15,58 19,37 4,24 24,22" fill="#ffffff" />
              <polygon points="32,10 38,24 53,26 42,36 45,51 32,43 19,51 22,36 11,26 26,24" fill="none" stroke="#1b2434" stroke-width="2.5" />
            </svg>
            <svg class="sticker s3" viewBox="0 0 64 64" width="60" height="60">
              <path d="M32 56C16 44 8 34 8 22a13 13 0 0 1 24-7 13 13 0 0 1 24 7c0 12-8 22-24 34z" fill="#ffffff" />
              <path d="M32 49C20 40 13 31 13 22a8.5 8.5 0 0 1 19-4 8.5 8.5 0 0 1 19 4c0 9-7 18-19 27z" fill="none" stroke="#1b2434" stroke-width="2.5" />
            </svg>
            <svg class="sticker s4" viewBox="0 0 56 56" width="54" height="54">
              <rect x="6" y="6" width="44" height="44" rx="10" fill="#ffffff" />
              <rect x="14" y="14" width="28" height="28" rx="4" fill="none" stroke="#1b2434" stroke-width="2.5" />
              <rect x="20" y="20" width="6" height="6" fill="#1b2434" />
              <rect x="30" y="20" width="6" height="6" fill="#1b2434" />
            </svg>
            <svg class="sticker s5" viewBox="0 0 56 56" width="54" height="54">
              <circle cx="28" cy="28" r="24" fill="#ffffff" />
              <circle cx="28" cy="28" r="16" fill="none" stroke="#1b2434" stroke-width="2.5" />
              <circle cx="23" cy="24" r="2" fill="#1b2434" />
              <circle cx="33" cy="24" r="2" fill="#1b2434" />
              <path d="M22 33q6 5 12 0" fill="none" stroke="#1b2434" stroke-width="2.5" stroke-linecap="round" />
            </svg>
            <svg class="sticker s6" viewBox="0 0 72 48" width="68" height="44">
              <rect x="3" y="3" width="66" height="42" rx="14" fill="#ffffff" />
              <path d="M16 32c10-16 26-16 38-8M14 22c14-10 30-10 42-2" fill="none" stroke="#1b2434" stroke-width="4" stroke-linecap="round" />
            </svg>
          </div>

          <form v-if="!submitted" class="popin-form" novalidate @submit.prevent="onSubmit">
            <input
              v-model="email"
              class="popin-input"
              type="email"
              name="EMAIL"
              :placeholder="t('mailchimp.placeholder')"
              aria-label="Email"
              autocomplete="email"
            />
            <button class="popin-submit popin-cta-link" type="submit" :disabled="loading">
              <span class="cta-text">{{ t('mailchimp.cta') }}</span>
            </button>
          </form>

          <p v-if="errorMsg" class="popin-error" role="alert">{{ errorMsg }}</p>
          <p v-if="submitted" class="popin-success" role="status">{{ t('mailchimp.success') }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
