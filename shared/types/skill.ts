import type { UnitClass } from './unitClass.ts';

export enum SkillTargetType {
  SINGLE_ENEMY = 'single_enemy',
  SINGLE_ALLY = 'single_ally',
  SELF = 'self',
  AREA_ENEMY = 'area_enemy',
  AREA_ALLY = 'area_ally',
}

export enum SkillEffectType {
  DAMAGE = 'damage',
  HEAL = 'heal',
  BUFF = 'buff',
  DEBUFF = 'debuff',
  STATUS = 'status',
}

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  range: number;
  aoeRadius: number;
  targetType: SkillTargetType;
  effectType: SkillEffectType;
  power: number;
  statusEffect?: string;
  statusDuration?: number;
  statusMagnitude?: number;
  requiredClasses?: UnitClass[];
  cooldown: number;
}

export interface SkillResult {
  skillId: string;
  casterId: string;
  effects: SkillEffect[];
}

export interface SkillEffect {
  unitId: string;
  damageDealt?: number;
  healingDone?: number;
  statusApplied?: string;
  unitDied?: boolean;
}
