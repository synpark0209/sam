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
  grade?: 'N' | 'R' | 'SR' | 'SSR' | 'UR';
  isScenarioUnit?: boolean;        // true: 시나리오 기본 장수 (출전 고정)
  level?: number;
  exp?: number;
  mp?: number;
  maxMp?: number;
  skills?: string[];              // 하위 호환용 (레거시)
  // ── 4슬롯 스킬 시스템 ──
  classSkillId?: string;          // 슬롯1: 병종 기본 스킬 (장수레벨/승급에 따라 자동 진화)
  uniqueSkill?: string;           // 슬롯2: 장수 고유 스킬 (Lv.20 해금, 각성으로 강화)
  uniqueSkillUnlocked?: boolean;  // 고유 스킬 해금 여부
  equippedSkills?: string[];      // 슬롯3~4: 장착 스킬 (자유 교체, 슬롯4는 Lv.10 해금)
  equippedSkillLevels?: Record<string, number>; // 장착 스킬별 레벨 (1~3단계)
  promotionLevel?: number;        // 승급 단계 (0: 기본, 1: 1차, 2: 2차)
  promotionClass?: string;        // 승급 후 병종명
  equipment?: EquipmentSlots;
  statusEffects?: ActiveStatusEffect[];
  skillCooldowns?: Record<string, number>;
}
