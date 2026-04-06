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
  return {
    id, name, faction: 'enemy', unitClass: cls,
    level, exp: 0, mp: cls === UnitClass.STRATEGIST ? 30 : 10, maxMp: cls === UnitClass.STRATEGIST ? 30 : 10,
    skills: cls === UnitClass.STRATEGIST ? ['fire', 'heal'] : cls === UnitClass.ARCHER ? ['arrow_rain'] : [],
    position: { x, y }, stats, hasActed: false, isAlive: true,
  };
}

// ── 챕터 1: 낙양의 야망 ──

// 1-1: 동탁군 선봉 격퇴 (정원군으로 동탁의 도발 방어)
const stage1Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 낙양 외곽, 도로 + 숲
    { x: 5, y: 3, type: TileType.FOREST }, { x: 5, y: 4, type: TileType.FOREST },
    { x: 6, y: 4, type: TileType.FOREST }, { x: 6, y: 5, type: TileType.FOREST },
    { x: 3, y: 7, type: TileType.FOREST },
    { x: 8, y: 2, type: TileType.MOUNTAIN },
    { x: 9, y: 7, type: TileType.MOUNTAIN },
  ]),
  enemyUnits: [
    enemy('e1_1', '동탁군 장수', UnitClass.CAVALRY, 10, 4, 2, { maxHp: 150, hp: 150, attack: 36 }),
    enemy('e1_2', '서량 기병', UnitClass.CAVALRY, 9, 2, 2),
    enemy('e1_3', '서량 기병', UnitClass.CAVALRY, 9, 6, 2),
    enemy('e1_4', '서량 궁수', UnitClass.ARCHER, 10, 1, 1),
    enemy('e1_5', '서량 보병', UnitClass.INFANTRY, 10, 7, 1),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

// 1-2: 낙양 거리 전투 (동탁의 본대)
const stage2Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 낙양 시가지, 건물(산) + 도로
    { x: 3, y: 1, type: TileType.MOUNTAIN }, { x: 3, y: 2, type: TileType.MOUNTAIN },
    { x: 3, y: 7, type: TileType.MOUNTAIN }, { x: 3, y: 8, type: TileType.MOUNTAIN },
    { x: 7, y: 1, type: TileType.MOUNTAIN }, { x: 7, y: 2, type: TileType.MOUNTAIN },
    { x: 7, y: 7, type: TileType.MOUNTAIN }, { x: 7, y: 8, type: TileType.MOUNTAIN },
    { x: 5, y: 4, type: TileType.FOREST }, { x: 5, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e2_1', '이유', UnitClass.STRATEGIST, 10, 4, 3, { maxHp: 100, hp: 100, attack: 28 }),
    enemy('e2_2', '서량 기병', UnitClass.CAVALRY, 9, 2, 2),
    enemy('e2_3', '서량 기병', UnitClass.CAVALRY, 9, 7, 2),
    enemy('e2_4', '서량 보병', UnitClass.INFANTRY, 8, 4, 2),
    enemy('e2_5', '서량 보병', UnitClass.INFANTRY, 8, 5, 2),
    enemy('e2_6', '서량 궁수', UnitClass.ARCHER, 10, 1, 2),
  ],
  playerStartPositions: [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }],
};

export const CHAPTER_1: Chapter = {
  id: 'ch1',
  name: '제1장: 낙양의 야망',
  description: '189년, 동탁이 낙양을 장악하려 한다. 정원의 부장 여포는 선택의 기로에 선다.',
  stages: [
    {
      id: 'ch1_s1', name: '동탁군 선봉 격퇴', description: '동탁의 선발대를 막아라',
      preDialogue: {
        lines: [
          { speaker: '정원', text: '동탁이 낙양에 군사를 끌고 왔다. 우리 병주군이 맞서야 한다!', speakerSide: 'right' },
          { speaker: '여포', text: '(동탁... 역사에서는 이 자에게 적토마를 받고 정원을 배신하지. 하지만...)', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공, 동탁의 서량 기병이 접근하고 있습니다! 맞서 싸워야 합니다!', speakerSide: 'right' },
          { speaker: '여포', text: '좋다! 서량 기병이 아무리 강해도 이 방천화극 앞에서는...!', speakerSide: 'left' },
          { speaker: '고순', text: '함진영, 출격 준비 완료!', speakerSide: 'right' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '서량 기병의 선봉을 격퇴했다!', speakerSide: 'left' },
          { speaker: '장료', text: '하지만 동탁의 본대는 아직 건재합니다. 병력이 우리보다 몇 배는 많습니다.', speakerSide: 'right' },
          { speaker: '여포', text: '(이제 동탁이 나를 회유하려 할 거야. 적토마를 보내올지도...)', speakerSide: 'left' },
          { speaker: '???', text: '여포 장군! 동탁 승상께서 보내신 선물이 도착했습니다!', speakerSide: 'right' },
          { speaker: '여포', text: '(왔군... 역사대로야. 적토마와 금은보화... 어떻게 해야 하지?)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 150, items: ['iron_spear', 'sun_amulet'] },
    },
    {
      id: 'ch1_s2', name: '낙양 쟁탈전', description: '동탁의 이유를 물리치고 낙양을 지켜라',
      preDialogue: {
        lines: [
          { speaker: '여포', text: '(역사에서 여포는 여기서 정원을 배신했지만... 나는 다르다!)', speakerSide: 'left' },
          { speaker: '여포', text: '의부, 동탁의 꼬임에 넘어가지 않겠습니다. 끝까지 함께 싸우겠습니다!', speakerSide: 'left' },
          { speaker: '정원', text: '봉선아... 역시 너를 믿길 잘했구나! 함께 동탁을 물리치자!', speakerSide: 'right' },
          { speaker: '장료', text: '동탁의 참모 이유가 군대를 이끌고 낙양 시가지로 진입하고 있습니다!', speakerSide: 'right' },
          { speaker: '여포', text: '좋다! 낙양을 지키기 위해 출격한다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '동탁의 부대를 격퇴했다! 하지만 동탁 본인은 아직 건재하군.', speakerSide: 'left' },
          { speaker: '정원', text: '동탁이 물러났다! 봉선아, 네 무용이 아니었으면 큰일날 뻔했구나.', speakerSide: 'right' },
          { speaker: '여포', text: '(역사를 바꿨어! 정원을 배신하지 않았다. 하지만 이제부터가 진짜 문제야...)', speakerSide: 'left' },
          { speaker: '여포', text: '(동탁이 이대로 물러설 리 없어. 그리고 반동탁 연합군도 움직이기 시작할 거야.)', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공, 각지에서 동탁에 맞서는 제후들이 군사를 일으키고 있다는 소식입니다.', speakerSide: 'right' },
          { speaker: '여포', text: '(호뢰관 전투... 거기서 유비, 관우, 장비와 싸우게 되겠군. 이번에는 내가 아군 편이지만...)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 200, items: ['iron_shield'] },
    },
  ],
};
