import { UnitClass } from '../types/unitClass.ts';

export interface PromotionDef {
  fromClass: UnitClass;
  toClassName: string;      // 승급 후 표시 이름
  requiredLevel: number;
  requiredItem: string;     // 필요 아이템 ID
  requiredItemName: string; // 필요 아이템 표시명
  statBonus: {
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    maxMp: number;
  };
  unlocksSkill?: string;    // 승급 시 해금되는 장착 스킬
}

/** 승급 아이템 정의 */
export const PROMOTION_ITEMS: Record<string, { name: string; description: string }> = {
  promotion_seal_1: { name: '하급 인수', description: '1차 승급에 필요한 인수' },
  promotion_seal_2: { name: '상급 인수', description: '2차 승급에 필요한 인수' },
};

/** 병종별 승급 경로 */
export const PROMOTION_PATHS: Record<UnitClass, PromotionDef[]> = {
  [UnitClass.INFANTRY]: [
    {
      fromClass: UnitClass.INFANTRY, toClassName: '중보병', requiredLevel: 15,
      requiredItem: 'promotion_seal_1', requiredItemName: '하급 인수',
      statBonus: { maxHp: 30, attack: 8, defense: 10, speed: 2, maxMp: 5 },
      unlocksSkill: 'fortify',
    },
    {
      fromClass: UnitClass.INFANTRY, toClassName: '근위병', requiredLevel: 30,
      requiredItem: 'promotion_seal_2', requiredItemName: '상급 인수',
      statBonus: { maxHp: 50, attack: 15, defense: 18, speed: 3, maxMp: 8 },
      unlocksSkill: 'group_heal',
    },
  ],
  [UnitClass.CAVALRY]: [
    {
      fromClass: UnitClass.CAVALRY, toClassName: '중기병', requiredLevel: 15,
      requiredItem: 'promotion_seal_1', requiredItemName: '하급 인수',
      statBonus: { maxHp: 25, attack: 12, defense: 6, speed: 3, maxMp: 3 },
      unlocksSkill: 'charge',
    },
    {
      fromClass: UnitClass.CAVALRY, toClassName: '철기병', requiredLevel: 30,
      requiredItem: 'promotion_seal_2', requiredItemName: '상급 인수',
      statBonus: { maxHp: 40, attack: 20, defense: 10, speed: 5, maxMp: 5 },
    },
  ],
  [UnitClass.ARCHER]: [
    {
      fromClass: UnitClass.ARCHER, toClassName: '노병', requiredLevel: 15,
      requiredItem: 'promotion_seal_1', requiredItemName: '하급 인수',
      statBonus: { maxHp: 15, attack: 10, defense: 5, speed: 3, maxMp: 5 },
      unlocksSkill: 'arrow_rain',
    },
    {
      fromClass: UnitClass.ARCHER, toClassName: '연노병', requiredLevel: 30,
      requiredItem: 'promotion_seal_2', requiredItemName: '상급 인수',
      statBonus: { maxHp: 25, attack: 18, defense: 8, speed: 5, maxMp: 8 },
    },
  ],
  [UnitClass.STRATEGIST]: [
    {
      fromClass: UnitClass.STRATEGIST, toClassName: '군사', requiredLevel: 15,
      requiredItem: 'promotion_seal_1', requiredItemName: '하급 인수',
      statBonus: { maxHp: 10, attack: 5, defense: 5, speed: 2, maxMp: 15 },
      unlocksSkill: 'water',
    },
    {
      fromClass: UnitClass.STRATEGIST, toClassName: '대군사', requiredLevel: 30,
      requiredItem: 'promotion_seal_2', requiredItemName: '상급 인수',
      statBonus: { maxHp: 20, attack: 8, defense: 8, speed: 3, maxMp: 25 },
      unlocksSkill: 'group_heal',
    },
  ],
  [UnitClass.BANDIT]: [
    {
      fromClass: UnitClass.BANDIT, toClassName: '유격대', requiredLevel: 15,
      requiredItem: 'promotion_seal_1', requiredItemName: '하급 인수',
      statBonus: { maxHp: 20, attack: 10, defense: 5, speed: 5, maxMp: 3 },
      unlocksSkill: 'ambush',
    },
    {
      fromClass: UnitClass.BANDIT, toClassName: '암살자', requiredLevel: 30,
      requiredItem: 'promotion_seal_2', requiredItemName: '상급 인수',
      statBonus: { maxHp: 30, attack: 18, defense: 8, speed: 8, maxMp: 5 },
    },
  ],
  [UnitClass.MARTIAL_ARTIST]: [
    {
      fromClass: UnitClass.MARTIAL_ARTIST, toClassName: '투사', requiredLevel: 15,
      requiredItem: 'promotion_seal_1', requiredItemName: '하급 인수',
      statBonus: { maxHp: 25, attack: 12, defense: 8, speed: 5, maxMp: 5 },
      unlocksSkill: 'counter_stance',
    },
    {
      fromClass: UnitClass.MARTIAL_ARTIST, toClassName: '권성', requiredLevel: 30,
      requiredItem: 'promotion_seal_2', requiredItemName: '상급 인수',
      statBonus: { maxHp: 40, attack: 20, defense: 12, speed: 8, maxMp: 8 },
    },
  ],
};

/** 승급 가능 여부 확인 */
export function canPromote(unitClass: UnitClass, level: number, currentPromotion: number): PromotionDef | null {
  const paths = PROMOTION_PATHS[unitClass];
  if (!paths || currentPromotion >= paths.length) return null;
  const nextPromotion = paths[currentPromotion];
  if (level >= nextPromotion.requiredLevel) return nextPromotion;
  return null;
}
