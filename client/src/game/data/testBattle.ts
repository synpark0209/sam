import { TileType } from '@shared/types/index.ts';
import { UnitClass } from '@shared/types/index.ts';
import { TILE_CONFIGS, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import type { TileData } from '@shared/types/index.ts';
import type { UnitData } from '@shared/types/index.ts';

function createMap(): TileData[][] {
  const tiles: TileData[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push({ ...TILE_CONFIGS[TileType.PLAIN] });
    }
    tiles.push(row);
  }

  const forestTiles = [
    [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7],
    [6, 3], [6, 5], [6, 7],
  ];
  for (const [x, y] of forestTiles) {
    tiles[y][x] = { ...TILE_CONFIGS[TileType.FOREST] };
  }

  const mountainTiles = [
    [3, 1], [8, 8], [7, 3],
  ];
  for (const [x, y] of mountainTiles) {
    tiles[y][x] = { ...TILE_CONFIGS[TileType.MOUNTAIN] };
  }

  const waterTiles = [
    [9, 4], [9, 5],
  ];
  for (const [x, y] of waterTiles) {
    tiles[y][x] = { ...TILE_CONFIGS[TileType.WATER] };
  }

  return tiles;
}

export const TEST_MAP = createMap();

export const TEST_UNITS: UnitData[] = [
  // 아군 (여포군)
  {
    id: 'p1', name: '여포', faction: 'player',
    unitClass: UnitClass.CAVALRY,
    level: 1, exp: 0, mp: 15, maxMp: 15,
    skills: ['charge'],
    equipment: { weapon: 'steel_sword', armor: 'iron_armor', accessory: 'red_hare' },
    position: { x: 1, y: 4 },
    stats: { maxHp: 200, hp: 200, attack: 48, defense: 25, speed: 6, moveRange: 6, attackRange: 1 },
    hasActed: false, isAlive: true,
  },
  {
    id: 'p2', name: '장료', faction: 'player',
    unitClass: UnitClass.INFANTRY,
    level: 1, exp: 0, mp: 10, maxMp: 10,
    skills: ['encourage'],
    equipment: { weapon: 'iron_spear', armor: 'iron_armor' },
    position: { x: 2, y: 2 },
    stats: { maxHp: 160, hp: 160, attack: 40, defense: 24, speed: 5, moveRange: 4, attackRange: 1 },
    hasActed: false, isAlive: true,
  },
  {
    id: 'p3', name: '고순', faction: 'player',
    unitClass: UnitClass.INFANTRY,
    level: 1, exp: 0, mp: 10, maxMp: 10,
    skills: ['encourage'],
    equipment: { weapon: 'steel_sword', armor: 'leather_armor' },
    position: { x: 1, y: 6 },
    stats: { maxHp: 170, hp: 170, attack: 38, defense: 28, speed: 4, moveRange: 4, attackRange: 1 },
    hasActed: false, isAlive: true,
  },
  // 적군 (동탁군)
  {
    id: 'e1', name: '화웅', faction: 'enemy',
    unitClass: UnitClass.CAVALRY,
    level: 2, exp: 0, mp: 10, maxMp: 10,
    skills: ['charge'],
    equipment: { weapon: 'steel_sword', armor: 'iron_armor' },
    position: { x: 10, y: 4 },
    stats: { maxHp: 180, hp: 180, attack: 42, defense: 22, speed: 5, moveRange: 6, attackRange: 1 },
    hasActed: false, isAlive: true,
  },
  {
    id: 'e2', name: '서량 기병', faction: 'enemy',
    unitClass: UnitClass.CAVALRY,
    level: 1, exp: 0, mp: 10, maxMp: 10,
    skills: [],
    position: { x: 10, y: 2 },
    stats: { maxHp: 140, hp: 140, attack: 35, defense: 15, speed: 5, moveRange: 6, attackRange: 1 },
    hasActed: false, isAlive: true,
  },
  {
    id: 'e3', name: '이유', faction: 'enemy',
    unitClass: UnitClass.STRATEGIST,
    level: 1, exp: 0, mp: 30, maxMp: 30,
    skills: ['fire', 'heal'],
    equipment: { weapon: 'sage_staff', armor: 'sage_robe' },
    position: { x: 10, y: 7 },
    stats: { maxHp: 90, hp: 90, attack: 28, defense: 10, speed: 4, moveRange: 3, attackRange: 1 },
    hasActed: false, isAlive: true,
  },
];
