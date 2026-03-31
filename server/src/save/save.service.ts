import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSave } from './save.entity';
import { SHOP_ITEMS } from '../../../shared/data/shopDefs.js';
import type { ShopItem } from '../../../shared/data/shopDefs.js';
import { canPromote, PROMOTION_PATHS } from '../../../shared/data/promotionDefs.js';
import { getClassSkillId } from '../../../shared/data/classSkillDefs.js';
import { getNextAwakening, getHeroBaseId, AWAKENING_TIERS } from '../../../shared/data/awakeningDefs.js';
import { getEnhanceTier, MAX_SKILL_LEVEL } from '../../../shared/data/skillEnhanceDefs.js';
import type { UnitData } from '../../../shared/types/unit.js';
import { DUNGEONS, generateReward, DUNGEON_DAILY_LIMIT } from '../../../shared/data/dungeonDefs.js';
import type { DungeonReward } from '../../../shared/data/dungeonDefs.js';
import { ALL_CHAPTERS } from '../../../shared/data/campaign/chapters.js';
import { DAILY_MISSIONS, ALL_COMPLETE_BONUS, areAllMissionsComplete, LOGIN_BONUS_TABLE } from '../../../shared/data/dailyMissionDefs.js';
import type { DailyMissionId, DailyMissionState, LoginBonusState } from '../../../shared/types/dailyMission.js';

/** 클라이언트가 덮어쓸 수 없는 서버 관리 필드 */
const SERVER_MANAGED_FIELDS = ['gold', 'gems', 'stamina'];

@Injectable()
export class SaveService {
  constructor(
    @InjectRepository(GameSave)
    private saveRepo: Repository<GameSave>,
  ) {}

  async getSave(userId: number): Promise<GameSave | null> {
    return this.saveRepo.findOne({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  async upsertSave(userId: number, data: Record<string, unknown>): Promise<GameSave> {
    let save = await this.saveRepo.findOne({ where: { userId } });

    // 서버 관리 필드 제거 (클라이언트 조작 방지)
    const sanitized = { ...data };
    for (const field of SERVER_MANAGED_FIELDS) {
      delete sanitized[field];
    }

    const progress = sanitized as {
      currentChapterId?: string;
      currentStageIdx?: number;
      playerUnits?: Array<{ level?: number }>;
    };

    const maxLevel = progress.playerUnits
      ? Math.max(...progress.playerUnits.map(u => u.level ?? 1))
      : 1;

    if (save) {
      // 기존 gold 값 유지하면서 나머지만 업데이트
      const existingProgress = save.campaignProgress as Record<string, unknown>;
      sanitized.gold = save.gold; // JSONB에도 서버 gold 동기화
      save.campaignProgress = sanitized;
      save.currentChapterId = progress.currentChapterId ?? save.currentChapterId;
      save.currentStageIdx = progress.currentStageIdx ?? save.currentStageIdx;
      save.maxLevel = maxLevel;
      return this.saveRepo.save(save);
    }

    save = this.saveRepo.create({
      userId,
      campaignProgress: sanitized,
      currentChapterId: progress.currentChapterId ?? 'ch1',
      currentStageIdx: progress.currentStageIdx ?? 0,
      maxLevel,
      gold: 0,
    });
    return this.saveRepo.save(save);
  }

  // ── 금화 (서버 권위적) ──

  async addGold(userId: number, amount: number, _reason: string): Promise<number> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new Error('Save not found');
    if (amount <= 0) throw new Error('Invalid amount');
    save.gold += amount;
    // JSONB에도 동기화
    const progress = save.campaignProgress as Record<string, unknown>;
    progress.gold = save.gold;
    save.campaignProgress = progress;
    await this.saveRepo.save(save);
    return save.gold;
  }

  async spendGold(userId: number, amount: number, _reason: string): Promise<number> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new Error('Save not found');
    if (amount <= 0) throw new Error('Invalid amount');
    if (save.gold < amount) throw new Error('Not enough gold');
    save.gold -= amount;
    const progress = save.campaignProgress as Record<string, unknown>;
    progress.gold = save.gold;
    save.campaignProgress = progress;
    await this.saveRepo.save(save);
    return save.gold;
  }

  // ── 보석 (서버 권위적) ──

  async spendGems(userId: number, amount: number, _reason: string): Promise<number> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new Error('Save not found');
    if (save.gems < amount) throw new Error('Not enough gems');
    save.gems -= amount;
    await this.saveRepo.save(save);
    return save.gems;
  }

