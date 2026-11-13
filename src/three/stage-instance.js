/**
 * Stage singleton holder: App.vue assigns the instance at mount; game code
 * (Part 2) imports `stage.current` to drive state-driven animation.
 */
export const stage = { current: null };
