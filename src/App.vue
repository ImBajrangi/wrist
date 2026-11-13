<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { store } from './store/index.js';
import { createStage } from './three/Stage.js';
import { stage as stageHolder } from './three/stage-instance.js';
import Preloader from './components/Preloader.vue';
import SoundButton from './components/SoundButton.vue';
import NewsletterPopin from './components/NewsletterPopin.vue';
import ConsentBanner from './components/ConsentBanner.vue';

const route = useRoute();
const showMiniCrest = computed(() => {
  const n = String(route.name || '');
  return n.startsWith('Lobby') || n.startsWith('Intro');
});

const vignetteClass = computed(() => {
  const n = String(route.name || '');
  if (n.startsWith('EndWin')) return 'vignette-overlay--win';
  if (n.startsWith('EndLose')) return 'vignette-overlay--lose';
  return 'vignette-overlay--default';
});

const glHost = ref(null);
let stage = null;

onMounted(() => {
  stage = createStage(glHost.value, {
    onReady: () => {
      store.stageReady = true;
    },
  });
  stageHolder.current = stage;

  if (window.__APP__) {
    window.__APP__.getQuality = stage.getQuality;
    window.__APP__.setQuality = stage.setQuality;
    window.__APP__.getPixelRatio = stage.getPixelRatio;
    window.__APP__.shake = stage.shake;
    window.__APP__.isShaking = stage.isShaking;
    // Live getter so a mid-session OS preference change is observable.
    Object.defineProperty(window.__APP__, 'reducedMotion', {
      configurable: true,
      get: () => stage?.isReducedMotion?.() === true,
    });
  }
});

onBeforeUnmount(() => {
  stage?.dispose();
});

watch(
  () => store.bootReady,
  (ready) => {
    if (ready) window.__APP__?.onBootReady?.();
  },
);
</script>

<template>
  <div ref="glHost" class="webgl-wrapper"></div>
  <div class="vignette-overlay" :class="vignetteClass" aria-hidden="true"></div>
  <Transition name="preloader-fade">
    <Preloader v-if="!store.bootReady" />
  </Transition>

  <div v-if="showMiniCrest" class="mini-crest" aria-hidden="true">
    <span class="mini-crest__stars">★★ <i>NO</i> ★★</span>
    <span class="mini-crest__mercy">MERCY</span>
    <span class="mini-crest__script">Michel</span>
  </div>

  <router-view />
  <SoundButton />
  <NewsletterPopin />
  <ConsentBanner />
  <div class="ui" aria-hidden="true"></div>
</template>
