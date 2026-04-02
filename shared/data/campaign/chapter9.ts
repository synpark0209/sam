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

// ── 챕터 9: 백문루의 선택 ──

// 9-1: 내부 반란 진압 (성 내부, 산으로 벽 표현, 좁은 통로)
const stage1Battle: BattleConfig = {
  mapWidth: 10, mapHeight: 10,
  tiles: plainMap(10, 10, [
    // 성벽 외곽 (산으로 표현)
    { x: 0, y: 0, type: TileType.MOUNTAIN }, { x: 1, y: 0, type: TileType.MOUNTAIN },
    { x: 2, y: 0, type: TileType.MOUNTAIN }, { x: 7, y: 0, type: TileType.MOUNTAIN },
    { x: 8, y: 0, type: TileType.MOUNTAIN }, { x: 9, y: 0, type: TileType.MOUNTAIN },
    { x: 0, y: 9, type: TileType.MOUNTAIN }, { x: 1, y: 9, type: TileType.MOUNTAIN },
    { x: 2, y: 9, type: TileType.MOUNTAIN }, { x: 7, y: 9, type: TileType.MOUNTAIN },
    { x: 8, y: 9, type: TileType.MOUNTAIN }, { x: 9, y: 9, type: TileType.MOUNTAIN },
    // 내부 벽 (좁은 통로 형성)
    { x: 3, y: 2, type: TileType.MOUNTAIN }, { x: 4, y: 2, type: TileType.MOUNTAIN },
    { x: 6, y: 2, type: TileType.MOUNTAIN }, { x: 7, y: 2, type: TileType.MOUNTAIN },
    { x: 3, y: 7, type: TileType.MOUNTAIN }, { x: 4, y: 7, type: TileType.MOUNTAIN },
    { x: 6, y: 7, type: TileType.MOUNTAIN }, { x: 7, y: 7, type: TileType.MOUNTAIN },
    // 중앙 기둥
    { x: 5, y: 4, type: TileType.MOUNTAIN }, { x: 5, y: 5, type: TileType.MOUNTAIN },
    // 숲 장식
    { x: 1, y: 4, type: TileType.FOREST }, { x: 1, y: 5, type: TileType.FOREST },
    { x: 8, y: 4, type: TileType.FOREST }, { x: 8, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e9_1', '후성', UnitClass.CAVALRY, 7, 4, 28, { maxHp: 360, hp: 360, attack: 72, defense: 30 }),
    enemy('e9_2', '위속', UnitClass.INFANTRY, 7, 5, 27, { maxHp: 350, hp: 350, attack: 68, defense: 28 }),
    enemy('e9_3', '송헌', UnitClass.ARCHER, 8, 3, 27, { maxHp: 280, hp: 280, attack: 62, defense: 18 }),
    enemy('e9_4', '반란군 보병', UnitClass.INFANTRY, 6, 3, 26),
    enemy('e9_5', '반란군 보병', UnitClass.INFANTRY, 6, 6, 25),
    enemy('e9_6', '반란군 보병', UnitClass.INFANTRY, 8, 6, 25),
  ],
  playerStartPositions: [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 1, y: 3 }, { x: 1, y: 6 }],
};

// 9-2: 하비성 탈출전 (포위된 성, 좁은 탈출구)
const stage2Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 성벽 (산으로 표현) - 동문만 열림
    { x: 0, y: 0, type: TileType.MOUNTAIN }, { x: 1, y: 0, type: TileType.MOUNTAIN },
    { x: 2, y: 0, type: TileType.MOUNTAIN }, { x: 3, y: 0, type: TileType.MOUNTAIN },
    { x: 4, y: 0, type: TileType.MOUNTAIN },
    { x: 0, y: 9, type: TileType.MOUNTAIN }, { x: 1, y: 9, type: TileType.MOUNTAIN },
    { x: 2, y: 9, type: TileType.MOUNTAIN }, { x: 3, y: 9, type: TileType.MOUNTAIN },
    { x: 4, y: 9, type: TileType.MOUNTAIN },
    { x: 0, y: 3, type: TileType.MOUNTAIN }, { x: 0, y: 4, type: TileType.MOUNTAIN },
    { x: 0, y: 5, type: TileType.MOUNTAIN }, { x: 0, y: 6, type: TileType.MOUNTAIN },
    // 성 내부 구조물
    { x: 3, y: 3, type: TileType.FOREST }, { x: 3, y: 6, type: TileType.FOREST },
    // 성 외부 - 해자 (수로)
    { x: 5, y: 1, type: TileType.WATER }, { x: 5, y: 2, type: TileType.WATER },
    { x: 5, y: 3, type: TileType.WATER }, { x: 5, y: 4, type: TileType.BRIDGE },
    { x: 5, y: 5, type: TileType.BRIDGE }, { x: 5, y: 6, type: TileType.WATER },
    { x: 5, y: 7, type: TileType.WATER }, { x: 5, y: 8, type: TileType.WATER },
    // 외부 숲
    { x: 8, y: 2, type: TileType.FOREST }, { x: 9, y: 3, type: TileType.FOREST },
    { x: 8, y: 7, type: TileType.FOREST }, { x: 9, y: 6, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e9_7', '조조', UnitClass.STRATEGIST, 10, 4, 30, { maxHp: 400, hp: 400, attack: 58, spirit: 80, defense: 25 }),
    enemy('e9_8', '허저', UnitClass.MARTIAL_ARTIST, 8, 3, 28, { maxHp: 420, hp: 420, attack: 82, defense: 30 }),
    enemy('e9_9', '전위', UnitClass.MARTIAL_ARTIST, 8, 6, 28, { maxHp: 410, hp: 410, attack: 78, defense: 28 }),
    enemy('e9_10', '하후돈', UnitClass.INFANTRY, 7, 1, 28, { maxHp: 390, hp: 390, attack: 72, defense: 32 }),
    enemy('e9_11', '조조군 보병', UnitClass.INFANTRY, 9, 2, 26),
    enemy('e9_12', '조조군 기병', UnitClass.CAVALRY, 9, 7, 26),
    enemy('e9_13', '조조군 보병', UnitClass.INFANTRY, 10, 1, 25),
    enemy('e9_14', '조조군 기병', UnitClass.CAVALRY, 10, 8, 25),
  ],
  playerStartPositions: [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 1, y: 4 }, { x: 1, y: 5 }],
};

