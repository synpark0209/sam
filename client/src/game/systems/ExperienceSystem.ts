import type { UnitData } from '@shared/types/index.ts';
import type { LevelUpResult } from '@shared/types/experience.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import { canPromote } from '@shared/data/promotionDefs.ts';

export class ExperienceSystem {
  readonly EXP_PER_LEVEL = 100;

  calculateExpGain(
    action: 'attack' | 'kill' | 'heal' | 'skill_damage',
    actorLevel: number,
    targetLevel: number = actorLevel,
  ): number {
    const levelDiff = targetLevel - actorLevel;
    switch (action) {
      case 'attack':
        return Math.max(10, Math.min(60, 30 + levelDiff * 5));
      case 'kill':
        return 30;
      case 'heal':
        return 20;
      case 'skill_damage':
        return Math.max(10, Math.min(50, 25 + levelDiff * 3));
    }
  }

  addExp(unit: UnitData, amount: number): LevelUpResult | null {
    const currentExp = (unit.exp ?? 0) + amount;
    const currentLevel = unit.level ?? 1;

    if (currentExp >= this.EXP_PER_LEVEL) {
      unit.exp = currentExp - this.EXP_PER_LEVEL;
      unit.level = currentLevel + 1;

      const statGains = this.calculateStatGains(unit);
      unit.stats.maxHp += statGains.maxHp ?? 0;
      unit.stats.hp += statGains.maxHp ?? 0; // 레벨업 시 HP 회복
      unit.stats.attack += statGains.attack ?? 0;
      unit.stats.defense += statGains.defense ?? 0;
      unit.stats.speed += statGains.speed ?? 0;
      if (statGains.maxMp) {
        unit.maxMp = (unit.maxMp ?? 0) + statGains.maxMp;
        unit.mp = (unit.mp ?? 0) + statGains.maxMp;
      }

      // 승급 체크
      let promoted = false;
      let promotionName: string | undefined;
      if (unit.unitClass) {
        const promotion = canPromote(unit.unitClass, unit.level, unit.promotionLevel ?? 0);
        if (promotion) {
          unit.promotionLevel = (unit.promotionLevel ?? 0) + 1;
          unit.promotionClass = promotion.toClassName;
          // 승급 스탯 보너스
          unit.stats.maxHp += promotion.statBonus.maxHp;
          unit.stats.hp += promotion.statBonus.maxHp;
          unit.stats.attack += promotion.statBonus.attack;
          unit.stats.defense += promotion.statBonus.defense;
          unit.stats.speed += promotion.statBonus.speed;
          unit.maxMp = (unit.maxMp ?? 0) + promotion.statBonus.maxMp;
          unit.mp = (unit.mp ?? 0) + promotion.statBonus.maxMp;
          // 승급 시 해금 스킬 자동 장착
          if (promotion.unlocksSkill) {
            if (!unit.equippedSkills) unit.equippedSkills = [];
            if (unit.equippedSkills.length < 3 && !unit.equippedSkills.includes(promotion.unlocksSkill)) {
              unit.equippedSkills.push(promotion.unlocksSkill);
            }
          }
          promoted = true;
          promotionName = promotion.toClassName;
        }
      }

      return { unitId: unit.id, newLevel: unit.level, statGains, promoted, promotionName };
    }

    unit.exp = currentExp;
    return null;
  }

  private calculateStatGains(unit: UnitData): Partial<Record<string, number>> {
    const classDef = unit.unitClass ? UNIT_CLASS_DEFS[unit.unitClass] : null;
    const growth = classDef?.growthRates ?? { maxHp: 6, attack: 3, defense: 3, speed: 2, maxMp: 2 };

    const vary = (base: number) => Math.max(1, base + Math.floor(Math.random() * 5) - 2);

    return {
      maxHp: vary(growth.maxHp),
      attack: vary(growth.attack),
      defense: vary(growth.defense),
      speed: vary(growth.speed),
      maxMp: growth.maxMp > 0 ? vary(growth.maxMp) : 0,
    };
  }
}
