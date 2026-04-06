import type { TileData, UnitData, UnitStats } from '@shared/types/index.ts';
import { UnitClass } from '@shared/types/index.ts';
import { EQUIPMENT_DEFS } from '@shared/data/equipmentDefs.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import { getAwakeningStatMultiplier } from '@shared/data/awakeningDefs.ts';

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
  missed: boolean;
  critical: boolean;
  doubleAttack: boolean;
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
          case 'speed_up':
            base.speed += effect.magnitude;
            break;
          case 'speed_down':
            base.speed -= effect.magnitude;
            break;
          case 'morale_up':
            base.morale += effect.magnitude;
            break;
          case 'move_up':
            base.moveRange += effect.magnitude;
            break;
          case 'move_down':
            base.moveRange = Math.max(1, base.moveRange - effect.magnitude);
            break;
          case 'range_up':
            base.attackRange += effect.magnitude;
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
        for (const [key, value] of Object.entries(def.statModifiers)) {
          if (value && key in base) {
            (base as Record<string, number>)[key] += value;
          }
        }
      }
    }

    // 각성 보너스 적용
    const awakeningMult = getAwakeningStatMultiplier(unit.awakeningLevel ?? 0);
    if (awakeningMult > 1) {
      base.maxHp = Math.floor(base.maxHp * awakeningMult);
      base.attack = Math.floor(base.attack * awakeningMult);
      base.defense = Math.floor(base.defense * awakeningMult);
    }

    base.attack = Math.max(0, base.attack);
    base.defense = Math.max(0, base.defense);
    return base;
  }

  calculateDamage(attacker: UnitData, defender: UnitData, defenderTile: TileData): number {
    const atkStats = this.getEffectiveStats(attacker);
    const defStats = this.getEffectiveStats(defender);
    // 관통: 방어력의 일부를 무시
    const effectiveDefense = defStats.defense * (1 - (atkStats.penetration ?? 0) / 100);
    const rawDamage = atkStats.attack - effectiveDefense;
    const terrainMultiplier = 1 - defenderTile.defenseBonus / 100;
    return Math.max(1, Math.floor(rawDamage * terrainMultiplier));
  }

  /** 명중 판정: 기본 90% + (공격자 민첩 - 방어자 민첩) * 2% */
  checkHit(attacker: UnitData, defender: UnitData): boolean {
    const atkStats = this.getEffectiveStats(attacker);
    const defStats = this.getEffectiveStats(defender);
    const hitRate = 90 + ((atkStats.agility ?? 0) - (defStats.agility ?? 0)) * 2;
    const clampedRate = Math.min(99, Math.max(30, hitRate));
    return Math.random() * 100 < clampedRate;
  }

  /** 크리티컬 판정: 순발력 / 200 (50순발 = 25%) */
  checkCritical(attacker: UnitData): boolean {
    const atkStats = this.getEffectiveStats(attacker);
    const critRate = (atkStats.critical ?? 0) / 200;
    return Math.random() < critRate;
  }

  /** 크리티컬 데미지 배율: 150% + 사기 * 0.5% + HP 낮을수록 보너스 */
  getCriticalMultiplier(attacker: UnitData): number {
    const stats = this.getEffectiveStats(attacker);
    const hpRatio = stats.hp / stats.maxHp;
    const moraleBonus = (stats.morale ?? 0) * 0.5;
    const lowHpBonus = hpRatio < 0.3 ? 30 : hpRatio < 0.5 ? 15 : 0;
    return (150 + moraleBonus + lowHpBonus) / 100;
  }

  /** 2회 공격 판정: 속도 차이 기반 */
  checkDoubleAttack(attacker: UnitData, defender: UnitData): boolean {
    const atkSpeed = this.getEffectiveStats(attacker).speed;
    const defSpeed = this.getEffectiveStats(defender).speed;
    if (atkSpeed <= defSpeed) return false;
    // 속도 1.5배 이상이면 30%, 2배 이상이면 60%
    const ratio = atkSpeed / Math.max(1, defSpeed);
    if (ratio >= 2) return Math.random() < 0.6;
    if (ratio >= 1.5) return Math.random() < 0.3;
    return Math.random() < 0.05;
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
    // 명중 판정
    const missed = !this.checkHit(attacker, defender);
    if (missed) {
      attacker.hasActed = true;
      return {
        attackerId: attacker.id, defenderId: defender.id,
        damage: 0, defenderDied: false, defenderHpAfter: defender.stats.hp,
        counterDamage: 0, attackerHpAfter: attacker.stats.hp, attackerDied: false,
        typeAdvantage: 'neutral', flanking: false, missed: true, critical: false, doubleAttack: false,
      };
    }

    // 상성 보정
    const typeResult = getTypeMultiplier(attacker.unitClass, defender.unitClass);

    // 협공 보정
    const flankCount = allUnits ? this.countFlankingAllies(attacker, defender, allUnits) : 0;
    const flankBonus = flankCount > 0 ? 1.2 : 1.0;
    const flanking = flankCount > 0;

    // 크리티컬 판정
    const critical = this.checkCritical(attacker);
    const critMult = critical ? this.getCriticalMultiplier(attacker) : 1.0;

    // 데미지 계산
    const baseDamage = this.calculateDamage(attacker, defender, defenderTile);
    let damage = Math.max(1, Math.floor(baseDamage * typeResult.multiplier * flankBonus * critMult));

    // 2회 공격 판정
    const doubleAttack = this.checkDoubleAttack(attacker, defender);
    if (doubleAttack) {
      damage = Math.floor(damage * 1.5); // 2회 공격 = 1.5배 데미지
    }

    defender.stats.hp = Math.max(0, defender.stats.hp - damage);
    const defenderDied = defender.stats.hp <= 0;
    if (defenderDied) defender.isAlive = false;

    // 반격 (상성 역적용, 명중 판정 포함)
    let counterDamage = 0;
    let attackerDied = false;
    if (!defenderDied && this.isInAttackRange(defender, attacker)) {
      if (this.checkHit(defender, attacker)) {
        const atkTile = attackerTile ?? defenderTile;
        const counterType = getTypeMultiplier(defender.unitClass, attacker.unitClass);
        const counterBase = this.calculateDamage(defender, attacker, atkTile);
        const counterCrit = this.checkCritical(defender) ? this.getCriticalMultiplier(defender) : 1.0;
        counterDamage = Math.max(1, Math.floor(counterBase * 0.5 * counterType.multiplier * counterCrit));
        attacker.stats.hp = Math.max(0, attacker.stats.hp - counterDamage);
        attackerDied = attacker.stats.hp <= 0;
        if (attackerDied) attacker.isAlive = false;
      }
    }

    attacker.hasActed = true;

    return {
      attackerId: attacker.id, defenderId: defender.id,
      damage, defenderDied, defenderHpAfter: defender.stats.hp,
      counterDamage, attackerHpAfter: attacker.stats.hp, attackerDied,
      typeAdvantage: typeResult.advantage, flanking,
      missed: false, critical, doubleAttack,
    };
  }

  isInAttackRange(attacker: UnitData, target: UnitData): boolean {
    const dx = Math.abs(attacker.position.x - target.position.x);
    const dy = Math.abs(attacker.position.y - target.position.y);
    const cls = attacker.unitClass ?? UnitClass.INFANTRY;
    const diagonal = UNIT_CLASS_DEFS[cls]?.diagonalAttack ?? false;
    const dist = diagonal ? Math.max(dx, dy) : dx + dy;
    return dist <= attacker.stats.attackRange;
  }
}
