<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import { store } from '../store/index.js';
import { translate } from '../i18n/index.js';
import { getConsent, setConsent } from '../analytics/index.js';

const t = (key) => translate(store.locale, key);

// Undecided visitors see the banner; a stored decision keeps it hidden.
const visible = ref(getConsent() === null);

// Reserve layout space while the banner is open so it never covers primary
// actions (e.g. the EndLose YES/NO buttons).
function syncLayout(open) {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('consent-open', open);
}
syncLayout(visible.value);
watch(visible, syncLayout);
onBeforeUnmount(() => syncLayout(false));

function decide(granted) {
  setConsent(granted);
  visible.value = false;
}
</script>

<template>
  <Transition name="consent">
    <aside
      v-if="visible"
      class="consent-banner"
      role="dialog"
      aria-modal="false"
      :aria-label="t('consent.title')"
      data-testid="consent-banner"
    >
      <div class="consent-banner__copy">
        <p class="consent-banner__title">{{ t('consent.title') }}</p>
        <p class="consent-banner__text">{{ t('consent.text') }}</p>
      </div>
      <div class="consent-banner__actions">
        <button
          class="consent-banner__button consent-banner__button--accept"
          type="button"
          data-consent="granted"
          @click="decide(true)"
        >
          {{ t('consent.accept') }}
        </button>
        <button
          class="consent-banner__button consent-banner__button--discard"
          type="button"
          data-consent="denied"
          @click="decide(false)"
        >
          {{ t('consent.discard') }}
        </button>
      </div>
    </aside>
  </Transition>
</template>
