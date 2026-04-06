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
  const base: Partial<Record<UnitClass, UnitData['stats']>> = {
    [UnitClass.INFANTRY]: { maxHp: 120, hp: 120, attack: 30, defense: 18, spirit: 8, agility: 18, critical: 20, morale: 30, speed: 4, penetration: 5, resist: 15, moveRange: 4, attackRange: 1 },
    [UnitClass.CAVALRY]: { maxHp: 140, hp: 140, attack: 35, defense: 15, spirit: 8, agility: 25, critical: 25, morale: 30, speed: 5, penetration: 8, resist: 10, moveRange: 6, attackRange: 1 },
    [UnitClass.ARCHER]: { maxHp: 80, hp: 80, attack: 28, defense: 10, spirit: 10, agility: 35, critical: 30, morale: 20, speed: 5, penetration: 5, resist: 10, moveRange: 3, attackRange: 2 },
    [UnitClass.STRATEGIST]: { maxHp: 70, hp: 70, attack: 22, defense: 8, spirit: 40, agility: 15, critical: 10, morale: 25, speed: 3, penetration: 0, resist: 30, moveRange: 3, attackRange: 1 },
    [UnitClass.BANDIT]: { maxHp: 100, hp: 100, attack: 28, defense: 12, spirit: 8, agility: 40, critical: 35, morale: 20, speed: 6, penetration: 20, resist: 10, moveRange: 5, attackRange: 1 },
    [UnitClass.MARTIAL_ARTIST]: { maxHp: 110, hp: 110, attack: 32, defense: 14, spirit: 12, agility: 30, critical: 45, morale: 35, speed: 5, penetration: 10, resist: 15, moveRange: 4, attackRange: 1 },
    [UnitClass.DANCER]: { maxHp: 70, hp: 70, attack: 18, defense: 8, spirit: 35, agility: 20, critical: 10, morale: 30, speed: 4, penetration: 0, resist: 25, moveRange: 4, attackRange: 1 },
    [UnitClass.TAOIST]: { maxHp: 80, hp: 80, attack: 22, defense: 10, spirit: 38, agility: 18, critical: 12, morale: 25, speed: 3, penetration: 0, resist: 28, moveRange: 3, attackRange: 1 },
    [UnitClass.GEOMANCER]: { maxHp: 75, hp: 75, attack: 15, defense: 12, spirit: 35, agility: 15, critical: 8, morale: 25, speed: 3, penetration: 0, resist: 30, moveRange: 3, attackRange: 1 },
    [UnitClass.SIEGE]: { maxHp: 200, hp: 200, attack: 45, defense: 30, spirit: 0, agility: 5, critical: 5, morale: 50, speed: 2, penetration: 20, resist: 5, moveRange: 2, attackRange: 2 },
  };
  const stats = { ...(base[cls] ?? base[UnitClass.INFANTRY]!), ...overrides };
  stats.maxHp += (level - 1) * 8;
  stats.hp = stats.maxHp;
  stats.attack += (level - 1) * 3;
  stats.defense += (level - 1) * 2;
  const spiritClasses = [UnitClass.STRATEGIST, UnitClass.DANCER, UnitClass.TAOIST, UnitClass.GEOMANCER];
  stats.spirit = (stats.spirit ?? 0) + (level - 1) * (spiritClasses.includes(cls) ? 4 : 1);
  stats.agility = (stats.agility ?? 0) + (level - 1) * 1;
  stats.critical = (stats.critical ?? 0) + (level - 1) * 1;
  stats.morale = (stats.morale ?? 0) + (level - 1) * 1;
  stats.resist = (stats.resist ?? 0) + (level - 1) * 1;
  return {
    id, name, faction: 'enemy', unitClass: cls,
    level, exp: 0, mp: spiritClasses.includes(cls) ? 20 + level * 2 : 8 + level, maxMp: spiritClasses.includes(cls) ? 20 + level * 2 : 8 + level,
    skills: cls === UnitClass.STRATEGIST ? ['fire', 'heal'] : cls === UnitClass.ARCHER ? ['arrow_rain'] : [],
    position: { x, y }, stats, hasActed: false, isAlive: true,
  };
}

