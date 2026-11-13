<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { store } from '../store/index.js';
import { translate } from '../i18n/index.js';
import { createInputController } from '../game/input.js';
import { GAME_STATE } from '../game/engine.js';
import {
  engine,
  getBotSimulation,
  handleLocalGameplayClick,
  isBotMatch,
  isMatchHost,
  remoteCursor,
} from '../game/match.js';
import PlayerNameCard from '../components/PlayerNameCard.vue';

const t = (key) => translate(store.locale, key);

const cursor = reactive({ x: 0, y: 0, visible: false, pressed: false });
const splashCanvas = ref(null);
const particles = [];
const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window && navigator.maxTouchPoints > 0;

function spawnSplash(x, y) {
  const cx = Number.isFinite(x) && x > 0 ? x : (window.innerWidth || 800) * 0.5;
  const cy = Number.isFinite(y) && y > 0 ? y : (window.innerHeight || 600) * 0.52;
  particles.push({ kind: 'ring', x: cx, y: cy, r: 10, alpha: 0.9, maxR: 54 });
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const speed = 2.6 + Math.random() * 4.2;
    particles.push({
      kind: 'spark',
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 3.5,
      alpha: 1,
      color: i % 2 === 0 ? '#ffd26b' : '#ffffff',
    });
  }
}

const inputCtrl = createInputController({
  onPress: () => {
    spawnSplash(cursor.x, cursor.y);
    handleLocalGameplayClick(inputCtrl.getCps());
  },
  onPointerMove: (x, y) => {
    if (isTouch) return;
    cursor.x = x;
    cursor.y = y;
    cursor.visible = true;
  },
  onPointerState: (down) => {
    cursor.pressed = down;
  },
});

const scoreBarRatio = computed(() => {
  const diff = (store.game.players.me.score || 0) - (store.game.players.opponent.score || 0);
  const clamped = Math.max(-40, Math.min(40, diff));
  return 50 + (clamped / 40) * 50;
});

const needleDeg = computed(() => {
  return ((scoreBarRatio.value - 50) / 50) * 72;
});

const activeTaunt = computed(() => {
  const diff = (store.game.players.me.score || 0) - (store.game.players.opponent.score || 0);
  if (store.game.state.current !== GAME_STATE.ACTIVE) {
    return t('game.taunt')[0];
  }
  if (diff >= 10) return t('game.cheers')[0];
  if (diff <= -10) return t('game.boos')[1] || t('game.boos')[0];
  return t('game.taunt')[1] || t('game.taunt')[0];
});

let rafId = 0;
let lastFrameMs = 0;

