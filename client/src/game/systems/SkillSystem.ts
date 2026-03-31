import type { Position, UnitData, Faction } from '@shared/types/index.ts';
import type { SkillDef, SkillResult, SkillEffectResult } from '@shared/types/skill.ts';
import { SkillTargetType, SkillEffectType } from '@shared/types/skill.ts';
import { SKILL_DEFS } from '@shared/data/skillDefs.ts';
import { getClassSkillId } from '@shared/data/classSkillDefs.ts';
import type { GridSystem } from './GridSystem.ts';

export class SkillSystem {
  /** 유닛의 4슬롯 스킬 ID 목록 반환 */
  getAllSkillIds(unit: UnitData): string[] {
    const ids: string[] = [];

    // 슬롯1: 병종 기본 스킬 (승급에 따라 자동 결정)
    if (unit.unitClass) {
      const classSkill = unit.classSkillId ?? getClassSkillId(unit.unitClass, unit.promotionLevel ?? 0);
      ids.push(classSkill);
    }

    // 슬롯2: 장수 고유 스킬 (Lv.20 이상 시 해금)
    if (unit.uniqueSkill && (unit.uniqueSkillUnlocked || (unit.level ?? 1) >= 20)) {
      ids.push(unit.uniqueSkill);
    }

    // 슬롯3~4: 장착 스킬
    if (unit.equippedSkills) {
      const maxSlots = (unit.level ?? 1) >= 10 ? 2 : 1;
      ids.push(...unit.equippedSkills.slice(0, maxSlots));
    }

    // 하위 호환: 위 시스템이 없으면 기존 skills 필드 사용
    if (ids.length === 0 && unit.skills) ids.push(...unit.skills);

    return ids;
  }

  getUsableSkills(unit: UnitData): SkillDef[] {
    const allIds = this.getAllSkillIds(unit);
    if (allIds.length === 0) return [];
    const mp = unit.mp ?? 0;
    const cooldowns = unit.skillCooldowns ?? {};

    return allIds
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

    const effects: SkillEffectResult[] = [];
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
    if (skill.effects && skill.effects.length > 0) {
      // 복합 효과 처리
      for (const target of targets) {
        const effectResult: SkillEffectResult = { unitId: target.id };
        for (const sub of skill.effects) {
          switch (sub.type) {
            case 'damage': {
              const scaling = sub.scaling === 'spirit' ? (caster.stats.spirit ?? 0) : caster.stats.attack;
              const dmg = Math.max(1, Math.floor(scaling * (sub.power ?? 0) / 100) - target.stats.defense);
              target.stats.hp = Math.max(0, target.stats.hp - dmg);
              effectResult.damageDealt = (effectResult.damageDealt ?? 0) + dmg;
              if (target.stats.hp <= 0) { target.isAlive = false; effectResult.unitDied = true; }
              break;
            }
            case 'heal': {
              const heal = Math.floor(caster.stats.spirit * (sub.power ?? 0) / 100);
              const actual = Math.min(heal, target.stats.maxHp - target.stats.hp);
              target.stats.hp += actual;
              effectResult.healingDone = (effectResult.healingDone ?? 0) + actual;
              break;
            }
            case 'buff': {
              // 버프: SELF/AREA_ALLY인 경우 대상(아군/자신)에 적용, AREA_ENEMY인 경우 시전자에 적용
              const buffTarget = isAlly ? target : caster;
              if (sub.statusEffect) {
                if (!buffTarget.statusEffects) buffTarget.statusEffects = [];
                buffTarget.statusEffects.push({
                  effect: sub.statusEffect,
                  remainingTurns: sub.statusDuration ?? 2,
                  magnitude: sub.statusMagnitude ?? 0,
                  sourceUnitId: caster.id,
                });
                effectResult.statusApplied = effectResult.statusApplied
                  ? effectResult.statusApplied + ', ' + sub.statusEffect
                  : sub.statusEffect;
              }
              break;
            }
            case 'debuff':
            case 'status': {
              if (sub.statusEffect) {
                if (!target.statusEffects) target.statusEffects = [];
                target.statusEffects.push({
                  effect: sub.statusEffect,
                  remainingTurns: sub.statusDuration ?? 2,
                  magnitude: sub.statusMagnitude ?? 0,
                  sourceUnitId: caster.id,
                });
                effectResult.statusApplied = effectResult.statusApplied
                  ? effectResult.statusApplied + ', ' + sub.statusEffect
                  : sub.statusEffect;
              }
              break;
            }
          }
        }
        effects.push(effectResult);
      }
    } else {
      // 레거시: 단일 효과 처리
      for (const target of targets) {
        const effect: SkillEffectResult = { unitId: target.id };

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
