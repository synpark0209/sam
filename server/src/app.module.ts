import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SaveModule } from './save/save.module';
import { PvpModule } from './pvp/pvp.module';
import { GachaModule } from './gacha/gacha.module';
import { User } from './user/user.entity';
import { GameSave } from './save/save.entity';
import { PvpRecord } from './pvp/pvp.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST') ?? 'localhost',
        port: parseInt(configService.get<string>('DB_PORT') ?? '5432', 10),
        username: configService.get<string>('DB_USERNAME') ?? 'postgres',
        password: configService.get<string>('DB_PASSWORD') ?? 'postgres',
        database: configService.get<string>('DB_NAME') ?? 'jojo',
        entities: [User, GameSave, PvpRecord],
        synchronize: configService.get<string>('DB_SYNC') !== 'false',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    SaveModule,
    PvpModule,
    GachaModule,
  ],
})
export class AppModule {}
