import { EquipmentSlot } from '../types/equipment.ts';
import { UnitClass } from '../types/unitClass.ts';
import type { EquipmentDef } from '../types/equipment.ts';

export const EQUIPMENT_DEFS: Record<string, EquipmentDef> = {
  // ══════════════════════════════════════════
  //  무기 (WEAPON) — 공통 + 병종 전용
  // ══════════════════════════════════════════

  // ── 공통 검 (보병·기병·도적·무도가) ──
  bronze_sword: {
    id: 'bronze_sword', name: '청동검', slot: EquipmentSlot.WEAPON, grade: 'common',
    statModifiers: { attack: 3 }, requiredClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.BANDIT, UnitClass.MARTIAL_ARTIST],
    description: '기본적인 청동 검',
  },
  steel_sword: {
    id: 'steel_sword', name: '강철검', slot: EquipmentSlot.WEAPON, grade: 'uncommon',
    statModifiers: { attack: 6 }, requiredClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.BANDIT, UnitClass.MARTIAL_ARTIST],
    description: '튼튼한 강철 검',
  },
  fine_blade: {
    id: 'fine_blade', name: '명도', slot: EquipmentSlot.WEAPON, grade: 'rare',
    statModifiers: { attack: 10 }, requiredClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.BANDIT, UnitClass.MARTIAL_ARTIST],
    description: '날카롭게 벼린 명검',
  },
  heavenly_sword: {
    id: 'heavenly_sword', name: '천자검', slot: EquipmentSlot.WEAPON, grade: 'epic',
    statModifiers: { attack: 15, speed: 1 }, requiredClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.BANDIT, UnitClass.MARTIAL_ARTIST],
    description: '천자가 하사한 보검',
  },
  sky_piercer: {
    id: 'sky_piercer', name: '방천화극', slot: EquipmentSlot.WEAPON, grade: 'legendary',
    statModifiers: { attack: 22, speed: 2 }, requiredClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY],
    description: '여포의 상징, 하늘을 찌르는 극',
  },

  // ── 기병 전용 창 ──
  iron_spear: {
    id: 'iron_spear', name: '철창', slot: EquipmentSlot.WEAPON, grade: 'common',
    statModifiers: { attack: 5 }, requiredClasses: [UnitClass.CAVALRY, UnitClass.INFANTRY],
    description: '기마전에 유리한 창',
  },
  dragon_spear: {
    id: 'dragon_spear', name: '용아창', slot: EquipmentSlot.WEAPON, grade: 'uncommon',
    statModifiers: { attack: 8 }, requiredClasses: [UnitClass.CAVALRY, UnitClass.INFANTRY],
    description: '용의 이빨을 닮은 창',
  },
  crescent_blade: {
    id: 'crescent_blade', name: '청룡언월도', slot: EquipmentSlot.WEAPON, grade: 'rare',
    statModifiers: { attack: 12, maxHp: 10 }, requiredClasses: [UnitClass.CAVALRY, UnitClass.INFANTRY],
    description: '관우가 애용한 전설의 대도',
  },
  serpent_spear: {
    id: 'serpent_spear', name: '사모', slot: EquipmentSlot.WEAPON, grade: 'epic',
    statModifiers: { attack: 16, speed: 2 }, requiredClasses: [UnitClass.CAVALRY],
    description: '장비의 장팔사모',
  },

  // ── 궁병 전용 ──
  short_bow: {
    id: 'short_bow', name: '단궁', slot: EquipmentSlot.WEAPON, grade: 'common',
    statModifiers: { attack: 3 }, requiredClasses: [UnitClass.ARCHER],
    description: '가볍고 다루기 쉬운 활',
  },
  longbow: {
    id: 'longbow', name: '장궁', slot: EquipmentSlot.WEAPON, grade: 'uncommon',
    statModifiers: { attack: 4, attackRange: 1 }, requiredClasses: [UnitClass.ARCHER],
    description: '사거리가 긴 활',
  },
  rapid_bow: {
    id: 'rapid_bow', name: '연노', slot: EquipmentSlot.WEAPON, grade: 'rare',
    statModifiers: { attack: 8, speed: 2 }, requiredClasses: [UnitClass.ARCHER],
    description: '연사가 가능한 개량 석궁',
  },
  heaven_bow: {
    id: 'heaven_bow', name: '신궁', slot: EquipmentSlot.WEAPON, grade: 'epic',
    statModifiers: { attack: 12, attackRange: 1, speed: 1 }, requiredClasses: [UnitClass.ARCHER],
    description: '백발백중의 신기한 활',
  },

  // ── 책사 전용 ──
  sage_staff: {
    id: 'sage_staff', name: '현자의 지팡이', slot: EquipmentSlot.WEAPON, grade: 'common',
    statModifiers: { attack: 2, maxMp: 10 }, requiredClasses: [UnitClass.STRATEGIST],
    description: 'MP를 높여주는 지팡이',
  },
  phoenix_fan: {
    id: 'phoenix_fan', name: '우선', slot: EquipmentSlot.WEAPON, grade: 'uncommon',
    statModifiers: { attack: 4, maxMp: 15 }, requiredClasses: [UnitClass.STRATEGIST],
    description: '깃털로 만든 선인의 부채',
  },
  ancient_tome: {
    id: 'ancient_tome', name: '태평요술', slot: EquipmentSlot.WEAPON, grade: 'rare',
    statModifiers: { attack: 7, maxMp: 25 }, requiredClasses: [UnitClass.STRATEGIST],
    description: '고대의 술법이 담긴 도서',
  },
  celestial_scroll: {
    id: 'celestial_scroll', name: '천서', slot: EquipmentSlot.WEAPON, grade: 'epic',
    statModifiers: { attack: 10, maxMp: 40, speed: 1 }, requiredClasses: [UnitClass.STRATEGIST],
    description: '하늘의 이치가 기록된 두루마리',
  },

  // ── 도적 전용 ──
  throwing_knife: {
    id: 'throwing_knife', name: '비도', slot: EquipmentSlot.WEAPON, grade: 'common',
    statModifiers: { attack: 4, speed: 1 }, requiredClasses: [UnitClass.BANDIT],
    description: '은밀한 투척용 단도',
  },
  twin_daggers: {
    id: 'twin_daggers', name: '쌍비수', slot: EquipmentSlot.WEAPON, grade: 'uncommon',
    statModifiers: { attack: 6, speed: 2 }, requiredClasses: [UnitClass.BANDIT],
    description: '양손에 쥐는 한 쌍의 비수',
  },
  shadow_blade: {
    id: 'shadow_blade', name: '암영도', slot: EquipmentSlot.WEAPON, grade: 'rare',
    statModifiers: { attack: 10, speed: 3 }, requiredClasses: [UnitClass.BANDIT],
    description: '그림자처럼 빠른 검',
  },

  // ── 무도가 전용 ──
  iron_fist: {
    id: 'iron_fist', name: '철권', slot: EquipmentSlot.WEAPON, grade: 'common',
    statModifiers: { attack: 4, maxHp: 5 }, requiredClasses: [UnitClass.MARTIAL_ARTIST],
    description: '강철로 만든 권갑',
  },
  tiger_gauntlet: {
    id: 'tiger_gauntlet', name: '호권', slot: EquipmentSlot.WEAPON, grade: 'uncommon',
    statModifiers: { attack: 7, maxHp: 10 }, requiredClasses: [UnitClass.MARTIAL_ARTIST],
    description: '호랑이 가죽으로 만든 권갑',
  },
  dragon_gauntlet: {
    id: 'dragon_gauntlet', name: '용권', slot: EquipmentSlot.WEAPON, grade: 'rare',
    statModifiers: { attack: 11, maxHp: 15, defense: 2 }, requiredClasses: [UnitClass.MARTIAL_ARTIST],
    description: '용의 비늘로 제작한 전설의 권갑',
  },

  // ══════════════════════════════════════════
  //  방어구 (ARMOR) — 공통 + 병종 전용
  // ══════════════════════════════════════════

  // ── 공통 갑옷 (보병·기병·무도가) ──
  leather_armor: {
    id: 'leather_armor', name: '가죽갑', slot: EquipmentSlot.ARMOR, grade: 'common',
    statModifiers: { defense: 3 }, requiredClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.ARCHER, UnitClass.MARTIAL_ARTIST, UnitClass.BANDIT],
    description: '기본적인 가죽 갑옷',
  },
  iron_armor: {
    id: 'iron_armor', name: '철갑', slot: EquipmentSlot.ARMOR, grade: 'uncommon',
    statModifiers: { defense: 6, speed: -1 }, requiredClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.MARTIAL_ARTIST],
    description: '무겁지만 튼튼한 갑옷',
  },
  scale_armor: {
    id: 'scale_armor', name: '어린갑', slot: EquipmentSlot.ARMOR, grade: 'rare',
    statModifiers: { defense: 10 }, requiredClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.MARTIAL_ARTIST],
    description: '비늘 모양으로 엮은 고급 갑옷',
  },
  dragon_armor: {
    id: 'dragon_armor', name: '용린갑', slot: EquipmentSlot.ARMOR, grade: 'epic',
    statModifiers: { defense: 15, maxHp: 20 }, requiredClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.MARTIAL_ARTIST],
    description: '용의 비늘로 만든 전설의 갑옷',
  },

  // ── 기병 전용 ──
  cavalry_plate: {
    id: 'cavalry_plate', name: '기병갑', slot: EquipmentSlot.ARMOR, grade: 'uncommon',
    statModifiers: { defense: 5, maxHp: 10 }, requiredClasses: [UnitClass.CAVALRY],
    description: '말 위에서 편하게 움직이는 갑옷',
  },
  warhorse_armor: {
    id: 'warhorse_armor', name: '마갑', slot: EquipmentSlot.ARMOR, grade: 'rare',
    statModifiers: { defense: 8, maxHp: 20, speed: 1 }, requiredClasses: [UnitClass.CAVALRY],
    description: '전마 전용 중장갑',
  },

  // ── 책사 전용 ──
  sage_robe: {
    id: 'sage_robe', name: '현자의 로브', slot: EquipmentSlot.ARMOR, grade: 'common',
    statModifiers: { defense: 2, maxMp: 5 }, requiredClasses: [UnitClass.STRATEGIST],
    description: '지혜로운 책사의 로브',
  },
  mystic_robe: {
    id: 'mystic_robe', name: '선인의 도포', slot: EquipmentSlot.ARMOR, grade: 'rare',
    statModifiers: { defense: 5, maxMp: 20, maxHp: 10 }, requiredClasses: [UnitClass.STRATEGIST],
    description: '신비한 기운이 감도는 도포',
  },

  // ── 도적 전용 ──
  shadow_cloak: {
    id: 'shadow_cloak', name: '암행의', slot: EquipmentSlot.ARMOR, grade: 'uncommon',
    statModifiers: { defense: 3, speed: 2 }, requiredClasses: [UnitClass.BANDIT],
    description: '은신에 유리한 검은 외투',
  },
  night_garb: {
    id: 'night_garb', name: '야행복', slot: EquipmentSlot.ARMOR, grade: 'rare',
    statModifiers: { defense: 5, speed: 3, moveRange: 1 }, requiredClasses: [UnitClass.BANDIT],
    description: '어둠 속에서 자유롭게 움직이는 복장',
  },

  // ── 무도가 전용 ──
  martial_garb: {
    id: 'martial_garb', name: '무도복', slot: EquipmentSlot.ARMOR, grade: 'uncommon',
    statModifiers: { defense: 4, maxHp: 10, speed: 1 }, requiredClasses: [UnitClass.MARTIAL_ARTIST],
    description: '무예 수련용 강화복',
  },

  // ══════════════════════════════════════════
  //  악세서리 (ACCESSORY)
  // ══════════════════════════════════════════

  // ── 공통 ──
  war_drum: {
    id: 'war_drum', name: '전고', slot: EquipmentSlot.ACCESSORY, grade: 'common',
    statModifiers: { attack: 2, defense: 2 }, description: '사기를 높이는 전쟁 북',
  },
  jade_seal: {
    id: 'jade_seal', name: '옥새', slot: EquipmentSlot.ACCESSORY, grade: 'rare',
    statModifiers: { maxHp: 20, maxMp: 5 }, description: '황제의 옥새',
  },
  sun_amulet: {
    id: 'sun_amulet', name: '태양부', slot: EquipmentSlot.ACCESSORY, grade: 'common',
    statModifiers: { attack: 3 }, description: '태양의 기운이 깃든 부적',
  },
  iron_shield: {
    id: 'iron_shield', name: '철방패', slot: EquipmentSlot.ACCESSORY, grade: 'common',
    statModifiers: { defense: 4 }, description: '든든한 철제 방패',
  },
  speed_boots: {
    id: 'speed_boots', name: '경보화', slot: EquipmentSlot.ACCESSORY, grade: 'uncommon',
    statModifiers: { speed: 2, moveRange: 1 }, description: '발이 빨라지는 가죽 부츠',
  },
  life_gem: {
    id: 'life_gem', name: '생명석', slot: EquipmentSlot.ACCESSORY, grade: 'uncommon',
    statModifiers: { maxHp: 30 }, description: '생명력을 높여주는 보석',
  },
  tiger_talisman: {
    id: 'tiger_talisman', name: '호부', slot: EquipmentSlot.ACCESSORY, grade: 'rare',
    statModifiers: { attack: 5, speed: 1 }, description: '맹호의 기운이 깃든 부적',
  },
  phoenix_feather: {
    id: 'phoenix_feather', name: '봉황깃', slot: EquipmentSlot.ACCESSORY, grade: 'epic',
    statModifiers: { maxHp: 15, maxMp: 20, speed: 2 }, description: '봉황의 깃털로 만든 장신구',
  },

  // ── 기병 전용 ──
  red_hare: {
    id: 'red_hare', name: '적토마', slot: EquipmentSlot.ACCESSORY, grade: 'legendary',
    statModifiers: { moveRange: 1, speed: 3 }, requiredClasses: [UnitClass.CAVALRY],
    description: '전설의 명마, 하루에 천리를 달린다',
  },
  hex_mark: {
    id: 'hex_mark', name: '절영', slot: EquipmentSlot.ACCESSORY, grade: 'rare',
    statModifiers: { moveRange: 1, speed: 1 }, requiredClasses: [UnitClass.CAVALRY],
    description: '그림자가 사라질 정도로 빠른 명마',
  },

  // ── 궁병 전용 ──
  quiver: {
    id: 'quiver', name: '대형 전통', slot: EquipmentSlot.ACCESSORY, grade: 'uncommon',
    statModifiers: { attack: 3, attackRange: 1 }, requiredClasses: [UnitClass.ARCHER],
    description: '더 많은 화살을 담을 수 있는 전통',
  },

  // ── 책사 전용 ──
  mana_crystal: {
    id: 'mana_crystal', name: '영석', slot: EquipmentSlot.ACCESSORY, grade: 'rare',
    statModifiers: { maxMp: 30, attack: 3 }, requiredClasses: [UnitClass.STRATEGIST],
    description: '마력이 응축된 수정',
  },
};

export function getEquipmentDef(id: string): EquipmentDef | undefined {
  return EQUIPMENT_DEFS[id];
}

/** 등급별 색상 */
export const EQUIPMENT_GRADE_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#55cc55',
  rare: '#5599ff',
  epic: '#cc55ff',
  legendary: '#ffaa00',
};
