import { TileType } from '../../types/grid.ts';
import { UnitClass } from '../../types/unitClass.ts';
import { TILE_CONFIGS } from '../../constants.ts';
import type { Chapter, BattleConfig } from '../../types/campaign.ts';
import type { TileData, UnitData } from '../../types/index.ts';

function plainMap(w: number, h: number, overrides: { x: number; y: number; type: TileType }[] = []): TileData[][] {
  const tiles: TileData[][] = [];
  for (let y = 0; y < h; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < w; x++) row.push({ ...TILE_CONFIGS[TileType.PLAIN] });
    tiles.push(row);
  }
  for (const o of overrides) tiles[o.y][o.x] = { ...TILE_CONFIGS[o.type] };
  return tiles;
}

function enemy(id: string, name: string, cls: UnitClass, x: number, y: number, level: number, overrides: Partial<UnitData['stats']> = {}): UnitData {
  const base: Record<UnitClass, UnitData['stats']> = {
    [UnitClass.INFANTRY]: { maxHp: 120, hp: 120, attack: 30, defense: 18, spirit: 8, agility: 18, critical: 20, morale: 30, speed: 4, penetration: 5, resist: 15, moveRange: 4, attackRange: 1 },
    [UnitClass.CAVALRY]: { maxHp: 140, hp: 140, attack: 35, defense: 15, spirit: 8, agility: 25, critical: 25, morale: 30, speed: 5, penetration: 8, resist: 10, moveRange: 6, attackRange: 1 },
    [UnitClass.ARCHER]: { maxHp: 80, hp: 80, attack: 28, defense: 10, spirit: 10, agility: 35, critical: 30, morale: 20, speed: 5, penetration: 5, resist: 10, moveRange: 3, attackRange: 2 },
    [UnitClass.STRATEGIST]: { maxHp: 70, hp: 70, attack: 22, defense: 8, spirit: 40, agility: 15, critical: 10, morale: 25, speed: 3, penetration: 0, resist: 30, moveRange: 3, attackRange: 1 },
    [UnitClass.BANDIT]: { maxHp: 100, hp: 100, attack: 28, defense: 12, spirit: 8, agility: 40, critical: 35, morale: 20, speed: 6, penetration: 20, resist: 10, moveRange: 5, attackRange: 1 },
    [UnitClass.MARTIAL_ARTIST]: { maxHp: 110, hp: 110, attack: 32, defense: 14, spirit: 12, agility: 30, critical: 45, morale: 35, speed: 5, penetration: 10, resist: 15, moveRange: 4, attackRange: 1 },
  };
  const stats = { ...base[cls], ...overrides };
  stats.maxHp += (level - 1) * 8;
  stats.hp = stats.maxHp;
  stats.attack += (level - 1) * 3;
  stats.defense += (level - 1) * 2;
  return {
    id, name, faction: 'enemy', unitClass: cls,
    level, exp: 0, mp: cls === UnitClass.STRATEGIST ? 30 : 10, maxMp: cls === UnitClass.STRATEGIST ? 30 : 10,
    skills: cls === UnitClass.STRATEGIST ? ['fire', 'heal'] : cls === UnitClass.ARCHER ? ['arrow_rain'] : [],
    position: { x, y }, stats, hasActed: false, isAlive: true,
  };
}

// ── 챕터 6: 원문의 화극 ──