// ── 챕터 10: 봉선의 천하 ──

// 10-1: 세력 재건전 (개활지 + 숲)
const stage1Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 숲 지형 (은신처/거점)
    { x: 3, y: 2, type: TileType.FOREST }, { x: 3, y: 3, type: TileType.FOREST },
    { x: 4, y: 2, type: TileType.FOREST }, { x: 4, y: 3, type: TileType.FOREST },
    { x: 7, y: 6, type: TileType.FOREST }, { x: 7, y: 7, type: TileType.FOREST },
    { x: 8, y: 6, type: TileType.FOREST }, { x: 8, y: 7, type: TileType.FOREST },
    // 언덕
    { x: 6, y: 4, type: TileType.MOUNTAIN }, { x: 6, y: 5, type: TileType.MOUNTAIN },
    // 시냇물
    { x: 5, y: 0, type: TileType.WATER }, { x: 5, y: 1, type: TileType.WATER },
    { x: 5, y: 2, type: TileType.BRIDGE }, { x: 5, y: 3, type: TileType.WATER },
  ]),
  enemyUnits: [
    enemy('e10_1', '잔적 수괴', UnitClass.BANDIT, 9, 4, 30, { maxHp: 400, hp: 400, attack: 75, defense: 28 }),
    enemy('e10_2', '잔적 도적', UnitClass.BANDIT, 8, 3, 29),
    enemy('e10_3', '잔적 도적', UnitClass.BANDIT, 8, 5, 29),
    enemy('e10_4', '잔적 보병', UnitClass.INFANTRY, 9, 2, 28),
    enemy('e10_5', '잔적 보병', UnitClass.INFANTRY, 9, 7, 28),
    enemy('e10_6', '잔적 도적', UnitClass.BANDIT, 10, 4, 28),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 3 }, { x: 2, y: 6 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
};

// 10-2: 조조와의 최종 결전 (대전장, 다양한 지형)
const stage2Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 숲
    { x: 3, y: 1, type: TileType.FOREST }, { x: 3, y: 2, type: TileType.FOREST },
    { x: 4, y: 1, type: TileType.FOREST },
    { x: 8, y: 7, type: TileType.FOREST }, { x: 9, y: 7, type: TileType.FOREST },
    { x: 8, y: 8, type: TileType.FOREST },
    // 산
    { x: 5, y: 0, type: TileType.MOUNTAIN }, { x: 6, y: 0, type: TileType.MOUNTAIN },
    { x: 5, y: 9, type: TileType.MOUNTAIN }, { x: 6, y: 9, type: TileType.MOUNTAIN },
    // 하천 + 다리
    { x: 5, y: 3, type: TileType.WATER }, { x: 5, y: 4, type: TileType.BRIDGE },
    { x: 5, y: 5, type: TileType.BRIDGE }, { x: 5, y: 6, type: TileType.WATER },
    // 언덕
    { x: 9, y: 3, type: TileType.MOUNTAIN }, { x: 10, y: 3, type: TileType.MOUNTAIN },
  ]),
  enemyUnits: [
    enemy('e10_7', '조조', UnitClass.STRATEGIST, 10, 4, 33, { maxHp: 450, hp: 450, attack: 65, spirit: 85, defense: 28 }),
    enemy('e10_8', '허저', UnitClass.MARTIAL_ARTIST, 9, 4, 32, { maxHp: 480, hp: 480, attack: 88, defense: 32 }),
    enemy('e10_9', '하후돈', UnitClass.INFANTRY, 9, 2, 31, { maxHp: 450, hp: 450, attack: 80, defense: 38 }),
    enemy('e10_10', '하후연', UnitClass.CAVALRY, 10, 1, 31, { maxHp: 430, hp: 430, attack: 82, defense: 30 }),
    enemy('e10_11', '악진', UnitClass.CAVALRY, 10, 8, 30, { maxHp: 400, hp: 400, attack: 75, defense: 28 }),
    enemy('e10_12', '조조군 정예보병', UnitClass.INFANTRY, 8, 5, 29),
    enemy('e10_13', '조조군 정예궁병', UnitClass.ARCHER, 10, 6, 29),
    enemy('e10_14', '조조군 정예보병', UnitClass.INFANTRY, 8, 2, 28),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 3 }, { x: 2, y: 6 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
};

