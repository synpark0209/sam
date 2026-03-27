import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSave } from '../save/save.entity';

// ── 가챠 장수 풀 (서버 권위적) ──

type HeroGrade = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

interface GachaHero {
  id: string;
  name: string;
  grade: HeroGrade;
  unitClass: string;
  uniqueSkill?: string;
  baseStats: { maxHp: number; attack: number; defense: number; speed: number; moveRange: number; attackRange: number };
  maxMp: number;
  defaultEquippedSkills: string[];
}

const GACHA_POOL: GachaHero[] = [
  // UR
  { id: 'gacha_guanyu', name: '관우', grade: 'UR', unitClass: 'cavalry', uniqueSkill: 'guanyu_blade', baseStats: { maxHp: 210, attack: 50, defense: 28, speed: 5, moveRange: 6, attackRange: 1 }, maxMp: 20, defaultEquippedSkills: [] },
  { id: 'gacha_caocao', name: '조조', grade: 'UR', unitClass: 'infantry', uniqueSkill: 'caocao_command', baseStats: { maxHp: 190, attack: 42, defense: 30, speed: 5, moveRange: 4, attackRange: 1 }, maxMp: 25, defaultEquippedSkills: [] },
  { id: 'gacha_zhuge', name: '제갈량', grade: 'UR', unitClass: 'strategist', uniqueSkill: 'zhuge_plan', baseStats: { maxHp: 120, attack: 28, defense: 15, speed: 4, moveRange: 3, attackRange: 1 }, maxMp: 50, defaultEquippedSkills: [] },
  { id: 'gacha_zhouyu', name: '주유', grade: 'UR', unitClass: 'strategist', uniqueSkill: 'zhouyu_fire', baseStats: { maxHp: 130, attack: 30, defense: 16, speed: 4, moveRange: 3, attackRange: 1 }, maxMp: 45, defaultEquippedSkills: [] },
  { id: 'gacha_zhangfei', name: '장비', grade: 'UR', unitClass: 'infantry', uniqueSkill: 'zhangfei_roar', baseStats: { maxHp: 230, attack: 48, defense: 32, speed: 4, moveRange: 4, attackRange: 1 }, maxMp: 15, defaultEquippedSkills: [] },
  { id: 'gacha_zhaoyun', name: '조운', grade: 'UR', unitClass: 'cavalry', uniqueSkill: 'zhaoyun_charge', baseStats: { maxHp: 200, attack: 52, defense: 24, speed: 6, moveRange: 6, attackRange: 1 }, maxMp: 18, defaultEquippedSkills: [] },
  // SSR
  { id: 'gacha_machao', name: '마초', grade: 'SSR', unitClass: 'cavalry', uniqueSkill: 'machao_fury', baseStats: { maxHp: 180, attack: 45, defense: 20, speed: 6, moveRange: 6, attackRange: 1 }, maxMp: 12, defaultEquippedSkills: [] },
  { id: 'gacha_huangzhong', name: '황충', grade: 'SSR', unitClass: 'archer', uniqueSkill: 'huang_snipe', baseStats: { maxHp: 120, attack: 42, defense: 14, speed: 5, moveRange: 3, attackRange: 3 }, maxMp: 15, defaultEquippedSkills: [] },
  { id: 'gacha_huatuo', name: '화타', grade: 'SSR', unitClass: 'strategist', uniqueSkill: 'huatuo_heal', baseStats: { maxHp: 100, attack: 18, defense: 12, speed: 4, moveRange: 3, attackRange: 1 }, maxMp: 40, defaultEquippedSkills: [] },
  { id: 'gacha_dianwei', name: '전위', grade: 'SSR', unitClass: 'martial_artist', uniqueSkill: 'dianwei_rage', baseStats: { maxHp: 200, attack: 46, defense: 22, speed: 5, moveRange: 4, attackRange: 1 }, maxMp: 12, defaultEquippedSkills: [] },
  { id: 'gacha_xuchu', name: '허저', grade: 'SSR', unitClass: 'martial_artist', uniqueSkill: 'xuchu_naked', baseStats: { maxHp: 220, attack: 44, defense: 26, speed: 4, moveRange: 4, attackRange: 1 }, maxMp: 10, defaultEquippedSkills: [] },
  { id: 'gacha_ganning', name: '감녕', grade: 'SSR', unitClass: 'bandit', uniqueSkill: 'ganning_raid', baseStats: { maxHp: 150, attack: 40, defense: 16, speed: 7, moveRange: 5, attackRange: 1 }, maxMp: 12, defaultEquippedSkills: [] },
  { id: 'gacha_pangtong', name: '방통', grade: 'SSR', unitClass: 'strategist', uniqueSkill: 'pangtong_chain', baseStats: { maxHp: 110, attack: 25, defense: 14, speed: 3, moveRange: 3, attackRange: 1 }, maxMp: 35, defaultEquippedSkills: [] },
  { id: 'gacha_xunyu', name: '순욱', grade: 'SSR', unitClass: 'strategist', uniqueSkill: 'xunyu_strategy', baseStats: { maxHp: 100, attack: 20, defense: 12, speed: 4, moveRange: 3, attackRange: 1 }, maxMp: 40, defaultEquippedSkills: [] },
  // SR
  { id: 'gacha_caoren', name: '조인', grade: 'SR', unitClass: 'infantry', baseStats: { maxHp: 160, attack: 35, defense: 25, speed: 4, moveRange: 4, attackRange: 1 }, maxMp: 10, defaultEquippedSkills: [] },
  { id: 'gacha_caohong', name: '조홍', grade: 'SR', unitClass: 'cavalry', baseStats: { maxHp: 150, attack: 38, defense: 18, speed: 5, moveRange: 6, attackRange: 1 }, maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_lidian', name: '이전', grade: 'SR', unitClass: 'infantry', baseStats: { maxHp: 145, attack: 34, defense: 22, speed: 5, moveRange: 4, attackRange: 1 }, maxMp: 10, defaultEquippedSkills: [] },
  { id: 'gacha_yuejin', name: '악진', grade: 'SR', unitClass: 'infantry', baseStats: { maxHp: 140, attack: 36, defense: 20, speed: 5, moveRange: 4, attackRange: 1 }, maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_wenchou', name: '문추', grade: 'SR', unitClass: 'cavalry', baseStats: { maxHp: 155, attack: 40, defense: 16, speed: 5, moveRange: 6, attackRange: 1 }, maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_yanliang', name: '안량', grade: 'SR', unitClass: 'cavalry', baseStats: { maxHp: 155, attack: 42, defense: 14, speed: 5, moveRange: 6, attackRange: 1 }, maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_huangge', name: '황개', grade: 'SR', unitClass: 'infantry', baseStats: { maxHp: 150, attack: 34, defense: 24, speed: 4, moveRange: 4, attackRange: 1 }, maxMp: 10, defaultEquippedSkills: [] },
  { id: 'gacha_chengpu', name: '정보', grade: 'SR', unitClass: 'archer', baseStats: { maxHp: 110, attack: 32, defense: 14, speed: 5, moveRange: 3, attackRange: 2 }, maxMp: 12, defaultEquippedSkills: [] },
  // 추가 SSR
  { id: 'gacha_lvmeng', name: '여몽', grade: 'SSR', unitClass: 'infantry', uniqueSkill: 'lvmeng_stealth', baseStats: { maxHp: 170, attack: 38, defense: 24, speed: 5, moveRange: 4, attackRange: 1 }, maxMp: 15, defaultEquippedSkills: [] },
  { id: 'gacha_zhanghe', name: '장합', grade: 'SSR', unitClass: 'cavalry', uniqueSkill: 'zhanghe_tactics', baseStats: { maxHp: 165, attack: 42, defense: 20, speed: 6, moveRange: 6, attackRange: 1 }, maxMp: 12, defaultEquippedSkills: [] },
  { id: 'gacha_weiyan', name: '위연', grade: 'SSR', unitClass: 'cavalry', uniqueSkill: 'weiyan_ambush', baseStats: { maxHp: 175, attack: 44, defense: 18, speed: 6, moveRange: 6, attackRange: 1 }, maxMp: 12, defaultEquippedSkills: [] },
  { id: 'gacha_taishici', name: '태사자', grade: 'SSR', unitClass: 'archer', uniqueSkill: 'taishici_duel', baseStats: { maxHp: 130, attack: 40, defense: 16, speed: 5, moveRange: 3, attackRange: 3 }, maxMp: 14, defaultEquippedSkills: [] },
  // 추가 SR
  { id: 'gacha_xuhuang', name: '서황', grade: 'SR', unitClass: 'infantry', baseStats: { maxHp: 155, attack: 36, defense: 26, speed: 4, moveRange: 4, attackRange: 1 }, maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_zhangzhao', name: '장소', grade: 'SR', unitClass: 'strategist', baseStats: { maxHp: 90, attack: 18, defense: 10, speed: 3, moveRange: 3, attackRange: 1 }, maxMp: 30, defaultEquippedSkills: [] },
  { id: 'gacha_masu', name: '마속', grade: 'SR', unitClass: 'strategist', baseStats: { maxHp: 85, attack: 20, defense: 8, speed: 3, moveRange: 3, attackRange: 1 }, maxMp: 28, defaultEquippedSkills: [] },
  { id: 'gacha_guanping', name: '관평', grade: 'SR', unitClass: 'infantry', baseStats: { maxHp: 148, attack: 35, defense: 22, speed: 4, moveRange: 4, attackRange: 1 }, maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_zhangbao', name: '장포', grade: 'SR', unitClass: 'cavalry', baseStats: { maxHp: 145, attack: 38, defense: 16, speed: 5, moveRange: 6, attackRange: 1 }, maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_dingfeng', name: '정봉', grade: 'SR', unitClass: 'infantry', baseStats: { maxHp: 150, attack: 34, defense: 24, speed: 5, moveRange: 4, attackRange: 1 }, maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_wenyang', name: '문앙', grade: 'SR', unitClass: 'cavalry', baseStats: { maxHp: 155, attack: 40, defense: 16, speed: 6, moveRange: 6, attackRange: 1 }, maxMp: 8, defaultEquippedSkills: [] },
  // R
  { id: 'gacha_xiahoumao', name: '하후무', grade: 'R', unitClass: 'cavalry', baseStats: { maxHp: 130, attack: 30, defense: 14, speed: 5, moveRange: 6, attackRange: 1 }, maxMp: 6, defaultEquippedSkills: [] },
  { id: 'gacha_caozhen', name: '조진', grade: 'R', unitClass: 'infantry', baseStats: { maxHp: 135, attack: 28, defense: 20, speed: 4, moveRange: 4, attackRange: 1 }, maxMp: 6, defaultEquippedSkills: [] },
  { id: 'gacha_yujin', name: '우금', grade: 'R', unitClass: 'infantry', baseStats: { maxHp: 130, attack: 26, defense: 22, speed: 4, moveRange: 4, attackRange: 1 }, maxMp: 6, defaultEquippedSkills: [] },
  { id: 'gacha_wanglang', name: '왕랑', grade: 'R', unitClass: 'strategist', baseStats: { maxHp: 70, attack: 16, defense: 6, speed: 3, moveRange: 3, attackRange: 1 }, maxMp: 22, defaultEquippedSkills: [] },
  { id: 'gacha_liyan', name: '이엄', grade: 'R', unitClass: 'infantry', baseStats: { maxHp: 128, attack: 28, defense: 20, speed: 4, moveRange: 4, attackRange: 1 }, maxMp: 6, defaultEquippedSkills: [] },
  { id: 'gacha_mizhu', name: '미축', grade: 'R', unitClass: 'strategist', baseStats: { maxHp: 68, attack: 14, defense: 6, speed: 3, moveRange: 3, attackRange: 1 }, maxMp: 20, defaultEquippedSkills: [] },
  { id: 'gacha_jianyong', name: '간옹', grade: 'R', unitClass: 'strategist', baseStats: { maxHp: 65, attack: 14, defense: 5, speed: 3, moveRange: 3, attackRange: 1 }, maxMp: 22, defaultEquippedSkills: [] },
  { id: 'gacha_lvfan', name: '여범', grade: 'R', unitClass: 'strategist', baseStats: { maxHp: 72, attack: 16, defense: 8, speed: 3, moveRange: 3, attackRange: 1 }, maxMp: 20, defaultEquippedSkills: [] },
  { id: 'gacha_zhoutai', name: '주태', grade: 'R', unitClass: 'infantry', baseStats: { maxHp: 140, attack: 30, defense: 22, speed: 4, moveRange: 4, attackRange: 1 }, maxMp: 6, defaultEquippedSkills: [] },
  { id: 'gacha_panzh', name: '반장', grade: 'R', unitClass: 'cavalry', baseStats: { maxHp: 125, attack: 30, defense: 12, speed: 5, moveRange: 6, attackRange: 1 }, maxMp: 6, defaultEquippedSkills: [] },
  { id: 'gacha_handang', name: '한당', grade: 'R', unitClass: 'archer', baseStats: { maxHp: 90, attack: 26, defense: 10, speed: 5, moveRange: 3, attackRange: 2 }, maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_zhangren', name: '장임', grade: 'R', unitClass: 'archer', baseStats: { maxHp: 88, attack: 28, defense: 10, speed: 5, moveRange: 3, attackRange: 2 }, maxMp: 8, defaultEquippedSkills: [] },
  { id: 'gacha_gaolan', name: '고람', grade: 'R', unitClass: 'cavalry', baseStats: { maxHp: 128, attack: 32, defense: 12, speed: 5, moveRange: 6, attackRange: 1 }, maxMp: 6, defaultEquippedSkills: [] },
  { id: 'gacha_shenpei', name: '심배', grade: 'R', unitClass: 'strategist', baseStats: { maxHp: 70, attack: 14, defense: 8, speed: 3, moveRange: 3, attackRange: 1 }, maxMp: 22, defaultEquippedSkills: [] },
  { id: 'gacha_chengyu', name: '정욱', grade: 'R', unitClass: 'strategist', baseStats: { maxHp: 68, attack: 12, defense: 6, speed: 3, moveRange: 3, attackRange: 1 }, maxMp: 24, defaultEquippedSkills: [] },
  { id: 'gacha_zhangxiu', name: '장수', grade: 'R', unitClass: 'cavalry', baseStats: { maxHp: 132, attack: 32, defense: 14, speed: 5, moveRange: 6, attackRange: 1 }, maxMp: 6, defaultEquippedSkills: [] },
  { id: 'gacha_gongsunzan', name: '공손찬', grade: 'R', unitClass: 'cavalry', baseStats: { maxHp: 135, attack: 30, defense: 16, speed: 5, moveRange: 6, attackRange: 1 }, maxMp: 6, defaultEquippedSkills: [] },
];

const FRAGMENT_MAP: Record<HeroGrade, number> = { N: 5, R: 10, SR: 20, SSR: 40, UR: 60 };

/** 기본 시나리오 장수 (세이브 자동 생성 시 포함) */
function createDefaultUnits(): Record<string, unknown>[] {
  return [
    {
      id: 'p1', name: '여포', faction: 'player', unitClass: 'cavalry', grade: 'SR', isScenarioUnit: true,
      level: 1, exp: 0, mp: 20, maxMp: 20,
      classSkillId: 'class_cavalry_1', uniqueSkill: 'musou', uniqueSkillUnlocked: false,
      equippedSkills: [], promotionLevel: 0,
      equipment: { weapon: 'steel_sword', armor: 'iron_armor' },
      position: { x: 0, y: 0 },
      stats: { maxHp: 200, hp: 200, attack: 48, defense: 25, spirit: 15, agility: 30, critical: 40, morale: 50, speed: 6, penetration: 10, resist: 20, moveRange: 6, attackRange: 1 },
      hasActed: false, isAlive: true,
    },
    {
      id: 'p2', name: '장료', faction: 'player', unitClass: 'cavalry', grade: 'R', isScenarioUnit: true,
      level: 1, exp: 0, mp: 15, maxMp: 15,
      classSkillId: 'class_cavalry_1', uniqueSkill: 'hebi_fury', uniqueSkillUnlocked: false,
      equippedSkills: [], promotionLevel: 0,
      equipment: { weapon: 'iron_spear', armor: 'iron_armor' },
      position: { x: 0, y: 0 },
      stats: { maxHp: 160, hp: 160, attack: 40, defense: 20, spirit: 12, agility: 35, critical: 30, morale: 35, speed: 5, penetration: 5, resist: 15, moveRange: 6, attackRange: 1 },
      hasActed: false, isAlive: true,
    },
    {
      id: 'p3', name: '고순', faction: 'player', unitClass: 'infantry', grade: 'R', isScenarioUnit: true,
      level: 1, exp: 0, mp: 15, maxMp: 15,
      classSkillId: 'class_infantry_1', uniqueSkill: 'hamjin_charge', uniqueSkillUnlocked: false,
      equippedSkills: [], promotionLevel: 0,
      equipment: { weapon: 'steel_sword', armor: 'leather_armor' },
      position: { x: 0, y: 0 },
      stats: { maxHp: 170, hp: 170, attack: 38, defense: 28, spirit: 10, agility: 20, critical: 25, morale: 45, speed: 4, penetration: 15, resist: 30, moveRange: 4, attackRange: 1 },
      hasActed: false, isAlive: true,
    },
  ];
}
const NORMAL_COST = 10000; // 금화
const PREMIUM_COST = 300;  // 보석
const PREMIUM_10_COST = 2700;

@Injectable()
export class GachaService {
  constructor(
    @InjectRepository(GameSave)
    private saveRepo: Repository<GameSave>,
  ) {}

  async pull(userId: number, type: 'normal' | 'premium', count: 1 | 10) {
    let save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) {
      // 세이브가 없으면 자동 생성
      save = this.saveRepo.create({
        userId,
        campaignProgress: { currentChapterId: 'prologue', currentStageIdx: 0, completedStages: [], playerUnits: createDefaultUnits(), gold: 0, inventory: [], equipmentBag: ['bronze_sword', 'leather_armor', 'war_drum'], skillBag: ['encourage', 'fortify', 'heal'], materialBag: {} },
        currentChapterId: 'prologue',
        currentStageIdx: 0,
        maxLevel: 1,
        gems: 1000,
        gachaPity: 0,
      });
      await this.saveRepo.save(save);
    }

    const progress = save.campaignProgress as Record<string, unknown>;
    const playerUnits = (progress.playerUnits ?? []) as Array<Record<string, unknown>>;
    let gold = (progress.gold ?? 0) as number;

    // 재화 확인 및 차감
    if (type === 'normal') {
      const cost = NORMAL_COST * count;
      if (gold < cost) throw new BadRequestException('금화가 부족합니다');
      gold -= cost;
      progress.gold = gold;
    } else {
      const cost = count === 10 ? PREMIUM_10_COST : PREMIUM_COST * count;
      if (save.gems < cost) throw new BadRequestException('보석이 부족합니다');
      save.gems -= cost;
    }

    // 뽑기 실행
    const results: Array<{ hero: GachaHero; isNew: boolean; fragments: number }> = [];
    let pity = save.gachaPity;

    for (let i = 0; i < count; i++) {
      const { hero, newPity } = type === 'premium'
        ? this.rollPremium(pity)
        : { hero: this.rollNormal(), newPity: pity };
      pity = newPity;

      // 중복 체크
      const existing = playerUnits.find(u => u.name === hero.name);
      if (existing) {
        const frag = FRAGMENT_MAP[hero.grade];
        gold += frag * 10;
        progress.gold = gold;
        results.push({ hero, isNew: false, fragments: frag });
      } else {
        const unit = this.heroToUnit(hero);
        playerUnits.push(unit);
        results.push({ hero, isNew: true, fragments: 0 });
      }
    }

    // 저장
    save.gachaPity = pity;
    progress.playerUnits = playerUnits;
    save.campaignProgress = progress;
    await this.saveRepo.save(save);

    return {
      results: results.map(r => ({
        name: r.hero.name,
        grade: r.hero.grade,
        unitClass: r.hero.unitClass,
        isNew: r.isNew,
        fragments: r.fragments,
      })),
      remainingGold: gold,
      remainingGems: save.gems,
      pity: save.gachaPity,
    };
  }

  async getStatus(userId: number) {
    let save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) {
      save = this.saveRepo.create({
        userId,
        campaignProgress: { currentChapterId: 'prologue', currentStageIdx: 0, completedStages: [], playerUnits: createDefaultUnits(), gold: 0, inventory: [], equipmentBag: ['bronze_sword', 'leather_armor', 'war_drum'], skillBag: ['encourage', 'fortify', 'heal'], materialBag: {} },
        currentChapterId: 'prologue',
        currentStageIdx: 0,
        maxLevel: 1,
        gems: 1000,
        gachaPity: 0,
      });
      await this.saveRepo.save(save);
    }
    const progress = save.campaignProgress as { gold?: number };
    return {
      gems: save.gems,
      gold: progress.gold ?? 0,
      pity: save.gachaPity,
    };
  }

  private rollNormal(): GachaHero {
    const rand = Math.random() * 100;
    let grade: HeroGrade;
    if (rand < 10) grade = 'SSR';
    else if (rand < 40) grade = 'SR';
    else grade = 'R';
    const pool = GACHA_POOL.filter(h => h.grade === grade);
    if (pool.length === 0) {
      const fallback = GACHA_POOL.filter(h => h.grade === 'SR');
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private rollPremium(pity: number): { hero: GachaHero; newPity: number } {
    let grade: HeroGrade;
    if (pity >= 89) {
      grade = 'UR';
    } else {
      const rand = Math.random() * 100;
      if (rand < 5) grade = 'UR';
      else if (rand < 25) grade = 'SSR';
      else grade = 'SR';
    }
    const pool = GACHA_POOL.filter(h => h.grade === grade);
    const hero = pool[Math.floor(Math.random() * pool.length)];
    return { hero, newPity: grade === 'UR' ? 0 : pity + 1 };
  }

  private heroToUnit(hero: GachaHero): Record<string, unknown> {
    return {
      id: `${hero.id}_${Date.now()}`,
      name: hero.name,
      faction: 'player',
      unitClass: hero.unitClass,
      grade: hero.grade,
      level: 1, exp: 0,
      mp: hero.maxMp, maxMp: hero.maxMp,
      classSkillId: `class_${hero.unitClass}_1`,
      uniqueSkill: hero.uniqueSkill,
      uniqueSkillUnlocked: false,
      equippedSkills: hero.defaultEquippedSkills,
      promotionLevel: 0,
      position: { x: 0, y: 0 },
      stats: { ...hero.baseStats, hp: hero.baseStats.maxHp },
      hasActed: false, isAlive: true,
    };
  }
}
