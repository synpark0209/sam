import type { Position } from './grid.ts';
import type { UnitClass } from './unitClass.ts';

export type Faction = 'player' | 'enemy';

export interface UnitStats {
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  moveRange: number;
  attackRange: number;
}

export interface ActiveStatusEffect {
  effect: string;
  remainingTurns: number;
  magnitude: number;
  sourceUnitId: string;
}

export interface EquipmentSlots {
  weapon?: string;
  armor?: string;
  accessory?: string;
}

export interface UnitData {
  id: string;
  name: string;
  faction: Faction;
  position: Position;
  stats: UnitStats;
  hasActed: boolean;
  isAlive: boolean;
  unitClass?: UnitClass;
  level?: number;
  exp?: number;
  mp?: number;
  maxMp?: number;
  skills?: string[];
  equipment?: EquipmentSlots;
  statusEffects?: ActiveStatusEffect[];
  skillCooldowns?: Record<string, number>;
}
