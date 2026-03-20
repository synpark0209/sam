import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import { CampaignManager } from '../systems/CampaignManager.ts';
import { isLoggedIn, getSavedUsername, logout, loginWithTelegram } from '../../api/client.ts';
import { isTelegramMiniApp, getTelegramInitData, initTelegramApp } from '../../telegram.ts';
import { EventBus } from '../EventBus.ts';

const GAME_W = TILE_SIZE * MAP_WIDTH;
const GAME_H = TILE_SIZE * MAP_HEIGHT + 60;

export class TitleScene extends Phaser.Scene {
  private campaignManager!: CampaignManager;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.campaignManager = new CampaignManager();

    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GAME_W, GAME_H);

    this.add.text(GAME_W / 2, GAME_H * 0.2, '삼국지 조조전', {
      fontSize: '36px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, GAME_H * 0.3, 'Romance of the Three Kingdoms', {
      fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);

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
    this.add.text(GAME_W / 2, GAME_H * 0.38, `${username} 님 환영합니다`, {
      fontSize: '14px', color: '#88aa88',
    }).setOrigin(0.5);

    const logoutBtn = this.add.text(GAME_W - 20, 10, '로그아웃', {
      fontSize: '12px', color: '#aa6666', padding: { x: 6, y: 4 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    logoutBtn.on('pointerdown', () => { logout(); this.scene.restart(); });

    // 서버에서 세이브 확인 후 메뉴 표시
    const loadingText = this.add.text(GAME_W / 2, GAME_H * 0.5, '데이터 로딩 중...', {
      fontSize: '14px', color: '#666666',
    }).setOrigin(0.5);

    this.campaignManager.loadFromServer().then((hasSave) => {
      loadingText.destroy();
      this.showGameButtons(hasSave);
    });
  }

  private showGameButtons(hasSave: boolean): void {
    const btnStyle = { fontSize: '20px', color: '#ffffff', backgroundColor: '#2a2a4a', padding: { x: 40, y: 12 } };

    const newGameBtn = this.add.text(GAME_W / 2, GAME_H * 0.5, '새 게임', btnStyle)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    newGameBtn.on('pointerover', () => newGameBtn.setStyle({ backgroundColor: '#3a3a5a' }));
    newGameBtn.on('pointerout', () => newGameBtn.setStyle({ backgroundColor: '#2a2a4a' }));
    newGameBtn.on('pointerdown', () => {
      this.campaignManager.resetProgress();
      this.startCampaign();
    });

    if (hasSave) {
      const continueBtn = this.add.text(GAME_W / 2, GAME_H * 0.62, '이어하기', btnStyle)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      continueBtn.on('pointerover', () => continueBtn.setStyle({ backgroundColor: '#3a3a5a' }));
      continueBtn.on('pointerout', () => continueBtn.setStyle({ backgroundColor: '#2a2a4a' }));
      continueBtn.on('pointerdown', () => this.startCampaign());
    }

    let nextY = hasSave ? 0.74 : 0.62;

    // PvP 대전
    if (hasSave) {
      const pvpBtn = this.add.text(GAME_W / 2, GAME_H * nextY, 'PvP 대전', {
        fontSize: '20px', color: '#ffffff', backgroundColor: '#aa3333', padding: { x: 40, y: 12 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      pvpBtn.on('pointerover', () => pvpBtn.setStyle({ backgroundColor: '#cc4444' }));
      pvpBtn.on('pointerout', () => pvpBtn.setStyle({ backgroundColor: '#aa3333' }));
      pvpBtn.on('pointerdown', () => {
        this.scene.start('PvpLobbyScene', { campaignManager: this.campaignManager });
      });
      nextY += 0.12;
    }

    // 랭킹
    const rankBtn = this.add.text(GAME_W / 2, GAME_H * nextY, '랭킹', {
      fontSize: '16px', color: '#aaaaaa', backgroundColor: '#1a1a3a', padding: { x: 30, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rankBtn.on('pointerover', () => rankBtn.setStyle({ backgroundColor: '#2a2a4a' }));
    rankBtn.on('pointerout', () => rankBtn.setStyle({ backgroundColor: '#1a1a3a' }));
    rankBtn.on('pointerdown', () => this.scene.start('RankingScene'));
  }

  private startCampaign(): void {
    this.scene.start('WorldMapScene', { campaignManager: this.campaignManager });
  }
}
