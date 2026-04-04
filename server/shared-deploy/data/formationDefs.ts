import type { StatusEffectId } from '../types/statusEffect.ts';

export interface FormationBuff {
  statusEffect: StatusEffectId;
  magnitude: number;
  duration: number;
}

export interface FormationDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  /**
   * 3×3 배치 패턴 — 좌우 방향 기준
   * pattern[row][col]
   * col 0 = 후열 (왼쪽, 아군 뒤), col 2 = 전열 (오른쪽, 적 가까이)
   * row 0~2 = 상~하 (세로 위치)
   */
  pattern: boolean[][];
  unitCount: number;
  buffs: FormationBuff[];
}

export const FORMATIONS: FormationDef[] = [
  {
    id: 'crane_wing', name: '학익진(鶴翼陣)', icon: '🦅',
    description: '공격 +10, 사기 +15',
    // 옆으로 누운 V자: 전열 중앙 + 후열 상하
    //  ●  ·  ·
    //  ·  ●  ●
    //  ●  ·  ·
    //  ·  ●  ·
    //  → 5칸 sideways V
    pattern: [
      [true,  false, true],
      [false, true,  true],
      [true,  true,  false],
    ],
    unitCount: 5,
    buffs: [
      { statusEffect: 'attack_up', magnitude: 10, duration: 3 },
      { statusEffect: 'morale_up', magnitude: 15, duration: 3 },
    ],
  },
  {
    id: 'fish_scale', name: '어린진(魚鱗陣)', icon: '🐟',
    description: '방어 +20, 공격 +10',
    // 옆으로 누운 T자: 전열 세로 3칸 + 중열 중앙 + 후열 중앙
    //  ·  ·  ●
    //  ●  ●  ●
    //  ·  ·  ●
    pattern: [
      [false, false, true],
      [true,  true,  true],
      [false, false, true],
    ],
    unitCount: 5,
    buffs: [
      { statusEffect: 'defense_up', magnitude: 20, duration: 3 },
      { statusEffect: 'attack_up', magnitude: 10, duration: 3 },
    ],
  },
  {
    id: 'arrow_head', name: '봉시진(鋒矢陣)', icon: '➤',
    description: '공격 +25, 사거리 +1',
    // 화살촉: 가로 십자
    //  ·  ●  ·
    //  ●  ●  ●
    //  ·  ●  ·
    pattern: [
      [false, true,  false],
      [true,  true,  true],
      [false, true,  false],
    ],
    unitCount: 5,
    buffs: [
      { statusEffect: 'attack_up', magnitude: 25, duration: 3 },
      { statusEffect: 'range_up', magnitude: 1, duration: 3 },
    ],
  },
  {
    id: 'long_snake', name: '장사진(長蛇陣)', icon: '🐍',
    description: '이동 +1, 속도 +2',
    // 가로 뱀: 중앙 가로 + 상하 전열
    //  ·  ·  ●
    //  ●  ●  ●
    //  ·  ·  ●
    pattern: [
      [false, false, true],
      [true,  true,  true],
      [false, false, true],
    ],
    unitCount: 5,
    buffs: [
      { statusEffect: 'move_up', magnitude: 1, duration: 3 },
      { statusEffect: 'speed_up', magnitude: 2, duration: 3 },
    ],
  },
  {
    id: 'square', name: '방원진(方圓陣)', icon: '🛡️',
    description: '방어 +15, 재생 +8',
    // 밀집 사각: 후열~중열 밀집 + 전열 중앙
    //  ●  ●  ·
    //  ●  ●  ●
    //  ·  ·  ·
    pattern: [
      [true,  true,  false],
      [true,  true,  true],
      [false, false, false],
    ],
    unitCount: 5,
    buffs: [
      { statusEffect: 'defense_up', magnitude: 15, duration: 3 },
      { statusEffect: 'regen', magnitude: 8, duration: 3 },
    ],
  },
];

/** 최소 4칸 이상 채워졌는지 확인 */
export function isFormationReady(
  formation: FormationDef,
  slots: (unknown | null)[],
): boolean {
  let filled = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      if (formation.pattern[row][col] && slots[idx]) filled++;
    }
  }
  return filled >= 4;
}

/** 진형 완전히 채워졌는지 (5/5) */
export function isFormationComplete(
  formation: FormationDef,
  slots: (unknown | null)[],
): boolean {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      if (formation.pattern[row][col] && !slots[idx]) return false;
    }
  }
  return true;
}

/** 특정 칸이 진형 패턴 칸인지 */
export function isPatternSlot(formation: FormationDef, row: number, col: number): boolean {
  return formation.pattern[row]?.[col] ?? false;
}

/** 첫 번째 빈 패턴 칸 인덱스 (-1 = 없음) */
export function getFirstEmptyPatternSlot(
  formation: FormationDef,
  slots: (unknown | null)[],
): number {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      if (formation.pattern[row][col] && !slots[idx]) return idx;
    }
  }
  return -1;
}

/**
 * 좌우 패턴을 상하로 전치 (던전용)
 * 좌우: col=후→전 (좌→우)
 * 상하: row=전→후 (위→아래) — col이 row가 됨
 */
export function transposePattern(pattern: boolean[][]): boolean[][] {
  const result: boolean[][] = [[], [], []];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      // 전치: [r][c] → [c][r], 그리고 col 방향 반전 (전열이 위로)
      result[c][r] = pattern[r][2 - c];
    }
  }
  return result;
}