function renderSplash() {
  const canvas = splashCanvas.value;
  if (!canvas) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    if (p.kind === 'ring') {
      p.r += (p.maxR - p.r) * 0.22;
      p.alpha *= 0.84;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 210, 107, ${p.alpha.toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.alpha *= 0.86;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (p.alpha < 0.04) particles.splice(i, 1);
  }
}

function tick(nowMs) {
  const dt = lastFrameMs ? Math.min(nowMs - lastFrameMs, 100) : 16;
  lastFrameMs = nowMs;

  if (store.game.state.current === GAME_STATE.ACTIVE) {
    store.game.players.me.cps = inputCtrl.getCps();
    if (isBotMatch() && !engine.isBotClicksDisabled()) {
      const botSim = getBotSimulation();
      botSim?.step(dt, Date.now());
      if (botSim) store.game.players.opponent.cps = botSim.getCps(Date.now());
    }
  }
  renderSplash();
  rafId = requestAnimationFrame(tick);
}

const stopStateWatch = watch(
  () => store.game.state.current,
  (cur) => {
    const active = cur === GAME_STATE.ACTIVE;
    inputCtrl.setEnabled(active);
    const botSim = getBotSimulation();
    if (active) {
      botSim?.start();
    } else {
      botSim?.stop();
    }
  },
  { immediate: true },
);

const stopScoreWatch = watch(
  () => [store.game.players.me.score, store.game.players.opponent.score],
  () => {
    if (isMatchHost() && store.game.state.current === GAME_STATE.ACTIVE) {
      engine.resolveRoundIfNeeded();
    }
  },
);

onMounted(() => {
  inputCtrl.attach();
  rafId = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  stopStateWatch();
  stopScoreWatch();
  inputCtrl.detach();
});

onBeforeRouteLeave((to) => {
  if (!to.path.includes('/end-')) {
    engine.stop();
  }
});
</script>

<template>
  <section class="page page-game" :class="{ 'has-cursor': cursor.visible && !isTouch }">
    <canvas ref="splashCanvas" class="vfx-splash" aria-hidden="true"></canvas>
    <div class="scoreboard">
      <div class="player-score left" aria-live="polite">
        <PlayerNameCard :name="store.game.players.me.name || store.user.name || t('global.you')" size="small" />
        <span class="cps-container">
          <span class="cps-value">{{ Number(store.game.players.me.cps || 0).toFixed(2) }}</span>
          <small class="cps-label">CLICKS PER SECOND</small>
        </span>
        <span class="dots round-pill round-pill--left">
          <i class="dot" :class="{ 'is-win': store.game.players.me.roundWon > 0 }"></i>
          <i class="dot" :class="{ 'is-win': store.game.players.me.roundWon > 1 }"></i>
        </span>
      </div>

      <div class="player-score right" aria-live="polite">
        <PlayerNameCard :name="store.game.players.opponent.name || 'Michel'" size="small" />
        <span class="cps-container">
          <span class="cps-value">{{ Number(store.game.players.opponent.cps || 0).toFixed(2) }}</span>
          <small class="cps-label">CLICKS PER SECOND</small>
        </span>
        <span class="dots round-pill round-pill--right">
          <i class="dot" :class="{ 'is-win': store.game.players.opponent.roundWon > 0 }"></i>
          <i class="dot" :class="{ 'is-win': store.game.players.opponent.roundWon > 1 }"></i>
        </span>
      </div>
    </div>

    <div class="round" aria-live="polite">{{ t('game.round') }} {{ store.game.state.round }}</div>

    <div class="countdown" aria-hidden="true">
      <span class="number ready" :class="{ visible: store.game.state.countdown === 1 }">{{ t('game.ready') }}</span>
      <span class="number fight" :class="{ visible: store.game.state.countdown === 0 }">{{ t('game.fight') }}</span>
    </div>

    <p v-if="store.game.state.countdown >= 0" class="tuto-text" aria-hidden="true">
      {{ store.locale === 'fr' ? 'CLIQUE OU APPUIE SUR ESPACE VITE !' : 'CLICK OR PRESS SPACE FAST!' }}
    </p>
    <p class="taunt taunt--game">{{ activeTaunt }}</p>

    <!-- Semicircular Bottom Arcade Tension Gauge (with testable score-tug__track/fill) -->
    <div class="gauge-dock" aria-hidden="true">
      <div class="gauge-dial">
        <svg viewBox="0 0 180 100" class="gauge-svg">
          <circle cx="90" cy="92" r="76" fill="#e6ecf5" stroke="#ffffff" stroke-width="4" />
          <path d="M 28 84 A 62 62 0 0 1 152 84" fill="none" stroke="#c8d4e3" stroke-width="14" stroke-linecap="round" />
          <path d="M 90 22 A 62 62 0 0 1 152 84" fill="none" stroke="#d93b3b" stroke-width="10" stroke-linecap="round" />
          <g :style="{ transform: `rotate(${needleDeg}deg)`, transformOrigin: '90px 92px', transition: 'transform 90ms linear' }">
            <polygon points="84,92 90,26 96,92" fill="#f89953" />
            <circle cx="90" cy="92" r="10" fill="#f89953" />
          </g>
        </svg>
      </div>
      <div class="score-tug__track">
        <div class="score-tug__fill" :style="{ width: `${scoreBarRatio}%` }"></div>
      </div>
    </div>

    <!-- Original SVG Pointer Finger Cursor -->
    <div
      v-if="cursor.visible && !isTouch"
      class="game-cursor"
      :class="{ pressed: cursor.pressed }"
      :style="{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)` }"
      aria-hidden="true"
    >
      <svg viewBox="0 0 42 52" width="38" height="46">
        <path
          d="M17 4c2.8 0 5 2.2 5 5v11h2.5c2 0 3.7 1.6 3.7 3.6v1.2h2c1.9 0 3.5 1.5 3.5 3.4v8.2c0 6.5-5.2 11.6-12.1 11.6h-3.8c-5.4 0-9.6-3.7-11.2-8.7L3.8 31c-.7-2.1.6-4.4 2.7-5 2-.6 4.2.5 5 2.5L12 30V9c0-2.8 2.2-5 5-5z"
          fill="#ffffff"
          stroke="#f89953"
          stroke-width="3"
        />
      </svg>
    </div>

    <div
      v-if="remoteCursor.visible"
      class="remote-cursor"
      :class="{ pressed: remoteCursor.pressed }"
      aria-hidden="true"
    ></div>
  </section>
</template>
