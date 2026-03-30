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

  // ── 상점 구매 ──

  @UseGuards(AuthGuard('jwt'))
  @Post('shop-buy')
  async shopBuy(
    @Request() req: { user: { userId: number } },
    @Body() body: { itemId: string },
  ) {
    return this.saveService.shopBuy(req.user.userId, body.itemId);
  }

  // ── 승급 ──

  @UseGuards(AuthGuard('jwt'))
  @Post('promote')
  async promote(
    @Request() req: { user: { userId: number } },
    @Body() body: { unitId: string },
  ) {
    return this.saveService.promoteUnit(req.user.userId, body.unitId);
  }

  // ── 각성 ──

  @UseGuards(AuthGuard('jwt'))
  @Post('awaken')
  async awaken(
    @Request() req: { user: { userId: number } },
    @Body() body: { unitId: string },
  ) {
    return this.saveService.awakenUnit(req.user.userId, body.unitId);
  }

  // ── 던전 완료 ──

  @UseGuards(AuthGuard('jwt'))
  @Post('dungeon-complete')
  async dungeonComplete(
    @Request() req: { user: { userId: number } },
    @Body() body: { dungeonId: string; difficulty: string; stars: number },
  ) {
    return this.saveService.dungeonComplete(
      req.user.userId,
      body.dungeonId,
      body.difficulty,
      body.stars,
    );
  }

  // ── 캠페인 전투 완료 ──

  @UseGuards(AuthGuard('jwt'))
  @Post('battle-complete')
  async battleComplete(
    @Request() req: { user: { userId: number } },
    @Body() body: { stageId: string },
  ) {
    return this.saveService.battleComplete(req.user.userId, body.stageId);
  }

  // ── 일일 임무 보상 수령 ──

  @UseGuards(AuthGuard('jwt'))
  @Post('mission-claim')
  async missionClaim(
    @Request() req: { user: { userId: number } },
    @Body() body: { missionId?: string; type?: string },
  ) {
    return this.saveService.missionClaim(req.user.userId, body.missionId, body.type);
  }

  // ── 출석 보너스 수령 ──

  @UseGuards(AuthGuard('jwt'))
  @Post('login-claim')
  async loginClaim(
    @Request() req: { user: { userId: number } },
    @Body() body: { day: number },
  ) {
    return this.saveService.loginClaim(req.user.userId, body.day);
  }

  @Get('ranking')
  async getRanking() {
    return this.saveService.getRanking();
  }
}
