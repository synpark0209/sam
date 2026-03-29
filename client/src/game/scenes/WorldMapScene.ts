import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@shared/constants.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { AudioManager } from '../systems/AudioManager.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import { getGradeColor } from '@shared/data/gachaDefs.ts';
import type { HeroGrade } from '@shared/data/gachaDefs.ts';

const GW = GAME_WIDTH;
const GH = GAME_HEIGHT;

export class WorldMapScene extends Phaser.Scene {
  private campaignManager!: CampaignManager;

  constructor() {
    super('WorldMapScene');
  }

  init(data: { campaignManager: CampaignManager }) {
    this.campaignManager = data.campaignManager;
  }

  create(): void {
    (this.registry.get('audioManager') as AudioManager)?.playBgm('worldmap');
    const chapter = this.campaignManager.getCurrentChapter();

    // 배경 그라데이션
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0e1420, 0x0e1420, 0x1a2030, 0x1a2030, 1);
    bg.fillRect(0, 0, GW, GH);

    // 음소거 버튼
    const audio = this.registry.get('audioManager') as AudioManager;
    const muteBtn = this.add.text(GW - 35, 12, audio?.isMuted() ? '🔇' : '🔊', {
      fontSize: '18px',
    }).setInteractive({ useHandCursor: true }).setDepth(100);
    muteBtn.on('pointerdown', () => {
      if (!audio) return;
      audio.setMuted(!audio.isMuted());
      muteBtn.setText(audio.isMuted() ? '🔇' : '🔊');
      if (!audio.isMuted()) audio.playBgm('worldmap');
    });

