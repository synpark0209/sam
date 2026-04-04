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

// ── 챕터 4: 연주 쟁탈전 ──

// 4-1: 연주성 기습
const stage1Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 성벽(산)으로 둘러싸인 도시 레이아웃
    { x: 6, y: 0, type: TileType.MOUNTAIN }, { x: 7, y: 0, type: TileType.MOUNTAIN },
    { x: 8, y: 0, type: TileType.MOUNTAIN }, { x: 9, y: 0, type: TileType.MOUNTAIN },
    { x: 6, y: 1, type: TileType.MOUNTAIN }, { x: 9, y: 1, type: TileType.MOUNTAIN },
    { x: 6, y: 8, type: TileType.MOUNTAIN }, { x: 9, y: 8, type: TileType.MOUNTAIN },
    { x: 6, y: 9, type: TileType.MOUNTAIN }, { x: 7, y: 9, type: TileType.MOUNTAIN },
    { x: 8, y: 9, type: TileType.MOUNTAIN }, { x: 9, y: 9, type: TileType.MOUNTAIN },
    // 성문(다리) - 좌측 입구
    { x: 6, y: 4, type: TileType.BRIDGE }, { x: 6, y: 5, type: TileType.BRIDGE },
    // 성벽 연장
    { x: 6, y: 2, type: TileType.MOUNTAIN }, { x: 6, y: 3, type: TileType.MOUNTAIN },
    { x: 6, y: 6, type: TileType.MOUNTAIN }, { x: 6, y: 7, type: TileType.MOUNTAIN },
    // 성 내부 숲 (정원)
    { x: 8, y: 4, type: TileType.FOREST }, { x: 8, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e8_1', '순욱', UnitClass.STRATEGIST, 8, 3, 14, { maxHp: 200, hp: 200, attack: 38, spirit: 58, defense: 18 }),
    enemy('e8_2', '연주 수비병', UnitClass.INFANTRY, 7, 4, 13),
    enemy('e8_3', '연주 수비병', UnitClass.INFANTRY, 7, 5, 13),
    enemy('e8_4', '연주 궁수', UnitClass.ARCHER, 9, 3, 12),
    enemy('e8_5', '연주 궁수', UnitClass.ARCHER, 9, 6, 12),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 3 }, { x: 2, y: 6 }],
};

// 4-2: 복양성 공방전
const stage2Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 성벽(산)으로 구성된 복양성 - 좁은 진입로
    { x: 3, y: 0, type: TileType.MOUNTAIN }, { x: 3, y: 1, type: TileType.MOUNTAIN },
    { x: 3, y: 2, type: TileType.MOUNTAIN },
    { x: 3, y: 7, type: TileType.MOUNTAIN }, { x: 3, y: 8, type: TileType.MOUNTAIN },
    { x: 3, y: 9, type: TileType.MOUNTAIN },
    // 성 내부 구조
    { x: 7, y: 0, type: TileType.MOUNTAIN }, { x: 7, y: 1, type: TileType.MOUNTAIN },
    { x: 7, y: 8, type: TileType.MOUNTAIN }, { x: 7, y: 9, type: TileType.MOUNTAIN },
    // 좁은 진입로 (다리)
    { x: 3, y: 4, type: TileType.BRIDGE }, { x: 3, y: 5, type: TileType.BRIDGE },
    // 화공 지역 (숲)
    { x: 5, y: 3, type: TileType.FOREST }, { x: 5, y: 4, type: TileType.FOREST },
    { x: 5, y: 5, type: TileType.FOREST }, { x: 5, y: 6, type: TileType.FOREST },
    // 방어 진지
    { x: 9, y: 3, type: TileType.FOREST }, { x: 9, y: 6, type: TileType.FOREST },
    { x: 10, y: 4, type: TileType.FOREST }, { x: 10, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e9_1', '조조', UnitClass.STRATEGIST, 10, 4, 16, { maxHp: 220, hp: 220, attack: 42, spirit: 62, defense: 20 }),
    enemy('e9_2', '허저', UnitClass.MARTIAL_ARTIST, 8, 3, 15, { maxHp: 300, hp: 300, attack: 68, defense: 25 }),
    enemy('e9_3', '전위', UnitClass.MARTIAL_ARTIST, 8, 6, 15, { maxHp: 290, hp: 290, attack: 66, defense: 24 }),
    enemy('e9_4', '하후돈', UnitClass.INFANTRY, 9, 2, 14, { maxHp: 280, hp: 280, attack: 62, defense: 28 }),
    enemy('e9_5', '악진', UnitClass.INFANTRY, 9, 7, 13, { maxHp: 260, hp: 260, attack: 58, defense: 22 }),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 1, y: 3 }, { x: 1, y: 6 }],
};

