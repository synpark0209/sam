import { SkillTargetType, SkillEffectType } from '../types/skill.ts';
import { UnitClass } from '../types/unitClass.ts';
import type { SkillDef } from '../types/skill.ts';

export const SKILL_DEFS: Record<string, SkillDef> = {
  fire: {
    id: 'fire', name: '화계', description: '불로 적을 공격한다',
    mpCost: 8, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 40,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  water: {
    id: 'water', name: '수계', description: '물로 적을 공격하고 기절시킨다',
    mpCost: 10, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 35,
    statusEffect: 'stun', statusDuration: 1, statusMagnitude: 0,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  heal: {
    id: 'heal', name: '회복', description: '아군 한 명의 HP를 회복한다',
    mpCost: 6, range: 3, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ALLY,
    effectType: SkillEffectType.HEAL, power: 50,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  group_heal: {
    id: 'group_heal', name: '대회복', description: '주변 아군의 HP를 회복한다',
    mpCost: 12, range: 2, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ALLY,
    effectType: SkillEffectType.HEAL, power: 35,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  poison: {
    id: 'poison', name: '독계', description: '적에게 독을 부여한다',
    mpCost: 5, range: 3, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.STATUS, power: 0,
    statusEffect: 'poison', statusDuration: 3, statusMagnitude: 10,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  confuse: {
    id: 'confuse', name: '혼란', description: '적을 혼란 상태로 만든다',
    mpCost: 8, range: 3, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.STATUS, power: 0,
    statusEffect: 'confuse', statusDuration: 2, statusMagnitude: 0,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  encourage: {
    id: 'encourage', name: '격려', description: '아군의 공격력을 높인다',
    mpCost: 6, range: 2, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ALLY,
    effectType: SkillEffectType.BUFF, power: 0,
    statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 8,
    cooldown: 0,
  },
  fortify: {
    id: 'fortify', name: '방어강화', description: '아군의 방어력을 높인다',
    mpCost: 6, range: 2, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ALLY,
    effectType: SkillEffectType.BUFF, power: 0,
    statusEffect: 'defense_up', statusDuration: 3, statusMagnitude: 8,
    cooldown: 0,
  },
  arrow_rain: {
    id: 'arrow_rain', name: '화살비', description: '넓은 범위에 화살을 퍼붓는다',
    mpCost: 10, range: 4, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 30,
    requiredClasses: [UnitClass.ARCHER], cooldown: 0,
  },
  charge: {
    id: 'charge', name: '돌격', description: '강력한 돌격 공격',
    mpCost: 5, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 45,
    requiredClasses: [UnitClass.CAVALRY], cooldown: 0,
  },

  // ═══════════════════════════════════════
  // 고유 스킬 (장수 전용)
  // ═══════════════════════════════════════
  musou: {
    id: 'musou', name: '무쌍난무', description: '주변 적 전체를 강타한다 (여포 전용)',
    mpCost: 20, range: 1, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 60,
    cooldown: 3,
  },
  hebi_fury: {
    id: 'hebi_fury', name: '합비의 위엄', description: '돌격 후 추가 행동 (장료 전용)',
    mpCost: 15, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 50,
    cooldown: 3,
  },
  hamjin_charge: {
    id: 'hamjin_charge', name: '함진영 돌파', description: '방어 무시 공격 (고순 전용)',
    mpCost: 12, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 55,
    statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 10,
    cooldown: 2,
  },
  strategem: {
    id: 'strategem', name: '모략의 대가', description: '범위 혼란 + 방어 감소 (진궁 전용)',
    mpCost: 18, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DEBUFF, power: 15,
    statusEffect: 'confuse', statusDuration: 1, statusMagnitude: 0,
    cooldown: 3,
  },
  beauty: {
    id: 'beauty', name: '경국지색', description: '범위 적 공격력 감소 (초선 전용)',
    mpCost: 15, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DEBUFF, power: 0,
    statusEffect: 'attack_down', statusDuration: 3, statusMagnitude: 12,
    cooldown: 3,
  },
};

export function getSkillDef(id: string): SkillDef | undefined {
  return SKILL_DEFS[id];
}

/** 장수 ID → 고유 스킬 매핑 */
export const HERO_UNIQUE_SKILLS: Record<string, string> = {
  p1: 'musou',           // 여포
  p2: 'hebi_fury',       // 장료
  p3: 'hamjin_charge',   // 고순
  // 이후 추가
  // 진궁: 'strategem'
  // 초선: 'beauty'
};
