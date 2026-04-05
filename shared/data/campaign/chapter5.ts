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

// ── 챕터 5: 서주의 주인 ──

// 5-1: 소패성 도적 소탕 (유비 공동작전)
const stage1Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 개활지 + 일부 숲
    { x: 3, y: 2, type: TileType.FOREST }, { x: 3, y: 3, type: TileType.FOREST },
    { x: 4, y: 7, type: TileType.FOREST }, { x: 4, y: 8, type: TileType.FOREST },
    { x: 8, y: 1, type: TileType.FOREST }, { x: 8, y: 2, type: TileType.FOREST },
    { x: 9, y: 6, type: TileType.FOREST }, { x: 9, y: 7, type: TileType.FOREST },
    // 약간의 지형 변화
    { x: 6, y: 4, type: TileType.FOREST }, { x: 6, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e10_1', '도적단장', UnitClass.BANDIT, 10, 4, 18, { maxHp: 300, hp: 300, attack: 68, defense: 22 }),
    enemy('e10_2', '도적', UnitClass.BANDIT, 9, 2, 16),
    enemy('e10_3', '도적', UnitClass.BANDIT, 9, 7, 16),
    enemy('e10_4', '도적', UnitClass.INFANTRY, 10, 3, 15),
    enemy('e10_5', '도적', UnitClass.INFANTRY, 10, 6, 15),
    enemy('e10_6', '도적', UnitClass.BANDIT, 8, 5, 14),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 3 }, { x: 2, y: 6 }],
};

// 5-2: 원술군 선봉 격퇴
const stage2Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 강 (수직으로 흐르는 강 + 다리)
    { x: 5, y: 0, type: TileType.WATER }, { x: 5, y: 1, type: TileType.WATER },
    { x: 5, y: 2, type: TileType.WATER },
    { x: 5, y: 3, type: TileType.BRIDGE },
    { x: 5, y: 4, type: TileType.WATER }, { x: 5, y: 5, type: TileType.WATER },
    { x: 5, y: 6, type: TileType.BRIDGE },
    { x: 5, y: 7, type: TileType.WATER }, { x: 5, y: 8, type: TileType.WATER },
    { x: 5, y: 9, type: TileType.WATER },
    // 강 주변 숲
    { x: 4, y: 2, type: TileType.FOREST }, { x: 4, y: 7, type: TileType.FOREST },
    { x: 6, y: 2, type: TileType.FOREST }, { x: 6, y: 7, type: TileType.FOREST },
    // 적진 쪽 숲
    { x: 9, y: 3, type: TileType.FOREST }, { x: 9, y: 6, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e11_1', '기령', UnitClass.CAVALRY, 9, 4, 18, { maxHp: 320, hp: 320, attack: 72, defense: 25 }),
    enemy('e11_2', '원술군 선봉기병', UnitClass.CAVALRY, 8, 3, 16),
    enemy('e11_3', '원술군 선봉기병', UnitClass.CAVALRY, 8, 6, 16),
    enemy('e11_4', '원술군 보병', UnitClass.INFANTRY, 7, 4, 15),
    enemy('e11_5', '원술군 보병', UnitClass.INFANTRY, 7, 5, 14),
  ],
  playerStartPositions: [{ x: 1, y: 3 }, { x: 1, y: 6 }, { x: 2, y: 4 }, { x: 2, y: 5 }],
};

export const CHAPTER_5: Chapter = {
  id: 'ch5',
  name: '제5장: 서주의 주인',
  description: '195~196년. 유비에게 의탁하고, 원술군과 맞서다.',
  stages: [
    {
      id: 'ch5_s1', name: '소패성 도적 소탕', description: '유비와 함께 소패성 일대의 도적을 소탕하라',
      preDialogue: {
        lines: [
          { speaker: '유비', text: '여포 장군, 소패성에 머무시오. 같이 도적을 소탕합시다.', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(유비... 역사에서는 이 사람한테 신세지다가 서주를 뺏었지.)', speakerSide: 'left' },
          { speaker: '여포(내심)', text: '(이번에는 어떻게 해야 할까... 일단은 유비의 호의를 받아들이자.)', speakerSide: 'left' },
          { speaker: '여포', text: '유비 사군, 고맙소. 도적 정도는 이 여포가 쓸어버리겠소!', speakerSide: 'left' },
          { speaker: '장료', text: '도적들이 개활지에 진을 치고 있습니다. 숲을 이용해 접근합시다.', speakerSide: 'left' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '도적을 소탕했소. 소패성 일대는 이제 안전하오.', speakerSide: 'left' },
          { speaker: '유비', text: '여포 장군의 무용에 감탄합니다. 역시 천하무쌍이라는 말이 허언이 아니오!', speakerSide: 'right' },
          { speaker: '장료', text: '유비는 좋은 사람 같습니다. 의를 중시하는 자입니다.', speakerSide: 'left' },
          { speaker: '여포(내심)', text: '(장료의 말이 맞아. 유비는 좋은 사람이야. 하지만 난세에서 좋기만 해서는...)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 500, items: ['twin_daggers', 'shadow_cloak'] },
    },
    {
      id: 'ch5_s2', name: '원술군 선봉 격퇴', description: '원술의 3만 대군 선봉을 강 건너에서 격퇴하라',
      preDialogue: {
        lines: [
          { speaker: '유비', text: '여포 장군! 원술이 3만 대군으로 서주를 공격합니다! 도와주시오!', speakerSide: 'right' },
          { speaker: '진궁', text: '원술군의 선봉은 기령입니다. 기병을 앞세워 강을 건너오고 있습니다.', speakerSide: 'right' },
          { speaker: '여포', text: '원술 따위가 감히! 강을 건너는 놈들부터 쓸어버린다!', speakerSide: 'left' },
          { speaker: '장료', text: '다리 두 곳을 사수하면 적의 도하를 막을 수 있습니다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '기령을 물리쳤다! 원술군의 선봉은 궤멸했소!', speakerSide: 'left' },
          { speaker: '유비', text: '여포 장군 덕분입니다! 서주가 보전되었소!', speakerSide: 'right' },
          { speaker: '진궁', text: '봉선공, 서주를 차지할 기회입니다만...', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(진궁은 벌써 서주를 노리라고 하는군. 역사에서는 실제로 그랬지...)', speakerSide: 'left' },
          { speaker: '여포(내심)', text: '(서주의 주인... 그 자리가 축복일지 저주일지, 아직은 모르겠다.)', speakerSide: 'left' },
        ],
      },
      rewards: {
        gold: 600, items: ['phoenix_fan', 'scale_armor'],
        recruitUnits: [{
          id: 'p6', name: '장패', faction: 'player', unitClass: UnitClass.ARCHER,
          grade: 'R', isScenarioUnit: true,
          level: 8, exp: 0, mp: 15, maxMp: 15,
          classSkillId: 'class_archer_1',
          uniqueSkill: 'zhang_volley', uniqueSkillUnlocked: false,
          equippedSkills: [], promotionLevel: 0,
          equipment: { weapon: 'longbow' },
          position: { x: 0, y: 0 },
          stats: { maxHp: 130, hp: 130, attack: 35, defense: 14, spirit: 18, agility: 30, critical: 35, morale: 30, speed: 5, penetration: 8, resist: 15, moveRange: 4, attackRange: 3 },
          hasActed: false, isAlive: true,
        }],
      },
    },
  ],
};
