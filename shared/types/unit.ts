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
  skills?: string[];              // 하위 호환용 (기존 코드)
  uniqueSkill?: string;           // 고유 스킬 ID (장수 고정)
  equippedSkills?: string[];      // 장착 스킬 ID 목록 (교체 가능, 최대 3개)
  promotionLevel?: number;        // 승급 단계 (0: 기본, 1: 1차, 2: 2차)
  promotionClass?: string;        // 승급 후 병종명
  equipment?: EquipmentSlots;
  statusEffects?: ActiveStatusEffect[];
  skillCooldowns?: Record<string, number>;
}