  // ── 재화 조회 ──

  async getCurrencies(userId: number): Promise<{ gold: number; gems: number }> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) return { gold: 0, gems: 0 };
    return { gold: save.gold, gems: save.gems };
  }

  // ── 기존 세이브의 gold 마이그레이션 ──

  async migrateGold(userId: number): Promise<void> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) return;
    if (save.gold > 0) return; // 이미 마이그레이션 됨
    const progress = save.campaignProgress as Record<string, unknown>;
    const jsonbGold = typeof progress.gold === 'number' ? progress.gold : 0;
    if (jsonbGold > 0) {
      save.gold = jsonbGold;
      await this.saveRepo.save(save);
    }
  }

  // ── 상점 구매 (서버 권위적) ──

  async shopBuy(userId: number, itemId: string): Promise<{ success: boolean; gold: number; gems: number }> {
    const item: ShopItem | undefined = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) throw new BadRequestException('Invalid item id');

    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new BadRequestException('Save not found');

    const progress = save.campaignProgress as Record<string, unknown>;

    // Check daily limits
    if (item.dailyLimit) {
      const today = new Date().toISOString().slice(0, 10);
      let shopDaily = progress.shopDailyPurchases as { date: string; counts: Record<string, number> } | undefined;
      if (!shopDaily || shopDaily.date !== today) {
        shopDaily = { date: today, counts: {} };
        progress.shopDailyPurchases = shopDaily;
      }
      const currentCount = shopDaily.counts[item.id] ?? 0;
      if (currentCount >= item.dailyLimit) {
        throw new BadRequestException('Daily purchase limit reached');
      }
    }

    // Check and deduct currency
    if (item.currency === 'gold') {
      if (save.gold < item.price) throw new BadRequestException('Not enough gold');
      save.gold -= item.price;
      progress.gold = save.gold;
    } else {
      if (save.gems < item.price) throw new BadRequestException('Not enough gems');
      save.gems -= item.price;
    }

    // Apply reward
    const reward = item.reward;
    switch (reward.type) {
      case 'material': {
        const bag = (progress.materialBag ?? {}) as Record<string, number>;
        bag[reward.itemId!] = (bag[reward.itemId!] ?? 0) + (reward.amount ?? 1);
        progress.materialBag = bag;
        break;
      }
      case 'equipment': {
        const bag = (progress.equipmentBag ?? []) as string[];
        bag.push(reward.itemId!);
        progress.equipmentBag = bag;
        break;
      }
      case 'skill': {
        const bag = (progress.skillBag ?? []) as string[];
        bag.push(reward.itemId!);
        progress.skillBag = bag;
        break;
      }
      case 'stamina': {
        const current = (progress.stamina as number) ?? 120;
        progress.stamina = Math.min(current + (reward.amount ?? 0), 120);
        break;
      }
      case 'fragment': {
        const frags = (progress.heroFragments ?? {}) as Record<string, number>;
        frags[reward.itemId!] = (frags[reward.itemId!] ?? 0) + (reward.amount ?? 1);
        progress.heroFragments = frags;
        break;
      }
      case 'gold': {
        const goldReward = reward.amount ?? 0;
        save.gold += goldReward;
        progress.gold = save.gold;
        break;
      }
    }

    // Update daily purchase count
    if (item.dailyLimit) {
      const shopDaily = progress.shopDailyPurchases as { date: string; counts: Record<string, number> };
      shopDaily.counts[item.id] = (shopDaily.counts[item.id] ?? 0) + 1;
    }

    save.campaignProgress = progress;
    await this.saveRepo.save(save);

    return { success: true, gold: save.gold, gems: save.gems };
  }

  // ── 승급 (서버 권위적) ──

  async promoteUnit(userId: number, unitId: string): Promise<{ success: boolean; promotionName?: string }> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new BadRequestException('Save not found');

    const progress = save.campaignProgress as Record<string, unknown>;
    const playerUnits = (progress.playerUnits ?? []) as UnitData[];
    const unit = playerUnits.find(u => u.id === unitId);
    if (!unit) throw new BadRequestException('Unit not found');
    if (!unit.unitClass) throw new BadRequestException('Unit has no class');

    const promotion = canPromote(unit.unitClass, unit.level ?? 1, unit.promotionLevel ?? 0);
    if (!promotion) throw new BadRequestException('승급 조건 미충족 (레벨 부족 또는 최대 승급)');

    const materials = (progress.materialBag ?? {}) as Record<string, number>;
    if ((materials[promotion.requiredItem] ?? 0) < 1) {
      throw new BadRequestException(`${promotion.requiredItemName} 부족`);
    }

    // 인수 소비
    materials[promotion.requiredItem] = (materials[promotion.requiredItem] ?? 0) - 1;
    progress.materialBag = materials;

    // 승급 적용
    unit.promotionLevel = (unit.promotionLevel ?? 0) + 1;
    unit.promotionClass = promotion.toClassName;
    unit.stats.maxHp += promotion.statBonus.maxHp;
    unit.stats.hp += promotion.statBonus.maxHp;
    unit.stats.attack += promotion.statBonus.attack;
    unit.stats.defense += promotion.statBonus.defense;
    unit.stats.speed += promotion.statBonus.speed;
    unit.maxMp = (unit.maxMp ?? 0) + promotion.statBonus.maxMp;
    unit.mp = (unit.mp ?? 0) + promotion.statBonus.maxMp;

    // 해금 스킬 자동 장착
    if (promotion.unlocksSkill) {
      if (!unit.equippedSkills) unit.equippedSkills = [];
      if (unit.equippedSkills.length < 3 && !unit.equippedSkills.includes(promotion.unlocksSkill)) {
        unit.equippedSkills.push(promotion.unlocksSkill);
      }
    }

    // 병종 기본 스킬 진화
    unit.classSkillId = getClassSkillId(unit.unitClass, unit.promotionLevel);

    save.campaignProgress = progress;
    await this.saveRepo.save(save);

    return { success: true, promotionName: promotion.toClassName };
  }

  // ── 각성 (서버 권위적) ──

  async awakenUnit(userId: number, unitId: string): Promise<{ success: boolean; awakeningLevel?: number }> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new BadRequestException('Save not found');

    const progress = save.campaignProgress as Record<string, unknown>;
    const playerUnits = (progress.playerUnits ?? []) as UnitData[];
    const unit = playerUnits.find(u => u.id === unitId);
    if (!unit) throw new BadRequestException('Unit not found');

    const heroFragments = (progress.heroFragments ?? {}) as Record<string, number>;
    const awakeningInfo = getNextAwakening(unit, heroFragments);

    if (!awakeningInfo.nextTier) throw new BadRequestException('최대 각성 단계입니다');
    if (!awakeningInfo.canDo) throw new BadRequestException('조각이 부족합니다');

    // 조각 소비
    const baseId = getHeroBaseId(unit);
    heroFragments[baseId] -= awakeningInfo.nextTier.fragmentCost;
    progress.heroFragments = heroFragments;

    // 각성 레벨 증가
    unit.awakeningLevel = (unit.awakeningLevel ?? 0) + 1;

    save.campaignProgress = progress;
    await this.saveRepo.save(save);

    return { success: true, awakeningLevel: unit.awakeningLevel };
  }

  // ── 던전 완료 (서버 권위적) ──

  async dungeonComplete(
    userId: number,
    dungeonId: string,
    difficulty: string,
    stars: number,
  ): Promise<{ success: boolean; gold: number; reward: DungeonReward }> {
    const dungeon = DUNGEONS.find(d => d.id === dungeonId);
    if (!dungeon) throw new BadRequestException('Invalid dungeon id');

    const diff = dungeon.difficulties.find(d => d.level === difficulty);
    if (!diff) throw new BadRequestException('Invalid difficulty');

    if (stars < 0 || stars > 3) throw new BadRequestException('Invalid stars');

    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new BadRequestException('Save not found');

    const progress = save.campaignProgress as Record<string, unknown>;

    // 스태미나 확인 및 차감
    const currentStamina = (progress.stamina as number) ?? 120;
    if (currentStamina < diff.stamina) throw new BadRequestException('Not enough stamina');
    progress.stamina = currentStamina - diff.stamina;

    // 일일 클리어 제한 확인
    const today = new Date().toISOString().split('T')[0];
    if ((progress.lastDungeonReset as string) !== today) {
      progress.dungeonClears = {};
      progress.lastDungeonReset = today;
    }
    const key = `${dungeonId}_${difficulty}`;
    const dungeonClears = (progress.dungeonClears ?? {}) as Record<string, number>;
    if ((dungeonClears[key] ?? 0) >= DUNGEON_DAILY_LIMIT) {
      throw new BadRequestException('Daily dungeon limit reached');
    }

    // 서버에서 보상 생성
    const reward = generateReward(dungeonId, diff);

    // 패배 시 보상 감소
    if (stars === 0) {
      reward.gold = Math.floor(reward.gold * 0.3);
      reward.equipment = undefined;
      reward.skills = undefined;
    }

    // 금화 지급
    save.gold += reward.gold;
    progress.gold = save.gold;

    // 장비 지급
    if (reward.equipment) {
      const bag = (progress.equipmentBag ?? []) as string[];
      bag.push(...reward.equipment);
      progress.equipmentBag = bag;
    }

    // 스킬 지급
    if (reward.skills) {
      const bag = (progress.skillBag ?? []) as string[];
      bag.push(...reward.skills);
      progress.skillBag = bag;
    }

    // 재료 지급
    if (reward.materials) {
      const matBag = (progress.materialBag ?? {}) as Record<string, number>;
      for (const [k, v] of Object.entries(reward.materials)) {
        matBag[k] = (matBag[k] ?? 0) + v;
      }
      progress.materialBag = matBag;
    }

    // 클리어 횟수 및 별점 업데이트
    dungeonClears[key] = (dungeonClears[key] ?? 0) + 1;
    progress.dungeonClears = dungeonClears;

    if (stars > 0) {
      const dungeonStars = (progress.dungeonStars ?? {}) as Record<string, number>;
      if ((dungeonStars[key] ?? 0) < stars) dungeonStars[key] = stars;
      progress.dungeonStars = dungeonStars;
    }

    save.campaignProgress = progress;
    await this.saveRepo.save(save);

    return { success: true, gold: save.gold, reward };
  }

  // ── 캠페인 전투 완료 (서버 권위적) ──

  async battleComplete(
    userId: number,
    stageId: string,
  ): Promise<{ success: boolean; gold: number }> {
    // 스테이지 보상 조회
    let stageGold = 0;
    for (const chapter of ALL_CHAPTERS) {
      const stage = chapter.stages.find(s => s.id === stageId);
      if (stage) {
        stageGold = stage.rewards.gold ?? 0;
        break;
      }
    }
    if (stageGold <= 0) throw new BadRequestException('Invalid stage or no gold reward');

    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new BadRequestException('Save not found');

    save.gold += stageGold;
    const progress = save.campaignProgress as Record<string, unknown>;
    progress.gold = save.gold;
    save.campaignProgress = progress;
    await this.saveRepo.save(save);

    return { success: true, gold: save.gold };
  }

  // ── 일일 임무 보상 수령 (서버 권위적) ──

  async missionClaim(
    userId: number,
    missionId?: string,
    type?: string,
  ): Promise<{ success: boolean; gold: number; gems: number }> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new BadRequestException('Save not found');

    const progress = save.campaignProgress as Record<string, unknown>;
    const today = new Date().toISOString().split('T')[0];
    let missionState = progress.dailyMissions as DailyMissionState | undefined;

    if (!missionState || missionState.date !== today) {
      throw new BadRequestException('No daily missions for today');
    }

    if (type === 'all_bonus') {
      // 전체 완료 보너스
      if (missionState.allClaimedBonusTaken) {
        throw new BadRequestException('All complete bonus already claimed');
      }
      if (!areAllMissionsComplete(missionState)) {
        throw new BadRequestException('Not all missions complete');
      }
      // 모든 개별 임무가 수령됐는지 확인
      const allClaimed = DAILY_MISSIONS.every(def => missionState!.missions[def.id]?.claimed);
      if (!allClaimed) {
        throw new BadRequestException('Not all individual missions claimed');
      }

      missionState.allClaimedBonusTaken = true;
      save.gold += ALL_COMPLETE_BONUS.gold;
      save.gems += ALL_COMPLETE_BONUS.gems;
      progress.gold = save.gold;
      progress.dailyMissions = missionState;
      save.campaignProgress = progress;
      await this.saveRepo.save(save);

      return { success: true, gold: save.gold, gems: save.gems };
    }

    // 개별 임무 수령
    if (!missionId) throw new BadRequestException('missionId required');
    const def = DAILY_MISSIONS.find(m => m.id === missionId);
    if (!def) throw new BadRequestException('Invalid mission id');

    const mp = missionState.missions[missionId as DailyMissionId];
    if (!mp) throw new BadRequestException('Mission not found in state');
    if (mp.claimed) throw new BadRequestException('Already claimed');
    if (mp.current < def.target) throw new BadRequestException('Mission not complete');

    mp.claimed = true;
    save.gold += def.reward.gold;
    progress.gold = save.gold;
    progress.dailyMissions = missionState;
    save.campaignProgress = progress;
    await this.saveRepo.save(save);

    return { success: true, gold: save.gold, gems: save.gems };
  }

  // ── 출석 보너스 수령 (서버 권위적) ──

  async loginClaim(
    userId: number,
    day: number,
  ): Promise<{ success: boolean; gold: number; gems: number }> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new BadRequestException('Save not found');

    const progress = save.campaignProgress as Record<string, unknown>;
    let loginState = progress.loginBonus as LoginBonusState | undefined;

    if (!loginState) throw new BadRequestException('Login bonus state not initialized');

    // day 유효성 확인
    const bonusDef = LOGIN_BONUS_TABLE.find(b => b.day === day);
    if (!bonusDef) throw new BadRequestException('Invalid day');

    // 현재 연속 출석일과 일치하는지 확인
    if (day !== loginState.consecutiveDays) {
      throw new BadRequestException('Day does not match current consecutive days');
    }

    // 이미 수령했는지 확인
    if (loginState.claimedDays.includes(day)) {
      throw new BadRequestException('Already claimed this day');
    }

    // 보상 지급
    loginState.claimedDays.push(day);
    if (bonusDef.gold > 0) {
      save.gold += bonusDef.gold;
      progress.gold = save.gold;
    }
    if (bonusDef.gems > 0) {
      save.gems += bonusDef.gems;
    }

    progress.loginBonus = loginState;
    save.campaignProgress = progress;
    await this.saveRepo.save(save);

    return { success: true, gold: save.gold, gems: save.gems };
  }

  // ── 스킬 강화 (서버 권위적) ──

  async enhanceSkill(
    userId: number,
    unitId: string,
    skillId: string,
  ): Promise<{ success: boolean; newLevel: number; gold: number }> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new BadRequestException('Save not found');

    const progress = save.campaignProgress as Record<string, unknown>;
    const playerUnits = (progress.playerUnits ?? []) as UnitData[];
    const unit = playerUnits.find(u => u.id === unitId);
    if (!unit) throw new BadRequestException('Unit not found');

    // Verify the unit actually has this skill
    const allSkillIds: string[] = [];
    if (unit.classSkillId) allSkillIds.push(unit.classSkillId);
    if (unit.uniqueSkill && unit.uniqueSkillUnlocked) allSkillIds.push(unit.uniqueSkill);
    if (unit.equippedSkills) allSkillIds.push(...unit.equippedSkills);
    if (unit.skills) allSkillIds.push(...unit.skills);
    if (!allSkillIds.includes(skillId)) {
      throw new BadRequestException('Unit does not have this skill');
    }

    // Get current level
    if (!unit.equippedSkillLevels) unit.equippedSkillLevels = {};
    const currentLevel = unit.equippedSkillLevels[skillId] ?? 1;
    if (currentLevel >= MAX_SKILL_LEVEL) {
      throw new BadRequestException('Skill is already at max level');
    }

    // Get required tier
    const tier = getEnhanceTier(currentLevel);
    if (!tier) throw new BadRequestException('No enhancement tier found');

    // Check materials
    const materials = (progress.materialBag ?? {}) as Record<string, number>;
    if ((materials[tier.requiredItem] ?? 0) < 1) {
      throw new BadRequestException(`${tier.requiredItemName} 부족`);
    }

    // Check gold
    if (save.gold < tier.goldCost) {
      throw new BadRequestException('금화 부족');
    }

    // Deduct material and gold
    materials[tier.requiredItem] = (materials[tier.requiredItem] ?? 0) - 1;
    progress.materialBag = materials;
    save.gold -= tier.goldCost;
    progress.gold = save.gold;

    // Increment skill level
    unit.equippedSkillLevels[skillId] = currentLevel + 1;

    save.campaignProgress = progress;
    await this.saveRepo.save(save);

    return { success: true, newLevel: currentLevel + 1, gold: save.gold };
  }

  async getRanking(limit = 20): Promise<Array<{ username: string; maxLevel: number; currentChapterId: string; currentStageIdx: number }>> {
    const results = await this.saveRepo
      .createQueryBuilder('save')
      .innerJoin('user', 'u', 'u.id = save.userId')
      .select([
        'u.username AS username',
        'save.maxLevel AS "maxLevel"',
        'save.currentChapterId AS "currentChapterId"',
        'save.currentStageIdx AS "currentStageIdx"',
      ])
      .orderBy('save.maxLevel', 'DESC')
      .addOrderBy('save.currentStageIdx', 'DESC')
      .limit(limit)
      .getRawMany();
    return results;
  }
}
