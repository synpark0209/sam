/** 상태효과 ID (타입 안전성) */
export type StatusEffectId =
  // 버프
  | 'attack_up'
  | 'defense_up'
  | 'speed_up'
  | 'morale_up'
  | 'move_up'
  | 'range_up'
  | 'regen'
  | 'counter_up'
  // 디버프
  | 'attack_down'
  | 'defense_down'
  | 'speed_down'
  | 'move_down'
  | 'poison'
  | 'burn'
  | 'stun'
  | 'confuse'
  | 'silence'
  | 'bind'
  | 'taunt';

/** 상태효과가 버프인지 디버프인지 */
export function isBuffEffect(id: StatusEffectId): boolean {
  return ['attack_up', 'defense_up', 'speed_up', 'morale_up', 'move_up', 'range_up', 'regen', 'counter_up'].includes(id);
}

/** 수치 합산 가능한 효과인지 (스탯 변경 + 독/재생) */
export function isStackableEffect(id: StatusEffectId): boolean {
  return ['attack_up', 'defense_up', 'speed_up', 'morale_up', 'move_up', 'range_up',
    'attack_down', 'defense_down', 'speed_down', 'move_down', 'poison', 'regen'].includes(id);
}

/** 상태효과 표시명 */
export const STATUS_EFFECT_NAMES: Record<StatusEffectId, string> = {
  attack_up: '공격↑', defense_up: '방어↑', speed_up: '속도↑', morale_up: '사기↑',
  move_up: '이동↑', range_up: '사거리↑', regen: '재생', counter_up: '반격강화',
  attack_down: '공격↓', defense_down: '방어↓', speed_down: '속도↓', move_down: '이동↓',
  poison: '독', burn: '화상', stun: '기절', confuse: '혼란',
  silence: '침묵', bind: '속박', taunt: '도발',
};

/** 상태효과 색상 */
export const STATUS_EFFECT_COLORS: Record<StatusEffectId, string> = {
  attack_up: '#ff8844', defense_up: '#4488ff', speed_up: '#44ff88', morale_up: '#ffaa00',
  move_up: '#88ff44', range_up: '#88ccff', regen: '#44ff44', counter_up: '#ff4444',
  attack_down: '#884400', defense_down: '#004488', speed_down: '#008844', move_down: '#448800',
  poison: '#88ff00', burn: '#ff4400', stun: '#ffff00', confuse: '#ff88ff',
  silence: '#8888ff', bind: '#888888', taunt: '#ff0000',
};
