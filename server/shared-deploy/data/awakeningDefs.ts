import type { UnitData } from '../types/unit.ts';

export interface AwakeningTierDef {
  star: number;
  fragmentCost: number;
  statBonusPct: number;
  description: string;
}

export const AWAKENING_TIERS: AwakeningTierDef[] = [
  { star: 1, fragmentCost: 20,  statBonusPct: 5,  description: '스탯 +5%, 스킬 슬롯 +1' },
  { star: 2, fragmentCost: 40,  statBonusPct: 10, description: '스탯 +10%, 고유 스킬 강화' },
  { star: 3, fragmentCost: 80,  statBonusPct: 15, description: '스탯 +15%, 각성 스킬 해금' },
  { star: 4, fragmentCost: 120, statBonusPct: 20, description: '스탯 +20%, 전용 장비 해금' },
  { star: 5, fragmentCost: 200, statBonusPct: 30, description: '스탯 +30%, 최종 각성' },
];

/** 등급별 중복 획득 시 조각 수 */
export const GRADE_FRAGMENT_MAP: Record<string, number> = {
  N: 5,
  R: 10,
  SR: 20,
  SSR: 40,
  UR: 60,
};

/** 각성 스탯 배율 (0=1.0, 1=1.05, ..., 5=1.30) */
export function getAwakeningStatMultiplier(awakeningLevel: number): number {
  if (awakeningLevel <= 0) return 1.0;
  const tier = AWAKENING_TIERS[Math.min(awakeningLevel, 5) - 1];
  return 1 + tier.statBonusPct / 100;
}

/** 히어로 베이스 ID 추출 (gacha_guanyu_123456 → gacha_guanyu, p1 → p1) */
export function getHeroBaseId(unit: UnitData): string {
  // 시나리오 유닛 (p1, p2, p3 등)
  if (/^p\d+$/.test(unit.id)) return unit.id;
  // 가챠 유닛 (gacha_xxx_timestamp → gacha_xxx)
  return unit.id.replace(/_\d{10,}$/, '');
}

/** 다음 각성 정보 */
export function getNextAwakening(unit: UnitData, fragments: Record<string, number>): {
  canDo: boolean;
  nextTier: AwakeningTierDef | null;
  currentFragments: number;
  cost: number;
} {
  const level = unit.awakeningLevel ?? 0;
  if (level >= 5) return { canDo: false, nextTier: null, currentFragments: 0, cost: 0 };

  const nextTier = AWAKENING_TIERS[level];
  const baseId = getHeroBaseId(unit);
  const currentFragments = fragments[baseId] ?? 0;

  return {
    canDo: currentFragments >= nextTier.fragmentCost,
    nextTier,
    currentFragments,
    cost: nextTier.fragmentCost,
  };
}

/** 각성 실행 */
export function performAwakening(
  unit: UnitData,
  heroFragments: Record<string, number>,
): { success: boolean; error?: string } {
  const info = getNextAwakening(unit, heroFragments);
  if (!info.nextTier) return { success: false, error: '최대 각성 단계입니다' };
  if (!info.canDo) return { success: false, error: '조각이 부족합니다' };

  const baseId = getHeroBaseId(unit);
  heroFragments[baseId] -= info.nextTier.fragmentCost;
  unit.awakeningLevel = (unit.awakeningLevel ?? 0) + 1;

  return { success: true };
}
