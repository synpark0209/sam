import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSave } from './save.entity';
import { SHOP_ITEMS } from '../../../shared/data/shopDefs.js';
import type { ShopItem } from '../../../shared/data/shopDefs.js';
import { canPromote, PROMOTION_PATHS } from '../../../shared/data/promotionDefs.js';
import { getClassSkillId } from '../../../shared/data/classSkillDefs.js';
import { getNextAwakening, getHeroBaseId, AWAKENING_TIERS } from '../../../shared/data/awakeningDefs.js';
import type { UnitData } from '../../../shared/types/unit.js';

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
