export interface SkillEnhanceTier {
  minLevel: number;
  maxLevel: number;
  requiredItem: string;
  requiredItemName: string;
  goldCost: number;  // per level
}

export const SKILL_ENHANCE_TIERS: SkillEnhanceTier[] = [
  { minLevel: 1, maxLevel: 3, requiredItem: 'skill_book_basic', requiredItemName: '초급 스킬서', goldCost: 500 },
  { minLevel: 4, maxLevel: 6, requiredItem: 'skill_book_mid', requiredItemName: '중급 스킬서', goldCost: 1500 },
  { minLevel: 7, maxLevel: 10, requiredItem: 'skill_book_high', requiredItemName: '고급 스킬서', goldCost: 3000 },
];

export const MAX_SKILL_LEVEL = 10;

/** Get enhanced power multiplier: Lv1=1.0, Lv2=1.1, ..., Lv10=1.9 */
export function getSkillPowerMultiplier(level: number): number {
  return 1 + (level - 1) * 0.1;
}

/** Get MP cost after enhancement: -1 per level (min 1) */
export function getSkillMpCost(baseMpCost: number, level: number): number {
  return Math.max(1, baseMpCost - (level - 1));
}

/** Get cooldown after enhancement: -1 at Lv5, -1 at Lv10 */
export function getSkillCooldown(baseCooldown: number, level: number): number {
  let cd = baseCooldown;
  if (level >= 5) cd--;
  if (level >= 10) cd--;
  return Math.max(0, cd);
}

/** Get required tier for next enhancement from current level */
export function getEnhanceTier(currentLevel: number): SkillEnhanceTier | null {
  return SKILL_ENHANCE_TIERS.find(t => currentLevel >= t.minLevel && currentLevel <= t.maxLevel) ?? null;
}

/** Skill book item definitions */
export const SKILL_BOOK_ITEMS: Record<string, { name: string; description: string }> = {
  skill_book_basic: { name: '초급 스킬서', description: 'Lv.1~3 스킬 강화에 필요' },
  skill_book_mid: { name: '중급 스킬서', description: 'Lv.4~6 스킬 강화에 필요' },
  skill_book_high: { name: '고급 스킬서', description: 'Lv.7~10 스킬 강화에 필요' },
};
