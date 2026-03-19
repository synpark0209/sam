import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PvpRecord } from './pvp.entity';
import { GameSave } from '../save/save.entity';
import { PvpService } from './pvp.service';
import { PvpController } from './pvp.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([PvpRecord, GameSave]), UserModule],
  controllers: [PvpController],
  providers: [PvpService],
})
export class PvpModule {}