    // 홈 버튼
    const homeBg = this.add.graphics();
    homeBg.fillStyle(0x1a1a3a, 1).fillRoundedRect(10, 8, 60, 26, 6);
    homeBg.lineStyle(1, 0x4466aa, 0.5).strokeRoundedRect(10, 8, 60, 26, 6);
    const homeBtn = this.add.text(40, 21, '← 홈', {
      fontSize: '12px', color: '#88aacc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    homeBtn.on('pointerdown', () => this.scene.start('LobbyScene', { campaignManager: this.campaignManager }));

    // 모든 챕터 완료
    if (!chapter) {
      this.add.text(GW / 2, GH * 0.3, '🎉', { fontSize: '48px' }).setOrigin(0.5);
      this.add.text(GW / 2, GH * 0.42, '축하합니다!', {
        fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(GW / 2, GH * 0.52, '현재 스토리를 모두 완료했습니다', {
        fontSize: '13px', color: '#aaaaaa',
      }).setOrigin(0.5);
      this.add.text(GW / 2, GH * 0.58, '새로운 챕터가 곧 추가됩니다!', {
        fontSize: '11px', color: '#666666',
      }).setOrigin(0.5);
      return;
    }

    // 챕터 헤더 카드
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1a2a3a, 0.8).fillRoundedRect(15, 42, GW - 30, 55, 8);
    headerBg.lineStyle(1, 0x4466aa, 0.5).strokeRoundedRect(15, 42, GW - 30, 55, 8);

    this.add.text(GW / 2, 56, chapter.name, {
      fontSize: '18px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(GW / 2, 78, chapter.description, {
      fontSize: '10px', color: '#aaaaaa', wordWrap: { width: GW - 60 },
    }).setOrigin(0.5);

    // 스테이지 목록
    const startY = 108;
    const stageH = 68;

    for (let i = 0; i < chapter.stages.length; i++) {
      const stage = chapter.stages[i];
      const status = this.campaignManager.getStageStatus(stage.id);
      const y = startY + i * stageH;

      // 카드 배경
      const cardColor = status === 'completed' ? 0x1a3a2a : status === 'available' ? 0x1a2a4a : 0x151520;
      const borderColor = status === 'completed' ? 0x44aa44 : status === 'available' ? 0x4488cc : 0x2a2a3a;
      const card = this.add.graphics();
      card.fillStyle(cardColor, 1).fillRoundedRect(20, y, GW - 40, stageH - 6, 8);
      card.lineStyle(1.5, borderColor, 0.8).strokeRoundedRect(20, y, GW - 40, stageH - 6, 8);

      // 번호 원
      const numBg = this.add.graphics();
      numBg.fillStyle(borderColor, 1).fillCircle(44, y + (stageH - 6) / 2, 14);
      this.add.text(44, y + (stageH - 6) / 2, `${i + 1}`, {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      // 스테이지 이름/설명
      const nameColor = status === 'locked' ? '#555555' : '#ffffff';
      this.add.text(66, y + 12, stage.name, {
        fontSize: '14px', color: nameColor, fontStyle: 'bold',
      });
      this.add.text(66, y + 32, stage.description, {
        fontSize: '10px', color: status === 'locked' ? '#333333' : '#888888',
      });

      // 상태 표시
      if (status === 'completed') {
        this.add.text(GW - 50, y + (stageH - 6) / 2, '✅', {
          fontSize: '20px',
        }).setOrigin(0.5);
      } else if (status === 'available') {
        const playBg = this.add.graphics();
        playBg.fillStyle(0x3366aa, 1).fillRoundedRect(GW - 90, y + 14, 60, 30, 6);
        this.add.text(GW - 60, y + 29, '출전 ▶', {
          fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
        const hit = this.add.rectangle(GW - 60, y + 29, 60, 30, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.startStage(stage.id));
      } else {
        this.add.text(GW - 50, y + (stageH - 6) / 2, '🔒', {
          fontSize: '18px',
        }).setOrigin(0.5);
      }
    }

    // 하단 유닛 정보 카드
    const infoY = GH - 45;
    const infoBg = this.add.graphics();
    infoBg.fillStyle(0x0a0a1a, 0.9).fillRoundedRect(10, infoY, GW - 20, 38, 6);

    const progress = this.campaignManager.getProgress();
    this.add.text(20, infoY + 8, `💰 ${progress.gold}`, {
      fontSize: '11px', color: '#ffd700',
    });
    const unitSummary = progress.playerUnits.filter(u => u.isScenarioUnit).map(u => `${u.name} Lv.${u.level ?? 1}`).join('  ');
    this.add.text(20, infoY + 24, unitSummary, { fontSize: '9px', color: '#667788' });
  }

  private startStage(stageId: string): void {
    const chapter = this.campaignManager.getCurrentChapter();
    const stage = chapter?.stages.find(s => s.id === stageId);
    if (!stage) return;

    const guests = this.campaignManager.getGuestCandidates();
    if (guests.length > 0) {
      this.showGuestSelect(stage, guests);
    } else {
      this.launchBattle(stage, undefined);
    }
  }

  private showGuestSelect(stage: import('@shared/types/campaign.ts').Stage, guests: import('@shared/types/index.ts').UnitData[]): void {
    this.children.removeAll();
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0e1420, 0x0e1420, 0x1a2030, 0x1a2030, 1);
    bg.fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 20, '⚔️ 지원 장수 선택', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(GW / 2, 48, '시나리오 장수 외 1명을 선택하세요', {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 선택 안 함 버튼
    const noneBg = this.add.graphics();
    noneBg.fillStyle(0x1a1a2a, 1).fillRoundedRect(GW / 2 - 120, 65, 240, 30, 6);
    noneBg.lineStyle(1, 0x333355, 0.5).strokeRoundedRect(GW / 2 - 120, 65, 240, 30, 6);
    const noneBtn = this.add.text(GW / 2, 80, '기본 장수만 출전', {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    noneBtn.on('pointerdown', () => this.launchBattle(stage, undefined));

    // 게스트 목록
    const startY = 105;
    const cardH = 52;

    for (let i = 0; i < guests.length; i++) {
      const unit = guests[i];
      const y = startY + i * cardH;
      const grade = unit.grade ?? 'N';
      const gradeColor = getGradeColor(grade as HeroGrade);

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1a2a3a, 1).fillRoundedRect(15, y, GW - 30, cardH - 5, 6);
      cardBg.lineStyle(1, 0x3366aa, 0.6).strokeRoundedRect(15, y, GW - 30, cardH - 5, 6);

      this.add.text(25, y + 8, `[${grade}]`, {
        fontSize: '12px', color: gradeColor, fontStyle: 'bold',
      });
      this.add.text(52, y + 6, unit.name, {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      });

      const cls = unit.unitClass ? (UNIT_CLASS_DEFS[unit.unitClass]?.name ?? '') : '';
      this.add.text(52, y + 24, `${cls} Lv.${unit.level ?? 1}  ATK:${unit.stats.attack}`, {
        fontSize: '9px', color: '#88aacc',
      });

      const selBg = this.add.graphics();
      selBg.fillStyle(0x3366aa, 1).fillRoundedRect(GW - 75, y + 10, 50, 26, 5);
      this.add.text(GW - 50, y + 23, '선택', {
        fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      const hit = this.add.rectangle(GW - 50, y + 23, 50, 26, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.launchBattle(stage, unit.id));
    }
  }

  private launchBattle(stage: import('@shared/types/campaign.ts').Stage, guestUnitId?: string): void {
    const playerUnits = this.campaignManager.prepareBattle(stage.battleConfig, guestUnitId);
    this.registry.set('pendingBattle', {
      campaignMode: true,
      campaignManager: this.campaignManager,
      stage,
      battleConfig: stage.battleConfig,
      playerUnits,
    });

    this.scene.start('DialogueScene', {
      dialogue: stage.preDialogue,
      nextScene: 'BattleScene',
      nextSceneData: this.registry.get('pendingBattle'),
    });
  }
}