// 10-3: 천하통일 최종전 (황궁, 웅장한 배치)
const stage3Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 궁전 벽 (산으로 표현)
    { x: 0, y: 0, type: TileType.MOUNTAIN }, { x: 1, y: 0, type: TileType.MOUNTAIN },
    { x: 2, y: 0, type: TileType.MOUNTAIN }, { x: 9, y: 0, type: TileType.MOUNTAIN },
    { x: 10, y: 0, type: TileType.MOUNTAIN }, { x: 11, y: 0, type: TileType.MOUNTAIN },
    { x: 0, y: 9, type: TileType.MOUNTAIN }, { x: 1, y: 9, type: TileType.MOUNTAIN },
    { x: 2, y: 9, type: TileType.MOUNTAIN }, { x: 9, y: 9, type: TileType.MOUNTAIN },
    { x: 10, y: 9, type: TileType.MOUNTAIN }, { x: 11, y: 9, type: TileType.MOUNTAIN },
    // 중앙 궁전 구조 (산)
    { x: 6, y: 3, type: TileType.MOUNTAIN }, { x: 7, y: 3, type: TileType.MOUNTAIN },
    { x: 6, y: 6, type: TileType.MOUNTAIN }, { x: 7, y: 6, type: TileType.MOUNTAIN },
    // 다리 (황궁 입구)
    { x: 3, y: 3, type: TileType.WATER }, { x: 3, y: 4, type: TileType.BRIDGE },
    { x: 3, y: 5, type: TileType.BRIDGE }, { x: 3, y: 6, type: TileType.WATER },
    // 정원 숲
    { x: 8, y: 1, type: TileType.FOREST }, { x: 9, y: 1, type: TileType.FOREST },
    { x: 8, y: 8, type: TileType.FOREST }, { x: 9, y: 8, type: TileType.FOREST },
    { x: 5, y: 4, type: TileType.FOREST }, { x: 5, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e10_15', '관우', UnitClass.CAVALRY, 10, 4, 35, { maxHp: 550, hp: 550, attack: 100, defense: 45, morale: 60 }),
    enemy('e10_16', '유비', UnitClass.CAVALRY, 9, 4, 33, { maxHp: 450, hp: 450, attack: 80, defense: 35, morale: 55 }),
    enemy('e10_17', '장비', UnitClass.INFANTRY, 10, 5, 34, { maxHp: 520, hp: 520, attack: 95, defense: 40 }),
    enemy('e10_18', '제갈량', UnitClass.STRATEGIST, 8, 4, 35, { maxHp: 400, hp: 400, attack: 55, spirit: 100, defense: 25 }),
    enemy('e10_19', '조운', UnitClass.CAVALRY, 9, 2, 34, { maxHp: 500, hp: 500, attack: 90, defense: 38, agility: 45 }),
    enemy('e10_20', '손권', UnitClass.STRATEGIST, 8, 7, 32, { maxHp: 380, hp: 380, attack: 50, spirit: 80, defense: 22 }),
    enemy('e10_21', '주유', UnitClass.STRATEGIST, 9, 7, 33, { maxHp: 390, hp: 390, attack: 52, spirit: 90, defense: 20 }),
    enemy('e10_22', '손책', UnitClass.CAVALRY, 10, 7, 32, { maxHp: 480, hp: 480, attack: 85, defense: 35, agility: 42 }),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 3 }, { x: 2, y: 6 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
};

