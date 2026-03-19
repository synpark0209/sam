import type { UnitData } from '@shared/types/index.ts';
import type { StatModifier, EquipmentDef } from '@shared/types/equipment.ts';
import { EQUIPMENT_DEFS } from '@shared/data/equipmentDefs.ts';

export class EquipmentSystem {
  getEquippedStats(unit: UnitData): StatModifier {
    const total: StatModifier = {};
    if (!unit.equipment) return total;

    const slots = [unit.equipment.weapon, unit.equipment.armor, unit.equipment.accessory];
    for (const itemId of slots) {
      if (!itemId) continue;
      const def = EQUIPMENT_DEFS[itemId];
      if (!def) continue;
      for (const [key, value] of Object.entries(def.statModifiers)) {
        const k = key as keyof StatModifier;
        total[k] = (total[k] ?? 0) + (value ?? 0);
      }
    }
    return total;
  }

  getEquipmentNames(unit: UnitData): { weapon?: string; armor?: string; accessory?: string } {
    if (!unit.equipment) return {};
    const result: Record<string, string> = {};
    if (unit.equipment.weapon) result.weapon = EQUIPMENT_DEFS[unit.equipment.weapon]?.name ?? '';
    if (unit.equipment.armor) result.armor = EQUIPMENT_DEFS[unit.equipment.armor]?.name ?? '';
    if (unit.equipment.accessory) result.accessory = EQUIPMENT_DEFS[unit.equipment.accessory]?.name ?? '';
    return result;
  }

  canEquip(unit: UnitData, equipment: EquipmentDef): boolean {
    if (!equipment.requiredClasses) return true;
    return !!unit.unitClass && equipment.requiredClasses.includes(unit.unitClass);
  }
}
