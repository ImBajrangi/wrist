<script setup>
import { computed } from 'vue';
import { store } from '../store/index.js';

/**
 * Shared "Alias + Nickname" name plate (spec.md §5.3/§13.4).
 * Display name grammar: "<alias> <nickname>" split at the first space.
 */
const props = defineProps({
  name: { type: String, default: '' },
  size: { type: String, default: 'medium' }, // small | medium | large
});

const alias = computed(() => {
  const n = props.name || '';
  const i = n.indexOf(' ');
  return i > 0 ? n.slice(0, i) : '—';
});
const nickname = computed(() => {
  const n = props.name || '';
  const i = n.indexOf(' ');
  return i > 0 ? n.slice(i + 1) : n || '—';
});
const fallback = computed(() => !store.user.name);
</script>

<template>
  <div class="name-card" :class="[`name-card--${size}`, { 'name-card--fallback': fallback }]">
    <span class="alias">{{ alias }}</span>
    <span class="nickname">{{ nickname }}</span>
  </div>
</template>
