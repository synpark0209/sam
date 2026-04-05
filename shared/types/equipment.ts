import type { UnitClass } from './unitClass.ts';

export enum EquipmentSlot {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  ACCESSORY = 'accessory',
}

export interface StatModifier {
  maxHp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  moveRange?: number;
  attackRange?: number;
  maxMp?: number;
}

export type EquipmentGrade = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface EquipmentDef {
  id: string;
  name: string;
  slot: EquipmentSlot;
  grade: EquipmentGrade;
  statModifiers: StatModifier;
  requiredClasses?: UnitClass[];
  description: string;
}
