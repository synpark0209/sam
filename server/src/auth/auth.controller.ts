import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, MinLength } from 'class-validator';

class AuthDto {
  @IsString()
  @MinLength(2)
  username: string;

  @IsString()
  @MinLength(4)
  password: string;
}

class TelegramAuthDto {
  @IsString()
  initData: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: AuthDto) {
    return this.authService.register(dto.username, dto.password);
  }

  @Post('login')
  login(@Body() dto: AuthDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Post('telegram')
  telegramLogin(@Body() dto: TelegramAuthDto) {
    return this.authService.loginWithTelegram(dto.initData);
  }
}
