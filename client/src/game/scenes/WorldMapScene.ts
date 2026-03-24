import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { AudioManager } from '../systems/AudioManager.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';

const GAME_W = TILE_SIZE * MAP_WIDTH;
const GAME_H = TILE_SIZE * MAP_HEIGHT + 60;

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

    // 음소거 버튼
    const audio = this.registry.get('audioManager') as AudioManager;
    const muteBtn = this.add.text(GAME_W - 30, 10, audio?.isMuted() ? '🔇' : '🔊', {
      fontSize: '20px',
    }).setInteractive({ useHandCursor: true }).setDepth(100);
    muteBtn.on('pointerdown', () => {
      if (!audio) return;
      audio.setMuted(!audio.isMuted());
      muteBtn.setText(audio.isMuted() ? '🔇' : '🔊');
      if (!audio.isMuted()) audio.playBgm('worldmap');
    });

    // 배경
    this.add.graphics().fillStyle(0x0e0e1e, 1).fillRect(0, 0, GAME_W, GAME_H);

    // 모든 챕터 완료
    if (!chapter) {
      this.add.text(GAME_W / 2, GAME_H * 0.35, '축하합니다!', {
        fontSize: '28px', color: '#ffd700', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(GAME_W / 2, GAME_H * 0.45, '현재 챕터의 모든 스토리를 완료했습니다.', {
        fontSize: '16px', color: '#aaaaaa',
      }).setOrigin(0.5);
      this.add.text(GAME_W / 2, GAME_H * 0.55, '새로운 챕터가 곧 추가됩니다!', {
        fontSize: '14px', color: '#888888',
      }).setOrigin(0.5);

      const backBtn = this.add.text(GAME_W / 2, GAME_H * 0.7, '타이틀로', {
        fontSize: '18px', color: '#ffffff', backgroundColor: '#2a2a4a', padding: { x: 30, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      backBtn.on('pointerdown', () => this.scene.start('TitleScene'));
      return;
    }

    // 챕터 제목
    this.add.text(GAME_W / 2, 30, chapter.name, {
      fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 60, chapter.description, {
      fontSize: '14px', color: '#aaaaaa', wordWrap: { width: GAME_W - 60 },
    }).setOrigin(0.5);

    // 유닛/골드 정보
    const progress = this.campaignManager.getProgress();
    this.add.text(20, GAME_H - 50, `금: ${progress.gold}`, {
      fontSize: '14px', color: '#ffd700',
    });
    const unitSummary = progress.playerUnits.map(u => `${u.name} Lv.${u.level ?? 1}`).join('  ');
    this.add.text(20, GAME_H - 30, unitSummary, { fontSize: '12px', color: '#8888aa' });

    // 홈 버튼
    const homeBtn = this.add.text(GAME_W - 100, 25, '홈으로', {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#4a4a6a', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    homeBtn.on('pointerover', () => homeBtn.setStyle({ backgroundColor: '#6a6a8a' }));
    homeBtn.on('pointerout', () => homeBtn.setStyle({ backgroundColor: '#4a4a6a' }));
    homeBtn.on('pointerdown', () => this.scene.start('TitleScene'));

    // 스테이지 목록
    const startY = 110;
    const stageH = 70;

    for (let i = 0; i < chapter.stages.length; i++) {
      const stage = chapter.stages[i];
      const status = this.campaignManager.getStageStatus(stage.id);
      const y = startY + i * stageH;

      const boxColor = status === 'completed' ? 0x2a4a2a : status === 'available' ? 0x2a2a4a : 0x1a1a1a;
      const box = this.add.graphics();
      box.fillStyle(boxColor, 1).fillRoundedRect(40, y, GAME_W - 80, stageH - 10, 8);
      box.lineStyle(2, status === 'available' ? 0x5588dd : 0x333344, 1);
      box.strokeRoundedRect(40, y, GAME_W - 80, stageH - 10, 8);

      const numColor = status === 'completed' ? '#44aa44' : status === 'available' ? '#5588dd' : '#555555';
      this.add.text(60, y + 12, `${i + 1}`, { fontSize: '22px', color: numColor, fontStyle: 'bold' });

      const nameColor = status === 'locked' ? '#555555' : '#ffffff';
      this.add.text(95, y + 10, stage.name, { fontSize: '16px', color: nameColor, fontStyle: 'bold' });
      this.add.text(95, y + 32, stage.description, {
        fontSize: '12px', color: status === 'locked' ? '#444444' : '#888888',
      });

      if (status === 'completed') {
        this.add.text(GAME_W - 110, y + 18, '완료', { fontSize: '14px', color: '#44aa44', fontStyle: 'bold' });
      } else if (status === 'available') {
        const playBtn = this.add.text(GAME_W - 130, y + 12, '출전 ▶', {
          fontSize: '16px', color: '#ffffff', backgroundColor: '#3366aa', padding: { x: 12, y: 6 },
        }).setInteractive({ useHandCursor: true });
        playBtn.on('pointerover', () => playBtn.setStyle({ backgroundColor: '#4488cc' }));
        playBtn.on('pointerout', () => playBtn.setStyle({ backgroundColor: '#3366aa' }));
        playBtn.on('pointerdown', () => this.startStage(stage.id));
      } else {
        this.add.text(GAME_W - 110, y + 18, '잠김', { fontSize: '14px', color: '#555555' });
      }
    }
  }

  private startStage(stageId: string): void {
    const chapter = this.campaignManager.getCurrentChapter();
    const stage = chapter?.stages.find(s => s.id === stageId);
    if (!stage) return;

    const guests = this.campaignManager.getGuestCandidates();
    if (guests.length > 0) {
      // 게스트 선택 화면 표시
      this.showGuestSelect(stage, guests);
    } else {
      // 게스트 없이 바로 출전
      this.launchBattle(stage, undefined);
    }
  }

  private showGuestSelect(stage: import('@shared/types/campaign.ts').Stage, guests: import('@shared/types/index.ts').UnitData[]): void {
    this.children.removeAll();
    this.add.graphics().fillStyle(0x0e0e1e, 1).fillRect(0, 0, GAME_W, GAME_H);

    this.add.text(GAME_W / 2, 20, '지원 장수 선택', {
      fontSize: '22px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 50, '시나리오 장수 외 1명을 선택하세요', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // "선택 안 함" 버튼
    const noneBtn = this.add.text(GAME_W / 2, 80, '선택 안 함 (기본 장수만 출전)', {
      fontSize: '13px', color: '#888888', backgroundColor: '#1a1a3a', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    noneBtn.on('pointerdown', () => this.launchBattle(stage, undefined));

    // 게스트 목록
    const startY = 115;
    const cardH = 55;

    for (let i = 0; i < guests.length; i++) {
      const unit = guests[i];
      const y = startY + i * cardH;
      const gradeColor = unit.grade === 'UR' ? '#ffaa00' : unit.grade === 'SSR' ? '#aa44ff' : unit.grade === 'SR' ? '#4488ff' : '#44aa44';

      const bg = this.add.graphics();
      bg.fillStyle(0x1a2a3a, 1).fillRoundedRect(15, y, GAME_W - 30, cardH - 5, 6);
      bg.lineStyle(1, 0x3366aa, 1).strokeRoundedRect(15, y, GAME_W - 30, cardH - 5, 6);

      this.add.text(25, y + 8, `[${unit.grade ?? 'N'}]`, {
        fontSize: '13px', color: gradeColor, fontStyle: 'bold',
      });
      this.add.text(55, y + 8, unit.name, {
        fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
      });

      const cls = unit.unitClass ? (UNIT_CLASS_DEFS[unit.unitClass]?.name ?? '') : '';
      this.add.text(55, y + 28, `${cls} Lv.${unit.level ?? 1}  ATK:${unit.stats.attack} DEF:${unit.stats.defense}`, {
        fontSize: '10px', color: '#88aacc',
      });

      const selectBtn = this.add.text(GAME_W - 80, y + 14, '선택', {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#3366aa', padding: { x: 12, y: 6 },
      }).setInteractive({ useHandCursor: true });
      selectBtn.on('pointerdown', () => this.launchBattle(stage, unit.id));
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
