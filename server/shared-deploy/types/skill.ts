import type { UnitClass } from './unitClass.ts';
import type { StatusEffectId } from './statusEffect.ts';

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

/** 스킬 등급 */
export type SkillGrade = 'normal' | 'advanced' | 'rare' | 'legendary';

/** 복합 효과 단일 항목 */
export interface SkillSubEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'status';
  scaling?: 'attack' | 'spirit';     // 데미지 스케일링 (물리/술법)
  power?: number;                     // 데미지/회복 위력
  statusEffect?: StatusEffectId;      // 적용할 상태효과
  statusDuration?: number;
  statusMagnitude?: number;
}

/** 스킬 정의 (복합 효과 지원) */
export interface SkillDef {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  range: number;
  aoeRadius: number;
  targetType: SkillTargetType;
  cooldown: number;
  grade?: SkillGrade;
  requiredClasses?: UnitClass[];

  // 레거시 호환 (단일 효과) — 기존 스킬은 이 필드 사용
  effectType: SkillEffectType;
  power: number;
  statusEffect?: string;
  statusDuration?: number;
  statusMagnitude?: number;

  // 복합 효과 (새 스킬) — 있으면 레거시 필드 무시
  effects?: SkillSubEffect[];
}

export interface SkillResult {
  skillId: string;
  casterId: string;
  effects: SkillEffectResult[];
}

export interface SkillEffectResult {
  unitId: string;
  damageDealt?: number;
  healingDone?: number;
  statusApplied?: string;
  unitDied?: boolean;
}
