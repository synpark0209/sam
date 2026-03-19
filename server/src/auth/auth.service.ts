import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(username: string, password: string) {
    const existing = await this.userService.findByUsername(username);
    if (existing) {
      throw new ConflictException('Username already exists');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userService.create(username, passwordHash);
    return this.generateToken(user.id, user.username);
  }

  async login(username: string, password: string) {
    const user = await this.userService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateToken(user.id, user.username);
  }

  async loginWithTelegram(initData: string) {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new UnauthorizedException('Telegram bot not configured');
    }

    const validated = this.validateTelegramInitData(initData, botToken);
    if (!validated) {
      throw new UnauthorizedException('Invalid Telegram init data');
    }

    const tgUser = JSON.parse(validated.user);
    const displayName = tgUser.first_name || tgUser.username || `user${tgUser.id}`;
    const user = await this.userService.findOrCreateByTelegram(tgUser.id, displayName);
    return this.generateToken(user.id, user.username);
  }

  private validateTelegramInitData(
    initData: string,
    botToken: string,
  ): Record<string, string> | null {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) return null;
    return Object.fromEntries(params.entries());
  }

  private generateToken(userId: number, username: string) {
    const payload = { sub: userId, username };
    return {
      accessToken: this.jwtService.sign(payload),
      userId,
      username,
    };
  }
}
