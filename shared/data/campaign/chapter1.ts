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
    [UnitClass.INFANTRY]: { maxHp: 120, hp: 120, attack: 30, defense: 18, speed: 4, moveRange: 4, attackRange: 1 },
    [UnitClass.CAVALRY]: { maxHp: 140, hp: 140, attack: 35, defense: 15, speed: 5, moveRange: 6, attackRange: 1 },
    [UnitClass.ARCHER]: { maxHp: 80, hp: 80, attack: 28, defense: 10, speed: 5, moveRange: 3, attackRange: 2 },
    [UnitClass.STRATEGIST]: { maxHp: 70, hp: 70, attack: 22, defense: 8, speed: 3, moveRange: 3, attackRange: 1 },
    [UnitClass.BANDIT]: { maxHp: 100, hp: 100, attack: 28, defense: 12, speed: 6, moveRange: 5, attackRange: 1 },
    [UnitClass.MARTIAL_ARTIST]: { maxHp: 110, hp: 110, attack: 32, defense: 14, speed: 5, moveRange: 4, attackRange: 1 },
  };
  const stats = { ...base[cls], ...overrides };
  // 레벨에 따른 스탯 보정
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

// ── 1장: 황건적의 난 ──

const stage1Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    { x: 5, y: 3, type: TileType.FOREST }, { x: 5, y: 4, type: TileType.FOREST },
    { x: 5, y: 5, type: TileType.FOREST }, { x: 5, y: 6, type: TileType.FOREST },
    { x: 6, y: 4, type: TileType.FOREST }, { x: 6, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e1_1', '장각', UnitClass.STRATEGIST, 10, 4, 2, { maxHp: 100, hp: 100, attack: 28 }),
    enemy('e1_2', '황건병', UnitClass.BANDIT, 9, 2, 1),
    enemy('e1_3', '황건병', UnitClass.BANDIT, 9, 6, 1),
    enemy('e1_4', '황건궁수', UnitClass.ARCHER, 10, 1, 1),
  ],
  playerStartPositions: [{ x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

const stage2Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    { x: 4, y: 2, type: TileType.FOREST }, { x: 4, y: 7, type: TileType.FOREST },
    { x: 7, y: 3, type: TileType.MOUNTAIN }, { x: 7, y: 6, type: TileType.MOUNTAIN },
    { x: 8, y: 4, type: TileType.FOREST }, { x: 8, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e2_1', '장보', UnitClass.MARTIAL_ARTIST, 10, 4, 2, { maxHp: 130, hp: 130, attack: 35 }),
    enemy('e2_2', '황건도적', UnitClass.BANDIT, 9, 2, 2),
    enemy('e2_3', '황건도적', UnitClass.BANDIT, 9, 7, 2),
    enemy('e2_4', '황건병', UnitClass.INFANTRY, 8, 3, 1),
    enemy('e2_5', '황건병', UnitClass.INFANTRY, 8, 6, 1),
  ],
  playerStartPositions: [{ x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

const stage3Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    { x: 3, y: 1, type: TileType.WATER }, { x: 3, y: 2, type: TileType.WATER },
    { x: 3, y: 3, type: TileType.BRIDGE },
    { x: 3, y: 7, type: TileType.WATER }, { x: 3, y: 8, type: TileType.WATER },
    { x: 6, y: 4, type: TileType.FOREST }, { x: 6, y: 5, type: TileType.FOREST },
    { x: 7, y: 4, type: TileType.FOREST },
    { x: 9, y: 2, type: TileType.MOUNTAIN },
  ]),
  enemyUnits: [
    enemy('e3_1', '장량', UnitClass.STRATEGIST, 10, 4, 3, { maxHp: 110, hp: 110, attack: 30 }),
    enemy('e3_2', '황건기병', UnitClass.CAVALRY, 9, 2, 2),
    enemy('e3_3', '황건기병', UnitClass.CAVALRY, 9, 7, 2),
    enemy('e3_4', '황건도적', UnitClass.BANDIT, 8, 4, 2),
    enemy('e3_5', '황건도적', UnitClass.BANDIT, 8, 5, 2),
    enemy('e3_6', '황건궁수', UnitClass.ARCHER, 10, 1, 2),
  ],
  playerStartPositions: [{ x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

export const CHAPTER_1: Chapter = {
  id: 'ch1',
  name: '제1장: 황건적의 난',
  description: '184년, 황건적이 봉기하다. 조조는 의병을 이끌고 토벌에 나선다.',
  stages: [
    {
      id: 'ch1_s1', name: '영천 전투', description: '황건적 선봉과의 첫 전투',
      preDialogue: {
        lines: [
          { speaker: '조조', text: '황건적이 영천을 침범했다. 백성들이 고통받고 있으니 우리가 나서야 한다!', speakerSide: 'left' },
          { speaker: '하후돈', text: '주공, 병사들은 준비가 되었습니다. 명만 내려주십시오!', speakerSide: 'left' },
          { speaker: '조조', text: '좋다! 전군, 출격하라!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '조조', text: '첫 전투를 승리로 이끌었다. 하지만 황건적의 주력은 아직 건재하다.', speakerSide: 'left' },
          { speaker: '하후연', text: '장각의 형제들이 각지에서 세력을 키우고 있다 합니다.', speakerSide: 'left' },
          { speaker: '조조', text: '서둘러 다음 거점을 공략하자.', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 100 },
    },
    {
      id: 'ch1_s2', name: '완성 전투', description: '장보의 부대를 격파하라',
      preDialogue: {
        lines: [
          { speaker: '조조', text: '완성에 장보가 진을 치고 있다. 무도에 능한 자라 하니 조심해야 한다.', speakerSide: 'left' },
          { speaker: '하후돈', text: '무도가라... 흥, 내 창이면 충분합니다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '조조', text: '장보를 격파했다! 이제 장량만 남았군.', speakerSide: 'left' },
          { speaker: '하후연', text: '장량은 꾀가 많다고 합니다. 경계를 늦추지 마십시오.', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 150 },
    },
    {
      id: 'ch1_s3', name: '광종 전투', description: '장량을 무찌르고 황건적을 섬멸하라',
      preDialogue: {
        lines: [
          { speaker: '조조', text: '광종에서 장량이 최후의 저항을 하고 있다. 이 전투로 황건의 난을 끝낸다!', speakerSide: 'left' },
          { speaker: '하후돈', text: '적의 기병이 많습니다. 숲을 이용해 기동을 제한합시다.', speakerSide: 'left' },
          { speaker: '하후연', text: '강을 건너려면 다리를 이용해야 합니다. 길목을 지키면 유리합니다.', speakerSide: 'left' },
        ],
      },
      battleConfig: stage3Battle,
      postDialogue: {
        lines: [
          { speaker: '조조', text: '드디어 황건적을 토벌했다! 하지만... 천하는 아직 혼란스럽구나.', speakerSide: 'left' },
          { speaker: '하후돈', text: '주공, 이번 전공으로 조정에서 관직을 내릴 것입니다.', speakerSide: 'left' },
          { speaker: '조조', text: '관직보다 중요한 것은 천하의 안녕이다. 앞으로도 갈 길이 멀다.', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 200 },
    },
  ],
};
