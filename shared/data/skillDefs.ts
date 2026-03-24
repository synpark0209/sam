import { SkillTargetType, SkillEffectType } from '../types/skill.ts';
import { UnitClass } from '../types/unitClass.ts';
import type { SkillDef } from '../types/skill.ts';

export const SKILL_DEFS: Record<string, SkillDef> = {
  fire: {
    id: 'fire', name: '화계', description: '불로 적을 공격한다',
    mpCost: 8, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 40,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  water: {
    id: 'water', name: '수계', description: '물로 적을 공격하고 기절시킨다',
    mpCost: 10, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 35,
    statusEffect: 'stun', statusDuration: 1, statusMagnitude: 0,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  heal: {
    id: 'heal', name: '회복', description: '아군 한 명의 HP를 회복한다',
    mpCost: 6, range: 3, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ALLY,
    effectType: SkillEffectType.HEAL, power: 50,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  group_heal: {
    id: 'group_heal', name: '대회복', description: '주변 아군의 HP를 회복한다',
    mpCost: 12, range: 2, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ALLY,
    effectType: SkillEffectType.HEAL, power: 35,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  poison: {
    id: 'poison', name: '독계', description: '적에게 독을 부여한다',
    mpCost: 5, range: 3, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.STATUS, power: 0,
    statusEffect: 'poison', statusDuration: 3, statusMagnitude: 10,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  confuse: {
    id: 'confuse', name: '혼란', description: '적을 혼란 상태로 만든다',
    mpCost: 8, range: 3, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.STATUS, power: 0,
    statusEffect: 'confuse', statusDuration: 2, statusMagnitude: 0,
    requiredClasses: [UnitClass.STRATEGIST], cooldown: 0,
  },
  encourage: {
    id: 'encourage', name: '격려', description: '아군의 공격력을 높인다',
    mpCost: 6, range: 2, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ALLY,
    effectType: SkillEffectType.BUFF, power: 0,
    statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 8,
    cooldown: 0,
  },
  fortify: {
    id: 'fortify', name: '방어강화', description: '아군의 방어력을 높인다',
    mpCost: 6, range: 2, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ALLY,
    effectType: SkillEffectType.BUFF, power: 0,
    statusEffect: 'defense_up', statusDuration: 3, statusMagnitude: 8,
    cooldown: 0,
  },
  arrow_rain: {
    id: 'arrow_rain', name: '화살비', description: '넓은 범위에 화살을 퍼붓는다',
    mpCost: 10, range: 4, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 30,
    requiredClasses: [UnitClass.ARCHER], cooldown: 0,
  },
  charge: {
    id: 'charge', name: '돌격', description: '강력한 돌격 공격',
    mpCost: 5, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 45,
    requiredClasses: [UnitClass.CAVALRY], cooldown: 0,
  },

  // ═══════════════════════════════════════
  // 병종 기본 스킬 (3단계 자동 진화)
  // ═══════════════════════════════════════
  // 기병
  class_cavalry_1: { id: 'class_cavalry_1', name: '돌격', description: '강력한 돌격 공격', mpCost: 5, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 40, cooldown: 0 },
  class_cavalry_2: { id: 'class_cavalry_2', name: '기마돌파', description: '적 방어를 뚫는 돌격', mpCost: 8, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 55, statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 5, cooldown: 0 },
  class_cavalry_3: { id: 'class_cavalry_3', name: '추격', description: '도망가는 적을 추격하여 강타', mpCost: 10, range: 2, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 70, cooldown: 1 },
  // 보병
  class_infantry_1: { id: 'class_infantry_1', name: '방어', description: '방어 태세로 피해 감소', mpCost: 4, range: 0, aoeRadius: 0, targetType: SkillTargetType.SELF, effectType: SkillEffectType.BUFF, power: 0, statusEffect: 'defense_up', statusDuration: 2, statusMagnitude: 8, cooldown: 0 },
  class_infantry_2: { id: 'class_infantry_2', name: '철벽방어', description: '강력한 방어 + 주변 아군 보호', mpCost: 8, range: 0, aoeRadius: 0, targetType: SkillTargetType.SELF, effectType: SkillEffectType.BUFF, power: 0, statusEffect: 'defense_up', statusDuration: 3, statusMagnitude: 15, cooldown: 0 },
  class_infantry_3: { id: 'class_infantry_3', name: '무적방패', description: '절대 방어 + 반격 데미지 증가', mpCost: 12, range: 0, aoeRadius: 0, targetType: SkillTargetType.SELF, effectType: SkillEffectType.BUFF, power: 0, statusEffect: 'defense_up', statusDuration: 3, statusMagnitude: 25, cooldown: 1 },
  // 궁병
  class_archer_1: { id: 'class_archer_1', name: '조준사격', description: '정확한 사격으로 적 1체 공격', mpCost: 5, range: 3, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 35, cooldown: 0 },
  class_archer_2: { id: 'class_archer_2', name: '정밀사격', description: '급소를 노린 사격', mpCost: 8, range: 3, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 50, cooldown: 0 },
  class_archer_3: { id: 'class_archer_3', name: '백보천양', description: '100보 밖의 버들잎을 꿰뚫는 신궁', mpCost: 12, range: 4, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 70, cooldown: 1 },
  // 책사
  class_strategist_1: { id: 'class_strategist_1', name: '화진', description: '불로 적을 공격', mpCost: 6, range: 3, aoeRadius: 1, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 30, cooldown: 0 },
  class_strategist_2: { id: 'class_strategist_2', name: '초열', description: '맹렬한 화염', mpCost: 10, range: 3, aoeRadius: 1, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 45, cooldown: 0 },
  class_strategist_3: { id: 'class_strategist_3', name: '폭염', description: '모든 것을 태우는 극한의 화염', mpCost: 15, range: 4, aoeRadius: 2, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 65, cooldown: 1 },
  // 무도가
  class_martial_1: { id: 'class_martial_1', name: '강타', description: '강력한 일격', mpCost: 4, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 38, cooldown: 0 },
  class_martial_2: { id: 'class_martial_2', name: '연타', description: '연속 타격', mpCost: 7, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 52, cooldown: 0 },
  class_martial_3: { id: 'class_martial_3', name: '회심격', description: '전력을 다한 일격', mpCost: 10, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 75, cooldown: 1 },
  // 도적
  class_bandit_1: { id: 'class_bandit_1', name: '암습', description: '기습 공격', mpCost: 4, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 35, statusEffect: 'attack_down', statusDuration: 1, statusMagnitude: 5, cooldown: 0 },
  class_bandit_2: { id: 'class_bandit_2', name: '기습', description: '방심한 틈을 노린 공격', mpCost: 7, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 48, statusEffect: 'attack_down', statusDuration: 2, statusMagnitude: 8, cooldown: 0 },
  class_bandit_3: { id: 'class_bandit_3', name: '급소공격', description: '치명적인 급소를 노린다', mpCost: 10, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 68, statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 12, cooldown: 1 },

  // ═══════════════════════════════════════
  // 고유 스킬 (장수 전용, Lv.20 해금)
  // ═══════════════════════════════════════
  musou: {
    id: 'musou', name: '무쌍난무', description: '주변 적 전체를 강타한다 (여포 전용)',
    mpCost: 20, range: 1, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 60,
    cooldown: 3,
  },
  hebi_fury: {
    id: 'hebi_fury', name: '합비의 위엄', description: '돌격 후 추가 행동 (장료 전용)',
    mpCost: 15, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 50,
    cooldown: 3,
  },
  hamjin_charge: {
    id: 'hamjin_charge', name: '함진영 돌파', description: '방어 무시 공격 (고순 전용)',
    mpCost: 12, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 55,
    statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 10,
    cooldown: 2,
  },
  strategem: {
    id: 'strategem', name: '모략의 대가', description: '범위 혼란 + 방어 감소 (진궁 전용)',
    mpCost: 18, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DEBUFF, power: 15,
    statusEffect: 'confuse', statusDuration: 1, statusMagnitude: 0,
    cooldown: 3,
  },
  beauty: {
    id: 'beauty', name: '경국지색', description: '범위 적 공격력 감소 (초선 전용)',
    mpCost: 15, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DEBUFF, power: 0,
    statusEffect: 'attack_down', statusDuration: 3, statusMagnitude: 12,
    cooldown: 3,
  },

  // ═══════════════════════════════════════
  // 가챠 장수 고유 스킬
  // ═══════════════════════════════════════
  guanyu_blade: {
    id: 'guanyu_blade', name: '춘추의 칼날', description: '일직선 관통 200% 데미지 (관우 전용)',
    mpCost: 18, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 80,
    cooldown: 3,
  },
  caocao_command: {
    id: 'caocao_command', name: '천하포무', description: '아군 전체 공방 30% 버프 (조조 전용)',
    mpCost: 22, range: 0, aoeRadius: 99,
    targetType: SkillTargetType.AREA_ALLY,
    effectType: SkillEffectType.BUFF, power: 0,
    statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 15,
    cooldown: 4,
  },
  zhuge_plan: {
    id: 'zhuge_plan', name: '출사표', description: '화+풍 동시 최강 위력 (제갈량 전용)',
    mpCost: 25, range: 4, aoeRadius: 2,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 70,
    cooldown: 4,
  },
  zhouyu_fire: {
    id: 'zhouyu_fire', name: '적벽의 화염', description: '광범위 화계 (주유 전용)',
    mpCost: 20, range: 4, aoeRadius: 2,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 55,
    cooldown: 3,
  },
  zhangfei_roar: {
    id: 'zhangfei_roar', name: '장판교의 호통', description: '범위 기절 (장비 전용)',
    mpCost: 15, range: 1, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.STATUS, power: 20,
    statusEffect: 'stun', statusDuration: 1, statusMagnitude: 0,
    cooldown: 3,
  },
  zhaoyun_charge: {
    id: 'zhaoyun_charge', name: '단기돌입', description: '단일 300% 데미지 (조운 전용)',
    mpCost: 20, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 90,
    cooldown: 4,
  },
  machao_fury: {
    id: 'machao_fury', name: '서량 철기', description: '돌격 50% 증가 (마초 전용)',
    mpCost: 12, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 55,
    cooldown: 2,
  },
  huang_snipe: {
    id: 'huang_snipe', name: '백보천양', description: '사거리 4 정밀 사격 (황충 전용)',
    mpCost: 14, range: 4, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 60,
    cooldown: 2,
  },
  huatuo_heal: {
    id: 'huatuo_heal', name: '신의', description: '전체 HP 회복 + 상태이상 해제 (화타 전용)',
    mpCost: 20, range: 0, aoeRadius: 99,
    targetType: SkillTargetType.AREA_ALLY,
    effectType: SkillEffectType.HEAL, power: 60,
    cooldown: 4,
  },
  dianwei_rage: {
    id: 'dianwei_rage', name: '쌍극무쌍', description: '주변 2회 연속 공격 (전위 전용)',
    mpCost: 14, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 65,
    cooldown: 2,
  },
  xuchu_naked: {
    id: 'xuchu_naked', name: '나체투', description: 'HP 50% 이하 시 200% 데미지 (허저 전용)',
    mpCost: 10, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 70,
    cooldown: 2,
  },
  ganning_raid: {
    id: 'ganning_raid', name: '야습', description: '기습 + 혼란 부여 (감녕 전용)',
    mpCost: 12, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 45,
    statusEffect: 'confuse', statusDuration: 2, statusMagnitude: 0,
    cooldown: 2,
  },
  pangtong_chain: {
    id: 'pangtong_chain', name: '연환계', description: '적 2유닛 행동불가 (방통 전용)',
    mpCost: 16, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.STATUS, power: 0,
    statusEffect: 'stun', statusDuration: 1, statusMagnitude: 0,
    cooldown: 3,
  },
  xunyu_strategy: {
    id: 'xunyu_strategy', name: '왕좌의 책사', description: '아군 전체 MP 회복 (순욱 전용)',
    mpCost: 15, range: 0, aoeRadius: 99,
    targetType: SkillTargetType.AREA_ALLY,
    effectType: SkillEffectType.HEAL, power: 30,
    cooldown: 4,
  },
};

export function getSkillDef(id: string): SkillDef | undefined {
  return SKILL_DEFS[id];
}

/** 장수 ID → 고유 스킬 매핑 */
export const HERO_UNIQUE_SKILLS: Record<string, string> = {
  p1: 'musou',           // 여포
  p2: 'hebi_fury',       // 장료
  p3: 'hamjin_charge',   // 고순
  // 이후 추가
  // 진궁: 'strategem'
  // 초선: 'beauty'
};