export const CHAPTER_4: Chapter = {
  id: 'ch4',
  name: '제4장: 연주 쟁탈전',
  description: '194년. 조조의 빈 연주를 기습하나, 돌아온 조조와 격돌.',
  stages: [
    {
      id: 'ch4_s1', name: '연주성 기습', description: '조조 부재 중 연주성을 기습 점령하라',
      preDialogue: {
        lines: [
          { speaker: '진궁', text: '봉선공, 조조가 서주 원정을 떠났습니다. 연주가 텅 비어 있습니다. 지금이 기회!', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(역사에서도 이렇게 했지... 하지만 결국 빼앗겼어. 이번에는 다르게 해야 해.)', speakerSide: 'left' },
          { speaker: '여포', text: '좋다, 진궁. 연주를 친다! 성문을 뚫어라!', speakerSide: 'left' },
          { speaker: '장료', text: '성벽이 견고합니다. 성문으로 집중 돌파해야 합니다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '연주를 점령했다! 드디어 우리만의 근거지가 생겼군!', speakerSide: 'left' },
          { speaker: '진궁', text: '연주 일대의 군현들이 속속 귀순하고 있습니다. 대세가 기울었습니다!', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(하지만 조조가 돌아온다... 역사에서는 복양성에서 치열하게 싸웠지.)', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공, 서주에서 조조군이 회군하고 있다는 보고입니다!', speakerSide: 'left' },
          { speaker: '여포', text: '예상대로군. 맞아 싸운다! 방어를 준비하라!', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 500 },
    },
    {
      id: 'ch4_s2', name: '복양성 공방전', description: '돌아온 조조 대군과 복양성에서 격돌하라',
      preDialogue: {
        lines: [
          { speaker: '진궁', text: '조조가 대군을 이끌고 복양성으로 진격합니다. 허저, 전위, 하후돈... 명장들이 총출동했습니다.', speakerSide: 'right' },
          { speaker: '진궁', text: '화공으로 조조를 유인합시다! 숲 지역에 불을 놓으면 적진을 혼란에 빠뜨릴 수 있습니다.', speakerSide: 'right' },
          { speaker: '여포', text: '조조... 역사에서 나를 처형한 자. 이번에는 내가 이긴다!', speakerSide: 'left' },
          { speaker: '장료', text: '적의 수가 많습니다. 좁은 통로를 이용해 각개격파해야 합니다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '조조를 물리쳤다...! 하지만 놈은 달아났군.', speakerSide: 'left' },
          { speaker: '조조', text: '여포... 만만치 않은 자다. 반드시 다시 오마.', speakerSide: 'right' },
          { speaker: '여포', text: '조조... 만만치 않군. 허저와 전위의 무용은 소문 이상이야.', speakerSide: 'left' },
          { speaker: '진궁', text: '봉선공, 연주를 완전히 장악하기엔 병력이 부족합니다. 장기전은 불리합니다.', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(역사에서도 결국 연주를 빼앗겼지... 다른 방도를 생각해야 해.)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 800 },
    },
  ],
};
