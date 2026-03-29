import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@shared/constants.ts';
import { getRanking, getPvpRanking } from '../../api/client.ts';
import type { RankingEntry, PvpRankingEntry } from '../../api/client.ts';

const GAME_W = GAME_WIDTH;
const GAME_H = GAME_HEIGHT;

export class RankingScene extends Phaser.Scene {
  private activeTab: 'campaign' | 'pvp' = 'campaign';
  private contentGroup!: Phaser.GameObjects.Group;

  constructor() {
    super('RankingScene');
  }

  create(): void {
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GAME_W, GAME_H);

    this.add.text(GAME_W / 2, 22, '랭킹', {
      fontSize: '26px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 탭 버튼
    const tabStyle = (active: boolean) => ({
      fontSize: '17px', color: active ? '#ffffff' : '#888888',
      backgroundColor: active ? '#3366aa' : '#1a1a3a',
      padding: { x: 24, y: 10 },
    });

    const campaignTab = this.add.text(GAME_W / 2 - 85, 60, '캠페인', tabStyle(true))
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const pvpTab = this.add.text(GAME_W / 2 + 85, 60, 'PvP', tabStyle(false))
      .setOrigin(0.5).setInteractive({ useHandCursor: true });

    campaignTab.on('pointerdown', () => {
      this.activeTab = 'campaign';
      campaignTab.setStyle(tabStyle(true));
      pvpTab.setStyle(tabStyle(false));
      this.loadRanking();
    });
    pvpTab.on('pointerdown', () => {
      this.activeTab = 'pvp';
      pvpTab.setStyle(tabStyle(true));
      campaignTab.setStyle(tabStyle(false));
      this.loadRanking();
    });

    // 뒤로가기
    const backBtn = this.add.text(20, 16, '← 뒤로', {
      fontSize: '15px', color: '#888888', backgroundColor: '#1a1a3a', padding: { x: 10, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('TitleScene'));

    this.contentGroup = this.add.group();
    this.loadRanking();
  }

  private async loadRanking(): Promise<void> {
    this.contentGroup.clear(true, true);

    const loading = this.add.text(GAME_W / 2, GAME_H / 2, '로딩 중...', {
      fontSize: '16px', color: '#666666',
    }).setOrigin(0.5);
    this.contentGroup.add(loading);

    if (this.activeTab === 'campaign') {
      const data = await getRanking();
      loading.destroy();
      this.renderCampaignRanking(data);
    } else {
      const data = await getPvpRanking();
      loading.destroy();
      this.renderPvpRanking(data);
    }
  }

  private renderCampaignRanking(data: RankingEntry[]): void {
    const header = this.add.text(20, 95, '순위    이름              레벨    진행도', {
      fontSize: '14px', color: '#888888',
    });
    this.contentGroup.add(header);

    data.forEach((entry, i) => {
      const y = 120 + i * 32;
      const rank = `${i + 1}`.padStart(2);
      const name = entry.username.padEnd(12);
      const txt = this.add.text(20, y,
        `${rank}      ${name}     Lv.${entry.maxLevel}      ${entry.currentChapterId} - ${entry.currentStageIdx + 1}`,
        { fontSize: '15px', color: i < 3 ? '#ffd700' : '#cccccc' },
      );
      this.contentGroup.add(txt);
    });

    if (data.length === 0) {
      const empty = this.add.text(GAME_W / 2, 160, '데이터가 없습니다', {
        fontSize: '16px', color: '#666666',
      }).setOrigin(0.5);
      this.contentGroup.add(empty);
    }
  }

  private renderPvpRanking(data: PvpRankingEntry[]): void {
    const header = this.add.text(20, 95, '순위    이름              ELO     전적', {
      fontSize: '14px', color: '#888888',
    });
    this.contentGroup.add(header);

    data.forEach((entry, i) => {
      const y = 120 + i * 32;
      const rank = `${i + 1}`.padStart(2);
      const name = entry.username.padEnd(12);
      const txt = this.add.text(20, y,
        `${rank}      ${name}     ${entry.pvpElo}     ${entry.pvpWins}승 ${entry.pvpLosses}패`,
        { fontSize: '15px', color: i < 3 ? '#ffd700' : '#cccccc' },
      );
      this.contentGroup.add(txt);
    });

    if (data.length === 0) {
      const empty = this.add.text(GAME_W / 2, 160, 'PvP 전적이 없습니다', {
        fontSize: '16px', color: '#666666',
      }).setOrigin(0.5);
      this.contentGroup.add(empty);
    }
  }
}
