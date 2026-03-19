import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PvpService } from './pvp.service';

@Controller('pvp')
export class PvpController {
  constructor(private pvpService: PvpService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('match')
  async findMatch(@Request() req: { user: { userId: number } }) {
    return this.pvpService.findMatch(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('result')
  async recordResult(
    @Request() req: { user: { userId: number } },
    @Body() body: { opponentId: number; won: boolean },
  ) {
    return this.pvpService.recordResult(req.user.userId, body.opponentId, body.won);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('history')
  async getHistory(@Request() req: { user: { userId: number } }) {
    return this.pvpService.getHistory(req.user.userId);
  }

  @Get('ranking')
  async getPvpRanking() {
    return this.pvpService.getPvpRanking();
  }
}
