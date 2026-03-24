import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import { CampaignManager } from '../systems/CampaignManager.ts';
import { isLoggedIn, getSavedUsername, loginWithTelegram } from '../../api/client.ts';
import { isTelegramMiniApp, getTelegramInitData, initTelegramApp } from '../../telegram.ts';
import { EventBus } from '../EventBus.ts';
import type { AudioManager } from '../systems/AudioManager.ts';

const GAME_W = TILE_SIZE * MAP_WIDTH;
const GAME_H = TILE_SIZE * MAP_HEIGHT + 60;

export class TitleScene extends Phaser.Scene {
  private campaignManager!: CampaignManager;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    (this.registry.get('audioManager') as AudioManager)?.playBgm('title');
    this.campaignManager = new CampaignManager();

    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GAME_W, GAME_H);

    this.add.text(GAME_W / 2, GAME_H * 0.2, '방구석 여포뎐', {
      fontSize: '36px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, GAME_H * 0.3, '현대인이 여포가 되었다?!', {
      fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);

    // 음소거 토글 버튼
    const audio = this.registry.get('audioManager') as AudioManager;
    const muteBtn = this.add.text(10, 10, audio?.isMuted() ? '🔇' : '🔊', {
      fontSize: '20px',
    }).setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      if (!audio) return;
      audio.setMuted(!audio.isMuted());
      muteBtn.setText(audio.isMuted() ? '🔇' : '🔊');
      if (!audio.isMuted()) audio.playBgm('title');
    });

    if (isLoggedIn()) {
      this.showLoggedInMenu();
    } else if (isTelegramMiniApp()) {
      this.tryTelegramLogin();
    } else {
      this.showLoginPrompt();
    }
  }

  private tryTelegramLogin(): void {
    initTelegramApp();

    const loadingText = this.add.text(GAME_W / 2, GAME_H * 0.5, '텔레그램 로그인 중...', {
      fontSize: '16px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const initData = getTelegramInitData();
    if (!initData) {
      loadingText.destroy();
      this.showLoginPrompt();
      return;
    }

    loginWithTelegram(initData).then((res) => {
      localStorage.setItem('jojo_auth_username', res.username);
      loadingText.destroy();
      this.showLoggedInMenu();
    }).catch(() => {
      loadingText.destroy();
      this.showLoginPrompt();
    });
  }

  private showLoginPrompt(): void {
    this.add.text(GAME_W / 2, GAME_H * 0.45, '게임을 시작하려면 로그인이 필요합니다', {
      fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const loginBtn = this.add.text(GAME_W / 2, GAME_H * 0.55, '로그인 / 회원가입', {
      fontSize: '20px', color: '#ffffff', backgroundColor: '#3366aa', padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    loginBtn.on('pointerover', () => loginBtn.setStyle({ backgroundColor: '#4488cc' }));
    loginBtn.on('pointerout', () => loginBtn.setStyle({ backgroundColor: '#3366aa' }));
    loginBtn.on('pointerdown', () => EventBus.emit('show-auth'));
  }

  private showLoggedInMenu(): void {
    const username = getSavedUsername() ?? '유저';
    this.add.text(GAME_W / 2, GAME_H * 0.42, `${username} 님 환영합니다`, {
      fontSize: '14px', color: '#88aa88',
    }).setOrigin(0.5);

    const loadingText = this.add.text(GAME_W / 2, GAME_H * 0.52, '데이터 로딩 중...', {
      fontSize: '14px', color: '#666666',
    }).setOrigin(0.5);

    this.campaignManager.loadFromServer().then(() => {
      loadingText.destroy();
      this.scene.start('LobbyScene', { campaignManager: this.campaignManager });
    });
  }
}
