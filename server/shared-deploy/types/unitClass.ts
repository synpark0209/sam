import type { TileType } from './grid.ts';

export enum UnitClass {
  INFANTRY = 'infantry',           // 보병
  CAVALRY = 'cavalry',             // 기병
  ARCHER = 'archer',               // 궁병
  STRATEGIST = 'strategist',       // 책사
  BANDIT = 'bandit',               // 도적
  MARTIAL_ARTIST = 'martial_artist', // 무도가
  DANCER = 'dancer',               // 무희
  TAOIST = 'taoist',               // 도사
  GEOMANCER = 'geomancer',         // 풍수사
  SIEGE = 'siege',                 // 공성차
}

export enum MovementType {
  FOOT = 'foot',
  MOUNTED = 'mounted',
  LIGHT = 'light',
  HEAVY = 'heavy',   // 공성차 (이동 느림, 숲/산 불가)
}

export interface GrowthRates {
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  maxMp: number;
  spirit?: number;
}

export interface UnitClassDef {
  id: UnitClass;
  name: string;
  movementType: MovementType;
  terrainCosts: Partial<Record<TileType, number>>;
  passableTerrain: TileType[];
  defaultAttackRange: number;
  diagonalAttack: boolean; // true: 8방향 공격 (체비셰프), false: 4방향 (맨해튼)
  skillSlots: number;
  growthRates: GrowthRates;
}
