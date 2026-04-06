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
    cooldown: 0, grade: 'normal',
    effects: [
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 8 },
    ],
  },
  fortify: {
    id: 'fortify', name: '방어강화', description: '아군의 방어력을 높인다',
    mpCost: 6, range: 2, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ALLY,
    effectType: SkillEffectType.BUFF, power: 0,
    statusEffect: 'defense_up', statusDuration: 3, statusMagnitude: 8,
    cooldown: 0, grade: 'normal',
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
  class_cavalry_1: { id: 'class_cavalry_1', name: '돌격', description: '강력한 돌격 공격', mpCost: 5, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 40, cooldown: 0,
    effects: [{ type: 'damage', scaling: 'attack', power: 40 }],
  },
  class_cavalry_2: { id: 'class_cavalry_2', name: '기마돌파', description: '적 방어를 뚫는 돌격', mpCost: 8, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 55, cooldown: 0,
    effects: [
      { type: 'damage', scaling: 'attack', power: 55 },
      { type: 'debuff', statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 5 },
    ],
  },
  class_cavalry_3: { id: 'class_cavalry_3', name: '추격', description: '도망가는 적을 추격하여 강타', mpCost: 10, range: 2, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 70, cooldown: 1,
    effects: [{ type: 'damage', scaling: 'attack', power: 70 }],
  },
  // 보병
  class_infantry_1: { id: 'class_infantry_1', name: '방어', description: '방어 태세로 피해 감소', mpCost: 4, range: 0, aoeRadius: 0, targetType: SkillTargetType.SELF, effectType: SkillEffectType.BUFF, power: 0, cooldown: 0,
    effects: [{ type: 'buff', statusEffect: 'defense_up', statusDuration: 2, statusMagnitude: 8 }],
  },
  class_infantry_2: { id: 'class_infantry_2', name: '철벽방어', description: '강력한 방어 + 주변 아군 보호', mpCost: 8, range: 0, aoeRadius: 0, targetType: SkillTargetType.SELF, effectType: SkillEffectType.BUFF, power: 0, cooldown: 0,
    effects: [{ type: 'buff', statusEffect: 'defense_up', statusDuration: 3, statusMagnitude: 15 }],
  },
  class_infantry_3: { id: 'class_infantry_3', name: '무적방패', description: '절대 방어 + 반격 데미지 증가', mpCost: 12, range: 0, aoeRadius: 0, targetType: SkillTargetType.SELF, effectType: SkillEffectType.BUFF, power: 0, cooldown: 1,
    effects: [
      { type: 'buff', statusEffect: 'defense_up', statusDuration: 3, statusMagnitude: 25 },
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 10 },
    ],
  },
  // 궁병
  class_archer_1: { id: 'class_archer_1', name: '조준사격', description: '정확한 사격으로 적 1체 공격', mpCost: 5, range: 3, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 35, cooldown: 0,
    effects: [{ type: 'damage', scaling: 'attack', power: 35 }],
  },
  class_archer_2: { id: 'class_archer_2', name: '정밀사격', description: '급소를 노린 사격', mpCost: 8, range: 3, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 50, cooldown: 0,
    effects: [{ type: 'damage', scaling: 'attack', power: 50 }],
  },
  class_archer_3: { id: 'class_archer_3', name: '백보천양', description: '100보 밖의 버들잎을 꿰뚫는 신궁', mpCost: 12, range: 4, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 70, cooldown: 1,
    effects: [{ type: 'damage', scaling: 'attack', power: 70 }],
  },
  // 책사
  class_strategist_1: { id: 'class_strategist_1', name: '화진', description: '불로 적을 공격', mpCost: 6, range: 3, aoeRadius: 1, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 30, cooldown: 0,
    effects: [{ type: 'damage', scaling: 'spirit', power: 30 }],
  },
  class_strategist_2: { id: 'class_strategist_2', name: '초열', description: '맹렬한 화염', mpCost: 10, range: 3, aoeRadius: 1, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 45, cooldown: 0,
    effects: [{ type: 'damage', scaling: 'spirit', power: 45 }],
  },
  class_strategist_3: { id: 'class_strategist_3', name: '폭염', description: '모든 것을 태우는 극한의 화염', mpCost: 15, range: 4, aoeRadius: 2, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 65, cooldown: 1,
    effects: [{ type: 'damage', scaling: 'spirit', power: 65 }],
  },
  // 무도가
  class_martial_1: { id: 'class_martial_1', name: '강타', description: '강력한 일격', mpCost: 4, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 38, cooldown: 0,
    effects: [{ type: 'damage', scaling: 'attack', power: 38 }],
  },
  class_martial_2: { id: 'class_martial_2', name: '연타', description: '연속 타격', mpCost: 7, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 52, cooldown: 0,
    effects: [{ type: 'damage', scaling: 'attack', power: 52 }],
  },
  class_martial_3: { id: 'class_martial_3', name: '회심격', description: '전력을 다한 일격', mpCost: 10, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 75, cooldown: 1,
    effects: [{ type: 'damage', scaling: 'attack', power: 75 }],
  },
  // 도적
  class_bandit_1: { id: 'class_bandit_1', name: '암습', description: '기습 공격', mpCost: 4, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 35, cooldown: 0,
    effects: [
      { type: 'damage', scaling: 'attack', power: 35 },
      { type: 'debuff', statusEffect: 'attack_down', statusDuration: 1, statusMagnitude: 5 },
    ],
  },
  class_bandit_2: { id: 'class_bandit_2', name: '기습', description: '방심한 틈을 노린 공격', mpCost: 7, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 48, cooldown: 0,
    effects: [
      { type: 'damage', scaling: 'attack', power: 48 },
      { type: 'debuff', statusEffect: 'attack_down', statusDuration: 2, statusMagnitude: 8 },
    ],
  },
  class_bandit_3: { id: 'class_bandit_3', name: '급소공격', description: '치명적인 급소를 노린다', mpCost: 10, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 68, cooldown: 1,
    effects: [
      { type: 'damage', scaling: 'attack', power: 68 },
      { type: 'debuff', statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 12 },
    ],
  },
  // 무희
  class_dancer_1: { id: 'class_dancer_1', name: '격무', description: '아군 1인 공격/속도 증가', mpCost: 8, range: 2, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ALLY, effectType: SkillEffectType.BUFF, power: 0, statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 8, cooldown: 1,
    effects: [
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 8 },
      { type: 'buff', statusEffect: 'speed_up', statusDuration: 3, statusMagnitude: 2 },
    ],
  },
  class_dancer_2: { id: 'class_dancer_2', name: '선무', description: '범위 아군 공격/속도 증가', mpCost: 14, range: 2, aoeRadius: 1, targetType: SkillTargetType.AREA_ALLY, effectType: SkillEffectType.BUFF, power: 0, statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 12, cooldown: 2,
    effects: [
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 12 },
      { type: 'buff', statusEffect: 'speed_up', statusDuration: 3, statusMagnitude: 3 },
    ],
  },
  // 도사
  class_taoist_1: { id: 'class_taoist_1', name: '뇌법', description: '번개로 적을 공격', mpCost: 8, range: 3, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 35, cooldown: 0,
    effects: [
      { type: 'damage', scaling: 'spirit', power: 35 },
      { type: 'status', statusEffect: 'stun', statusDuration: 1, statusMagnitude: 0 },
    ],
  },
  class_taoist_2: { id: 'class_taoist_2', name: '천뇌', description: '범위 번개 + 기절', mpCost: 14, range: 3, aoeRadius: 1, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 50, cooldown: 1,
    effects: [
      { type: 'damage', scaling: 'spirit', power: 50 },
      { type: 'status', statusEffect: 'stun', statusDuration: 1, statusMagnitude: 0 },
    ],
  },
  // 풍수사
  class_geomancer_1: { id: 'class_geomancer_1', name: '치유', description: '아군 1인 HP 회복', mpCost: 8, range: 3, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ALLY, effectType: SkillEffectType.HEAL, power: 40, cooldown: 0,
    effects: [
      { type: 'heal', scaling: 'spirit', power: 40 },
    ],
  },
  class_geomancer_2: { id: 'class_geomancer_2', name: '대치유', description: '범위 아군 HP 회복', mpCost: 16, range: 3, aoeRadius: 1, targetType: SkillTargetType.AREA_ALLY, effectType: SkillEffectType.HEAL, power: 55, cooldown: 2,
    effects: [
      { type: 'heal', scaling: 'spirit', power: 55 },
    ],
  },
  // 공성차
  class_siege_1: { id: 'class_siege_1', name: '포격', description: '넓은 범위 폭격', mpCost: 10, range: 3, aoeRadius: 2, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 45, cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 45 },
      { type: 'debuff', statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 10 },
    ],
  },

  // ═══════════════════════════════════════
  // 고유 스킬 (장수 전용, Lv.20 해금)
  // ═══════════════════════════════════════
  musou: {
    id: 'musou', name: '무쌍난무', description: '범위 물리 공격 + 자신 공격력 증가 (여포 전용)',
    mpCost: 20, range: 1, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 60,
    cooldown: 3,
    effects: [
      { type: 'damage', scaling: 'attack', power: 60 },
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 2, statusMagnitude: 20 },
    ],
  },
  hebi_fury: {
    id: 'hebi_fury', name: '합비의 위엄', description: '강력한 돌격 + 속도 증가 (장료 전용)',
    mpCost: 15, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 50,
    cooldown: 3,
    effects: [
      { type: 'damage', scaling: 'attack', power: 50 },
      { type: 'buff', statusEffect: 'speed_up', statusDuration: 2, statusMagnitude: 3 },
    ],
  },
  hamjin_charge: {
    id: 'hamjin_charge', name: '함진영 돌파', description: '방어 관통 돌격 + 적 방어 감소 (고순 전용)',
    mpCost: 12, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 55,
    statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 10,
    cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 55 },
      { type: 'debuff', statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 15 },
    ],
  },
  strategem: {
    id: 'strategem', name: '모략의 대가', description: '술법 공격 + 혼란 + 방어 감소 (진궁 전용)',
    mpCost: 18, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DEBUFF, power: 15,
    statusEffect: 'confuse', statusDuration: 1, statusMagnitude: 0,
    cooldown: 3,
    effects: [
      { type: 'damage', scaling: 'spirit', power: 25 },
      { type: 'status', statusEffect: 'confuse', statusDuration: 1, statusMagnitude: 0 },
      { type: 'debuff', statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 10 },
    ],
  },
  beauty: {
    id: 'beauty', name: '경국지색', description: '적 공격력 대폭 감소 + 혼란 (초선 전용)',
    mpCost: 15, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DEBUFF, power: 0,
    statusEffect: 'attack_down', statusDuration: 3, statusMagnitude: 12,
    cooldown: 3,
    effects: [
      { type: 'debuff', statusEffect: 'attack_down', statusDuration: 3, statusMagnitude: 15 },
      { type: 'status', statusEffect: 'confuse', statusDuration: 1, statusMagnitude: 0 },
    ],
  },

  // ── 시나리오 보상 장수 고유 스킬 ──
  zhang_volley: {
    id: 'zhang_volley', name: '연주일제', description: '범위 화살 사격 + 속도 감소 (장패 전용)',
    mpCost: 14, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 40,
    cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 40 },
      { type: 'debuff', statusEffect: 'speed_down', statusDuration: 2, statusMagnitude: 3 },
    ],
  },
  chenglian_guard: {
    id: 'chenglian_guard', name: '철벽수비', description: '자신 방어 대폭 증가 + 도발 (성렴 전용)',
    mpCost: 12, range: 0, aoeRadius: 0,
    targetType: SkillTargetType.SELF,
    effectType: SkillEffectType.BUFF, power: 0,
    cooldown: 3,
    effects: [
      { type: 'buff', statusEffect: 'defense_up', statusDuration: 3, statusMagnitude: 20 },
      { type: 'buff', statusEffect: 'taunt', statusDuration: 2, statusMagnitude: 0 },
    ],
  },
  housheng_ambush: {
    id: 'housheng_ambush', name: '기습', description: '고확률 치명타 + 독 (후성 전용)',
    mpCost: 13, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 50,
    cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 50 },
      { type: 'status', statusEffect: 'poison', statusDuration: 3, statusMagnitude: 8 },
    ],
  },

  // ═══════════════════════════════════════
  // 가챠 장수 고유 스킬
  // ═══════════════════════════════════════
  guanyu_blade: {
    id: 'guanyu_blade', name: '춘추의 칼날', description: '관통 일격 + 적 방어 감소 (관우 전용)',
    mpCost: 18, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 80,
    cooldown: 3,
    effects: [
      { type: 'damage', scaling: 'attack', power: 80 },
      { type: 'debuff', statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 15 },
    ],
  },
  caocao_command: {
    id: 'caocao_command', name: '천하포무', description: '아군 전체 공격/방어 증가 (조조 전용)',
    mpCost: 22, range: 0, aoeRadius: 99,
    targetType: SkillTargetType.AREA_ALLY,
    effectType: SkillEffectType.BUFF, power: 0,
    statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 15,
    cooldown: 4,
    effects: [
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 15 },
      { type: 'buff', statusEffect: 'defense_up', statusDuration: 3, statusMagnitude: 15 },
    ],
  },
  zhuge_plan: {
    id: 'zhuge_plan', name: '출사표', description: '최강 술법 + 화상 (제갈량 전용)',
    mpCost: 25, range: 4, aoeRadius: 2,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 70,
    cooldown: 4,
    effects: [
      { type: 'damage', scaling: 'spirit', power: 70 },
      { type: 'debuff', statusEffect: 'burn', statusDuration: 2, statusMagnitude: 8 },
    ],
  },
  zhouyu_fire: {
    id: 'zhouyu_fire', name: '적벽의 화염', description: '광범위 화계 + 적 공격력 감소 (주유 전용)',
    mpCost: 20, range: 4, aoeRadius: 2,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 55,
    cooldown: 3,
    effects: [
      { type: 'damage', scaling: 'spirit', power: 55 },
      { type: 'debuff', statusEffect: 'attack_down', statusDuration: 2, statusMagnitude: 10 },
    ],
  },
  zhangfei_roar: {
    id: 'zhangfei_roar', name: '장판교의 호통', description: '범위 호통 + 기절 + 공격 감소 (장비 전용)',
    mpCost: 15, range: 1, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.STATUS, power: 20,
    statusEffect: 'stun', statusDuration: 1, statusMagnitude: 0,
    cooldown: 3,
    effects: [
      { type: 'damage', scaling: 'attack', power: 30 },
      { type: 'status', statusEffect: 'stun', statusDuration: 1, statusMagnitude: 0 },
      { type: 'debuff', statusEffect: 'attack_down', statusDuration: 2, statusMagnitude: 10 },
    ],
  },
  zhaoyun_charge: {
    id: 'zhaoyun_charge', name: '단기돌입', description: '초강력 단일 공격 + 자신 방어 증가 (조운 전용)',
    mpCost: 20, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 90,
    cooldown: 4,
    effects: [
      { type: 'damage', scaling: 'attack', power: 90 },
      { type: 'buff', statusEffect: 'defense_up', statusDuration: 2, statusMagnitude: 20 },
    ],
  },
  machao_fury: {
    id: 'machao_fury', name: '서량 철기', description: '강력한 돌격 + 속도 증가 (마초 전용)',
    mpCost: 12, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 55,
    cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 55 },
      { type: 'buff', statusEffect: 'speed_up', statusDuration: 2, statusMagnitude: 3 },
    ],
  },
  huang_snipe: {
    id: 'huang_snipe', name: '백보천양', description: '정밀 장거리 사격 + 적 속도 감소 (황충 전용)',
    mpCost: 14, range: 4, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 60,
    cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 60 },
      { type: 'debuff', statusEffect: 'speed_down', statusDuration: 2, statusMagnitude: 2 },
    ],
  },
  huatuo_heal: {
    id: 'huatuo_heal', name: '신의', description: '전체 회복 + 재생 효과 (화타 전용)',
    mpCost: 20, range: 0, aoeRadius: 99,
    targetType: SkillTargetType.AREA_ALLY,
    effectType: SkillEffectType.HEAL, power: 60,
    cooldown: 4,
    effects: [
      { type: 'heal', power: 60 },
      { type: 'buff', statusEffect: 'regen', statusDuration: 3, statusMagnitude: 10 },
    ],
  },
  dianwei_rage: {
    id: 'dianwei_rage', name: '쌍극무쌍', description: '연속 공격 + 자신 공격력 증가 (전위 전용)',
    mpCost: 14, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 65,
    cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 65 },
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 2, statusMagnitude: 15 },
    ],
  },
  xuchu_naked: {
    id: 'xuchu_naked', name: '나체투', description: '광폭 공격 + 공격 대폭↑ + 방어↓ (허저 전용)',
    mpCost: 10, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 70,
    cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 70 },
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 2, statusMagnitude: 25 },
      { type: 'debuff', statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 10 },
    ],
  },
  ganning_raid: {
    id: 'ganning_raid', name: '야습', description: '기습 공격 + 혼란 부여 (감녕 전용)',
    mpCost: 12, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 45,
    statusEffect: 'confuse', statusDuration: 2, statusMagnitude: 0,
    cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 45 },
      { type: 'status', statusEffect: 'confuse', statusDuration: 2, statusMagnitude: 0 },
    ],
  },
  pangtong_chain: {
    id: 'pangtong_chain', name: '연환계', description: '적 속박 + 속도 감소 (방통 전용)',
    mpCost: 16, range: 3, aoeRadius: 1,
    targetType: SkillTargetType.AREA_ENEMY,
    effectType: SkillEffectType.STATUS, power: 0,
    statusEffect: 'stun', statusDuration: 1, statusMagnitude: 0,
    cooldown: 3,
    effects: [
      { type: 'status', statusEffect: 'bind', statusDuration: 1, statusMagnitude: 0 },
      { type: 'debuff', statusEffect: 'speed_down', statusDuration: 2, statusMagnitude: 3 },
    ],
  },
  xunyu_strategy: {
    id: 'xunyu_strategy', name: '왕좌의 책사', description: '아군 회복 + 공격력 증가 (순욱 전용)',
    mpCost: 15, range: 0, aoeRadius: 99,
    targetType: SkillTargetType.AREA_ALLY,
    effectType: SkillEffectType.HEAL, power: 30,
    cooldown: 4,
    effects: [
      { type: 'heal', power: 30 },
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 2, statusMagnitude: 10 },
    ],
  },
  lvmeng_stealth: {
    id: 'lvmeng_stealth', name: '백의도강', description: '기습 + 방어 감소 + 침묵 (여몽 전용)',
    mpCost: 14, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 55,
    statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 10,
    cooldown: 3,
    effects: [
      { type: 'damage', scaling: 'attack', power: 55 },
      { type: 'debuff', statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 10 },
      { type: 'status', statusEffect: 'silence', statusDuration: 1, statusMagnitude: 0 },
    ],
  },
  zhanghe_tactics: {
    id: 'zhanghe_tactics', name: '교묘한 전술', description: '전술 공격 + 이동력 증가 (장합 전용)',
    mpCost: 12, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 50,
    cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 50 },
      { type: 'buff', statusEffect: 'move_up', statusDuration: 1, statusMagnitude: 2 },
    ],
  },
  weiyan_ambush: {
    id: 'weiyan_ambush', name: '자오곡 기습', description: '기습 공격 + 적 속도 감소 (위연 전용)',
    mpCost: 14, range: 1, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 60,
    cooldown: 3,
    effects: [
      { type: 'damage', scaling: 'attack', power: 60 },
      { type: 'debuff', statusEffect: 'speed_down', statusDuration: 2, statusMagnitude: 3 },
    ],
  },
  taishici_duel: {
    id: 'taishici_duel', name: '일기토', description: '일기토 + 사기 증가 (태사자 전용)',
    mpCost: 12, range: 3, aoeRadius: 0,
    targetType: SkillTargetType.SINGLE_ENEMY,
    effectType: SkillEffectType.DAMAGE, power: 55,
    cooldown: 2,
    effects: [
      { type: 'damage', scaling: 'attack', power: 55 },
      { type: 'buff', statusEffect: 'morale_up', statusDuration: 2, statusMagnitude: 20 },
    ],
  },

  // ═══════════════════════════════════════
  // 장착 스킬 (복합 효과)
  // ═══════════════════════════════════════

  // 물리 공격 계열
  sweep_attack: {
    id: 'sweep_attack', name: '횡소천군', description: '적 2체에 물리 120% + 자신 사기 +20',
    mpCost: 12, range: 1, aoeRadius: 1, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 48, cooldown: 2, grade: 'rare',
    effects: [
      { type: 'damage', scaling: 'attack', power: 48 },
      { type: 'buff', statusEffect: 'morale_up', statusDuration: 2, statusMagnitude: 20 },
    ],
  },
  tiger_strike: {
    id: 'tiger_strike', name: '맹호출림', description: '단일 적에게 물리 150%',
    mpCost: 10, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 60, cooldown: 2, grade: 'advanced',
    effects: [
      { type: 'damage', scaling: 'attack', power: 60 },
    ],
  },
  breakthrough: {
    id: 'breakthrough', name: '돌파진격', description: '물리 130% + 방어 감소 15',
    mpCost: 10, range: 1, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ENEMY, effectType: SkillEffectType.DAMAGE, power: 52, cooldown: 2, grade: 'advanced',
    effects: [
      { type: 'damage', scaling: 'attack', power: 52 },
      { type: 'debuff', statusEffect: 'defense_down', statusDuration: 2, statusMagnitude: 15 },
    ],
  },

  // 술법 공격 계열
  lightning: {
    id: 'lightning', name: '낙뢰', description: '범위 술법 100% + 기절 1턴',
    mpCost: 14, range: 3, aoeRadius: 1, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 40, cooldown: 3, grade: 'advanced',
    effects: [
      { type: 'damage', scaling: 'spirit', power: 40 },
      { type: 'status', statusEffect: 'stun', statusDuration: 1, statusMagnitude: 0 },
    ],
  },
  freeze_field: {
    id: 'freeze_field', name: '빙결진', description: '범위 술법 80% + 이동력 감소',
    mpCost: 12, range: 3, aoeRadius: 1, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.DAMAGE, power: 32, cooldown: 2, grade: 'rare',
    effects: [
      { type: 'damage', scaling: 'spirit', power: 32 },
      { type: 'debuff', statusEffect: 'move_down', statusDuration: 2, statusMagnitude: 2 },
    ],
  },
  poison_fog: {
    id: 'poison_fog', name: '독안개', description: '범위 독 (매턴 데미지)',
    mpCost: 8, range: 3, aoeRadius: 1, targetType: SkillTargetType.AREA_ENEMY, effectType: SkillEffectType.STATUS, power: 0, cooldown: 1, grade: 'normal',
    effects: [
      { type: 'damage', scaling: 'spirit', power: 15 },
      { type: 'debuff', statusEffect: 'poison', statusDuration: 3, statusMagnitude: 10 },
    ],
  },

  // 지원 계열
  resolve: {
    id: 'resolve', name: '결의', description: '자신 공/방 +25 (3턴)',
    mpCost: 8, range: 0, aoeRadius: 0, targetType: SkillTargetType.SELF, effectType: SkillEffectType.BUFF, power: 0, cooldown: 3, grade: 'advanced',
    effects: [
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 3, statusMagnitude: 25 },
      { type: 'buff', statusEffect: 'defense_up', statusDuration: 3, statusMagnitude: 25 },
    ],
  },
  first_aid: {
    id: 'first_aid', name: '응급치료', description: '아군 HP 50% 회복',
    mpCost: 8, range: 2, aoeRadius: 0, targetType: SkillTargetType.SINGLE_ALLY, effectType: SkillEffectType.HEAL, power: 50, cooldown: 1, grade: 'normal',
    effects: [
      { type: 'heal', power: 50 },
    ],
  },
  march_inspire: {
    id: 'march_inspire', name: '진군고무', description: '범위 아군 이동력 +2 + 공격 +10',
    mpCost: 12, range: 0, aoeRadius: 2, targetType: SkillTargetType.AREA_ALLY, effectType: SkillEffectType.BUFF, power: 0, cooldown: 3, grade: 'rare',
    effects: [
      { type: 'buff', statusEffect: 'move_up', statusDuration: 1, statusMagnitude: 2 },
      { type: 'buff', statusEffect: 'attack_up', statusDuration: 2, statusMagnitude: 10 },
    ],
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
  p4: 'strategem',       // 진궁
  p5: 'beauty',          // 초선
  p6: 'zhang_volley',    // 장패
  p7: 'chenglian_guard', // 성렴
  p8: 'housheng_ambush', // 후성
};
