import type { TileData, UnitData, UnitStats } from '@shared/types/index.ts';
import { UnitClass } from '@shared/types/index.ts';
import { EQUIPMENT_DEFS } from '@shared/data/equipmentDefs.ts';

export interface CombatResult {
  attackerId: string;
  defenderId: string;
  damage: number;
  defenderDied: boolean;
  defenderHpAfter: number;
  counterDamage: number;
  attackerHpAfter: number;
  attackerDied: boolean;
  typeAdvantage: 'strong' | 'weak' | 'neutral';
  flanking: boolean;
}

/** 상성 배율: 유리 1.2, 불리 0.8, 중립 1.0 */
function getTypeMultiplier(attacker: UnitClass | undefined, defender: UnitClass | undefined): { multiplier: number; advantage: 'strong' | 'weak' | 'neutral' } {
  if (!attacker || !defender) return { multiplier: 1, advantage: 'neutral' };

  const strong: [UnitClass, UnitClass][] = [
    [UnitClass.CAVALRY, UnitClass.INFANTRY],    // 기병 → 보병
    [UnitClass.INFANTRY, UnitClass.ARCHER],      // 보병 → 궁병
    [UnitClass.ARCHER, UnitClass.CAVALRY],       // 궁병 → 기병
    [UnitClass.MARTIAL_ARTIST, UnitClass.STRATEGIST], // 무도가 → 책사
  ];

  for (const [s, w] of strong) {
    if (attacker === s && defender === w) return { multiplier: 1.2, advantage: 'strong' };
    if (attacker === w && defender === s) return { multiplier: 0.8, advantage: 'weak' };
  }
  return { multiplier: 1, advantage: 'neutral' };
}

export class CombatSystem {
  getEffectiveStats(unit: UnitData): UnitStats {
    const base = { ...unit.stats };

    // 상태효과 적용
    if (unit.statusEffects) {
      for (const effect of unit.statusEffects) {
        switch (effect.effect) {
          case 'attack_up':
            base.attack += effect.magnitude;
            break;
          case 'defense_up':
            base.defense += effect.magnitude;
            break;
          case 'attack_down':
            base.attack -= effect.magnitude;
            break;
          case 'defense_down':
            base.defense -= effect.magnitude;
            break;
        }
      }
    }

    // 장비 적용
    if (unit.equipment) {
      const slots = [unit.equipment.weapon, unit.equipment.armor, unit.equipment.accessory];
      for (const itemId of slots) {
        if (!itemId) continue;
        const def = EQUIPMENT_DEFS[itemId];
        if (!def) continue;
        if (def.statModifiers.attack) base.attack += def.statModifiers.attack;
        if (def.statModifiers.defense) base.defense += def.statModifiers.defense;
        if (def.statModifiers.speed) base.speed += def.statModifiers.speed;
      }
    }

    base.attack = Math.max(0, base.attack);
    base.defense = Math.max(0, base.defense);
    return base;
  }

  calculateDamage(attacker: UnitData, defender: UnitData, defenderTile: TileData): number {
    const atkStats = this.getEffectiveStats(attacker);
    const defStats = this.getEffectiveStats(defender);
    const rawDamage = atkStats.attack - defStats.defense;
    const terrainMultiplier = 1 - defenderTile.defenseBonus / 100;
    return Math.max(1, Math.floor(rawDamage * terrainMultiplier));
  }

  /** 협공 체크: 방어자에 인접한 아군 유닛 수 (공격자 제외) */
  countFlankingAllies(attacker: UnitData, defender: UnitData, allUnits: UnitData[]): number {
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    let count = 0;
    for (const d of dirs) {
      const ax = defender.position.x + d.x;
      const ay = defender.position.y + d.y;
      const ally = allUnits.find(u =>
        u.isAlive && u.id !== attacker.id && u.faction === attacker.faction &&
        u.position.x === ax && u.position.y === ay,
      );
      if (ally) count++;
    }
    return count;
  }

  executeAttack(attacker: UnitData, defender: UnitData, defenderTile: TileData, attackerTile?: TileData, allUnits?: UnitData[]): CombatResult {
    // 상성 보정
    const typeResult = getTypeMultiplier(attacker.unitClass, defender.unitClass);

    // 협공 보정 (인접 아군이 있으면 데미지 20% 추가)
    const flankCount = allUnits ? this.countFlankingAllies(attacker, defender, allUnits) : 0;
    const flankBonus = flankCount > 0 ? 1.2 : 1.0;
    const flanking = flankCount > 0;

    // 데미지 계산
    const baseDamage = this.calculateDamage(attacker, defender, defenderTile);
    const damage = Math.max(1, Math.floor(baseDamage * typeResult.multiplier * flankBonus));
    defender.stats.hp = Math.max(0, defender.stats.hp - damage);
    const defenderDied = defender.stats.hp <= 0;
    if (defenderDied) defender.isAlive = false;

    // 반격 (상성 역적용)
    let counterDamage = 0;
    let attackerDied = false;
    if (!defenderDied && this.isInAttackRange(defender, attacker)) {
      const atkTile = attackerTile ?? defenderTile;
      const counterType = getTypeMultiplier(defender.unitClass, attacker.unitClass);
      const counterBase = this.calculateDamage(defender, attacker, atkTile);
      counterDamage = Math.max(1, Math.floor(counterBase * 0.5 * counterType.multiplier));
      attacker.stats.hp = Math.max(0, attacker.stats.hp - counterDamage);
      attackerDied = attacker.stats.hp <= 0;
      if (attackerDied) attacker.isAlive = false;
    }

    attacker.hasActed = true;

    return {
      attackerId: attacker.id,
      defenderId: defender.id,
      damage,
      defenderDied,
      defenderHpAfter: defender.stats.hp,
      counterDamage,
      attackerHpAfter: attacker.stats.hp,
      attackerDied,
      typeAdvantage: typeResult.advantage,
      flanking,
    };
  }

  isInAttackRange(attacker: UnitData, target: UnitData): boolean {
    const dist = Math.abs(attacker.position.x - target.position.x) +
                 Math.abs(attacker.position.y - target.position.y);
    return dist <= attacker.stats.attackRange;
  }
}
