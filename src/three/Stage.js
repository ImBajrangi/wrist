import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { store } from '../store/index.js';
import {
  createQualityController,
  capFor,
  loadSavedQuality,
  saveQuality,
  MIN_QUALITY,
  MAX_QUALITY,
} from './quality.js';
import {
  createArenaBackdrop,
  createBoxingRing,
  createLogoPlaque,
  createSculptedArm,
  evaluateClaspCurve,
} from './arena.js';

/**
 * Reverse-Engineered Three.js Route Camera Transform Tables (from site-js/main.pretty.js):
 * - ca (home), ga (lobby), pa (intro), oa (game), Ta (win), _a (lose)
 * - Calibrated to procedural clean-room arena coordinates while preserving exact FOV curves,
 *   unit quaternion slerping, and responsive desktopInfluence blending:
 *   aspectRatio = w / h; clamp((aspectRatio - 0.55) / (1.2 - 0.55), 0, 1)
 */
const _lookMat = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
function camPose(pos, target, fov = 55) {
  const position = new THREE.Vector3(...pos);
  _lookMat.lookAt(position, new THREE.Vector3(...target), _up);
  return {
    position,
    quaternion: new THREE.Quaternion().setFromRotationMatrix(_lookMat),
    fov,
  };
}

const ROUTE_CAMERAS = {
  home: {
    from: camPose([0, 0.40, 3.85], [0, 0.78, 0], 56),
    toMobile: camPose([0, 0.36, 4.15], [0, 0.76, 0], 70),
    toDesktop: camPose([0, 0.36, 3.32], [0, 0.76, 0], 54),
    duration: 1600,
  },
  lobby: {
    from: camPose([0, 0.48, 3.65], [0, 0.56, 0], 56),
    toMobile: camPose([0, 0.48, 3.95], [0, 0.56, 0], 70),
    toDesktop: camPose([0, 0.48, 3.35], [0, 0.56, 0], 55),
    duration: 1600,
  },
  intro: {
    from: camPose([0, 0.44, 3.75], [0, 0.62, 0], 56),
    toMobile: camPose([0, 0.42, 3.95], [0, 0.62, 0], 70),
    toDesktop: camPose([0, 0.42, 3.35], [0, 0.62, 0], 55),
    duration: 1200,
  },
  game: {
    from: camPose([-0.22, 2.25, 2.95], [0, 0.52, 0], 56),
    toMobile: camPose([0, 2.35, 3.55], [0, 0.52, 0], 70),
    toDesktop: camPose([-0.18, 2.25, 2.75], [0, 0.52, 0], 55),
    toLeft: camPose([-0.92, 2.10, 2.35], [0, 0.52, 0], 53),
    toRight: camPose([1.06, 2.10, 2.35], [0, 0.52, 0], 53),
    duration: 1400,
  },
  'end-win': {
    from: camPose([0.08, 0.56, 3.55], [0, 0.50, 0], 56),
    toMobile: camPose([0.06, 0.54, 3.75], [0, 0.50, 0], 70),
    toDesktop: camPose([0.06, 0.54, 3.10], [0, 0.50, 0], 55.2),
    duration: 1600,
  },
  'end-lose': {
    from: camPose([-0.25, 0.95, 3.15], [0, 0.18, 0], 62),
    toMobile: camPose([-0.55, 1.48, 3.05], [0, 0.16, 0], 70.2),
    toDesktop: camPose([-0.72, 1.42, 2.50], [0, 0.16, 0], 55.2),
    duration: 2000,
  },
};

