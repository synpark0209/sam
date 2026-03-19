import type { Position, UnitData, Faction } from '@shared/types/index.ts';
import type { SkillDef, SkillResult, SkillEffect } from '@shared/types/skill.ts';
import { SkillTargetType, SkillEffectType } from '@shared/types/skill.ts';
import { SKILL_DEFS } from '@shared/data/skillDefs.ts';
import type { GridSystem } from './GridSystem.ts';

export class SkillSystem {
  getUsableSkills(unit: UnitData): SkillDef[] {
    if (!unit.skills) return [];
    const mp = unit.mp ?? 0;
    const cooldowns = unit.skillCooldowns ?? {};

    return unit.skills
      .map(id => SKILL_DEFS[id])
      .filter((def): def is SkillDef => {
        if (!def) return false;
        if (def.mpCost > mp) return false;
        if ((cooldowns[def.id] ?? 0) > 0) return false;
        return true;
      });
  }

  getSkillTargetPositions(
    caster: UnitData, skill: SkillDef, units: UnitData[], gridSystem: GridSystem,
  ): Position[] {
    const range = gridSystem.getAttackRange(caster.position, skill.range);

    switch (skill.targetType) {
      case SkillTargetType.SINGLE_ENEMY:
      case SkillTargetType.AREA_ENEMY:
        return range.filter(pos =>
          units.some(u => u.position.x === pos.x && u.position.y === pos.y &&
            u.isAlive && u.faction !== caster.faction),
        );

      case SkillTargetType.SINGLE_ALLY:
      case SkillTargetType.AREA_ALLY:
        return range.filter(pos =>
          units.some(u => u.position.x === pos.x && u.position.y === pos.y &&
            u.isAlive && u.faction === caster.faction),
        );

      case SkillTargetType.SELF:
        return [{ ...caster.position }];
    }
  }

  getAoeTargets(
    center: Position, radius: number, units: UnitData[], targetFaction: Faction | null,
  ): UnitData[] {
    return units.filter(u => {
      if (!u.isAlive) return false;
      if (targetFaction && u.faction !== targetFaction) return false;
      const dist = Math.abs(u.position.x - center.x) + Math.abs(u.position.y - center.y);
      return dist <= radius;
    });
  }

  executeSkill(
    caster: UnitData, skill: SkillDef, targetPos: Position, units: UnitData[],
  ): SkillResult {
    // MP 소비
    caster.mp = (caster.mp ?? 0) - skill.mpCost;
    if (!caster.skillCooldowns) caster.skillCooldowns = {};
    if (skill.cooldown > 0) caster.skillCooldowns[skill.id] = skill.cooldown;

    const effects: SkillEffect[] = [];
    const isAlly = skill.targetType === SkillTargetType.SINGLE_ALLY ||
                   skill.targetType === SkillTargetType.AREA_ALLY ||
                   skill.targetType === SkillTargetType.SELF;

    // 대상 결정
    let targets: UnitData[];
    if (skill.aoeRadius > 0) {
      const factionFilter = isAlly ? caster.faction : (caster.faction === 'player' ? 'enemy' : 'player');
      targets = this.getAoeTargets(targetPos, skill.aoeRadius, units, factionFilter);
    } else {
      const target = units.find(u =>
        u.position.x === targetPos.x && u.position.y === targetPos.y && u.isAlive,
      );
      targets = target ? [target] : [];
    }

    // 효과 적용
    for (const target of targets) {
      const effect: SkillEffect = { unitId: target.id };

      switch (skill.effectType) {
        case SkillEffectType.DAMAGE: {
          const atkStat = caster.stats.attack;
          const defStat = target.stats.defense;
          const damage = Math.max(1, Math.floor(skill.power + (atkStat - defStat) * 0.3));
          target.stats.hp = Math.max(0, target.stats.hp - damage);
          effect.damageDealt = damage;
          if (target.stats.hp <= 0) {
            target.isAlive = false;
            effect.unitDied = true;
          }
          break;
        }

        case SkillEffectType.HEAL: {
          const healing = Math.min(skill.power, target.stats.maxHp - target.stats.hp);
          target.stats.hp += healing;
          effect.healingDone = healing;
          break;
        }

        case SkillEffectType.BUFF:
        case SkillEffectType.DEBUFF:
        case SkillEffectType.STATUS: {
          if (skill.statusEffect && skill.statusDuration) {
            if (!target.statusEffects) target.statusEffects = [];
            // 같은 효과가 이미 있으면 갱신
            const existing = target.statusEffects.find(e => e.effect === skill.statusEffect);
            if (existing) {
              existing.remainingTurns = skill.statusDuration;
              existing.magnitude = skill.statusMagnitude ?? 0;
            } else {
              target.statusEffects.push({
                effect: skill.statusEffect,
                remainingTurns: skill.statusDuration,
                magnitude: skill.statusMagnitude ?? 0,
                sourceUnitId: caster.id,
              });
            }
            effect.statusApplied = skill.statusEffect;
          }
          break;
        }
      }

      effects.push(effect);
    }

    caster.hasActed = true;
    return { skillId: skill.id, casterId: caster.id, effects };
  }

  processStatusEffectsOnTurnStart(unit: UnitData): { damage: number; skipTurn: boolean } {
    let damage = 0;
    let skipTurn = false;

    if (!unit.statusEffects) return { damage, skipTurn };

    for (const effect of unit.statusEffects) {
      switch (effect.effect) {
        case 'poison':
          damage += effect.magnitude;
          break;
        case 'stun':
          skipTurn = true;
          break;
        case 'confuse':
          skipTurn = Math.random() < 0.5;
          break;
      }
    }

    if (damage > 0) {
      unit.stats.hp = Math.max(0, unit.stats.hp - damage);
      if (unit.stats.hp <= 0) unit.isAlive = false;
    }

    return { damage, skipTurn };
  }

  tickStatusEffects(units: UnitData[]): void {
    for (const unit of units) {
      if (!unit.statusEffects || !unit.isAlive) continue;
      unit.statusEffects = unit.statusEffects
        .map(e => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
        .filter(e => e.remainingTurns > 0);
    }
  }

  tickCooldowns(unit: UnitData): void {
    if (!unit.skillCooldowns) return;
    for (const skillId of Object.keys(unit.skillCooldowns)) {
      unit.skillCooldowns[skillId] = Math.max(0, unit.skillCooldowns[skillId] - 1);
    }
  }
}
