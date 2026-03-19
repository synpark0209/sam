import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(username: string, passwordHash: string): Promise<User> {
    const user = this.userRepo.create({ username, passwordHash });
    return this.userRepo.save(user);
  }

  async findByTelegramId(telegramId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { telegramId } });
  }

  async findOrCreateByTelegram(telegramId: number, displayName: string): Promise<User> {
    let user = await this.findByTelegramId(telegramId);
    if (user) return user;

    // 텔레그램 유저는 비밀번호 없이 생성 (랜덤 해시)
    const randomHash = `tg_${telegramId}_${Date.now()}`;
    const username = `tg_${displayName}_${telegramId}`;
    user = this.userRepo.create({ username, passwordHash: randomHash, telegramId });
    return this.userRepo.save(user);
  }
}
