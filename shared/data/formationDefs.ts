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
  /** 3×3 배치 패턴 (true = 장수 배치 필요) */
  pattern: boolean[][];
  /** 필요 장수 수 (pattern에서 true 개수) */
  unitCount: number;
  buffs: FormationBuff[];
}

/**
 * 3×3 그리드 진형 정의
 * 패턴: [row][col], row=0은 후열, row=2는 전열
 *
 *   열0(후) 열1(중) 열2(전)
 * 행0  [ ]   [ ]   [ ]
 * 행1  [ ]   [ ]   [ ]
 * 행2  [ ]   [ ]   [ ]
 */
export const FORMATIONS: FormationDef[] = [
  {
    id: 'crane_wing', name: '학익진(鶴翼陣)', icon: '🦅',
    description: '공격 +10, 사기 +15',
    // V자 형태
    pattern: [
      [false, false, true],
      [true,  false, true],
      [false, false, true],
    ],
    unitCount: 4,
    buffs: [
      { statusEffect: 'attack_up', magnitude: 10, duration: 3 },
      { statusEffect: 'morale_up', magnitude: 15, duration: 3 },
    ],
  },
  {
    id: 'fish_scale', name: '어린진(魚鱗陣)', icon: '🐟',
    description: '방어 +20, 공격 +10',
    // 세로 중앙 + 전열
    pattern: [
      [false, true, false],
      [false, true, true],
      [false, true, false],
    ],
    unitCount: 4,
    buffs: [
      { statusEffect: 'defense_up', magnitude: 20, duration: 3 },
      { statusEffect: 'attack_up', magnitude: 10, duration: 3 },
    ],
  },
  {
    id: 'arrow_head', name: '봉시진(鋒矢陣)', icon: '➤',
    description: '공격 +25, 사거리 +1',
    // 화살촉: 중앙 세로 + 전열 양쪽
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
    // 가로 중앙 일렬 + 후열 1명
    pattern: [
      [true,  true,  true],
      [false, false, false],
      [false, true,  false],
    ],
    unitCount: 4,
    buffs: [
      { statusEffect: 'move_up', magnitude: 1, duration: 3 },
      { statusEffect: 'speed_up', magnitude: 2, duration: 3 },
    ],
  },
  {
    id: 'square', name: '방원진(方圓陣)', icon: '🛡️',
    description: '방어 +15, 재생 +8',
    // 밀집 사각 + 중앙
    pattern: [
      [false, true, true],
      [false, true, true],
      [false, false, true],
    ],
    unitCount: 5,
    buffs: [
      { statusEffect: 'defense_up', magnitude: 15, duration: 3 },
      { statusEffect: 'regen', magnitude: 8, duration: 3 },
    ],
  },
];

/** 진형 패턴 검증: 모든 패턴 칸에 장수가 배치되었는지 확인 */
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

/** 특정 칸이 진형에서 활성화된 칸인지 확인 */
export function isPatternSlot(formation: FormationDef, row: number, col: number): boolean {
  return formation.pattern[row]?.[col] ?? false;
}