const ROUTE_MOODS = {
  home: {
    bg: 0x073a72,
    topBg: 0x6bcdf7,
    botBg: 0x062b56,
    floorColor: 0x357fbe,
    rimColor: 0x58b8ff,
    keyColor: 0xfff4e6,
    keyIntensity: 1.60,
    spotColor: 0x8edfff,
    spotIntensity: 30,
    showLogo: true,
    showOpponent: true,
    showRing: true,
  },
  lobby: {
    bg: 0x062854,
    topBg: 0x62ccff,
    botBg: 0x062854,
    floorColor: 0x3a84cc,
    rimColor: 0x4fb4ff,
    keyColor: 0xf0f8ff,
    keyIntensity: 2.15,
    spotColor: 0x7dd2ff,
    spotIntensity: 36,
    showLogo: false,
    showOpponent: false,
    showRing: true,
  },
  intro: {
    bg: 0x08346b,
    topBg: 0x72d4ff,
    botBg: 0x08346b,
    floorColor: 0x3a84cc,
    rimColor: 0x58b8ff,
    keyColor: 0xffffff,
    keyIntensity: 2.25,
    spotColor: 0x86d6ff,
    spotIntensity: 40,
    showLogo: false,
    showOpponent: true,
    showRing: true,
  },
  game: {
    bg: 0x04152b,
    topBg: 0x1e5c9e,
    botBg: 0x030e1c,
    floorColor: 0x3275b8,
    rimColor: 0x4db3ff,
    keyColor: 0xfff8f0,
    keyIntensity: 2.35,
    spotColor: 0x4caeff,
    spotIntensity: 38,
    showLogo: false,
    showOpponent: true,
    showRing: true,
  },
  'end-win': {
    bg: 0x3a2405,
    topBg: 0x8a5a12,
    botBg: 0x1c1002,
    floorColor: 0x5e3a0c,
    rimColor: 0x9fc26a,
    keyColor: 0xffe6b0,
    keyIntensity: 1.05,
    spotColor: 0xffc14d,
    spotIntensity: 22,
    ringPost: 0x241505,
    ringPad: 0x5a3a10,
    ringRope: 0x120b02,
    ringTowel: 0x6a5530,
    showLogo: false,
    showOpponent: false,
    showRing: true,
  },
  'end-lose': {
    bg: 0x1e0204,
    topBg: 0x4e060c,
    botBg: 0x140102,
    floorColor: 0x5c0a12,
    rimColor: 0xe62030,
    keyColor: 0xff9a9a,
    keyIntensity: 1.45,
    spotColor: 0xe61c2c,
    spotIntensity: 52,
    showLogo: false,
    showOpponent: false,
    showRing: true,
  },
};

/** Simplex 2D noise generator (spec Os in main.pretty.js) */
const SIMPLEX_GRADIENTS = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [1, 0], [-1, 0],
  [0, 1], [0, -1], [0, 1], [0, -1],
];
const S2_G = (3 - Math.sqrt(3)) / 6;

