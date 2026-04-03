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
  /** 3×3 배치 패턴 (true = 장수 배치 칸) — 상하 기준 */
  pattern: boolean[][];
  unitCount: number;
  buffs: FormationBuff[];
}

/**
 * 3×3 그리드 진형 정의 (상하 방향 기준)
 *
 * 행(row) 0 = 전열 (적 가까이)
 * 행(row) 2 = 후열 (적 멀리)
 * 열(col) 0~2 = 좌~우
 *
 * PvP에서는 90도 회전하여 좌우로 표시
 */
export const FORMATIONS: FormationDef[] = [
  {
    id: 'crane_wing', name: '학익진(鶴翼陣)', icon: '🦅',
    description: '공격 +10, 사기 +15',
    // V자 + 중앙
    pattern: [
      [true,  false, true],
      [false, true,  false],
      [true,  false, true],
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
    // 세로 중앙 + 전열 양쪽
    pattern: [
      [true,  true,  true],
      [false, true,  false],
      [false, true,  false],
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
    // 화살촉: 십자형
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
    // 가로 + 세로 중앙
    pattern: [
      [true,  true,  true],
      [false, true,  false],
      [false, true,  false],
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
    // 밀집 + 중앙
    pattern: [
      [true,  false, true],
      [true,  true,  false],
      [true,  false, false],
    ],
    unitCount: 5,
    buffs: [
      { statusEffect: 'defense_up', magnitude: 15, duration: 3 },
      { statusEffect: 'regen', magnitude: 8, duration: 3 },
    ],
  },
];

/** 최소 4칸 이상 채워졌는지 확인 (전투 시작 가능 조건) */
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

/** 진형 패턴이 완전히 채워졌는지 확인 (5/5) */
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

/** 특정 칸이 진형 패턴 칸인지 확인 */
export function isPatternSlot(formation: FormationDef, row: number, col: number): boolean {
  return formation.pattern[row]?.[col] ?? false;
}

/** 진형의 첫 번째 빈 패턴 칸 인덱스 반환 (-1이면 없음) */
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
