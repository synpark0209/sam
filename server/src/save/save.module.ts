import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSave } from './save.entity';
import { SaveService } from './save.service';
import { SaveController } from './save.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GameSave])],
  controllers: [SaveController],
  providers: [SaveService],
})
export class SaveModule {}
