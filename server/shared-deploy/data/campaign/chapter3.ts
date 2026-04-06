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
  return {
    id, name, faction: 'enemy', unitClass: cls,
    level, exp: 0, mp: cls === UnitClass.STRATEGIST ? 30 : 10, maxMp: cls === UnitClass.STRATEGIST ? 30 : 10,
    skills: cls === UnitClass.STRATEGIST ? ['fire', 'heal'] : cls === UnitClass.ARCHER ? ['arrow_rain'] : [],
    position: { x, y }, stats, hasActed: false, isAlive: true,
  };
}

// ── 챕터 3: 떠도는 봉선 ──

// 3-1: 흑산적 장연 격파
const stage1Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 양쪽 가장자리 숲
    { x: 0, y: 0, type: TileType.FOREST }, { x: 0, y: 1, type: TileType.FOREST },
    { x: 0, y: 8, type: TileType.FOREST }, { x: 0, y: 9, type: TileType.FOREST },
    { x: 11, y: 0, type: TileType.FOREST }, { x: 11, y: 1, type: TileType.FOREST },
    { x: 11, y: 8, type: TileType.FOREST }, { x: 11, y: 9, type: TileType.FOREST },
    // 중앙 산악 협로
    { x: 5, y: 0, type: TileType.MOUNTAIN }, { x: 5, y: 1, type: TileType.MOUNTAIN },
    { x: 5, y: 2, type: TileType.MOUNTAIN },
    { x: 6, y: 0, type: TileType.MOUNTAIN }, { x: 6, y: 1, type: TileType.MOUNTAIN },
    { x: 5, y: 7, type: TileType.MOUNTAIN }, { x: 5, y: 8, type: TileType.MOUNTAIN },
    { x: 5, y: 9, type: TileType.MOUNTAIN },
    { x: 6, y: 8, type: TileType.MOUNTAIN }, { x: 6, y: 9, type: TileType.MOUNTAIN },
    // 협로 양쪽 숲
    { x: 4, y: 3, type: TileType.FOREST }, { x: 4, y: 6, type: TileType.FOREST },
    { x: 7, y: 3, type: TileType.FOREST }, { x: 7, y: 6, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e5_1', '장연', UnitClass.CAVALRY, 9, 4, 12, { maxHp: 260, hp: 260, attack: 60, defense: 25 }),
    enemy('e5_2', '흑산적 졸병', UnitClass.BANDIT, 8, 3, 10),
    enemy('e5_3', '흑산적 도적', UnitClass.BANDIT, 8, 6, 10),
    enemy('e5_4', '흑산적 졸병', UnitClass.BANDIT, 9, 2, 9),
    enemy('e5_5', '흑산적 도적', UnitClass.BANDIT, 9, 7, 8),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

// 3-2: 원소군 매복 탈출
const stage2Battle: BattleConfig = {
  mapWidth: 10, mapHeight: 10,
  tiles: plainMap(10, 10, [
    // 야간 숲: 곳곳에 숲, 좁은 통로
    { x: 0, y: 0, type: TileType.FOREST }, { x: 1, y: 0, type: TileType.FOREST },
    { x: 0, y: 1, type: TileType.FOREST },
    { x: 8, y: 0, type: TileType.FOREST }, { x: 9, y: 0, type: TileType.FOREST },
    { x: 9, y: 1, type: TileType.FOREST },
    { x: 0, y: 8, type: TileType.FOREST }, { x: 0, y: 9, type: TileType.FOREST },
    { x: 1, y: 9, type: TileType.FOREST },
    { x: 8, y: 9, type: TileType.FOREST }, { x: 9, y: 8, type: TileType.FOREST },
    { x: 9, y: 9, type: TileType.FOREST },
    { x: 2, y: 2, type: TileType.FOREST }, { x: 7, y: 2, type: TileType.FOREST },
    { x: 2, y: 7, type: TileType.FOREST }, { x: 7, y: 7, type: TileType.FOREST },
    { x: 3, y: 4, type: TileType.FOREST }, { x: 6, y: 4, type: TileType.FOREST },
    { x: 3, y: 5, type: TileType.FOREST }, { x: 6, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e6_1', '안량', UnitClass.CAVALRY, 1, 3, 12, { maxHp: 250, hp: 250, attack: 58, defense: 22 }),
    enemy('e6_2', '원소군 매복병', UnitClass.INFANTRY, 8, 3, 10),
    enemy('e6_3', '원소군 궁병', UnitClass.ARCHER, 1, 6, 10),
    enemy('e6_4', '원소군 궁병', UnitClass.ARCHER, 8, 6, 9),
    enemy('e6_5', '원소군 매복병', UnitClass.INFANTRY, 4, 1, 9),
  ],
  playerStartPositions: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 5 }, { x: 5, y: 5 }],
};

// 3-3: 장막 합류 (도적 소탕)
const stage3Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 마을 지역: 다리와 물
    { x: 5, y: 3, type: TileType.WATER }, { x: 5, y: 4, type: TileType.WATER },
    { x: 5, y: 5, type: TileType.BRIDGE }, { x: 5, y: 6, type: TileType.WATER },
    { x: 5, y: 7, type: TileType.WATER },
    { x: 8, y: 1, type: TileType.WATER }, { x: 8, y: 2, type: TileType.BRIDGE },
    { x: 8, y: 3, type: TileType.WATER },
    // 마을 주변 숲
    { x: 3, y: 2, type: TileType.FOREST }, { x: 3, y: 7, type: TileType.FOREST },
    { x: 9, y: 5, type: TileType.FOREST }, { x: 10, y: 6, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e7_1', '도적 두목', UnitClass.BANDIT, 10, 4, 11, { maxHp: 240, hp: 240, attack: 55, defense: 20 }),
    enemy('e7_2', '도적', UnitClass.BANDIT, 9, 3, 9),
    enemy('e7_3', '도적', UnitClass.BANDIT, 9, 6, 9),
    enemy('e7_4', '도적', UnitClass.BANDIT, 10, 7, 8),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 3 }, { x: 2, y: 6 }],
};

