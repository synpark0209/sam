import type { Position, UnitData } from '../types/index.ts';
import type { StatusEffectId } from '../types/statusEffect.ts';

export interface FormationBuff {
  statusEffect: StatusEffectId;
  magnitude: number;
  duration: number;
  /** 특정 유닛에만 적용 (예: 전열/돌출 유닛) */
  targetFilter?: 'all' | 'front' | 'back' | 'center';
}

export interface FormationDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  minUnits: number;
  buffs: FormationBuff[];
}

export const FORMATIONS: FormationDef[] = [
  {
    id: 'crane_wing', name: '학익진(鶴翼陣)', icon: '🦅',
    description: '전원 공격 +10, 사기 +15',
    minUnits: 3,
    buffs: [
      { statusEffect: 'attack_up', magnitude: 10, duration: 3, targetFilter: 'all' },
      { statusEffect: 'morale_up', magnitude: 15, duration: 3, targetFilter: 'all' },
    ],
  },
  {
    id: 'fish_scale', name: '어린진(魚鱗陣)', icon: '🐟',
    description: '전열 방어 +20, 후열 공격 +10',
    minUnits: 3,
    buffs: [
      { statusEffect: 'defense_up', magnitude: 20, duration: 3, targetFilter: 'front' },
      { statusEffect: 'attack_up', magnitude: 10, duration: 3, targetFilter: 'back' },
    ],
  },
  {
    id: 'arrow_head', name: '봉시진(鋒矢陣)', icon: '➤',
    description: '선두 공격 +25, 후방 사거리 +1',
    minUnits: 3,
    buffs: [
      { statusEffect: 'attack_up', magnitude: 25, duration: 3, targetFilter: 'front' },
      { statusEffect: 'range_up', magnitude: 1, duration: 3, targetFilter: 'back' },
    ],
  },
  {
    id: 'long_snake', name: '장사진(長蛇陣)', icon: '🐍',
    description: '전원 이동 +1, 속도 +2',
    minUnits: 3,
    buffs: [
      { statusEffect: 'move_up', magnitude: 1, duration: 3, targetFilter: 'all' },
      { statusEffect: 'speed_up', magnitude: 2, duration: 3, targetFilter: 'all' },
    ],
  },
  {
    id: 'square', name: '방원진(方圓陣)', icon: '🛡️',
    description: '전원 방어 +15, 재생 +8',
    minUnits: 3,
    buffs: [
      { statusEffect: 'defense_up', magnitude: 15, duration: 3, targetFilter: 'all' },
      { statusEffect: 'regen', magnitude: 8, duration: 3, targetFilter: 'all' },
    ],
  },
];

/** 유닛 배치 패턴으로 진형 감지 */
export function detectFormation(units: UnitData[]): FormationDef | null {
  const alive = units.filter(u => u.isAlive);
  if (alive.length < 3) return null;

  const positions = alive.map(u => u.position);

  // 가로 일렬 (같은 y, 연속 x) → 장사진
  if (isHorizontalLine(positions)) return FORMATIONS.find(f => f.id === 'long_snake')!;

  // 세로 일렬 (같은 x, 연속 y) → 어린진
  if (isVerticalLine(positions)) return FORMATIONS.find(f => f.id === 'fish_scale')!;

  // V자 배치 → 학익진
  if (isVShape(positions)) return FORMATIONS.find(f => f.id === 'crane_wing')!;

  // 화살촉 (1명 앞 + 나머지 뒤) → 봉시진
  if (isArrowHead(positions)) return FORMATIONS.find(f => f.id === 'arrow_head')!;

  // 밀집 사각형 → 방원진
  if (isCluster(positions)) return FORMATIONS.find(f => f.id === 'square')!;

  return null;
}

/** 진형 버프 적용 (전투 시작 시 호출) */
export function applyFormationBuffs(formation: FormationDef, units: UnitData[]): void {
  const alive = units.filter(u => u.isAlive);
  if (alive.length === 0) return;

  // 전열/후열 구분 (x 좌표 기준 — 큰 쪽이 전열)
  const avgX = alive.reduce((s, u) => s + u.position.x, 0) / alive.length;

  for (const buff of formation.buffs) {
    const targets = alive.filter(u => {
      if (!buff.targetFilter || buff.targetFilter === 'all') return true;
      if (buff.targetFilter === 'front') return u.position.x >= avgX;
      if (buff.targetFilter === 'back') return u.position.x < avgX;
      if (buff.targetFilter === 'center') {
        const avgY = alive.reduce((s, a) => s + a.position.y, 0) / alive.length;
        return Math.abs(u.position.x - avgX) <= 1 && Math.abs(u.position.y - avgY) <= 1;
      }
      return true;
    });

    for (const target of targets) {
      if (!target.statusEffects) target.statusEffects = [];
      target.statusEffects.push({
        effect: buff.statusEffect,
        remainingTurns: buff.duration,
        magnitude: buff.magnitude,
        sourceUnitId: 'formation',
      });
    }
  }
}

// ── 패턴 감지 헬퍼 ──

function isHorizontalLine(positions: Position[]): boolean {
  if (positions.length < 3) return false;
  const ys = new Set(positions.map(p => p.y));
  if (ys.size !== 1) return false;
  const xs = positions.map(p => p.x).sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - xs[i - 1] > 2) return false;
  }
  return true;
}

function isVerticalLine(positions: Position[]): boolean {
  if (positions.length < 3) return false;
  const xs = new Set(positions.map(p => p.x));
  if (xs.size !== 1) return false;
  const ys = positions.map(p => p.y).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i++) {
    if (ys[i] - ys[i - 1] > 2) return false;
  }
  return true;
}

function isVShape(positions: Position[]): boolean {
  if (positions.length < 3) return false;
  const sorted = [...positions].sort((a, b) => a.x - b.x);
  const front = sorted[sorted.length - 1]; // 가장 앞 (x 큰 쪽)
  const wings = sorted.slice(0, -1);
  // 날개가 앞 유닛보다 뒤에 있고, y 방향으로 퍼져 있는지
  const wingYs = wings.map(w => w.y);
  const ySpread = Math.max(...wingYs) - Math.min(...wingYs);
  const allBehind = wings.every(w => w.x < front.x);
  return allBehind && ySpread >= 2;
}

function isArrowHead(positions: Position[]): boolean {
  if (positions.length < 3) return false;
  const sorted = [...positions].sort((a, b) => a.x - b.x);
  const front = sorted[sorted.length - 1];
  const rest = sorted.slice(0, -1);
  // 1명만 앞에 돌출
  const secondMaxX = Math.max(...rest.map(r => r.x));
  return front.x - secondMaxX >= 2 && rest.length >= 2;
}

function isCluster(positions: Position[]): boolean {
  if (positions.length < 3) return false;
  // 모든 유닛이 서로 2칸 이내
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = Math.abs(positions[i].x - positions[j].x);
      const dy = Math.abs(positions[i].y - positions[j].y);
      if (dx > 2 || dy > 2) return false;
    }
  }
  return true;
}