// 6-1: 원술 선봉대 견제
const stage1Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 개활지에 산재한 숲
    { x: 3, y: 2, type: TileType.FOREST }, { x: 4, y: 3, type: TileType.FOREST },
    { x: 2, y: 5, type: TileType.FOREST }, { x: 3, y: 7, type: TileType.FOREST },
    { x: 6, y: 1, type: TileType.FOREST }, { x: 7, y: 4, type: TileType.FOREST },
    { x: 8, y: 6, type: TileType.FOREST }, { x: 5, y: 8, type: TileType.FOREST },
    { x: 9, y: 2, type: TileType.FOREST }, { x: 10, y: 7, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e6_1', '기령', UnitClass.CAVALRY, 10, 4, 12, { maxHp: 260, hp: 260, attack: 68 }),
    enemy('e6_2', '원술 기병', UnitClass.CAVALRY, 9, 2, 10),
    enemy('e6_3', '원술 기병', UnitClass.CAVALRY, 9, 6, 10),
    enemy('e6_4', '원술 기병', UnitClass.CAVALRY, 10, 5, 10),
    enemy('e6_5', '원술 궁병', UnitClass.ARCHER, 11, 3, 10),
    enemy('e6_6', '원술 궁병', UnitClass.ARCHER, 11, 7, 10),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

// 6-2: 원술군 본대 격파
const stage2Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 진영 배치: 숲(엄폐), 산(측면 차단)
    { x: 0, y: 0, type: TileType.MOUNTAIN }, { x: 0, y: 1, type: TileType.MOUNTAIN },
    { x: 0, y: 8, type: TileType.MOUNTAIN }, { x: 0, y: 9, type: TileType.MOUNTAIN },
    { x: 11, y: 0, type: TileType.MOUNTAIN }, { x: 11, y: 1, type: TileType.MOUNTAIN },
    { x: 11, y: 8, type: TileType.MOUNTAIN }, { x: 11, y: 9, type: TileType.MOUNTAIN },
    // 숲 엄폐물
    { x: 4, y: 2, type: TileType.FOREST }, { x: 4, y: 7, type: TileType.FOREST },
    { x: 5, y: 4, type: TileType.FOREST }, { x: 5, y: 5, type: TileType.FOREST },
    { x: 7, y: 3, type: TileType.FOREST }, { x: 7, y: 6, type: TileType.FOREST },
    { x: 8, y: 4, type: TileType.FOREST }, { x: 8, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e6_7', '원술', UnitClass.STRATEGIST, 10, 4, 13, { maxHp: 180, hp: 180, spirit: 55 }),
    enemy('e6_8', '원술 호위병', UnitClass.INFANTRY, 9, 3, 11),
    enemy('e6_9', '원술 호위병', UnitClass.INFANTRY, 9, 5, 11),
    enemy('e6_10', '원술 호위기병', UnitClass.CAVALRY, 10, 2, 11),
    enemy('e6_11', '원술 호위기병', UnitClass.CAVALRY, 10, 6, 11),
    enemy('e6_12', '원술 친위병', UnitClass.INFANTRY, 11, 4, 11),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

export const CHAPTER_6: Chapter = {
  id: 'ch6',
  name: '제6장: 원문의 화극',
  description: '196년. 원문사격의 전설, 원술과의 대결.',
  stages: [
    {
      id: 'ch6_s1', name: '원술 선봉대 견제', description: '기령이 이끄는 원술 선봉대를 격퇴하라',
      preDialogue: {
        lines: [
          { speaker: '원술', text: '기령! 3만 대군을 이끌고 유비를 치거라. 소패를 밟아버려!', speakerSide: 'right' },
          { speaker: '기령', text: '명을 받들겠습니다! 유비 따위, 한 달도 버티지 못할 것입니다!', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(원문사격... 그 전설의 장면이 다가오는군. 방천화극으로 원문을 쏘아 전쟁을 멈춘 일화.)', speakerSide: 'left' },
          { speaker: '여포', text: '유비를 돕는 것이 아니라, 이 여포의 위엄을 보여주는 것이다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '선봉대는 격퇴했다. 하지만 원술 본대가 아직 남아있군.', speakerSide: 'left' },
          { speaker: '여포(내심)', text: '(이제 원문사격으로 결판을 낸다!)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 600 },
    },
    {
      id: 'ch6_s2', name: '원술군 본대 격파', description: '원술의 본대를 격파하라',
      preDialogue: {
        lines: [
          { speaker: '여포(내심)', text: '(원문사격은 성공했지만... 원술이 철수를 거부했다.)', speakerSide: 'left' },
          { speaker: '원술', text: '여포 따위에게 굴복할 수는 없다! 전군 돌격!', speakerSide: 'right' },
          { speaker: '여포', text: '결국 싸워야 하는군. 좋다, 원술! 이 여포가 직접 상대해주마!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '원술이 패퇴했다! 감히 이 여포에게 덤비다니!', speakerSide: 'left' },
          { speaker: '진궁', text: '봉선공의 위명이 천하에 울려 퍼졌습니다! 원문사격의 일화는 길이 전해질 것입니다.', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(원술을 물리쳤다. 하지만 다음은... 유비와 조조, 더 큰 적들이 기다리고 있어.)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 800 },
    },
  ],
};
