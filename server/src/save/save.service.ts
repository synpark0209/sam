import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSave } from './save.entity';

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

    const progress = data as {
      currentChapterId?: string;
      currentStageIdx?: number;
      playerUnits?: Array<{ level?: number }>;
    };

    const maxLevel = progress.playerUnits
      ? Math.max(...progress.playerUnits.map(u => u.level ?? 1))
      : 1;

    if (save) {
      save.campaignProgress = data;
      save.currentChapterId = progress.currentChapterId ?? save.currentChapterId;
      save.currentStageIdx = progress.currentStageIdx ?? save.currentStageIdx;
      save.maxLevel = maxLevel;
      return this.saveRepo.save(save);
    }

    save = this.saveRepo.create({
      userId,
      campaignProgress: data,
      currentChapterId: progress.currentChapterId ?? 'ch1',
      currentStageIdx: progress.currentStageIdx ?? 0,
      maxLevel,
    });
    return this.saveRepo.save(save);
  }

  async spendGems(userId: number, amount: number, _reason: string): Promise<number> {
    const save = await this.saveRepo.findOne({ where: { userId } });
    if (!save) throw new Error('Save not found');
    if (save.gems < amount) throw new Error('Not enough gems');
    save.gems -= amount;
    await this.saveRepo.save(save);
    return save.gems;
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
