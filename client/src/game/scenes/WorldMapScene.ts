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
      fontSize: '13px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 선택 안 함 버튼
    const noneBg = this.add.graphics();
    noneBg.fillStyle(0x1a1a2a, 1).fillRoundedRect(GW / 2 - 120, 65, 240, 30, 6);
    noneBg.lineStyle(1, 0x333355, 0.5).strokeRoundedRect(GW / 2 - 120, 65, 240, 30, 6);
    const noneBtn = this.add.text(GW / 2, 80, '기본 장수만 출전', {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    noneBtn.on('pointerdown', () => this.launchBattle(stage, undefined));

    // 최근 선택 장수 맨 앞 + 레벨 내림차순 정렬
    const lastGuestId = this.campaignManager.getProgress().lastGuestId;
    guests.sort((a, b) => {
      if (a.id === lastGuestId) return -1;
      if (b.id === lastGuestId) return 1;
      return (b.level ?? 1) - (a.level ?? 1);
    });

    // 게스트 그리드
    const cols = 4;
    const pad = 12;
    const cellW = (GW - pad * 2 - (cols - 1) * 8) / cols;
    const cellH = cellW + 30;
    const startY = 105;
    const clsIcons: Record<string, string> = {
      cavalry: '🐎', infantry: '🛡️', archer: '🏹',
      strategist: '📜', martial_artist: '👊', bandit: '🗡️',
    };

    for (let i = 0; i < guests.length; i++) {
      const unit = guests[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cellW + 8);
      const y = startY + row * (cellH + 8);
      const grade = unit.grade ?? 'N';
      const gradeColorHex = getGradeColor(grade as HeroGrade);
      const gradeColorNum = Phaser.Display.Color.HexStringToColor(gradeColorHex).color;

      const isLast = unit.id === lastGuestId;
      const card = this.add.graphics();
      card.fillStyle(isLast ? 0x1a2840 : 0x141428, 1).fillRoundedRect(x, y, cellW, cellH, 6);
      card.lineStyle(2, isLast ? 0xffd700 : gradeColorNum, 0.8).strokeRoundedRect(x, y, cellW, cellH, 6);

      const cls = unit.unitClass ?? 'infantry';
      this.add.text(x + cellW / 2, y + cellW * 0.30, clsIcons[cls] ?? '⚔️', {
        fontSize: '26px',
      }).setOrigin(0.5);

      this.add.text(x + 4, y + 2, grade, {
        fontSize: '10px', color: gradeColorHex, fontStyle: 'bold',
      });

      this.add.text(x + cellW - 4, y + 2, `${unit.level ?? 1}`, {
        fontSize: '10px', color: '#88aacc',
      }).setOrigin(1, 0);

      this.add.text(x + cellW / 2, y + cellW * 0.62, unit.name, {
        fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      const clsName = unit.unitClass ? (UNIT_CLASS_DEFS[unit.unitClass]?.name ?? '') : '';
      this.add.text(x + cellW / 2, y + cellW * 0.62 + 14, clsName, {
        fontSize: '9px', color: '#88aacc',
      }).setOrigin(0.5);

      const hit = this.add.rectangle(x + cellW / 2, y + cellH / 2, cellW, cellH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.launchBattle(stage, unit.id));
    }
  }

  private launchBattle(stage: import('@shared/types/campaign.ts').Stage, guestUnitId?: string): void {
    if (guestUnitId) {
      this.campaignManager.getProgress().lastGuestId = guestUnitId;
      this.campaignManager.save();
    }
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