export const CHAPTER_9: Chapter = {
  id: 'ch9',
  name: '제9장: 백문루의 선택',
  description: '198년 12월. 부하들의 반란을 막고, 하비성을 탈출하라.',
  stages: [
    {
      id: 'ch9_s1', name: '내부 반란 진압', description: '후성, 위속, 송헌의 반란을 진압하라',
      preDialogue: {
        lines: [
          { speaker: '여포', text: '(후성, 위속, 송헌... 역사에서 이놈들이 배신했지. 이번에는 미리 막겠다!)', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공! 성 안에서 반란입니다!', speakerSide: 'right' },
          { speaker: '여포', text: '이미 알고 있었다. 따라와라, 장료!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '이번에는 당하지 않는다! 반란은 끝났다!', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공, 반란군은 모두 제압되었습니다.', speakerSide: 'right' },
          { speaker: '진궁', text: '봉선공, 성 밖으로 나가 조조와 맞서야 합니다. 이대로는 포위당합니다!', speakerSide: 'right' },
          { speaker: '여포', text: '(역사에서는 이 성에서 잡혀 죽었지... 탈출해야 한다!)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 1000 },
    },
    {
      id: 'ch9_s2', name: '하비성 탈출전', description: '조조의 포위망을 뚫고 탈출하라',
      preDialogue: {
        lines: [
          { speaker: '여포', text: '(역사에서는 여기서 끝이었지... 하지만 이번에는 다르다!)', speakerSide: 'left' },
          { speaker: '진궁', text: '봉선공, 동문으로 돌파합시다! 그쪽의 포위가 가장 얇습니다!', speakerSide: 'right' },
          { speaker: '고순', text: '제가 후위를 맡겠습니다. 봉선공은 앞으로 돌파하십시오!', speakerSide: 'right' },
          { speaker: '여포', text: '고순... 반드시 살아서 나와라. 이번에는 아무도 잃지 않는다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '해냈다... 역사를 바꿨다! 백문루에서 죽지 않았다!', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공, 이제 어디로 가십니까?', speakerSide: 'right' },
          { speaker: '여포', text: '천하를 향해 간다. 더 이상 쫓기는 여포가 아니다!', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 1500 },
    },
  ],
};
