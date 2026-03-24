import { UnitClass } from '../types/unitClass.ts';
import type { UnitData } from '../types/unit.ts';

export type HeroGrade = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface GachaHeroDef {
  id: string;
  name: string;
  grade: HeroGrade;
  unitClass: UnitClass;
  uniqueSkill?: string;
  baseStats: {
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    moveRange: number;
    attackRange: number;
  };
  maxMp: number;
  defaultEquippedSkills: string[];
}

// ═══════════════════════════════════════
// 가챠 장수 풀
// ═══════════════════════════════════════

export const GACHA_HERO_POOL: GachaHeroDef[] = [
  // ── SSR ──
  { id: 'gacha_guanyu', name: '관우', grade: 'UR', unitClass: UnitClass.CAVALRY,
    uniqueSkill: 'guanyu_blade', baseStats: { maxHp: 210, attack: 50, defense: 28, speed: 5, moveRange: 6, attackRange: 1 },
    maxMp: 20, defaultEquippedSkills: ['charge', 'encourage'] },
  { id: 'gacha_caocao', name: '조조', grade: 'UR', unitClass: UnitClass.INFANTRY,
    uniqueSkill: 'caocao_command', baseStats: { maxHp: 190, attack: 42, defense: 30, speed: 5, moveRange: 4, attackRange: 1 },
    maxMp: 25, defaultEquippedSkills: ['encourage', 'fortify'] },
  { id: 'gacha_zhuge', name: '제갈량', grade: 'UR', unitClass: UnitClass.STRATEGIST,
    uniqueSkill: 'zhuge_plan', baseStats: { maxHp: 120, attack: 28, defense: 15, speed: 4, moveRange: 3, attackRange: 1 },
    maxMp: 50, defaultEquippedSkills: ['fire', 'heal', 'water'] },
  { id: 'gacha_zhouyu', name: '주유', grade: 'UR', unitClass: UnitClass.STRATEGIST,
    uniqueSkill: 'zhouyu_fire', baseStats: { maxHp: 130, attack: 30, defense: 16, speed: 4, moveRange: 3, attackRange: 1 },
    maxMp: 45, defaultEquippedSkills: ['fire', 'water'] },
  { id: 'gacha_zhangfei', name: '장비', grade: 'UR', unitClass: UnitClass.INFANTRY,
    uniqueSkill: 'zhangfei_roar', baseStats: { maxHp: 230, attack: 48, defense: 32, speed: 4, moveRange: 4, attackRange: 1 },
    maxMp: 15, defaultEquippedSkills: ['fortify'] },
  { id: 'gacha_zhaoyun', name: '조운', grade: 'UR', unitClass: UnitClass.CAVALRY,
    uniqueSkill: 'zhaoyun_charge', baseStats: { maxHp: 200, attack: 52, defense: 24, speed: 6, moveRange: 6, attackRange: 1 },
    maxMp: 18, defaultEquippedSkills: ['charge'] },

  // ── SR ──
  { id: 'gacha_machao', name: '마초', grade: 'SSR', unitClass: UnitClass.CAVALRY,
    uniqueSkill: 'machao_fury', baseStats: { maxHp: 180, attack: 45, defense: 20, speed: 6, moveRange: 6, attackRange: 1 },
    maxMp: 12, defaultEquippedSkills: ['charge'] },
  { id: 'gacha_huangzhong', name: '황충', grade: 'SSR', unitClass: UnitClass.ARCHER,
    uniqueSkill: 'huang_snipe', baseStats: { maxHp: 120, attack: 42, defense: 14, speed: 5, moveRange: 3, attackRange: 3 },
    maxMp: 15, defaultEquippedSkills: ['arrow_rain'] },
  { id: 'gacha_huatuo', name: '화타', grade: 'SSR', unitClass: UnitClass.STRATEGIST,
    uniqueSkill: 'huatuo_heal', baseStats: { maxHp: 100, attack: 18, defense: 12, speed: 4, moveRange: 3, attackRange: 1 },
    maxMp: 40, defaultEquippedSkills: ['heal', 'group_heal'] },
  { id: 'gacha_dianwei', name: '전위', grade: 'SSR', unitClass: UnitClass.MARTIAL_ARTIST,
    uniqueSkill: 'dianwei_rage', baseStats: { maxHp: 200, attack: 46, defense: 22, speed: 5, moveRange: 4, attackRange: 1 },
    maxMp: 12, defaultEquippedSkills: ['encourage'] },
  { id: 'gacha_xuchu', name: '허저', grade: 'SSR', unitClass: UnitClass.MARTIAL_ARTIST,
    uniqueSkill: 'xuchu_naked', baseStats: { maxHp: 220, attack: 44, defense: 26, speed: 4, moveRange: 4, attackRange: 1 },
    maxMp: 10, defaultEquippedSkills: ['fortify'] },
  { id: 'gacha_ganning', name: '감녕', grade: 'SSR', unitClass: UnitClass.BANDIT,
    uniqueSkill: 'ganning_raid', baseStats: { maxHp: 150, attack: 40, defense: 16, speed: 7, moveRange: 5, attackRange: 1 },
    maxMp: 12, defaultEquippedSkills: ['confuse'] },
  { id: 'gacha_pangtong', name: '방통', grade: 'SSR', unitClass: UnitClass.STRATEGIST,
    uniqueSkill: 'pangtong_chain', baseStats: { maxHp: 110, attack: 25, defense: 14, speed: 3, moveRange: 3, attackRange: 1 },
    maxMp: 35, defaultEquippedSkills: ['fire', 'confuse'] },
  { id: 'gacha_xunyu', name: '순욱', grade: 'SSR', unitClass: UnitClass.STRATEGIST,
    uniqueSkill: 'xunyu_strategy', baseStats: { maxHp: 100, attack: 20, defense: 12, speed: 4, moveRange: 3, attackRange: 1 },
    maxMp: 40, defaultEquippedSkills: ['heal', 'encourage'] },

  // ── A ──
  { id: 'gacha_caoren', name: '조인', grade: 'SR', unitClass: UnitClass.INFANTRY,
    baseStats: { maxHp: 160, attack: 35, defense: 25, speed: 4, moveRange: 4, attackRange: 1 },
    maxMp: 10, defaultEquippedSkills: ['fortify'] },
  { id: 'gacha_caohong', name: '조홍', grade: 'SR', unitClass: UnitClass.CAVALRY,
    baseStats: { maxHp: 150, attack: 38, defense: 18, speed: 5, moveRange: 6, attackRange: 1 },
    maxMp: 8, defaultEquippedSkills: ['charge'] },
  { id: 'gacha_lidian', name: '이전', grade: 'SR', unitClass: UnitClass.INFANTRY,
    baseStats: { maxHp: 145, attack: 34, defense: 22, speed: 5, moveRange: 4, attackRange: 1 },
    maxMp: 10, defaultEquippedSkills: ['encourage'] },
  { id: 'gacha_yuejin', name: '악진', grade: 'SR', unitClass: UnitClass.INFANTRY,
    baseStats: { maxHp: 140, attack: 36, defense: 20, speed: 5, moveRange: 4, attackRange: 1 },
    maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_wenchou', name: '문추', grade: 'SR', unitClass: UnitClass.CAVALRY,
    baseStats: { maxHp: 155, attack: 40, defense: 16, speed: 5, moveRange: 6, attackRange: 1 },
    maxMp: 8, defaultEquippedSkills: ['charge'] },
  { id: 'gacha_yanliang', name: '안량', grade: 'SR', unitClass: UnitClass.CAVALRY,
    baseStats: { maxHp: 155, attack: 42, defense: 14, speed: 5, moveRange: 6, attackRange: 1 },
    maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_huangge', name: '황개', grade: 'SR', unitClass: UnitClass.INFANTRY,
    baseStats: { maxHp: 150, attack: 34, defense: 24, speed: 4, moveRange: 4, attackRange: 1 },
    maxMp: 10, defaultEquippedSkills: [] },
  { id: 'gacha_chengpu', name: '정보', grade: 'SR', unitClass: UnitClass.ARCHER,
    baseStats: { maxHp: 110, attack: 32, defense: 14, speed: 5, moveRange: 3, attackRange: 2 },
    maxMp: 12, defaultEquippedSkills: ['arrow_rain'] },
];

