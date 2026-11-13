/**
 * Winstreak & Cosmetic Rewards Engine (F-P3.1, spec.md §9.1-§9.3, T-11).
 *
 * Progression curve:
 * - Milestones: [1, 2, 4, 6, 7, 8, 10, 11, 13, 14, 16, 17]
 * - Priority: pick random unowned accessory first (8 total).
 * - Fallback: once all 8 accessories are owned, pick an eligible tattoo matching an empty slot (11 slots).
 * - Loss: clears temporary accessories, preserves earned tattoos forever.
 */

export const REWARD_MILESTONES = [1, 2, 4, 6, 7, 8, 10, 11, 13, 14, 16, 17];

export const ACCESSORIES = [
  'bandana',
  'bandage',
  'bracelet',
  'chain',
  'diamond',
  'nails',
  'ring',
  'rolex',
];

export const TATTOO_SLOT_SIZES = [
  'small', 'small', 'small', 'small',
  'medium', 'medium', 'medium', 'medium',
  'large', 'large', 'large',
];

export const TATTOO_CATALOG = {
  small: ['Bolt', 'Star', 'Heart', 'Spark', 'Eye', 'Dice'],
  medium: ['Anchor', 'Crown', 'Flame', 'Sword', 'Rose', 'Skull'],
  large: ['Dragon', 'Phoenix', 'Serpent', 'Tiger', 'Kraken'],
};

export function isMilestoneStreak(streak) {
  return REWARD_MILESTONES.includes(streak);
}

/**
 * Selects and applies at most one cosmetic for a qualifying milestone streak.
 * Returns { type: 'accessory' | 'tattoo', item, slot? } or null.
 */
export function grantMilestoneReward({ streak, arm, rng = Math.random } = {}) {
  if (!arm || !isMilestoneStreak(streak)) return null;

  const ownedAcc = new Set(arm.accessories || []);
  const remainingAcc = ACCESSORIES.filter((id) => !ownedAcc.has(id));

  if (remainingAcc.length > 0) {
    const pick = remainingAcc[Math.floor(rng() * remainingAcc.length)];
    arm.accessories.push(pick);
    return { type: 'accessory', item: pick };
  }

  // Fallback to empty tattoo slots (11 total)
  const slots = Array.isArray(arm.tatoos) ? arm.tatoos : [];
  const emptyIndices = [];
  for (let i = 0; i < TATTOO_SLOT_SIZES.length; i++) {
    if (!slots[i]) emptyIndices.push(i);
  }
  if (emptyIndices.length === 0) return null;

  const slotIndex = emptyIndices[Math.floor(rng() * emptyIndices.length)];
  const sizeClass = TATTOO_SLOT_SIZES[slotIndex];
  const ownedTattoos = new Set(slots.filter(Boolean));
  const candidates = (TATTOO_CATALOG[sizeClass] || []).filter((t) => !ownedTattoos.has(t));
  const pool = candidates.length > 0 ? candidates : (TATTOO_CATALOG[sizeClass] || ['Star']);
  const tattoo = pool[Math.floor(rng() * pool.length)];
  slots[slotIndex] = tattoo;
  return { type: 'tattoo', item: tattoo, slot: slotIndex, size: sizeClass };
}

export function recordWinAndReward({ user, arm, rng = Math.random } = {}) {
  user.streak = (Number(user.streak) || 0) + 1;
  return grantMilestoneReward({ streak: user.streak, arm, rng });
}

export function clearAccessoriesOnLoss(arm) {
  if (arm) arm.accessories = [];
}

