import { TileType } from '../types/grid.ts';
import { UnitClass, MovementType } from '../types/unitClass.ts';
import type { UnitClassDef } from '../types/unitClass.ts';

export const UNIT_CLASS_DEFS: Record<UnitClass, UnitClassDef> = {
  [UnitClass.INFANTRY]: {
    id: UnitClass.INFANTRY,
    name: '보병',
    movementType: MovementType.FOOT,
    terrainCosts: {
      [TileType.PLAIN]: 1,
      [TileType.FOREST]: 2,
      [TileType.BRIDGE]: 1,
    },
    passableTerrain: [],
    defaultAttackRange: 1,
    diagonalAttack: true, // 8방향 공격
    skillSlots: 2,
    growthRates: { maxHp: 8, attack: 4, defense: 4, speed: 2, maxMp: 2 },
  },
  [UnitClass.CAVALRY]: {
    id: UnitClass.CAVALRY,
    name: '기병',
    movementType: MovementType.MOUNTED,
    terrainCosts: {
      [TileType.PLAIN]: 1,
      [TileType.FOREST]: 3,
      [TileType.BRIDGE]: 1,
    },
    passableTerrain: [],
    defaultAttackRange: 1,
    diagonalAttack: false,
    skillSlots: 1,
    growthRates: { maxHp: 9, attack: 5, defense: 3, speed: 3, maxMp: 1 },
  },
  [UnitClass.ARCHER]: {
    id: UnitClass.ARCHER,
    name: '궁병',
    movementType: MovementType.FOOT,
    terrainCosts: {
      [TileType.PLAIN]: 1,
      [TileType.FOREST]: 2,
      [TileType.BRIDGE]: 1,
    },
    passableTerrain: [],
    defaultAttackRange: 2,
    diagonalAttack: false,
    skillSlots: 2,
    growthRates: { maxHp: 6, attack: 4, defense: 2, speed: 3, maxMp: 2 },
  },
  [UnitClass.STRATEGIST]: {
    id: UnitClass.STRATEGIST,
    name: '책사',
    movementType: MovementType.FOOT,
    terrainCosts: {
      [TileType.PLAIN]: 1,
      [TileType.FOREST]: 2,
      [TileType.BRIDGE]: 1,
    },
    passableTerrain: [],
    defaultAttackRange: 1,
    diagonalAttack: false,
    skillSlots: 4,
    growthRates: { maxHp: 5, attack: 2, defense: 2, speed: 2, maxMp: 5 },
  },
  [UnitClass.BANDIT]: {
    id: UnitClass.BANDIT,
    name: '도적',
    movementType: MovementType.LIGHT,
    terrainCosts: {
      [TileType.PLAIN]: 1,
      [TileType.FOREST]: 1,
      [TileType.MOUNTAIN]: 2,
      [TileType.BRIDGE]: 1,
    },
    passableTerrain: [TileType.MOUNTAIN],
    defaultAttackRange: 1,
    diagonalAttack: false,
    skillSlots: 2,
    growthRates: { maxHp: 7, attack: 4, defense: 2, speed: 4, maxMp: 1 },
  },
  [UnitClass.MARTIAL_ARTIST]: {
    id: UnitClass.MARTIAL_ARTIST,
    name: '무도가',
    movementType: MovementType.LIGHT,
    terrainCosts: {
      [TileType.PLAIN]: 1,
      [TileType.FOREST]: 1,
      [TileType.BRIDGE]: 1,
      [TileType.WATER]: 2,
    },
    passableTerrain: [TileType.WATER],
    defaultAttackRange: 1,
    diagonalAttack: false,
    skillSlots: 2,
    growthRates: { maxHp: 7, attack: 5, defense: 3, speed: 4, maxMp: 2 },
  },
};

export function getClassDef(unitClass: UnitClass): UnitClassDef {
  return UNIT_CLASS_DEFS[unitClass];
}