// ═══════════════════════════════════════
// 가챠 스킬 (추가 고유 스킬 정의)
// ═══════════════════════════════════════

// skillDefs.ts에 추가할 스킬들의 ID만 정의
// 실제 스킬 데이터는 skillDefs.ts에서 관리
export const GACHA_UNIQUE_SKILL_IDS = [
  'guanyu_blade',    // 관우: 춘추의 칼날
  'caocao_command',  // 조조: 천하포무
  'zhuge_plan',      // 제갈량: 출사표
  'zhouyu_fire',     // 주유: 적벽의 화염
  'zhangfei_roar',   // 장비: 장판교의 호통
  'zhaoyun_charge',  // 조운: 단기돌입
  'machao_fury',     // 마초: 서량 철기
  'huang_snipe',     // 황충: 백보천양
  'huatuo_heal',     // 화타: 신의
  'dianwei_rage',    // 전위: 쌍극무쌍
  'xuchu_naked',     // 허저: 나체투
  'ganning_raid',    // 감녕: 야습
  'pangtong_chain',  // 방통: 연환계
  'xunyu_strategy',  // 순욱: 왕좌의 책사
];

// ═══════════════════════════════════════
// 가챠 로직
// ═══════════════════════════════════════

export interface GachaResult {
  hero: GachaHeroDef;
  isNew: boolean;
  fragments: number; // 중복 시 조각 수
}

