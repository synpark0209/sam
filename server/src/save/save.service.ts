import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSave } from './save.entity';

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
