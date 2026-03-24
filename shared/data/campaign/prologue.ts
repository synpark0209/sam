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

// ── 프롤로그: 방구석의 봉선 ──

const tutorialBattle: BattleConfig = {
  mapWidth: 10, mapHeight: 8,
  tiles: plainMap(10, 8, [
    { x: 4, y: 2, type: TileType.FOREST }, { x: 4, y: 3, type: TileType.FOREST },
    { x: 5, y: 3, type: TileType.FOREST },
    { x: 7, y: 1, type: TileType.MOUNTAIN },
    { x: 3, y: 6, type: TileType.FOREST }, { x: 4, y: 6, type: TileType.FOREST },
  ]),
  enemyUnits: [
    enemy('ep_1', '산적 두목', UnitClass.BANDIT, 8, 3, 1, { maxHp: 120, hp: 120, attack: 30 }),
    enemy('ep_2', '산적', UnitClass.BANDIT, 7, 2, 1),
    enemy('ep_3', '산적', UnitClass.BANDIT, 7, 5, 1),
    enemy('ep_4', '산적 궁수', UnitClass.ARCHER, 8, 5, 1),
  ],
  playerStartPositions: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
};

export const PROLOGUE: Chapter = {
  id: 'prologue',
  name: '프롤로그: 방구석의 봉선',
  description: '삼국지 게임을 하다 잠들었더니... 여포가 되었다?!',
  stages: [
    {
      id: 'pro_s1', name: '산적 토벌', description: '병주의 산적을 토벌하라 (튜토리얼)',
      preDialogue: {
        lines: [
          { speaker: '???', text: '으으... 여기가 어디야? 왜 이렇게 몸이 무겁지...', speakerSide: 'left' },
          { speaker: '???', text: '잠깐, 이 손에 들린 건... 방천화극?! 설마...', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공! 산적들이 마을을 습격하고 있습니다. 출격 명령을 내려주십시오!', speakerSide: 'right' },
          { speaker: '???', text: '(봉선공...? 나보고 봉선공이라고? 설마 내가 여포가 된 건가?!)', speakerSide: 'left' },
          { speaker: '???', text: '(일단 상황을 파악하자. 산적부터 처리하고...)', speakerSide: 'left' },
          { speaker: '여포', text: '...좋다! 출격이다!', speakerSide: 'left' },
          { speaker: '고순', text: '함진영, 준비 완료되었습니다!', speakerSide: 'right' },
        ],
      },
      battleConfig: tutorialBattle,
      postDialogue: {
        lines: [
          { speaker: '여포', text: '(진짜로 싸운 거야...? 근데 몸이 알아서 움직인다. 이 힘은...)', speakerSide: 'left' },
          { speaker: '여포', text: '(삼국지에서 최강이라 불리는 여포의 무력... 내가 이걸 가진 거야?)', speakerSide: 'left' },
          { speaker: '장료', text: '봉선공, 역시 대단한 무용이십니다! 산적들이 모두 도주했습니다.', speakerSide: 'right' },
          { speaker: '여포', text: '(하지만... 역사에서 여포는 비극적인 최후를 맞았지. 배신과 배신의 연속...)', speakerSide: 'left' },
          { speaker: '여포', text: '(내가 여포라면... 이 운명을 바꿀 수 있을까?)', speakerSide: 'left' },
          { speaker: '정원', text: '봉선아, 낙양에서 급보가 왔다. 대장군 하진이 각지의 군사를 소집한다고 하는구나.', speakerSide: 'right' },
          { speaker: '여포', text: '(정원... 역사에서 내가 처음으로 배신한 주군. 동탁에게 적토마를 받고...)', speakerSide: 'left' },
          { speaker: '여포', text: '알겠습니다, 의부. 낙양으로 가시죠.', speakerSide: 'left' },
        ],
      },
      rewards: { gold: 100 },
    },
  ],
};
