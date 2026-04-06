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

// ── 챕터 8: 하비성의 물 ──

// 8-1: 하비성 외곽 방어전
const stage1Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 성벽(산)이 오른쪽, 왼쪽은 개활지
    { x: 10, y: 0, type: TileType.MOUNTAIN }, { x: 10, y: 1, type: TileType.MOUNTAIN },
    { x: 10, y: 2, type: TileType.MOUNTAIN }, { x: 10, y: 3, type: TileType.MOUNTAIN },
    { x: 10, y: 6, type: TileType.MOUNTAIN }, { x: 10, y: 7, type: TileType.MOUNTAIN },
    { x: 10, y: 8, type: TileType.MOUNTAIN }, { x: 10, y: 9, type: TileType.MOUNTAIN },
    { x: 11, y: 0, type: TileType.MOUNTAIN }, { x: 11, y: 1, type: TileType.MOUNTAIN },
    { x: 11, y: 2, type: TileType.MOUNTAIN }, { x: 11, y: 3, type: TileType.MOUNTAIN },
    { x: 11, y: 4, type: TileType.MOUNTAIN }, { x: 11, y: 5, type: TileType.MOUNTAIN },
    { x: 11, y: 6, type: TileType.MOUNTAIN }, { x: 11, y: 7, type: TileType.MOUNTAIN },
    { x: 11, y: 8, type: TileType.MOUNTAIN }, { x: 11, y: 9, type: TileType.MOUNTAIN },
    // 성문 통로
    { x: 10, y: 4, type: TileType.BRIDGE }, { x: 10, y: 5, type: TileType.BRIDGE },
    // 개활지 숲
    { x: 3, y: 2, type: TileType.FOREST }, { x: 3, y: 7, type: TileType.FOREST },
    { x: 5, y: 4, type: TileType.FOREST }, { x: 5, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e8_1', '하후연', UnitClass.CAVALRY, 1, 4, 26, { maxHp: 400, hp: 400, attack: 90, defense: 35 }),
    enemy('e8_2', '조조군 보병', UnitClass.INFANTRY, 2, 2, 23),
    enemy('e8_3', '조조군 보병', UnitClass.INFANTRY, 2, 7, 23),
    enemy('e8_4', '조조군 기병', UnitClass.CAVALRY, 1, 2, 22),
    enemy('e8_5', '조조군 기병', UnitClass.CAVALRY, 1, 7, 22),
    enemy('e8_6', '조조군 궁병', UnitClass.ARCHER, 0, 4, 22),
  ],
  playerStartPositions: [{ x: 8, y: 4 }, { x: 8, y: 3 }, { x: 8, y: 5 }, { x: 9, y: 4 }, { x: 8, y: 2 }, { x: 9, y: 2 }, { x: 10, y: 2 }, { x: 11, y: 2 }],
};

