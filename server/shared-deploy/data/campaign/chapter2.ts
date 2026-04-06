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

// ── 챕터 2: 봉의정의 달빛 ──

// 2-1: 호뢰관 전투 (반동탁 연합군 측에서 참전)
const stage1Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 호뢰관: 중앙에 좁은 통로, 양쪽에 산
    { x: 5, y: 0, type: TileType.MOUNTAIN }, { x: 5, y: 1, type: TileType.MOUNTAIN },
    { x: 5, y: 2, type: TileType.MOUNTAIN },
    { x: 5, y: 7, type: TileType.MOUNTAIN }, { x: 5, y: 8, type: TileType.MOUNTAIN },
    { x: 5, y: 9, type: TileType.MOUNTAIN },
    { x: 6, y: 0, type: TileType.MOUNTAIN }, { x: 6, y: 1, type: TileType.MOUNTAIN },
    { x: 6, y: 8, type: TileType.MOUNTAIN }, { x: 6, y: 9, type: TileType.MOUNTAIN },
    // 관문 앞 숲
    { x: 3, y: 3, type: TileType.FOREST }, { x: 3, y: 6, type: TileType.FOREST },
    { x: 4, y: 4, type: TileType.FOREST }, { x: 4, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e3_1', '화웅', UnitClass.CAVALRY, 9, 4, 3, { maxHp: 180, hp: 180, attack: 42 }),
    enemy('e3_2', '동탁 친위병', UnitClass.INFANTRY, 8, 3, 2),
    enemy('e3_3', '동탁 친위병', UnitClass.INFANTRY, 8, 6, 2),
    enemy('e3_4', '서량 기병', UnitClass.CAVALRY, 9, 2, 2),
    enemy('e3_5', '서량 기병', UnitClass.CAVALRY, 9, 7, 2),
    enemy('e3_6', '서량 궁수', UnitClass.ARCHER, 10, 4, 2),
    enemy('e3_7', '서량 궁수', UnitClass.ARCHER, 10, 5, 2),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

// 2-2: 동탁 추격전 / 이각곽사 방어전
const stage2Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 장안 외곽: 성벽(산) + 도로
    { x: 6, y: 0, type: TileType.MOUNTAIN }, { x: 6, y: 1, type: TileType.MOUNTAIN },
    { x: 6, y: 2, type: TileType.MOUNTAIN },
    { x: 6, y: 7, type: TileType.MOUNTAIN }, { x: 6, y: 8, type: TileType.MOUNTAIN },
    { x: 6, y: 9, type: TileType.MOUNTAIN },
    // 다리
    { x: 3, y: 3, type: TileType.WATER }, { x: 3, y: 4, type: TileType.BRIDGE },
    { x: 3, y: 5, type: TileType.WATER },
    { x: 3, y: 6, type: TileType.WATER },
    // 숲
    { x: 8, y: 3, type: TileType.FOREST }, { x: 8, y: 4, type: TileType.FOREST },
    { x: 9, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e4_1', '이각', UnitClass.CAVALRY, 10, 3, 4, { maxHp: 190, hp: 190, attack: 44 }),
    enemy('e4_2', '곽사', UnitClass.CAVALRY, 10, 6, 4, { maxHp: 185, hp: 185, attack: 42 }),
    enemy('e4_3', '동탁 잔당', UnitClass.INFANTRY, 9, 2, 3),
    enemy('e4_4', '동탁 잔당', UnitClass.INFANTRY, 9, 7, 3),
    enemy('e4_5', '동탁 잔당', UnitClass.ARCHER, 10, 1, 2),
    enemy('e4_6', '동탁 잔당', UnitClass.ARCHER, 10, 8, 2),
    enemy('e4_7', '동탁 잔당', UnitClass.BANDIT, 8, 5, 2),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

export const CHAPTER_2: Chapter = {
  id: 'ch2',
  name: '제2장: 봉의정의 달빛',
  description: '190~192년. 반동탁 연합군의 전쟁, 동탁의 최후, 그리고 이각곽사의 반격.',
  stages: [
    {
      id: 'ch2_s1', name: '호뢰관 전투', description: '동탁군의 화웅을 격파하라',
      preDialogue: {
        lines: [
          { speaker: '여포', text: '(호뢰관... 역사에서는 내가 동탁 편에 서서 연합군과 싸웠지. 삼영전여포...)', speakerSide: 'left' },
          { speaker: '여포', text: '(하지만 이번에는 내가 연합군 편이다. 유비, 관우, 장비와 같은 편이라니!)', speakerSide: 'left' },
          { speaker: '정원', text: '봉선아, 호뢰관을 지키는 화웅은 만만치 않은 장수다. 조심해라.', speakerSide: 'right' },
          { speaker: '장료', text: '봉선공의 방천화극이면 화웅 따위는 상대도 안 됩니다!', speakerSide: 'right' },
          { speaker: '여포', text: '화웅이고 뭐고, 이 여포 앞에 설 자는 없다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '화웅을 쓰러뜨렸다! 호뢰관은 열렸다!', speakerSide: 'left' },
          { speaker: '장료', text: '연합군 제후들이 봉선공의 무용에 감탄하고 있습니다!', speakerSide: 'right' },
          { speaker: '여포', text: '(원래는 관우가 화웅을 벤 건데... 이번에는 내가 했군. 역사가 바뀌고 있어.)', speakerSide: 'left' },
          { speaker: '고순', text: '동탁이 낙양을 불태우고 장안으로 천도를 서두르고 있다는 보고입니다!', speakerSide: 'right' },
          { speaker: '여포', text: '동탁을 추격한다! 놓쳐서는 안 된다!', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 200, items: ['short_bow'] },
    },
    {
      id: 'ch2_s2', name: '장안 공방전', description: '이각과 곽사의 반격을 막아라',
      preDialogue: {
        lines: [
          { speaker: '여포', text: '(동탁은 왕윤의 계략으로 제거되었다. 역사와는 다른 방식이지만...)', speakerSide: 'left' },
          { speaker: '여포', text: '(문제는 이각과 곽사. 동탁의 잔당들이 복수를 위해 장안으로 온다!)', speakerSide: 'left' },
          { speaker: '정원', text: '이각과 곽사가 장안으로 진격하고 있다! 병력이 10만에 달한다!', speakerSide: 'right' },
          { speaker: '장료', text: '봉선공, 장안의 방어를 맡아야 합니다. 다리를 이용하면 적의 진격을 늦출 수 있습니다.', speakerSide: 'right' },
          { speaker: '여포', text: '(역사에서는 이각곽사에게 쫓겨 장안을 버리고 도주했지... 이번에는 막아야 해!)', speakerSide: 'left' },
          { speaker: '여포', text: '장안을 지킨다! 물러서지 마라!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '이각과 곽사를 물리쳤다...! 장안을 지켜냈다!', speakerSide: 'left' },
          { speaker: '정원', text: '봉선아, 네 덕분이다. 이제 장안의 조정을 안정시켜야 한다.', speakerSide: 'right' },
          { speaker: '여포', text: '(역사를 또 바꿨어. 원래는 장안에서 쫓겨나 떠돌이가 되었을 텐데...)', speakerSide: 'left' },
          { speaker: '여포', text: '(하지만 아직 갈 길이 멀다. 조조, 원소, 유비... 천하를 노리는 군웅들이 할거하고 있어.)', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공, 연주에서 조조가 세력을 키우고 있다는 보고입니다. 경계해야 합니다.', speakerSide: 'right' },
          { speaker: '여포', text: '(조조... 역사에서 나를 처형한 그 자. 언젠가 마주치게 되겠지.)', speakerSide: 'left' },
        ],
      },
      rewards: {
        gold: 250, items: ['steel_sword', 'iron_armor'],
        recruitUnits: [{
          id: 'p4', name: '진궁', faction: 'player', unitClass: UnitClass.STRATEGIST,
          grade: 'R', isScenarioUnit: true,
          level: 3, exp: 0, mp: 20, maxMp: 20,
          classSkillId: 'class_strategist_1',
          uniqueSkill: 'strategem', uniqueSkillUnlocked: false,
          equippedSkills: [], promotionLevel: 0,
          equipment: { weapon: 'sage_staff' },
          position: { x: 0, y: 0 },
          stats: { maxHp: 120, hp: 120, attack: 25, defense: 15, spirit: 35, agility: 22, critical: 20, morale: 40, speed: 4, penetration: 5, resist: 30, moveRange: 4, attackRange: 3 },
          hasActed: false, isAlive: true,
        }],
      },
    },
  ],
};
