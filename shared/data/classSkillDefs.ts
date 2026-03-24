import { UnitClass } from '../types/unitClass.ts';

/** 병종별 기본 스킬 3단계 진화 경로 */
export interface ClassSkillTier {
  skillId: string;
  name: string;
  requiredPromotion: number; // 0: 기본, 1: 1차승급, 2: 2차승급
}

export const CLASS_SKILL_TIERS: Record<UnitClass, ClassSkillTier[]> = {
  [UnitClass.CAVALRY]: [
    { skillId: 'class_cavalry_1', name: '돌격', requiredPromotion: 0 },
    { skillId: 'class_cavalry_2', name: '기마돌파', requiredPromotion: 1 },
    { skillId: 'class_cavalry_3', name: '추격', requiredPromotion: 2 },
  ],
  [UnitClass.INFANTRY]: [
    { skillId: 'class_infantry_1', name: '방어', requiredPromotion: 0 },
    { skillId: 'class_infantry_2', name: '철벽방어', requiredPromotion: 1 },
    { skillId: 'class_infantry_3', name: '무적방패', requiredPromotion: 2 },
  ],
  [UnitClass.ARCHER]: [
    { skillId: 'class_archer_1', name: '조준사격', requiredPromotion: 0 },
    { skillId: 'class_archer_2', name: '정밀사격', requiredPromotion: 1 },
    { skillId: 'class_archer_3', name: '백보천양', requiredPromotion: 2 },
  ],
  [UnitClass.STRATEGIST]: [
    { skillId: 'class_strategist_1', name: '화진', requiredPromotion: 0 },
    { skillId: 'class_strategist_2', name: '초열', requiredPromotion: 1 },
    { skillId: 'class_strategist_3', name: '폭염', requiredPromotion: 2 },
  ],
  [UnitClass.MARTIAL_ARTIST]: [
    { skillId: 'class_martial_1', name: '강타', requiredPromotion: 0 },
    { skillId: 'class_martial_2', name: '연타', requiredPromotion: 1 },
    { skillId: 'class_martial_3', name: '회심격', requiredPromotion: 2 },
  ],
  [UnitClass.BANDIT]: [
    { skillId: 'class_bandit_1', name: '암습', requiredPromotion: 0 },
    { skillId: 'class_bandit_2', name: '기습', requiredPromotion: 1 },
    { skillId: 'class_bandit_3', name: '급소공격', requiredPromotion: 2 },
  ],
};

/** 현재 승급 단계에 맞는 병종 기본 스킬 ID 반환 */
export function getClassSkillId(unitClass: UnitClass, promotionLevel: number): string {
  const tiers = CLASS_SKILL_TIERS[unitClass];
  // 승급 레벨에 맞는 가장 높은 단계 반환
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (promotionLevel >= tiers[i].requiredPromotion) {
      return tiers[i].skillId;
    }
  }
  return tiers[0].skillId;
}

/** 병종 기본 스킬 이름 반환 */
export function getClassSkillName(unitClass: UnitClass, promotionLevel: number): string {
  const tiers = CLASS_SKILL_TIERS[unitClass];
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (promotionLevel >= tiers[i].requiredPromotion) {
      return tiers[i].name;
    }
  }
  return tiers[0].name;
}