function createSimplex2D() {
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = perm[i];
    perm[i] = perm[j];
    perm[j] = temp;
  }
  const permTable = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    permTable[i] = perm[i & 255];
    permMod12[i] = permTable[i] % 12;
  }
  return function (x, y) {
    const s = 0.5 * (x + y) * (Math.sqrt(3) - 1);
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * S2_G;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + S2_G;
    const y1 = y0 - j1 + S2_G;
    const x2 = x0 - 1.0 + 2.0 * S2_G;
    const y2 = y0 - 1.0 + 2.0 * S2_G;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = permMod12[ii + permTable[jj]];
    const gi1 = permMod12[ii + i1 + permTable[jj + j1]];
    const gi2 = permMod12[ii + 1 + permTable[jj + 1]];
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let n0 = 0;
    if (t0 > 0) {
      t0 *= t0;
      n0 = t0 * t0 * (SIMPLEX_GRADIENTS[gi0][0] * x0 + SIMPLEX_GRADIENTS[gi0][1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    let n1 = 0;
    if (t1 > 0) {
      t1 *= t1;
      n1 = t1 * t1 * (SIMPLEX_GRADIENTS[gi1][0] * x1 + SIMPLEX_GRADIENTS[gi1][1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    let n2 = 0;
    if (t2 > 0) {
      t2 *= t2;
      n2 = t2 * t2 * (SIMPLEX_GRADIENTS[gi2][0] * x2 + SIMPLEX_GRADIENTS[gi2][1] * y2);
    }
    return 70.1480577 * (n0 + n1 + n2);
  };
}

function inOutExpo(t) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  if ((t *= 2) < 1) return 0.5 * Math.pow(1024, t - 1);
  return 0.5 * (-Math.pow(2, -10 * (t - 1)) + 2);
}

function detectRouteMode() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/en/';
  if (path.includes('/lobby')) return 'lobby';
  if (path.includes('/intro')) return 'intro';
  if (path.includes('/game')) return 'game';
  if (path.includes('/end-win')) return 'end-win';
  if (path.includes('/end-lose')) return 'end-lose';
  return 'home';
}

export function createStage(host, { onReady = () => {} } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
  } catch (err) {
    console.warn('WebGL unavailable, booting without 3D stage:', err?.message);
    onReady();
    return {
      dispose: () => {},
      markReady: onReady,
      isReducedMotion: () =>
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches === true,
      isShaking: () => false,
      shake: () => {},
    };
  }

  const canvas = renderer.domElement;
  canvas.setAttribute('data-engine', `three.js r${THREE.REVISION}`);
  canvas.className = 'stage-canvas';
  host.appendChild(canvas);

  const initialMode = detectRouteMode();
  const bootMood = ROUTE_MOODS[initialMode] || ROUTE_MOODS.home;
  const initialCam = ROUTE_CAMERAS[initialMode] || ROUTE_CAMERAS.home;

  const scene = new THREE.Scene();
  const bgColor = new THREE.Color(bootMood.bg);
  scene.background = bgColor;
  scene.fog = new THREE.FogExp2(bgColor.getHex(), 0.085);

  const initialAspect = (host.clientWidth || window.innerWidth) / Math.max(1, host.clientHeight || window.innerHeight);
  const initialDesktopInfluence = Math.max(0, Math.min(1, (initialAspect - 0.55) / (1.2 - 0.55)));
  const initialFov = THREE.MathUtils.lerp(initialCam.toMobile.fov, initialCam.toDesktop.fov, initialDesktopInfluence);

  const camera = new THREE.PerspectiveCamera(initialFov, initialAspect, 0.1, 60);
  camera.position.lerpVectors(initialCam.toMobile.position, initialCam.toDesktop.position, initialDesktopInfluence);
  camera.quaternion.slerpQuaternions(initialCam.toMobile.quaternion, initialCam.toDesktop.quaternion, initialDesktopInfluence);

  // Arena Lighting Rig
  const ambient = new THREE.AmbientLight(0x5a82b8, 1.05);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xeef6ff, 2.35);
  keyLight.position.set(1.5, 5.5, 4.0);
  scene.add(keyLight);

  const arenaSpot = new THREE.PointLight(0x889bff, 42, 22);
  arenaSpot.position.set(0, 3.8, -1.5);
  scene.add(arenaSpot);

  const rimLeft = new THREE.PointLight(0xff924c, 18, 16);
  rimLeft.position.set(-4.0, 2.0, 2.5);
  scene.add(rimLeft);

  const rimRight = new THREE.PointLight(0x47b5ff, 22, 16);
  rimRight.position.set(4.0, 2.0, 2.5);
  scene.add(rimRight);

  // Procedural IBL reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTexture = pmrem.fromScene(roomEnv, 0.04).texture;
  scene.environment = envTexture;
  roomEnv.dispose();
  pmrem.dispose();

  const backdrop = createArenaBackdrop();
  backdrop.skyUniforms.uTopColor.value.setHex(bootMood.topBg);
  backdrop.skyUniforms.uBottomColor.value.setHex(bootMood.botBg);
  scene.add(backdrop.group);

  const ring = createBoxingRing();
  ring.floorMat.color.setHex(bootMood.floorColor);
  scene.add(ring.group);

  const logoPlaque = createLogoPlaque();
  scene.add(logoPlaque);

  // Continuous spline-lofted anatomical arms: wide crossed clasp on Home,
  // plus a dedicated pale flexed arm for the EndWin spotlight.
  const armLeft = createSculptedArm({
    mirror: false,
    skinHex: 0x4f1f12,
    envMapIntensity: 0.70,
    tattoos: ['NoRegrets', 'RIP', 'Star'],
    showBandana: true,
    showChain: true,
    showBandaid: true,
  });
  const armRight = createSculptedArm({
    mirror: true,
    skinHex: 0xdf8f63,
    envMapIntensity: 0.40,
    tattoos: ['Tired', 'Anchor', 'Crossed'],
  });
  const armWin = createSculptedArm({
    mirror: true,
    pose: 'flex',
    skinHex: 0xd8b48c,
    envMapIntensity: 0.28,
    tattoos: [],
    showRing: true,
  });

  armLeft.root.position.set(-0.01, 0.02, 0.05);
  armRight.root.position.set(0.01, 0.02, -0.05);
  armWin.root.position.set(-0.02, 0.02, 0.06);
  armWin.root.visible = false;
  scene.add(armLeft.root, armRight.root, armWin.root);

  function applyPixelRatio() {
    const cap = capFor(quality.index);
    const pr = Math.min(cap, window.devicePixelRatio || 1);
    renderer.setPixelRatio(pr);
    backdrop.bokehMat.uniforms.uPixelRatio.value = pr;
  }

  function resize() {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  const quality = createQualityController({
    initial: loadSavedQuality() ?? 3,
    onChange: () => applyPixelRatio(),
  });
  applyPixelRatio();
  resize();
  window.addEventListener('resize', resize);

  // Pointer tracking parallax state
  let normPointerX = 0;
  let normPointerY = 0;
  function onPointerMove(e) {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    normPointerX = (e.clientX / w) * 2 - 1;
    normPointerY = (e.clientY / h) * 2 - 1;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Reduced motion (spec.md §16.1, F-P3.8): no camera shake or pointer drift.
  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  let reducedMotion = motionQuery?.matches === true;

  const parallaxState = {
    mouseX: 0,
    mouseY: 0,
    ang: 0,
  };

  // Harmonic Simplex Noise Camera Shake (spec Os in main.pretty.js)
  const simplex2D = createSimplex2D();
  const shakeState = {
    shaking: false,
    maxDuration: 0,
    maxAmplitude: 0,
    currentDuration: 0,
    currentAmplitude: 0,
    freqMult: 1,
    value: [0, 0],
    pos: [0, 0],
    speed: [0.006, 0.0001],
    vertical: false,
  };

  function triggerShake(duration = 500, power = 0.1, vertical = false, freqMult = 1) {
    if (reducedMotion) return;
    const amp = power * 1.07;
    shakeState.vertical = vertical;
    if (!shakeState.shaking || duration > shakeState.maxDuration) {
      shakeState.maxDuration = duration;
      shakeState.currentDuration = duration;
    }
    if (!shakeState.shaking || amp > shakeState.maxAmplitude) {
      shakeState.maxAmplitude = amp;
      shakeState.currentAmplitude = amp;
      shakeState.freqMult = freqMult;
    }
    shakeState.shaking = true;
    shakeState.pos[0] = 200 * Math.PI;
    shakeState.pos[1] = 500 * Math.random();
  }

  function shake(power = 1, duration = 500, vertical = false) {
    triggerShake(duration, Math.min(1.5, power * 0.1), vertical);
  }

  function onMotionPreferenceChange(event) {
    reducedMotion = event.matches === true;
    if (reducedMotion) shakeState.shaking = false;
  }
  motionQuery?.addEventListener?.('change', onMotionPreferenceChange);

  const clock = new THREE.Clock();
  let readySent = false;
  let currentMode = initialMode;
  let easedProgress = 0;
  let easedLead = 0;
  let lastCosmeticsSig = '';

  // Camera transition state
  let transitionActive = false;
  let transitionStartTime = 0;
  let transitionDuration = 1.4;
  const transitionStartPos = camera.position.clone();
  const transitionStartQuat = camera.quaternion.clone();
  let transitionStartFov = camera.fov;

  const targetCamPos = camera.position.clone();
  const targetCamQuat = camera.quaternion.clone();

  renderer.setAnimationLoop(() => {
    const dtMs = Math.min(clock.getDelta() * 1000, 250);
    const dtSec = dtMs * 0.001;
    const t = clock.elapsedTime;
    const modeName = detectRouteMode();
    const mood = ROUTE_MOODS[modeName] || ROUTE_MOODS.home;
    const camConfig = ROUTE_CAMERAS[modeName] || ROUTE_CAMERAS.home;

    quality.sample(dtMs);
    backdrop.update(t);

    // Dynamic desktopInfluence from current aspect ratio
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    const desktopInfluence = Math.max(0, Math.min(1, (aspect - 0.55) / (1.2 - 0.55)));

    // Route change detection & transition start
    if (modeName !== currentMode) {
      currentMode = modeName;
      transitionActive = true;
      transitionStartTime = t;
      transitionDuration = (camConfig.duration || 1400) / 1000;
      transitionStartPos.copy(camera.position);
      transitionStartQuat.copy(camera.quaternion);
      transitionStartFov = camera.fov;
    }

    // Sync scene mood lighting & materials
    const blend = Math.min(1, Math.max(0.08, dtMs * 0.009));
    bgColor.lerp(new THREE.Color(mood.bg), blend);
    scene.fog.color.copy(bgColor);
    backdrop.skyUniforms.uTopColor.value.lerp(new THREE.Color(mood.topBg), blend);
    backdrop.skyUniforms.uBottomColor.value.lerp(new THREE.Color(mood.botBg), blend);
    backdrop.beamUniforms.uColor.value.lerp(new THREE.Color(mood.spotColor), blend);
    backdrop.bokehMat.uniforms.uColor.value.lerp(new THREE.Color(mood.spotColor), blend);
    ring.floorMat.color.lerp(new THREE.Color(mood.floorColor), blend);
    ring.postMat.color.lerp(new THREE.Color(mood.ringPost ?? 0x102d54), blend);
    ring.padMat.color.lerp(new THREE.Color(mood.ringPad ?? 0x2466ad), blend);
    ring.ropeMat.color.lerp(new THREE.Color(mood.ringRope ?? 0x07101e), blend);
    ring.towelMat.color.lerp(new THREE.Color(mood.ringTowel ?? 0x7b8ea8), blend);
    armLeft.rimUniform.value.lerp(new THREE.Color(mood.rimColor), blend);
    armRight.rimUniform.value.lerp(new THREE.Color(mood.rimColor), blend);
    armWin.rimUniform.value.lerp(new THREE.Color(mood.rimColor), blend);

    const activeEffort =
      modeName === 'game' && store.game.state.current === 3
        ? Math.min(1, ((store.game.players.me.cps || 0) + (store.game.players.opponent.cps || 0)) / 12 + 0.25)
        : 0;
    armLeft.update(t, activeEffort);
    armRight.update(t, activeEffort);
    armWin.update(t, 0);

    keyLight.color.lerp(new THREE.Color(mood.keyColor), blend);
    keyLight.intensity += (mood.keyIntensity - keyLight.intensity) * blend;
    arenaSpot.color.lerp(new THREE.Color(mood.spotColor), blend);
    arenaSpot.intensity += (mood.spotIntensity - arenaSpot.intensity) * blend;

    logoPlaque.visible = mood.showLogo;
    armLeft.root.visible = modeName !== 'end-win';
    armRight.root.visible = modeName !== 'end-win' && mood.showOpponent;
    armWin.root.visible = modeName === 'end-win';
    ring.group.visible = mood.showRing;

    if (logoPlaque.visible) {
      const logoY = THREE.MathUtils.lerp(1.54, 1.60, desktopInfluence);
      const logoScale = THREE.MathUtils.lerp(1.04, 1.14, desktopInfluence);
      logoPlaque.position.set(0, logoY + Math.sin(t * 1.4) * 0.012, -0.78);
      // Slight x compression matches the original plaque proportions without
      // flattening the gold lettering.
      logoPlaque.scale.set(logoScale * 0.95, logoScale, logoScale);
      logoPlaque.rotation.y = Math.sin(t * 0.5) * 0.025;
    }

    if (modeName !== 'home') {
      const sig = `${(store.arm.accessories || []).join(',')}|${(store.arm.tatoos || []).join(',')}`;
      if (sig !== lastCosmeticsSig) {
        lastCosmeticsSig = sig;
        armLeft.applyCosmetics({
          accessories: store.arm.accessories || [],
          tattoosList: store.arm.tatoos || [],
        });
      }
    }

    // Arm Clasp Physics & Piecewise Wi Curve
    const diff = (store.game.players.me.score || 0) - (store.game.players.opponent.score || 0);
    const targetProgress = Math.max(-1, Math.min(1, diff / 40));
    easedProgress += (targetProgress - easedProgress) * 0.12;

    const normProgress = Math.max(0, Math.min(1, (easedProgress + 1) * 0.5));
    const claspCurveVal = evaluateClaspCurve(normProgress);

    const clickMult = store.game.state.clickPoints || 1;
    const tension = store.game.state.current === 3 ? 0.016 * clickMult : 0;
    const tremble = tension > 0 ? Math.sin(t * 42) * tension : 0;

    if (modeName === 'lobby') {
      armLeft.root.position.set(0.45, 0.06 + Math.sin(t * 2.1) * 0.02, 0);
      armLeft.pivot.rotation.set(0, 0.24 + Math.sin(t * 0.8) * 0.07, Math.sin(t * 1.7) * 0.05);
    } else if (modeName === 'end-win') {
      armWin.root.position.set(-0.02, 0.02 + Math.sin(t * 1.7) * 0.01, 0.06);
      armWin.pivot.rotation.set(0.02, -0.04 + Math.sin(t * 1.3) * 0.015, 0.02 + Math.sin(t * 1.5) * 0.018);
    } else if (modeName === 'end-lose') {
      armLeft.root.position.set(0.32, -0.10, 0.06);
      armLeft.pivot.rotation.set(0.18, -0.15, -1.04);
    } else {
      const leanAngle = -easedProgress * 0.62 + tremble;
      const lateralSway = 0.02 * -claspCurveVal;
      armLeft.root.position.set(-0.01 + lateralSway, 0.02 + Math.sin(t * 1.6) * 0.015, 0.05);
      armRight.root.position.set(0.01 + lateralSway, 0.02 + Math.sin(t * 1.6 + 0.5) * 0.015, -0.05);
      armLeft.pivot.rotation.set(0, 0, leanAngle);
      armRight.pivot.rotation.set(0, 0, leanAngle);
    }

    // Resolve base camera transform for route with desktopInfluence
    targetCamPos.lerpVectors(camConfig.toMobile.position, camConfig.toDesktop.position, desktopInfluence);
    targetCamQuat.slerpQuaternions(camConfig.toMobile.quaternion, camConfig.toDesktop.quaternion, desktopInfluence);
    let targetFov = THREE.MathUtils.lerp(camConfig.toMobile.fov, camConfig.toDesktop.fov, desktopInfluence);

    // Dynamic Game Match Orbit (toLeft <-> toRight)
    if (modeName === 'game') {
      easedLead += (targetProgress - easedLead) * 0.08;
      const oppLead = -1 * Math.min(easedLead, 0);
      const playerLead = Math.max(easedLead, 0);
      if (oppLead > 0) {
        targetCamPos.lerp(camConfig.toRight.position, oppLead);
        targetCamQuat.slerp(camConfig.toRight.quaternion, oppLead);
      } else if (playerLead > 0) {
        targetCamPos.lerp(camConfig.toLeft.position, playerLead);
        targetCamQuat.slerp(camConfig.toLeft.quaternion, playerLead);
      }
      targetFov -= Math.abs(easedLead) * 3.5;
    }

    // Camera slerp / lerp interpolation
    if (transitionActive) {
      const elapsed = t - transitionStartTime;
      const p = Math.min(1, elapsed / Math.max(0.01, transitionDuration));
      const ease = inOutExpo(p);
      camera.position.lerpVectors(transitionStartPos, targetCamPos, ease);
      camera.quaternion.slerpQuaternions(transitionStartQuat, targetCamQuat, ease);
      camera.fov = THREE.MathUtils.lerp(transitionStartFov, targetFov, ease);
      if (p >= 1) transitionActive = false;
    } else {
      camera.position.lerp(targetCamPos, Math.min(1, dtMs * 0.008));
      camera.quaternion.slerp(targetCamQuat, Math.min(1, dtMs * 0.008));
      camera.fov += (targetFov - camera.fov) * Math.min(1, dtMs * 0.008);
    }
    camera.updateProjectionMatrix();

    // Pointer Parallax Tracking (spec Za / la / xa in main.pretty.js)
    // Disabled under prefers-reduced-motion (F-P3.8).
    if (!reducedMotion) {
      const prevMouseX = parallaxState.mouseX;
      parallaxState.mouseX = THREE.MathUtils.damp(parallaxState.mouseX, normPointerX, 0.1, dtSec);
      parallaxState.mouseY = THREE.MathUtils.damp(parallaxState.mouseY, normPointerY, 0.1, dtSec);
      let pr = parallaxState.mouseX;
      let pc = parallaxState.mouseY;
      const oscFreq = 2.2;
      const oscScale = 0.25;
      pr += 0.02 * Math.sin(0.001 * dtMs * oscFreq) * oscScale;
      pc += 0.3 * Math.cos(0.001 * dtMs * oscFreq) * oscScale;
      parallaxState.ang = THREE.MathUtils.damp(parallaxState.ang, 0.5 * (pr - prevMouseX), 0.2, dtSec);

      camera.position.x += 0.03 * pr;
      camera.position.y += 0.02 * pc;
      camera.rotation.y += 0.03 * pr;
      camera.rotateZ(parallaxState.ang);
    }

    // Harmonic Simplex Noise Camera Shake (spec Os in main.pretty.js)
    if (!reducedMotion && shakeState.shaking) {
      const prog = 1 - shakeState.currentDuration / Math.max(1, shakeState.maxDuration);
      const speed = THREE.MathUtils.lerp(shakeState.speed[0], shakeState.speed[1], prog) * shakeState.freqMult;
      shakeState.currentAmplitude = THREE.MathUtils.lerp(shakeState.maxAmplitude, 0, prog);
      shakeState.pos[0] += dtMs * speed;
      shakeState.pos[1] += dtMs * speed;
      shakeState.value[0] = Math.cos(9 * shakeState.pos[0]) * shakeState.currentAmplitude * 0.6;
      shakeState.value[1] = simplex2D(10, shakeState.pos[1]) * shakeState.currentAmplitude;
      const s = 0.9 * shakeState.value[0];
      const a = 0.3 * shakeState.value[1];
      const o = shakeState.vertical ? a : s;
      const i = shakeState.vertical ? s : a;
      camera.translateY(i);
      camera.translateX(o);
      camera.rotateZ(0.5 * i);
      camera.rotateY(0.5 * o);
      shakeState.currentDuration = Math.max(0, shakeState.currentDuration - dtMs);
      if (shakeState.currentDuration <= 0) {
        shakeState.shaking = false;
      }
    }

    renderer.render(scene, camera);
    if (!readySent) {
      readySent = true;
      onReady();
    }
  });

  function dispose() {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    motionQuery?.removeEventListener?.('change', onMotionPreferenceChange);
    window.removeEventListener('pagehide', dispose);
    scene.traverse((obj) => {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => {
          m?.map?.dispose?.();
          m?.dispose?.();
        });
      } else {
        obj.material?.map?.dispose?.();
        obj.material?.dispose?.();
      }
    });
    envTexture?.dispose?.();
    renderer.forceContextLoss?.();
    renderer.dispose();
    canvas.remove();
  }

  window.addEventListener('pagehide', dispose);

  return {
    renderer,
    scene,
    camera,
    shake,
    markReady: onReady,
    isReducedMotion: () => reducedMotion,
    isShaking: () => shakeState.shaking,
    getQuality: () => quality.index,
    setQuality: (index) => {
      const clamped = Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, Math.round(Number(index) || 0)));
      quality.index = clamped;
      saveQuality(clamped);
      applyPixelRatio();
      resize();
      return clamped;
    },
    getPixelRatio: () => renderer.getPixelRatio(),
    dispose,
  };
}