const GRADE_COLORS: Record<HeroGrade, string> = {
  N: '#888888', R: '#44aa44', SR: '#4488ff', SSR: '#aa44ff', UR: '#ffaa00',
};

export function getGradeColor(grade: HeroGrade): string {
  return GRADE_COLORS[grade];
}

/** 일반 뽑기 1회 (금화) */
export function rollNormalGacha(): GachaHeroDef {
  const rand = Math.random() * 100;
  let targetGrade: HeroGrade;
  if (rand < 1) targetGrade = 'UR';
  else if (rand < 10) targetGrade = 'SSR';
  else if (rand < 40) targetGrade = 'SR';
  else targetGrade = 'R';

  // R급은 SR 풀에서 제공 (별도 R풀 없으므로)
  if (targetGrade === 'R') targetGrade = 'SR';

  const pool = GACHA_HERO_POOL.filter(h => h.grade === targetGrade);
  if (pool.length === 0) {
    const fallback = GACHA_HERO_POOL.filter(h => h.grade === 'SR');
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 프리미엄 뽑기 1회 (보석) */
export function rollPremiumGacha(pity: number): { hero: GachaHeroDef; newPity: number } {
  let targetGrade: HeroGrade;

  // 천장: 90회째에 UR 확정
  if (pity >= 89) {
    targetGrade = 'UR';
  } else {
    const rand = Math.random() * 100;
    if (rand < 5) targetGrade = 'UR';
    else if (rand < 25) targetGrade = 'SSR';
    else if (rand < 60) targetGrade = 'SR';
    else targetGrade = 'R';
    // R급은 SR 풀에서 제공
    if (targetGrade === 'R') targetGrade = 'SR';
  }

  const pool = GACHA_HERO_POOL.filter(h => h.grade === targetGrade);
  const hero = pool[Math.floor(Math.random() * pool.length)];
  const newPity = targetGrade === 'UR' ? 0 : pity + 1;

  return { hero, newPity };
}

/** GachaHeroDef → UnitData 변환 */
export function gachaHeroToUnit(def: GachaHeroDef): UnitData {
  return {
    id: `${def.id}_${Date.now()}`,
    name: def.name,
    faction: 'player',
    unitClass: def.unitClass,
    level: 1,
    exp: 0,
    mp: def.maxMp,
    maxMp: def.maxMp,
    uniqueSkill: def.uniqueSkill,
    equippedSkills: [...def.defaultEquippedSkills],
    promotionLevel: 0,
    position: { x: 0, y: 0 },
    stats: {
      ...def.baseStats,
      hp: def.baseStats.maxHp,
    },
    hasActed: false,
    isAlive: true,
  };
}

/** 중복 시 조각 수 */
export function getDuplicateFragments(grade: HeroGrade): number {
  switch (grade) {
    case 'N': return 5;
    case 'R': return 10;
    case 'SR': return 20;
    case 'SSR': return 40;
    case 'UR': return 60;
    default: return 5;
  }
}
