import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GachaController } from './gacha.controller';
import { GachaService } from './gacha.service';
import { GameSave } from '../save/save.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GameSave])],
  controllers: [GachaController],
  providers: [GachaService],
})
export class GachaModule {}