export const CHAPTER_3: Chapter = {
  id: 'ch3',
  name: '제3장: 떠도는 봉선',
  description: '192~194년. 원소의 배신과 방랑, 진궁과의 만남.',
  stages: [
    {
      id: 'ch3_s1', name: '흑산적 장연 격파', description: '원소의 요청으로 흑산적 장연을 토벌하라',
      preDialogue: {
        lines: [
          { speaker: '원소', text: '여포 장군, 흑산적 장연이 기주 변경을 약탈하고 있소. 토벌해 주시오.', speakerSide: 'right' },
          { speaker: '여포', text: '소수 기병으로도 충분합니다. 흑산적 따위, 이 여포가 쓸어버리겠소.', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공, 산악 지형에서는 기병 운용이 어렵습니다. 협로에 주의하십시오.', speakerSide: 'left' },
          { speaker: '여포', text: '(원소 밑에 있는 것도 길지 않겠지... 역사대로라면 곧 배신당할 텐데.)', speakerSide: 'left' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '장연을 격파했다! 흑산적은 흩어졌소.', speakerSide: 'left' },
          { speaker: '원소', text: '...흠, 대단하군. 여포의 무력은 소문대로구려.', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(원소의 눈빛이 수상하다... 감탄이 아니라 경계하는 눈이야.)', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공, 원소가 수상합니다. 우리 병사들에 대한 감시가 늘었습니다.', speakerSide: 'left' },
          { speaker: '여포', text: '(역시... 원소는 나를 이용만 하고 버릴 생각이군.)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 300, items: ['throwing_knife'] },
    },
    {
      id: 'ch3_s2', name: '원소군 매복 탈출', description: '원소의 매복을 뚫고 탈출하라',
      preDialogue: {
        lines: [
          { speaker: '여포(내심)', text: '(한밤중에 습격이라... 역사대로군. 원소 이 자식!)', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공! 사방에서 원소의 병사들이 몰려옵니다!', speakerSide: 'left' },
          { speaker: '여포', text: '원소! 네 놈이 감히 이 여포를 암살하려 해?!', speakerSide: 'left' },
          { speaker: '여포', text: '포위를 뚫는다! 나를 따르라!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '포위를 뚫었다... 하지만 갈 곳이 없군.', speakerSide: 'left' },
          { speaker: '진궁', text: '봉선공, 저는 진궁이라 합니다. 공의 무용을 듣고 찾아왔습니다.', speakerSide: 'right' },
          { speaker: '진궁', text: '공과 뜻을 같이하고자 합니다. 저를 따르시지요, 갈 곳을 마련하겠습니다.', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(진궁... 역사에서 끝까지 나를 따른 책사. 이번에는 더 잘 대해야지.)', speakerSide: 'left' },
          { speaker: '여포', text: '진궁 선생, 잘 부탁하오.', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 400, items: ['sage_staff'] },
    },
    {
      id: 'ch3_s3', name: '장막 합류', description: '장막 태수에게 합류하기 위해 도적을 소탕하라',
      preDialogue: {
        lines: [
          { speaker: '진궁', text: '봉선공, 진류의 장막 태수에게 의탁합시다. 먼저 도적을 소탕하면 환영받을 것입니다.', speakerSide: 'right' },
          { speaker: '여포', text: '도적 소탕이라... 좋다. 백성들도 구하고 신뢰도 얻고, 일석이조군.', speakerSide: 'left' },
          { speaker: '장료', text: '마을 주민들이 다리 근처에 도적이 진을 치고 있다고 합니다.', speakerSide: 'left' },
        ],
      },
      battleConfig: stage3Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '도적을 소탕했다. 마을 주민들이 안심하겠군.', speakerSide: 'left' },
          { speaker: '장막', text: '여포 장군, 대단한 무용이오! 잠시 이곳에 머무시오. 환영하겠소.', speakerSide: 'right' },
          { speaker: '진궁', text: '봉선공, 장막은 성품이 좋으나 우유부단합니다. 오래 머물 곳은 아닙니다.', speakerSide: 'right' },
          { speaker: '진궁', text: '다음 기회를 노려야 합니다. 연주가 비어 있다는 소문이...', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(연주... 조조의 근거지. 역사대로라면 이제 연주를 기습할 차례지.)', speakerSide: 'left' },
        ],
      },
      rewards: {
        gold: 500, items: ['life_gem'],
        recruitUnits: [{
          id: 'p5', name: '초선', faction: 'player', unitClass: UnitClass.STRATEGIST,
          grade: 'SR', isScenarioUnit: true,
          level: 5, exp: 0, mp: 25, maxMp: 25,
          classSkillId: 'class_strategist_1',
          uniqueSkill: 'beauty', uniqueSkillUnlocked: false,
          equippedSkills: [], promotionLevel: 0,
          equipment: { weapon: 'phoenix_fan', armor: 'sage_robe' },
          position: { x: 0, y: 0 },
          stats: { maxHp: 110, hp: 110, attack: 20, defense: 12, spirit: 40, agility: 25, critical: 15, morale: 50, speed: 5, penetration: 3, resist: 35, moveRange: 4, attackRange: 3 },
          hasActed: false, isAlive: true,
        }],
      },
    },
  ],
};
