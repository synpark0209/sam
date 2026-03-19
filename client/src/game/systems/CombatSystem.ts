import type { TileData, UnitData, UnitStats } from '@shared/types/index.ts';
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

  executeAttack(attacker: UnitData, defender: UnitData, defenderTile: TileData, attackerTile?: TileData): CombatResult {
    // 공격
    const damage = this.calculateDamage(attacker, defender, defenderTile);
    defender.stats.hp = Math.max(0, defender.stats.hp - damage);
    const defenderDied = defender.stats.hp <= 0;
    if (defenderDied) defender.isAlive = false;

    // 반격: 방어자가 생존하고, 공격자가 방어자의 공격 사거리 내에 있을 때
    let counterDamage = 0;
    let attackerDied = false;
    if (!defenderDied && this.isInAttackRange(defender, attacker)) {
      const atkTile = attackerTile ?? defenderTile; // fallback
      counterDamage = Math.max(1, Math.floor(
        this.calculateDamage(defender, attacker, atkTile) * 0.5,
      ));
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
    };
  }

  isInAttackRange(attacker: UnitData, target: UnitData): boolean {
    const dist = Math.abs(attacker.position.x - target.position.x) +
                 Math.abs(attacker.position.y - target.position.y);
    return dist <= attacker.stats.attackRange;
  }
}
