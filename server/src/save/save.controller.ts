import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SaveService } from './save.service';

@Controller('save')
export class SaveController {
  constructor(private saveService: SaveService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getSave(@Request() req: { user: { userId: number } }) {
    const save = await this.saveService.getSave(req.user.userId);
    return save ? save.campaignProgress : null;
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

  @UseGuards(AuthGuard('jwt'))
  @Post('spend-gems')
  async spendGems(
    @Request() req: { user: { userId: number } },
    @Body() body: { amount: number; reason: string },
  ) {
    const remaining = await this.saveService.spendGems(req.user.userId, body.amount, body.reason);
    return { gems: remaining };
  }

  @Get('ranking')
  async getRanking() {
    return this.saveService.getRanking();
  }
}
