import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SaveService } from './save.service';

@Controller('save')
export class SaveController {
  constructor(private saveService: SaveService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getSave(@Request() req: { user: { userId: number } }) {
    // 기존 세이브의 gold 마이그레이션 (JSONB → 컬럼)
    await this.saveService.migrateGold(req.user.userId);
    const save = await this.saveService.getSave(req.user.userId);
    if (!save) return null;
    // 클라이언트에 gold/gems를 JSONB와 함께 전달
    const progress = save.campaignProgress as Record<string, unknown>;
    progress.gold = save.gold;
    return progress;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async upsertSave(
    @Request() req: { user: { userId: number } },
    @Body() body: Record<string, unknown>,
  ) {
    await this.saveService.upsertSave(req.user.userId, body);
    return { success: true };
  }

  // ── 금화 ──

  @UseGuards(AuthGuard('jwt'))
  @Post('add-gold')
  async addGold(
    @Request() req: { user: { userId: number } },
    @Body() body: { amount: number; reason: string },
  ) {
    const remaining = await this.saveService.addGold(req.user.userId, body.amount, body.reason);
    return { gold: remaining };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('spend-gold')
  async spendGold(
    @Request() req: { user: { userId: number } },
    @Body() body: { amount: number; reason: string },
  ) {
    const remaining = await this.saveService.spendGold(req.user.userId, body.amount, body.reason);
    return { gold: remaining };
  }

  // ── 보석 ──

  @UseGuards(AuthGuard('jwt'))
  @Post('spend-gems')
  async spendGems(
    @Request() req: { user: { userId: number } },
    @Body() body: { amount: number; reason: string },
  ) {
    const remaining = await this.saveService.spendGems(req.user.userId, body.amount, body.reason);
    return { gems: remaining };
  }

  // ── 재화 조회 ──

  @UseGuards(AuthGuard('jwt'))
  @Get('currencies')
  async getCurrencies(@Request() req: { user: { userId: number } }) {
    return this.saveService.getCurrencies(req.user.userId);
  }

  @Get('ranking')
  async getRanking() {
    return this.saveService.getRanking();
  }
}
