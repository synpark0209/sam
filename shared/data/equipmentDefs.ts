import { EquipmentSlot } from '../types/equipment.ts';
import { UnitClass } from '../types/unitClass.ts';
import type { EquipmentDef } from '../types/equipment.ts';

export const EQUIPMENT_DEFS: Record<string, EquipmentDef> = {
  // 무기
  bronze_sword: {
    id: 'bronze_sword', name: '청동검', slot: EquipmentSlot.WEAPON,
    statModifiers: { attack: 3 }, description: '기본적인 청동 검',
  },
  steel_sword: {
    id: 'steel_sword', name: '강철검', slot: EquipmentSlot.WEAPON,
    statModifiers: { attack: 6 }, description: '튼튼한 강철 검',
  },
  iron_spear: {
    id: 'iron_spear', name: '철창', slot: EquipmentSlot.WEAPON,
    statModifiers: { attack: 5 }, requiredClasses: [UnitClass.CAVALRY, UnitClass.INFANTRY],
    description: '기마전에 유리한 창',
  },
  longbow: {
    id: 'longbow', name: '장궁', slot: EquipmentSlot.WEAPON,
    statModifiers: { attack: 4, attackRange: 1 }, requiredClasses: [UnitClass.ARCHER],
    description: '사거리가 긴 활',
  },
  sage_staff: {
    id: 'sage_staff', name: '현자의 지팡이', slot: EquipmentSlot.WEAPON,
    statModifiers: { attack: 2, maxMp: 10 }, requiredClasses: [UnitClass.STRATEGIST],
    description: 'MP를 높여주는 지팡이',
  },

  // 방어구
  leather_armor: {
    id: 'leather_armor', name: '가죽갑', slot: EquipmentSlot.ARMOR,
    statModifiers: { defense: 3 }, description: '기본적인 가죽 갑옷',
  },
  iron_armor: {
    id: 'iron_armor', name: '철갑', slot: EquipmentSlot.ARMOR,
    statModifiers: { defense: 6, speed: -1 }, description: '무겁지만 튼튼한 갑옷',
  },
  sage_robe: {
    id: 'sage_robe', name: '현자의 로브', slot: EquipmentSlot.ARMOR,
    statModifiers: { defense: 2, maxMp: 5 }, requiredClasses: [UnitClass.STRATEGIST],
    description: '지혜로운 책사의 로브',
  },

  // 악세서리
  red_hare: {
    id: 'red_hare', name: '적토마', slot: EquipmentSlot.ACCESSORY,
    statModifiers: { moveRange: 1, speed: 2 }, requiredClasses: [UnitClass.CAVALRY],
    description: '전설의 명마',
  },
  war_drum: {
    id: 'war_drum', name: '전고', slot: EquipmentSlot.ACCESSORY,
    statModifiers: { attack: 2, defense: 2 }, description: '사기를 높이는 전쟁 북',
  },
  jade_seal: {
    id: 'jade_seal', name: '옥새', slot: EquipmentSlot.ACCESSORY,
    statModifiers: { maxHp: 20, maxMp: 5 }, description: '황제의 옥새',
  },
};

export function getEquipmentDef(id: string): EquipmentDef | undefined {
  return EQUIPMENT_DEFS[id];
}
