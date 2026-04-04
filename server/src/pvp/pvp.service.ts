import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { PvpRecord } from './pvp.entity';
import { GameSave } from '../save/save.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class PvpService {
  constructor(
    @InjectRepository(PvpRecord)
    private pvpRepo: Repository<PvpRecord>,
    @InjectRepository(GameSave)
    private saveRepo: Repository<GameSave>,
    private userService: UserService,
  ) {}

  async findMatch(userId: number) {
    const mySave = await this.saveRepo.findOne({ where: { userId }, order: { updatedAt: 'DESC' } });
    if (!mySave) throw new NotFoundException('No save data found. Play campaign first.');

    const myElo = mySave.pvpElo ?? 1000;

    // ELO ±200 범위에서 상대 찾기
    const candidates = await this.saveRepo
      .createQueryBuilder('save')
      .where('save.userId != :userId', { userId })
      .andWhere('save.pvpElo BETWEEN :lo AND :hi', { lo: myElo - 200, hi: myElo + 200 })
      .orderBy('RANDOM()')
      .limit(1)
      .getMany();

    // 범위 내 없으면 아무나
    let opponent: GameSave;
    if (candidates.length > 0) {
      opponent = candidates[0];
    } else {
      const any = await this.saveRepo
        .createQueryBuilder('save')
        .where('save.userId != :userId', { userId })
        .orderBy('RANDOM()')
        .limit(1)
        .getOne();
      if (!any) throw new NotFoundException('No opponents available');
      opponent = any;
    }

    const opponentUser = await this.userService.findById(opponent.userId);
    const progress = opponent.campaignProgress as { playerUnits?: unknown[] };

    return {
      opponentId: opponent.userId,
      opponentName: opponentUser?.username ?? 'Unknown',
      opponentElo: opponent.pvpElo,
      opponentUnits: progress.playerUnits ?? [],
    };
  }

  async recordResult(userId: number, opponentId: number, won: boolean) {
    const mySave = await this.saveRepo.findOne({ where: { userId }, order: { updatedAt: 'DESC' } });
    const oppSave = await this.saveRepo.findOne({ where: { userId: opponentId } });
    if (!mySave || !oppSave) throw new NotFoundException('Save not found');

    const myUser = await this.userService.findById(userId);
    const oppUser = await this.userService.findById(opponentId);

    // ELO 계산
    const myElo = mySave.pvpElo ?? 1000;
    const oppElo = oppSave.pvpElo ?? 1000;
    const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
    const K = 32;
    const delta = Math.round(K * ((won ? 1 : 0) - expected));

    mySave.pvpElo = myElo + delta;
    oppSave.pvpElo = oppElo - delta;
    if (won) {
      mySave.pvpWins = (mySave.pvpWins ?? 0) + 1;
      oppSave.pvpLosses = (oppSave.pvpLosses ?? 0) + 1;
    } else {
      mySave.pvpLosses = (mySave.pvpLosses ?? 0) + 1;
      oppSave.pvpWins = (oppSave.pvpWins ?? 0) + 1;
    }

    await this.saveRepo.save(mySave);
    await this.saveRepo.save(oppSave);

    // 전적 기록
    const record = this.pvpRepo.create({
      player1Id: userId,
      player2Id: opponentId,
      winnerId: won ? userId : opponentId,
      player1Name: myUser?.username ?? '',
      player2Name: oppUser?.username ?? '',
      eloDelta: Math.abs(delta),
    });
    await this.pvpRepo.save(record);

    return {
      newElo: mySave.pvpElo,
      eloDelta: delta,
      wins: mySave.pvpWins,
      losses: mySave.pvpLosses,
    };
  }

  async getHistory(userId: number, limit = 10) {
    return this.pvpRepo.find({
      where: [{ player1Id: userId }, { player2Id: userId }],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getPvpRanking(limit = 20) {
    return this.saveRepo
      .createQueryBuilder('save')
      .innerJoin('user', 'u', 'u.id = save.userId')
      .select([
        'u.username AS username',
        'save.pvpElo AS "pvpElo"',
        'save.pvpWins AS "pvpWins"',
        'save.pvpLosses AS "pvpLosses"',
      ])
      .where('save.pvpWins + save.pvpLosses > 0')
      .orderBy('save.pvpElo', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