export const CHAPTER_10: Chapter = {
  id: 'ch10',
  name: '제10장: 봉선의 천하',
  description: '199년~. 천하무적 봉선, 역사를 바꾸다.',
  stages: [
    {
      id: 'ch10_s1', name: '세력 재건전', description: '잔적을 소탕하고 거점을 확보하라',
      preDialogue: {
        lines: [
          { speaker: '여포', text: '새로운 시작이다. 먼저 세력을 재건해야 해.', speakerSide: 'left' },
          { speaker: '진궁', text: '봉선공, 소수의 병력이지만 봉선공의 무명이 있습니다. 잔적부터 소탕합시다.', speakerSide: 'right' },
          { speaker: '장료', text: '병사들의 사기가 높습니다! 봉선공을 따르겠다는 자들이 모여들고 있습니다!', speakerSide: 'right' },
          { speaker: '여포', text: '좋다. 이것이 천하를 향한 첫걸음이다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '잔적은 소탕되었다. 이곳을 거점으로 삼는다.', speakerSide: 'left' },
          { speaker: '진궁', text: '봉선공, 좋은 출발입니다. 이제 본격적으로 세력을 키워야 합니다.', speakerSide: 'right' },
          { speaker: '여포', text: '이것이 첫걸음이다. 다음은 조조를 쓰러뜨린다.', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 1000, items: ['celestial_scroll', 'hex_mark'] },
    },
    {
      id: 'ch10_s2', name: '조조와의 최종 결전', description: '숙적 조조를 격파하라',
      preDialogue: {
        lines: [
          { speaker: '여포', text: '조조... 마지막 결전이다. 하비성의 빚을 갚겠다!', speakerSide: 'left' },
          { speaker: '조조', text: '여포, 이번에는 놓치지 않겠다. 네 목을 취하마!', speakerSide: 'right' },
          { speaker: '진궁', text: '봉선공, 승리하면 천하가 봉선공의 것입니다! 전력을 다합시다!', speakerSide: 'right' },
          { speaker: '여포', text: '방천화극이 기다리고 있다, 조조!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '해냈다...! 조조를 격파했다!', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공 만세! 조조군이 궤멸되었습니다!', speakerSide: 'right' },
          { speaker: '진궁', text: '봉선공, 이제 남은 것은 하나... 천하통일입니다.', speakerSide: 'right' },
          { speaker: '여포', text: '(여기까지 왔다... 이제 마지막이다.)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 3000, items: ['phoenix_feather', 'mana_crystal'] },
    },
    {
      id: 'ch10_s3', name: '천하통일 최종전', description: '천하의 영웅들을 모두 꺾고 천하를 통일하라',
      preDialogue: {
        lines: [
          { speaker: '여포', text: '(마지막이다. 천하통일... 방구석에서 꿈꾸던 그것을 이룬다!)', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공, 천하의 영웅들이 모두 모였습니다! 유비, 손권... 최후의 연합군입니다!', speakerSide: 'right' },
          { speaker: '진궁', text: '이것이 마지막 전투입니다. 봉선공의 천하무쌍을 보여주십시오!', speakerSide: 'right' },
          { speaker: '여포', text: '관우, 장비, 조운, 제갈량... 삼국지 최강의 영웅들이 총출동이라고?', speakerSide: 'left' },
          { speaker: '여포', text: '좋다! 이 여포가 왜 천하무적인지 똑똑히 보여주마!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage3Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '해냈다... 방천화극과 적토마로 천하를 통일했다.', speakerSide: 'left' },
          { speaker: '여포', text: '(삼국지 게임에서 "여포가 되면 다 이기겠다"고 했는데... 진짜로 해버렸네.)', speakerSide: 'left' },
          { speaker: '여포', text: '(정원을 지키고, 진궁의 지혜를 빌리고, 장료와 고순을 믿었기에 가능했다.)', speakerSide: 'left' },
          { speaker: '여포', text: '(이것은 단순한 무력이 아니라, 사람의 힘이었다.)', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공... 아니, 폐하. 천하가 평화롭습니다.', speakerSide: 'right' },
          { speaker: '여포', text: '장료, 고순, 진궁... 고맙다. 이 천하는 너희와 함께 만든 것이다.', speakerSide: 'left' },
          { speaker: '여포', text: '(방구석으로 돌아갈 수 있을까? ...돌아가고 싶지 않은걸.)', speakerSide: 'left' },
          { speaker: '여포', text: '(THE END - 방구석 여포뎐)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 10000, items: ['sky_piercer', 'red_hare'] },
    },
  ],
};
