import { TileType } from './types/grid.ts';
import type { TileData } from './types/grid.ts';

export const TILE_SIZE = 48;
export const MAP_WIDTH = 12;
export const MAP_HEIGHT = 10;

/** 게임 캔버스 크기 (모바일 세로 비율 9:16) */
export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 690;

export const TILE_CONFIGS: Record<TileType, TileData> = {
  [TileType.PLAIN]: { type: TileType.PLAIN, movementCost: 1, defenseBonus: 0, isPassable: true },
  [TileType.FOREST]: { type: TileType.FOREST, movementCost: 2, defenseBonus: 15, isPassable: true },
  [TileType.MOUNTAIN]: { type: TileType.MOUNTAIN, movementCost: 999, defenseBonus: 30, isPassable: false },
  [TileType.WATER]: { type: TileType.WATER, movementCost: 999, defenseBonus: 0, isPassable: false },
  [TileType.BRIDGE]: { type: TileType.BRIDGE, movementCost: 1, defenseBonus: 0, isPassable: true },
};

export const TILE_COLORS: Record<TileType, number> = {
  [TileType.PLAIN]: 0x8fbc8f,
  [TileType.FOREST]: 0x228b22,
  [TileType.MOUNTAIN]: 0x8b8682,
  [TileType.WATER]: 0x4682b4,
  [TileType.BRIDGE]: 0xdeb887,
};
