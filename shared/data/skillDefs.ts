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
};

export function getSkillDef(id: string): SkillDef | undefined {
  return SKILL_DEFS[id];
}
