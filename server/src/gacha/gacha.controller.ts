import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsIn, IsNumber } from 'class-validator';
import { GachaService } from './gacha.service';

class GachaPullDto {
  @IsIn(['normal', 'premium'])
  type: 'normal' | 'premium';

  @IsNumber()
  @IsIn([1, 10])
  count: 1 | 10;
}

@Controller('gacha')
@UseGuards(AuthGuard('jwt'))
export class GachaController {
  constructor(private gachaService: GachaService) {}

  @Post('pull')
  pull(@Request() req: { user: { userId: number } }, @Body() dto: GachaPullDto) {
    return this.gachaService.pull(req.user.userId, dto.type, dto.count);
  }

  @Get('status')
  getStatus(@Request() req: { user: { userId: number } }) {
    return this.gachaService.getStatus(req.user.userId);
  }
}
