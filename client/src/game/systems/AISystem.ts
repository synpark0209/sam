import type { UnitData } from '@shared/types/index.ts';
import type { Position } from '@shared/types/index.ts';
import type { SkillDef } from '@shared/types/skill.ts';
import { SkillEffectType } from '@shared/types/skill.ts';
import type { GridSystem } from './GridSystem.ts';
import type { CombatSystem } from './CombatSystem.ts';
import type { TurnSystem } from './TurnSystem.ts';
import { SkillSystem } from './SkillSystem.ts';

export interface AIAction {
  unit: UnitData;
  moveTo: Position | null;
  attackTarget: UnitData | null;
  skillAction?: { skillId: string; targetPos: Position };
}

export class AISystem {
  private skillSystem: SkillSystem;

  constructor(
    private gridSystem: GridSystem,
    private combatSystem: CombatSystem,
    private turnSystem: TurnSystem,
  ) {
    this.skillSystem = new SkillSystem();
  }

  planActions(): AIAction[] {
    const enemies = this.turnSystem.getUnitsByFaction('enemy');
    const actions: AIAction[] = [];
    const claimedTiles = new Set<string>();
    for (const enemy of enemies) {
      if (enemy.hasActed) continue;
      const action = this.planUnitAction(enemy, claimedTiles);
      if (action.moveTo) {
        claimedTiles.add(`${action.moveTo.x},${action.moveTo.y}`);
      }
      actions.push(action);
    }
    return actions;
  }

  private planUnitAction(enemy: UnitData, claimedTiles: Set<string> = new Set()): AIAction {
    const playerUnits = this.turnSystem.getUnitsByFaction('player');
    if (playerUnits.length === 0) {
      return { unit: enemy, moveTo: null, attackTarget: null };
    }

    // 스킬 사용 시도: 힐 > AoE 데미지 > 버프
    const skillAction = this.evaluateSkill(enemy, playerUnits);
    if (skillAction) {
      return { unit: enemy, moveTo: null, attackTarget: null, skillAction };
    }

    // 공격 사거리 안에 적이 있으면 공격
    for (const target of playerUnits) {
      if (this.combatSystem.isInAttackRange(enemy, target)) {
        return { unit: enemy, moveTo: null, attackTarget: target };
      }
    }

    // 이동
    const state = this.turnSystem.getState();
    const nearest = this.findNearest(enemy.position, playerUnits);
    const moveRange = this.gridSystem.getMovementRange(
      enemy.position, enemy.stats.moveRange, state.units, 'enemy', enemy.unitClass,
    );

    if (moveRange.length === 0) {
      return { unit: enemy, moveTo: null, attackTarget: null };
    }

    let bestTile: Position | null = null;
    let bestDist = Infinity;

    for (const tile of moveRange) {
      // 다른 AI 유닛이 이미 이동 예정인 타일 제외
      if (claimedTiles.has(`${tile.x},${tile.y}`)) continue;
      const dist = this.gridSystem.manhattanDistance(tile, nearest.position);
      if (dist < bestDist) {
        bestTile = tile;
        bestDist = dist;
      }
    }

    let attackTarget: UnitData | null = null;
    if (bestTile) {
      const distAfterMove = this.gridSystem.manhattanDistance(bestTile, nearest.position);
      if (distAfterMove <= enemy.stats.attackRange) {
        attackTarget = nearest;
      }
    }

    return { unit: enemy, moveTo: bestTile, attackTarget };
  }

  private evaluateSkill(enemy: UnitData, playerUnits: UnitData[]): { skillId: string; targetPos: Position } | null {
    const usableSkills = this.skillSystem.getUsableSkills(enemy);
    if (usableSkills.length === 0) return null;

    const allies = this.turnSystem.getUnitsByFaction('enemy');

    // 1. 힐: 아군 HP가 40% 이하이면 치유
    const healSkills = usableSkills.filter(s => s.effectType === SkillEffectType.HEAL);
    for (const skill of healSkills) {
      const targets = this.skillSystem.getSkillTargetPositions(enemy, skill, [...allies, ...playerUnits], this.gridSystem);
      for (const pos of targets) {
        const target = allies.find(u => u.position.x === pos.x && u.position.y === pos.y);
        if (target && target.stats.hp / target.stats.maxHp < 0.4) {
          return { skillId: skill.id, targetPos: pos };
        }
      }
    }

    // 2. AoE 데미지: 2명 이상 타격 가능하면 사용
    const damageSkills = usableSkills.filter(s => s.effectType === SkillEffectType.DAMAGE && s.aoeRadius > 0);
    for (const skill of damageSkills) {
      const targets = this.skillSystem.getSkillTargetPositions(enemy, skill, [...allies, ...playerUnits], this.gridSystem);
      for (const pos of targets) {
        const hits = this.countAoeHits(pos, skill, playerUnits);
        if (hits >= 2) {
          return { skillId: skill.id, targetPos: pos };
        }
      }
    }

    // 3. 단일 데미지 스킬
    const singleDamageSkills = usableSkills.filter(s => s.effectType === SkillEffectType.DAMAGE && s.aoeRadius === 0);
    for (const skill of singleDamageSkills) {
      const targets = this.skillSystem.getSkillTargetPositions(enemy, skill, [...allies, ...playerUnits], this.gridSystem);
      if (targets.length > 0) {
        return { skillId: skill.id, targetPos: targets[0] };
      }
    }

    return null;
  }

  private countAoeHits(center: Position, skill: SkillDef, targets: UnitData[]): number {
    return targets.filter(u =>
      u.isAlive && this.gridSystem.manhattanDistance(center, u.position) <= skill.aoeRadius,
    ).length;
  }

  private findNearest(origin: Position, targets: UnitData[]): UnitData {
    let nearest = targets[0];
    let minDist = this.gridSystem.manhattanDistance(origin, nearest.position);
    for (let i = 1; i < targets.length; i++) {
      const dist = this.gridSystem.manhattanDistance(origin, targets[i].position);
      if (dist < minDist) {
        minDist = dist;
        nearest = targets[i];
      }
    }
    return nearest;
  }
}