// 8-2: 제방 사수전
const stage2Battle: BattleConfig = {
  mapWidth: 12, mapHeight: 10,
  tiles: plainMap(12, 10, [
    // 하단 물 타일 (강)
    { x: 0, y: 8, type: TileType.WATER }, { x: 1, y: 8, type: TileType.WATER },
    { x: 2, y: 8, type: TileType.WATER }, { x: 3, y: 8, type: TileType.WATER },
    { x: 4, y: 8, type: TileType.WATER }, { x: 5, y: 8, type: TileType.WATER },
    { x: 6, y: 8, type: TileType.WATER }, { x: 7, y: 8, type: TileType.WATER },
    { x: 8, y: 8, type: TileType.WATER }, { x: 9, y: 8, type: TileType.WATER },
    { x: 10, y: 8, type: TileType.WATER }, { x: 11, y: 8, type: TileType.WATER },
    { x: 0, y: 9, type: TileType.WATER }, { x: 1, y: 9, type: TileType.WATER },
    { x: 2, y: 9, type: TileType.WATER }, { x: 3, y: 9, type: TileType.WATER },
    { x: 4, y: 9, type: TileType.WATER }, { x: 5, y: 9, type: TileType.WATER },
    { x: 6, y: 9, type: TileType.WATER }, { x: 7, y: 9, type: TileType.WATER },
    { x: 8, y: 9, type: TileType.WATER }, { x: 9, y: 9, type: TileType.WATER },
    { x: 10, y: 9, type: TileType.WATER }, { x: 11, y: 9, type: TileType.WATER },
    // 다리 (제방 위)
    { x: 5, y: 7, type: TileType.BRIDGE }, { x: 6, y: 7, type: TileType.BRIDGE },
    // 산 (측면)
    { x: 0, y: 0, type: TileType.MOUNTAIN }, { x: 0, y: 1, type: TileType.MOUNTAIN },
    { x: 11, y: 0, type: TileType.MOUNTAIN }, { x: 11, y: 1, type: TileType.MOUNTAIN },
    // 숲
    { x: 3, y: 3, type: TileType.FOREST }, { x: 4, y: 5, type: TileType.FOREST },
    { x: 7, y: 3, type: TileType.FOREST }, { x: 8, y: 5, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('e8_7', '순유', UnitClass.STRATEGIST, 1, 4, 26, { maxHp: 280, hp: 280, attack: 45, spirit: 72, defense: 18 }),
    enemy('e8_8', '조조군 공병', UnitClass.INFANTRY, 2, 3, 24),
    enemy('e8_9', '조조군 공병', UnitClass.INFANTRY, 2, 5, 24),
    enemy('e8_10', '조조군 공병', UnitClass.INFANTRY, 1, 6, 23),
    enemy('e8_11', '조조군 궁병', UnitClass.ARCHER, 0, 3, 23),
    enemy('e8_12', '조조군 궁병', UnitClass.ARCHER, 0, 6, 22),
  ],
  playerStartPositions: [{ x: 8, y: 4 }, { x: 8, y: 3 }, { x: 8, y: 5 }, { x: 9, y: 4 }, { x: 8, y: 2 }, { x: 9, y: 2 }, { x: 10, y: 2 }, { x: 11, y: 2 }],
};

export const CHAPTER_8: Chapter = {
  id: 'ch8',
  name: '제8장: 하비성의 물',
  description: '198년. 조조의 수공 작전을 저지하라.',
  stages: [
    {
      id: 'ch8_s1', name: '하비성 외곽 방어전', description: '조조의 대군으로부터 하비성 외곽을 방어하라',
      preDialogue: {
        lines: [
          { speaker: '여포(내심)', text: '(조조 대군이 다가온다. 역사에서 조조는 수공으로 하비성을 함락시켰어... 제방을 지켜야 해!)', speakerSide: 'left' },
          { speaker: '진궁', text: '봉선공, 조조의 대군이 하비성 외곽에 도달했습니다! 먼저 외곽을 방어해야 합니다!', speakerSide: 'right' },
          { speaker: '여포', text: '성문을 지켜라! 이 여포가 살아있는 한, 하비성은 무너지지 않는다!', speakerSide: 'left' },
        ],
      },
      battleConfig: stage1Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '외곽 방어에 성공했다! 하지만 조조는 쉽게 물러나지 않겠지.', speakerSide: 'left' },
          { speaker: '진궁', text: '봉선공! 조조가 수공을 노리고 있습니다! 사수와 기수의 제방을 파괴하려 합니다! 제방을 사수해야 합니다!', speakerSide: 'right' },
          { speaker: '여포(내심)', text: '(역사의 분기점이다! 제방을 지키면 역사를 바꿀 수 있어!)', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 800, items: ['warhorse_armor', 'night_garb'] },
    },
    {
      id: 'ch8_s2', name: '제방 사수전', description: '조조의 공병대를 막고 제방을 사수하라',
      preDialogue: {
        lines: [
          { speaker: '진궁', text: '제방이 무너지면 하비성 전체가 침수됩니다! 절대로 뚫려서는 안 됩니다!', speakerSide: 'right' },
          { speaker: '여포', text: '어떻게든 막아야 한다! 전군, 제방으로!', speakerSide: 'left' },
          { speaker: '여포(내심)', text: '(원래 역사에서는 부하들의 배신과 수공으로 모든 것이 끝났지... 이번에는 다르다!)', speakerSide: 'left' },
        ],
      },
      battleConfig: stage2Battle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '제방을 지켜냈다...! 수공은 실패했다!', speakerSide: 'left' },
          { speaker: '여포(내심)', text: '(역사를 바꿨다... 수공을 막았어! 원래라면 여기서 모든 게 끝났을 텐데!)', speakerSide: 'left' },
          { speaker: '조조', text: '여포... 쉽지 않군. 수공이 통하지 않다니.', speakerSide: 'right' },
          { speaker: '진궁', text: '봉선공, 조조가 퇴각합니다! 해냈습니다!', speakerSide: 'right' },
          { speaker: '여포', text: '이것은 시작에 불과하다. 조조는 반드시 다시 올 것이다. 그때까지 힘을 키워야 한다!', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 1000, items: ['heaven_bow', 'dragon_gauntlet'] },
    },
  ],
};
