import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import { CampaignManager } from '../systems/CampaignManager.ts';
import { isLoggedIn, getSavedUsername, loginWithTelegram } from '../../api/client.ts';
import { isTelegramMiniApp, getTelegramInitData, initTelegramApp } from '../../telegram.ts';
import { EventBus } from '../EventBus.ts';
import type { AudioManager } from '../systems/AudioManager.ts';

const GW = TILE_SIZE * MAP_WIDTH;
const GH = TILE_SIZE * MAP_HEIGHT + 60;

export class TitleScene extends Phaser.Scene {
  private campaignManager!: CampaignManager;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    (this.registry.get('audioManager') as AudioManager)?.playBgm('title');
    this.campaignManager = new CampaignManager();

    // 배경 그라데이션
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a20, 0x0a0a20, 0x1a0a30, 0x1a0a30, 1);
    bg.fillRect(0, 0, GW, GH);

    // 장식 파티클 (별)
    for (let i = 0; i < 30; i++) {
      const sx = Math.random() * GW;
      const sy = Math.random() * GH * 0.6;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.5 + 0.2;
      const star = this.add.graphics();
      star.fillStyle(0xffd700, alpha);
      star.fillCircle(sx, sy, size);
      // 반짝임 애니메이션
      this.tweens.add({
        targets: star, alpha: { from: alpha, to: alpha * 0.3 },
        duration: 1000 + Math.random() * 2000, yoyo: true, repeat: -1,
      });
    }

    // 상단 장식선
    const topLine = this.add.graphics();
    topLine.fillGradientStyle(0xffd700, 0xff6600, 0xff6600, 0xffd700, 1);
    topLine.fillRect(GW * 0.2, GH * 0.12, GW * 0.6, 2);

    // 타이틀
    this.add.text(GW / 2, GH * 0.18, '方丘席 呂布傳', {
      fontSize: '14px', color: '#aa8844', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GW / 2, GH * 0.26, '방구석 여포뎐', {
      fontSize: '34px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    // 부제 (타이핑 효과)
    const subtitle = this.add.text(GW / 2, GH * 0.34, '', {
      fontSize: '13px', color: '#cc8844',
    }).setOrigin(0.5);
    const subText = '현대인이 삼국지 여포가 되었다?!';
    let charIdx = 0;
    this.time.addEvent({
      delay: 80, repeat: subText.length - 1,
      callback: () => { charIdx++; subtitle.setText(subText.substring(0, charIdx)); },
    });

    // 하단 장식선
    const bottomLine = this.add.graphics();
    bottomLine.fillGradientStyle(0xffd700, 0xff6600, 0xff6600, 0xffd700, 1);
    bottomLine.fillRect(GW * 0.2, GH * 0.38, GW * 0.6, 2);

    // 음소거 버튼
    const audio = this.registry.get('audioManager') as AudioManager;
    const muteBtn = this.add.text(GW - 35, 12, audio?.isMuted() ? '🔇' : '🔊', {
      fontSize: '18px',
    }).setInteractive({ useHandCursor: true }).setDepth(100);
    muteBtn.on('pointerdown', () => {
      if (!audio) return;
      audio.setMuted(!audio.isMuted());
      muteBtn.setText(audio.isMuted() ? '🔇' : '🔊');
      if (!audio.isMuted()) audio.playBgm('title');
    });

    // 버전
    this.add.text(GW / 2, GH - 15, 'v0.1.0', {
      fontSize: '9px', color: '#333344',
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

    const loadingText = this.add.text(GW / 2, GH * 0.5, '텔레그램 로그인 중...', {
      fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 로딩 스피너
    const spinner = this.add.text(GW / 2, GH * 0.56, '⏳', { fontSize: '20px' }).setOrigin(0.5);
    this.tweens.add({ targets: spinner, angle: 360, duration: 1000, repeat: -1 });

    const initData = getTelegramInitData();
    if (!initData) {
      loadingText.destroy();
      spinner.destroy();
      this.showLoginPrompt();
      return;
    }

    loginWithTelegram(initData).then((res) => {
      localStorage.setItem('jojo_auth_username', res.username);
      loadingText.destroy();
      spinner.destroy();
      this.showLoggedInMenu();
    }).catch(() => {
      loadingText.destroy();
      spinner.destroy();
      this.showLoginPrompt();
    });
  }

  private showLoginPrompt(): void {
    this.add.text(GW / 2, GH * 0.48, '삼국지의 세계가 당신을 기다립니다', {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);

    // 로그인 버튼 (카드 스타일)
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x2244aa, 1);
    btnBg.fillRoundedRect(GW / 2 - 100, GH * 0.55, 200, 48, 10);
    btnBg.lineStyle(2, 0x4488ff, 0.8);
    btnBg.strokeRoundedRect(GW / 2 - 100, GH * 0.55, 200, 48, 10);

    this.add.text(GW / 2, GH * 0.55 + 24, '⚔️ 게임 시작', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(GW / 2, GH * 0.55 + 24, 200, 48, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => EventBus.emit('show-auth'));
    hitArea.on('pointerover', () => btnBg.setAlpha(0.8));
    hitArea.on('pointerout', () => btnBg.setAlpha(1));
  }

  private showLoggedInMenu(): void {
    const username = getSavedUsername() ?? '유저';

    // 환영 카드
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1a2a3a, 0.8);
    cardBg.fillRoundedRect(GW / 2 - 110, GH * 0.46, 220, 50, 8);
    cardBg.lineStyle(1, 0x4466aa, 0.5);
    cardBg.strokeRoundedRect(GW / 2 - 110, GH * 0.46, 220, 50, 8);

    this.add.text(GW / 2, GH * 0.46 + 16, `환영합니다, ${username} 님`, {
      fontSize: '14px', color: '#88ccff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const loadingText = this.add.text(GW / 2, GH * 0.46 + 34, '데이터 로딩 중...', {
      fontSize: '11px', color: '#666666',
    }).setOrigin(0.5);

    // 로딩 바
    const barW = 160;
    const barX = GW / 2 - barW / 2;
    const barY = GH * 0.58;
    this.add.graphics().fillStyle(0x222233, 1).fillRoundedRect(barX, barY, barW, 6, 3);
    const loadBar = this.add.graphics();
    let progress = 0;
    const loadTimer = this.time.addEvent({
      delay: 30, repeat: 50,
      callback: () => {
        progress += 2;
        loadBar.clear();
        loadBar.fillStyle(0x4488ff, 1);
        loadBar.fillRoundedRect(barX, barY, Math.min(barW, barW * progress / 100), 6, 3);
      },
    });

    this.campaignManager.loadFromServer().then(() => {
      loadTimer.destroy();
      loadBar.clear();
      loadBar.fillStyle(0x44ff44, 1);
      loadBar.fillRoundedRect(barX, barY, barW, 6, 3);
      loadingText.setText('로딩 완료!');
      this.time.delayedCall(300, () => {
        this.scene.start('LobbyScene', { campaignManager: this.campaignManager });
      });
    });
  }
}
