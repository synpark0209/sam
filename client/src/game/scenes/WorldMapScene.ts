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
    const muteBtn = this.add.text(GW - 40, 16, audio?.isMuted() ? '🔇' : '🔊', {
      fontSize: '24px',
    }).setInteractive({ useHandCursor: true }).setDepth(100);
    muteBtn.on('pointerdown', () => {
      if (!audio) return;
      audio.setMuted(!audio.isMuted());
      muteBtn.setText(audio.isMuted() ? '🔇' : '🔊');
      if (!audio.isMuted()) audio.playBgm('worldmap');
    });

    // 뒤로 버튼
    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('LobbyScene', { campaignManager: this.campaignManager }));

    // 모든 챕터 완료
    if (!chapter) {
      this.add.text(GW / 2, GH * 0.3, '🎉', { fontSize: '48px' }).setOrigin(0.5);
      this.add.text(GW / 2, GH * 0.42, '축하합니다!', {
        fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(GW / 2, GH * 0.52, '현재 스토리를 모두 완료했습니다', {
        fontSize: '16px', color: '#aaaaaa',
      }).setOrigin(0.5);
      this.add.text(GW / 2, GH * 0.58, '새로운 챕터가 곧 추가됩니다!', {
        fontSize: '14px', color: '#666666',
      }).setOrigin(0.5);
      return;
    }

    // 챕터 헤더 카드
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1a2a3a, 0.8).fillRoundedRect(16, 55, GW - 32, 70, 10);
    headerBg.lineStyle(1, 0x4466aa, 0.5).strokeRoundedRect(16, 55, GW - 32, 70, 10);

    this.add.text(GW / 2, 72, chapter.name, {
      fontSize: '22px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(GW / 2, 100, chapter.description, {
      fontSize: '13px', color: '#aaaaaa', wordWrap: { width: GW - 60 },
    }).setOrigin(0.5);

    // 스테이지 목록
    const startY = 140;
    const stageH = 85;

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
      numBg.fillStyle(borderColor, 1).fillCircle(46, y + (stageH - 6) / 2, 17);
      this.add.text(46, y + (stageH - 6) / 2, `${i + 1}`, {
        fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      // 스테이지 이름/설명
      const nameColor = status === 'locked' ? '#555555' : '#ffffff';
      this.add.text(72, y + 14, stage.name, {
        fontSize: '17px', color: nameColor, fontStyle: 'bold',
      });
      this.add.text(72, y + 38, stage.description, {
        fontSize: '13px', color: status === 'locked' ? '#333333' : '#888888',
      });

      // 상태 표시
      if (status === 'completed') {
        this.add.text(GW - 50, y + (stageH - 6) / 2, '✅', {
          fontSize: '20px',
        }).setOrigin(0.5);
      } else if (status === 'available') {
        const playBg = this.add.graphics();
        playBg.fillStyle(0x3366aa, 1).fillRoundedRect(GW - 100, y + 18, 76, 40, 8);
        this.add.text(GW - 62, y + 38, '출전 ▶', {
          fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
        const hit = this.add.rectangle(GW - 62, y + 38, 76, 40, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.startStage(stage.id));
      } else {
        this.add.text(GW - 50, y + (stageH - 6) / 2, '🔒', {
          fontSize: '18px',
        }).setOrigin(0.5);
      }
    }

    // 하단 유닛 정보 카드
    const infoY = GH - 55;
    const infoBg = this.add.graphics();
    infoBg.fillStyle(0x0a0a1a, 0.9).fillRoundedRect(10, infoY, GW - 20, 48, 8);

    const progress = this.campaignManager.getProgress();
    this.add.text(20, infoY + 8, `💰 ${progress.gold}`, {
      fontSize: '14px', color: '#ffd700',
    });
    const unitSummary = progress.playerUnits.filter(u => u.isScenarioUnit).map(u => `${u.name} Lv.${u.level ?? 1}`).join('  ');
    this.add.text(20, infoY + 28, unitSummary, { fontSize: '12px', color: '#667788' });
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

  private selectedGuests: string[] = [];

  private showGuestSelect(stage: import('@shared/types/campaign.ts').Stage, guests: import('@shared/types/index.ts').UnitData[]): void {
    this.children.removeAll();
    const maxGuests = this.campaignManager.getMaxGuests();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0e1420, 0x0e1420, 0x1a2030, 0x1a2030, 1);
    bg.fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 20, '⚔️ 지원 장수 선택', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(GW / 2, 48, `최대 ${maxGuests}명 선택 (${this.selectedGuests.length}/${maxGuests})`, {
      fontSize: '13px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 출전 버튼
    const goReady = this.selectedGuests.length > 0;
    const goBg = this.add.graphics();
    goBg.fillStyle(goReady ? 0x228833 : 0x1a1a2a, 1).fillRoundedRect(GW / 2 - 120, 65, 240, 32, 6);
    goBg.lineStyle(1, goReady ? 0x44ff44 : 0x333355, 0.5).strokeRoundedRect(GW / 2 - 120, 65, 240, 32, 6);
    const goLabel = this.selectedGuests.length > 0
      ? `출전! (시나리오 + ${this.selectedGuests.length}명)`
      : '기본 장수만 출전';
    const goBtn = this.add.text(GW / 2, 81, goLabel, {
      fontSize: '13px', color: goReady ? '#ffffff' : '#888888', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    goBtn.on('pointerdown', () => this.launchBattle(stage, this.selectedGuests.length > 0 ? this.selectedGuests : undefined));

    // 레벨 내림차순 정렬
    guests.sort((a, b) => (b.level ?? 1) - (a.level ?? 1));

    // 게스트 그리드
    const cols = 3;
    const pad = 14;
    const gap = 10;
    const cellW = (GW - pad * 2 - (cols - 1) * gap) / cols;
    const cellH = cellW;
    const startY = 108;
    const clsIcons: Record<string, string> = {
      cavalry: '🐎', infantry: '🛡️', archer: '🏹',
      strategist: '📜', martial_artist: '👊', bandit: '🗡️',
      dancer: '💃', taoist: '🔮', geomancer: '🌀', siege: '🏗️',
    };

    for (let i = 0; i < guests.length; i++) {
      const unit = guests[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cellW + gap);
      const y = startY + row * (cellH + gap);
      const grade = unit.grade ?? 'N';
      const gradeColorHex = getGradeColor(grade as HeroGrade);
      const gradeColorNum = Phaser.Display.Color.HexStringToColor(gradeColorHex).color;

      const isSelected = this.selectedGuests.includes(unit.id);
      const card = this.add.graphics();
      card.fillStyle(isSelected ? 0x1a3a1a : 0x141428, 1).fillRoundedRect(x, y, cellW, cellH, 8);
      card.lineStyle(2, isSelected ? 0x44ff44 : gradeColorNum, 0.8).strokeRoundedRect(x, y, cellW, cellH, 8);

      if (isSelected) {
        this.add.text(x + cellW - 6, y + cellH - 6, '✓', {
          fontSize: '16px', color: '#44ff44', fontStyle: 'bold',
        }).setOrigin(1, 1);
      }

      const cls = unit.unitClass ?? 'infantry';
      this.add.text(x + cellW / 2, y + cellW * 0.30, clsIcons[cls] ?? '⚔️', {
        fontSize: '34px',
      }).setOrigin(0.5);

      this.add.text(x + 6, y + 4, grade, {
        fontSize: '13px', color: gradeColorHex, fontStyle: 'bold',
      });

      this.add.text(x + cellW - 6, y + 4, `Lv.${unit.level ?? 1}`, {
        fontSize: '12px', color: '#88aacc',
      }).setOrigin(1, 0);

      this.add.text(x + cellW / 2, y + cellH * 0.65, unit.name, {
        fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      const clsName = unit.unitClass ? (UNIT_CLASS_DEFS[unit.unitClass]?.name ?? '') : '';
      this.add.text(x + cellW / 2, y + cellH * 0.82, clsName, {
        fontSize: '10px', color: '#88aacc',
      }).setOrigin(0.5);

      const hit = this.add.rectangle(x + cellW / 2, y + cellH / 2, cellW, cellH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (isSelected) {
          this.selectedGuests = this.selectedGuests.filter(id => id !== unit.id);
        } else if (this.selectedGuests.length < maxGuests) {
          this.selectedGuests.push(unit.id);
        }
        this.showGuestSelect(stage, guests);
      });
    }
  }

  private launchBattle(stage: import('@shared/types/campaign.ts').Stage, guestUnitIds?: string[]): void {
    if (guestUnitIds && guestUnitIds.length > 0) {
      this.campaignManager.getProgress().lastGuestId = guestUnitIds[0];
      this.campaignManager.save();
    }
    this.selectedGuests = [];
    const playerUnits = this.campaignManager.prepareBattle(stage.battleConfig, guestUnitIds);
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
