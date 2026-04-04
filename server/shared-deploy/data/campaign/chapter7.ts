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

// ── 챕터 7: 함진영의 전설 ──

// 7-1: 소패 공략전 (고순 활약)
const stage1Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 소규모 요새: 산이 벽, 다리 하나로 진입
    { x: 6, y: 0, type: TileType.MOUNTAIN }, { x: 6, y: 1, type: TileType.MOUNTAIN },
    { x: 6, y: 2, type: TileType.MOUNTAIN }, { x: 6, y: 3, type: TileType.MOUNTAIN },
    { x: 6, y: 6, type: TileType.MOUNTAIN }, { x: 6, y: 7, type: TileType.MOUNTAIN },
    { x: 6, y: 8, type: TileType.MOUNTAIN }, { x: 6, y: 9, type: TileType.MOUNTAIN },
    // 다리 입구
    { x: 6, y: 4, type: TileType.BRIDGE }, { x: 6, y: 5, type: TileType.BRIDGE },
    // 요새 내부 숲
    { x: 8, y: 3, type: TileType.FOREST }, { x: 8, y: 6, type: TileType.FOREST },
    { x: 9, y: 4, type: TileType.FOREST }, { x: 9, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e7_1', '관우', UnitClass.CAVALRY, 9, 4, 22, { maxHp: 350, hp: 350, attack: 80, defense: 40 }),
    enemy('e7_2', '장비', UnitClass.INFANTRY, 8, 3, 21, { maxHp: 330, hp: 330, attack: 75, defense: 35 }),
    enemy('e7_3', '유비군 보병', UnitClass.INFANTRY, 8, 6, 19),
    enemy('e7_4', '유비군 궁병', UnitClass.ARCHER, 10, 4, 18),
    enemy('e7_5', '유비군 궁병', UnitClass.ARCHER, 10, 5, 18),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

// 7-2: 조조 선봉대 격퇴
const stage2Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 방어 진지: 아군 측에 숲과 산
    { x: 2, y: 1, type: TileType.FOREST }, { x: 2, y: 8, type: TileType.FOREST },
    { x: 3, y: 3, type: TileType.FOREST }, { x: 3, y: 6, type: TileType.FOREST },
    { x: 4, y: 4, type: TileType.FOREST }, { x: 4, y: 5, type: TileType.FOREST },
    { x: 1, y: 0, type: TileType.MOUNTAIN }, { x: 1, y: 9, type: TileType.MOUNTAIN },
    { x: 0, y: 0, type: TileType.MOUNTAIN }, { x: 0, y: 1, type: TileType.MOUNTAIN },
    { x: 0, y: 8, type: TileType.MOUNTAIN }, { x: 0, y: 9, type: TileType.MOUNTAIN },
  ]),
  enemyUnits: [
    enemy('e7_6', '하후돈', UnitClass.INFANTRY, 10, 4, 22, { maxHp: 380, hp: 380, attack: 85, defense: 48 }),
    enemy('e7_7', '조조군 선봉보병', UnitClass.INFANTRY, 9, 3, 20),
    enemy('e7_8', '조조군 선봉보병', UnitClass.INFANTRY, 9, 6, 20),
    enemy('e7_9', '조조군 선봉기병', UnitClass.CAVALRY, 10, 2, 19),
    enemy('e7_10', '조조군 선봉기병', UnitClass.CAVALRY, 10, 7, 19),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

// 7-3: 장료의 야간 기습
const stage3Battle: BattleConfig = {
  mapWidth: 10, mapHeight: 10,
  tiles: plainMap(10, 10, [
    // 야간 숲: 숲 타일 다수, 좁은 통로
    { x: 1, y: 1, type: TileType.FOREST }, { x: 1, y: 3, type: TileType.FOREST },
    { x: 1, y: 5, type: TileType.FOREST }, { x: 1, y: 7, type: TileType.FOREST },
    { x: 2, y: 2, type: TileType.FOREST }, { x: 2, y: 6, type: TileType.FOREST },
    { x: 3, y: 1, type: TileType.FOREST }, { x: 3, y: 4, type: TileType.FOREST },
    { x: 3, y: 8, type: TileType.FOREST }, { x: 4, y: 3, type: TileType.FOREST },
    { x: 4, y: 6, type: TileType.FOREST }, { x: 5, y: 2, type: TileType.FOREST },
    { x: 5, y: 5, type: TileType.FOREST }, { x: 5, y: 8, type: TileType.FOREST },
    { x: 6, y: 1, type: TileType.FOREST }, { x: 6, y: 4, type: TileType.FOREST },
    { x: 6, y: 7, type: TileType.FOREST }, { x: 7, y: 3, type: TileType.FOREST },
    { x: 7, y: 6, type: TileType.FOREST }, { x: 8, y: 2, type: TileType.FOREST },
    { x: 8, y: 5, type: TileType.FOREST }, { x: 8, y: 8, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e7_11', '조조군 야영보병', UnitClass.INFANTRY, 7, 2, 19),
    enemy('e7_12', '조조군 야영보병', UnitClass.INFANTRY, 8, 4, 19),
    enemy('e7_13', '조조군 야영궁병', UnitClass.ARCHER, 7, 6, 19),
    enemy('e7_14', '조조군 야영궁병', UnitClass.ARCHER, 8, 7, 18),
    enemy('e7_15', '조조군 야영보병', UnitClass.INFANTRY, 9, 5, 19),
    enemy('e7_16', '곽가', UnitClass.STRATEGIST, 9, 3, 21, { maxHp: 240, hp: 240, spirit: 70, defense: 15 }),
  ],
  playerStartPositions: [{ x: 0, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 5 }, { x: 1, y: 4 }],
};

export const CHAPTER_7: Chapter = {
  id: 'ch7',
  name: '제7장: 함진영의 전설',
  description: '197~198년. 고순의 함진영, 하후돈과의 대결, 조조와의 전면전.',
  stages: [
    {
      id: 'ch7_s1', name: '소패 공략전', description: '고순과 함께 소패를 함락시켜라',
      preDialogue: {
        lines: [
          { speaker: '여포(내심)', text: '(유비를 공격하다니... 미안하지만 이것이 역사의 흐름이다.)', speakerSide: 'left' },
          { speaker: '여포(내심)', text: '(고순의 함진영... 역사에서도 무적이었던 정예부대. 직접 볼 수 있다니!)', speakerSide: 'left' },
          { speaker: '고순', text: '함진영, 돌격! 소패성을 함락시킨다!', speakerSide: 'right' },
          { speaker: '여포', text: '고순에게 맡겨라! 함진영은 무적이다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '소패가 함락되었다! 고순, 잘 싸웠다!', speakerSide: 'left' },
          { speaker: '하후돈', text: '여포! 유비를 도우러 왔다! 각오하거라!', speakerSide: 'right' },
          { speaker: '고순', text: '하후돈... 봉선공, 제가 상대하겠습니다!', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(고순과 하후돈의 일기토... 역사에서 하후돈이 눈에 화살을 맞은 그 싸움이군!)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 700 },
    },
    {
      id: 'ch7_s2', name: '조조 선봉대 격퇴', description: '하후돈이 이끄는 조조의 선봉대를 격퇴하라',
      preDialogue: {
        lines: [
          { speaker: '장료', text: '봉선공, 조조가 여포 토벌을 결심했습니다! 대군이 접근하고 있습니다!', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(조조의 본격적인 공격이 시작되었군. 역사의 분기점이 다가온다.)', speakerSide: 'left' },
          { speaker: '여포', text: '선봉대부터 격파한다! 조조에게 이 여포의 힘을 보여주마!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '선봉대를 격퇴했다! 하후돈도 물러났군!', speakerSide: 'left' },
          { speaker: '진궁', text: '하지만 조조의 본대는 아직 건재합니다. 조조가 직접 올 것입니다.', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(조조 본대와의 전면전... 이번에는 지지 않는다!)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 800 },
    },
    {
      id: 'ch7_s3', name: '장료의 야간 기습', description: '야간 기습으로 조조의 보급을 차단하라',
      preDialogue: {
        lines: [
          { speaker: '장료', text: '봉선공, 야간 기습으로 조조의 보급을 끊읍시다! 숲을 이용하면 은밀히 접근할 수 있습니다.', speakerSide: 'right' },
          { speaker: '여포', text: '장료, 너를 믿는다. 이 작전이 성패를 가른다!', speakerSide: 'left' },
          { speaker: '여포(내심)', text: '(장료의 용맹은 나중에 합비에서도 빛나지. 지금부터 그 전설이 시작되는 거야.)', speakerSide: 'left' },
        ],
      },
      battleConfig: stage3Battle,
      postDialogue: {
        lines: [
          { speaker: '장료', text: '보급 차단 성공입니다! 조조군의 군량이 끊겼습니다!', speakerSide: 'right' },
          { speaker: '여포', text: '이것으로 시간을 벌었다. 장료, 대단하군!', speakerSide: 'left' },
          { speaker: '여포(내심)', text: '(하지만 조조는 쉽게 물러날 인물이 아니다. 다음 수를 준비해야 해.)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 900 },
    },
  ],
};
