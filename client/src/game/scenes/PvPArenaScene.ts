import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@shared/constants.ts';
import type { UnitData } from '@shared/types/index.ts';
import { UnitClass } from '@shared/types/index.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import { SKILL_DEFS } from '@shared/data/skillDefs.ts';
import { SkillEffectType } from '@shared/types/skill.ts';
import { getClassSkillId } from '@shared/data/classSkillDefs.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { AudioManager } from '../systems/AudioManager.ts';
import { getGradeColor } from '@shared/data/gachaDefs.ts';
import type { HeroGrade } from '@shared/data/gachaDefs.ts';
import { getTier, calculateEloChange, getNextTierProgress, DAILY_PVP_TICKETS } from '@shared/data/pvpDefs.ts';
import { pvpRecordResult, addGold } from '../../api/client.ts';
import { preloadUnitImages, hasUnitImage } from '../systems/UnitSpriteManager.ts';
import { FORMATIONS, isFormationComplete, isPatternSlot } from '@shared/data/formationDefs.ts';

const GW = GAME_WIDTH;
const GH = GAME_HEIGHT;
const GRID_COLS = 3; // 열: 후열/중열/전열
const GRID_ROWS = 3; // 행: 배치 라인
const CELL_W = 100;
const CELL_H = 80;
const MAX_DEPLOY = 5;

interface ArenaUnit {
  data: UnitData;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  spirit: number;
  alive: boolean;
  side: 'player' | 'enemy';
  mp: number;
  maxMp: number;
  skillCooldowns: Record<string, number>;
  sprite?: Phaser.GameObjects.Container;
}

export class PvPArenaScene extends Phaser.Scene {
  private campaignManager!: CampaignManager;
  private playerSlots: (UnitData | null)[] = Array(GRID_COLS * GRID_ROWS).fill(null);
  private deployedCount = 0;
  private selectedHeroForDeploy: UnitData | null = null; // 배치할 장수 선택 상태
  private battleUnits: ArenaUnit[] = [];
  private battleSpeed = 1;
  private battleLog: string[] = [];
  private selectedFormation: string | null = null;
  private playerElo = 1000;
  private pvpWins = 0;
  private pvpLosses = 0;
  private ticketsUsed = 0;

  constructor() {
    super('PvPArenaScene');
  }

  init(data: { campaignManager: CampaignManager }) {
    this.campaignManager = data.campaignManager;
  }

  preload(): void {
    preloadUnitImages(this);
  }

  create(): void {
    (this.registry.get('audioManager') as AudioManager)?.playBgm('battle');
    this.playerSlots = Array(GRID_COLS * GRID_ROWS).fill(null);
    this.deployedCount = 0;
    this.ticketsUsed = 0;
    // ELO/전적은 서버에서 로드 (세이브 데이터에 포함)
    this.showArenaHome();
  }

  // ── 아레나 홈 ──

  private showArenaHome(): void {
    this.children.removeAll();
    const g = this.add.graphics();
    const pad = 20; // horizontal padding
    const cardW = GW - pad * 2; // card width

    // 1. Dark gradient background
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(8 + t * 6);
      const gb = Math.round(8 + t * 14);
      const color = (r << 16) | (gb << 8) | (gb + 8);
      g.fillStyle(color, 1);
      g.fillRect(0, Math.round((GH / steps) * i), GW, Math.ceil(GH / steps) + 1);
    }

    // 2. Back button (top-left, touch-friendly)
    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('LobbyScene', { campaignManager: this.campaignManager }));

    // 3. Title with decorative line
    this.add.text(GW / 2, 24, 'PvP 아레나', {
      fontSize: '22px', color: '#ffd700', fontStyle: 'bold', fontFamily: 'sans-serif',
    }).setOrigin(0.5, 0);
    const lineY = 54;
    g.fillStyle(0xffd700, 0.4);
    g.fillRect(pad, lineY, cardW, 1);
    g.fillStyle(0xffd700, 0.8);
    g.fillRect(GW / 2 - 40, lineY, 80, 2);

    // -- Data --
    const tier = getTier(this.playerElo);
    const { next, progress } = getNextTierProgress(this.playerElo);
    const remainTickets = DAILY_PVP_TICKETS - this.ticketsUsed;
    const tierColor = Phaser.Display.Color.HexStringToColor(tier.color).color;

    // 4. Large tier card (centered)
    const tierCardY = 68;
    const tierCardH = 120;
    g.fillStyle(0x1a1a2e, 0.9);
    g.fillRoundedRect(pad, tierCardY, cardW, tierCardH, 14);
    // subtle border
    g.lineStyle(1, tierColor, 0.5);
    g.strokeRoundedRect(pad, tierCardY, cardW, tierCardH, 14);
    // inner glow at top
    g.fillStyle(tierColor, 0.07);
    g.fillRoundedRect(pad, tierCardY, cardW, 50, { tl: 14, tr: 14, bl: 0, br: 0 });

    // Big tier icon
    this.add.text(GW / 2, tierCardY + 22, tier.icon, {
      fontSize: '42px',
    }).setOrigin(0.5, 0);

    // Tier name
    this.add.text(GW / 2, tierCardY + 72, tier.name, {
      fontSize: '24px', color: tier.color, fontStyle: 'bold', fontFamily: 'sans-serif',
    }).setOrigin(0.5, 0);

    // ELO display
    this.add.text(GW / 2, tierCardY + 100, `ELO  ${this.playerElo}`, {
      fontSize: '16px', color: '#bbbbcc', fontFamily: 'sans-serif',
    }).setOrigin(0.5, 0);

    // 5. Progress bar to next tier (full width card)
    const progY = tierCardY + tierCardH + 10;
    if (next) {
      g.fillStyle(0x1a1a2e, 0.8);
      g.fillRoundedRect(pad, progY, cardW, 36, 10);

      this.add.text(pad + 12, progY + 9, `다음: ${next.name}`, {
        fontSize: '13px', color: '#888899', fontFamily: 'sans-serif',
      });

      const barX = pad + 120;
      const barW = cardW - 130 - 44;
      const barH = 12;
      const barY = progY + 12;
      g.fillStyle(0x222244, 1);
      g.fillRoundedRect(barX, barY, barW, barH, 6);
      if (progress > 0) {
        g.fillStyle(tierColor, 1);
        g.fillRoundedRect(barX, barY, Math.max(barW * progress, 12), barH, 6);
      }

      this.add.text(barX + barW + 8, progY + 9, `${Math.round(progress * 100)}%`, {
        fontSize: '13px', color: tier.color, fontFamily: 'sans-serif',
      });
    }

    // 6. Stats row card: wins/losses + tickets
    const statsY = progY + (next ? 48 : 6);
    const statsH = 62;
    g.fillStyle(0x1a1a2e, 0.8);
    g.fillRoundedRect(pad, statsY, cardW, statsH, 12);

    // divider in middle
    g.fillStyle(0x333355, 0.6);
    g.fillRect(GW / 2, statsY + 12, 1, statsH - 24);

    // wins/losses (left half)
    const leftCx = pad + cardW / 4;
    this.add.text(leftCx, statsY + 14, '전적', {
      fontSize: '12px', color: '#777799', fontFamily: 'sans-serif',
    }).setOrigin(0.5, 0);
    this.add.text(leftCx, statsY + 32, `${this.pvpWins}승  ${this.pvpLosses}패`, {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'sans-serif',
    }).setOrigin(0.5, 0);

    // tickets (right half)
    const rightCx = pad + (cardW * 3) / 4;
    this.add.text(rightCx, statsY + 14, '남은 티켓', {
      fontSize: '12px', color: '#777799', fontFamily: 'sans-serif',
    }).setOrigin(0.5, 0);
    this.add.text(rightCx, statsY + 32, `${remainTickets} / ${DAILY_PVP_TICKETS}`, {
      fontSize: '18px', color: remainTickets > 0 ? '#44ff88' : '#ff4444', fontStyle: 'bold', fontFamily: 'sans-serif',
    }).setOrigin(0.5, 0);

    // 7. Big "대전 시작" button
    const btnY = statsY + statsH + 16;
    const btnH = 56;
    if (remainTickets > 0) {
      // button background: red-gold gradient effect
      g.fillStyle(0xaa2222, 1);
      g.fillRoundedRect(pad, btnY, cardW, btnH, 14);
      // lighter top half for gradient feel
      g.fillStyle(0xcc3333, 1);
      g.fillRoundedRect(pad, btnY, cardW, btnH / 2, { tl: 14, tr: 14, bl: 0, br: 0 });
      // gold border
      g.lineStyle(2, 0xffd700, 0.8);
      g.strokeRoundedRect(pad, btnY, cardW, btnH, 14);

      const startLabel = this.add.text(GW / 2, btnY + btnH / 2, '대전 시작', {
        fontSize: '24px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'sans-serif',
      }).setOrigin(0.5);

      // invisible hit area over the button
      const hitZone = this.add.zone(GW / 2, btnY + btnH / 2, cardW, btnH)
        .setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => this.showDeployPhase());
      hitZone.on('pointerover', () => startLabel.setColor('#ffe066'));
      hitZone.on('pointerout', () => startLabel.setColor('#ffffff'));
    } else {
      g.fillStyle(0x332222, 0.8);
      g.fillRoundedRect(pad, btnY, cardW, btnH, 14);
      this.add.text(GW / 2, btnY + btnH / 2, '오늘의 티켓을 모두 사용했습니다', {
        fontSize: '16px', color: '#ff6666', fontFamily: 'sans-serif',
      }).setOrigin(0.5);
    }

    // 8. Season rewards card section
    const rewardCardY = btnY + btnH + 20;
    const rewardTitleH = 36;
    const allTiers = [
      { name: '브론즈', icon: '🥉', elo: '~999', reward: '금화 200 + 보석 50', color: '#cd7f32' },
      { name: '실버', icon: '🥈', elo: '1000+', reward: '금화 500 + 보석 100 + 스킬', color: '#c0c0c0' },
      { name: '골드', icon: '🥇', elo: '1200+', reward: '금화 1000 + 보석 200 + 장비', color: '#ffd700' },
      { name: '다이아', icon: '💎', elo: '1400+', reward: '금화 2000 + 보석 500', color: '#00bfff' },
      { name: '마스터', icon: '👑', elo: '1600+', reward: '금화 5000 + 보석 1000 + 적토마', color: '#ff4500' },
    ];
    const rowH = 44;
    const rewardListH = allTiers.length * rowH;
    const rewardCardH = rewardTitleH + rewardListH + 10;

    // card background
    g.fillStyle(0x12122a, 0.9);
    g.fillRoundedRect(pad, rewardCardY, cardW, rewardCardH, 14);
    g.lineStyle(1, 0x333366, 0.5);
    g.strokeRoundedRect(pad, rewardCardY, cardW, rewardCardH, 14);

    // title bar
    g.fillStyle(0x1e1e40, 1);
    g.fillRoundedRect(pad, rewardCardY, cardW, rewardTitleH, { tl: 14, tr: 14, bl: 0, br: 0 });
    this.add.text(GW / 2, rewardCardY + rewardTitleH / 2, '시즌 보상', {
      fontSize: '15px', color: '#ffd700', fontStyle: 'bold', fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // reward rows
    const listStartY = rewardCardY + rewardTitleH + 4;
    for (let i = 0; i < allTiers.length; i++) {
      const t = allTiers[i];
      const y = listStartY + i * rowH;
      const isCurrent = tier.name === t.name;

      // highlight current tier row
      if (isCurrent) {
        g.fillStyle(Phaser.Display.Color.HexStringToColor(t.color).color, 0.1);
        g.fillRect(pad + 4, y, cardW - 8, rowH - 2);
      }

      // row separator (except last)
      if (i < allTiers.length - 1) {
        g.fillStyle(0x333355, 0.3);
        g.fillRect(pad + 12, y + rowH - 1, cardW - 24, 1);
      }

      // icon + tier name
      this.add.text(pad + 14, y + 6, `${t.icon} ${t.name}`, {
        fontSize: '15px',
        color: isCurrent ? t.color : '#777788',
        fontStyle: isCurrent ? 'bold' : 'normal',
        fontFamily: 'sans-serif',
      });

      // ELO requirement
      this.add.text(pad + 14, y + 25, t.elo, {
        fontSize: '11px', color: isCurrent ? '#999999' : '#555566', fontFamily: 'sans-serif',
      });

      // reward text (right-aligned)
      this.add.text(GW - pad - 14, y + 13, t.reward, {
        fontSize: '12px',
        color: isCurrent ? '#ffffff' : '#555566',
        fontFamily: 'sans-serif',
      }).setOrigin(1, 0);
    }
  }

  // ── 배치 화면 ──

  private showDeployPhase(): void {
    this.children.removeAll();

    // Gradient background
    const g = this.add.graphics();
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(8 + t * 6);
      const gb = Math.round(8 + t * 14);
      const color = (r << 16) | (gb << 8) | (gb + 8);
      g.fillStyle(color, 1);
      g.fillRect(0, Math.round((GH / steps) * i), GW, Math.ceil(GH / steps) + 1);
    }

    this.add.text(GW / 2, 22, '⚔️ PvP 아레나 - 배치', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Decorative gold line under title
    const lineY = 48;
    g.fillStyle(0xffd700, 0.4);
    g.fillRect(20, lineY, GW - 40, 1);
    g.fillStyle(0xffd700, 0.8);
    g.fillRect(GW / 2 - 40, lineY, 80, 2);

    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showArenaHome());

    // ── 진형 선택 (그리드 위) ──
    const formationY = 56;
    const selFormation = FORMATIONS.find(f => f.id === this.selectedFormation) ?? null;

    const fBtnW = 64;
    const fBtnH = 38;
    const fGap = 4;
    const totalFW = FORMATIONS.length * fBtnW + (FORMATIONS.length - 1) * fGap;
    const fStartX = (GW - totalFW) / 2;

    for (let i = 0; i < FORMATIONS.length; i++) {
      const f = FORMATIONS[i];
      const fx = fStartX + i * (fBtnW + fGap);
      const isSel = this.selectedFormation === f.id;

      const fbg = this.add.graphics();
      fbg.fillStyle(isSel ? 0x2a2a1a : 0x1a1a2e, 1);
      fbg.fillRoundedRect(fx, formationY, fBtnW, fBtnH, 4);
      fbg.lineStyle(isSel ? 2 : 1, isSel ? 0xffd700 : 0x333355, 1);
      fbg.strokeRoundedRect(fx, formationY, fBtnW, fBtnH, 4);

      this.add.text(fx + fBtnW / 2, formationY + 10, f.icon, {
        fontSize: isSel ? '16px' : '13px',
      }).setOrigin(0.5);
      this.add.text(fx + fBtnW / 2, formationY + 28, f.name.split('(')[0], {
        fontSize: '9px', color: isSel ? '#ffd700' : '#888888',
      }).setOrigin(0.5);

      this.add.rectangle(fx + fBtnW / 2, formationY + fBtnH / 2, fBtnW, fBtnH, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selectedFormation = this.selectedFormation === f.id ? null : f.id;
          this.showDeployPhase();
        });
    }

    // 선택된 진형 설명
    let descEndY = formationY + fBtnH + 4;
    if (selFormation) {
      this.add.text(GW / 2, descEndY, `${selFormation.name} - ${selFormation.description}`, {
        fontSize: '12px', color: '#88ccff',
      }).setOrigin(0.5);
      descEndY += 18;
    }

    // 선택 상태 표시
    const statusText = this.selectedHeroForDeploy
      ? `"${this.selectedHeroForDeploy.name}" 배치할 칸을 선택하세요`
      : `장수를 선택하세요 (${this.deployedCount}/${MAX_DEPLOY})`;
    const statusColor = this.selectedHeroForDeploy ? '#ffaa00' : '#aaaaaa';
    this.add.text(GW / 2, descEndY, statusText, {
      fontSize: '14px', color: statusColor,
    }).setOrigin(0.5);

    // ── 3x3 그리드 ──
    const colLabels = ['후열', '중열', '전열'];
    const gridX = (GW - GRID_COLS * CELL_W) / 2;
    const gridY = descEndY + 24;

    for (let c = 0; c < GRID_COLS; c++) {
      this.add.text(gridX + c * CELL_W + CELL_W / 2, gridY - 16, colLabels[c], {
        fontSize: '13px', color: '#446688',
      }).setOrigin(0.5);
    }

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = gridX + c * CELL_W;
        const y = gridY + r * CELL_H;
        const idx = r * GRID_COLS + c;
        const unit = this.playerSlots[idx];

        // Determine if this cell is a pattern cell
        const inPattern = selFormation ? isPatternSlot(selFormation, r, c) : true;
        const isEmpty = !unit;
        const canPlace = isEmpty && this.selectedHeroForDeploy && this.deployedCount < MAX_DEPLOY && inPattern;

        const bg = this.add.graphics();
        if (unit) {
          bg.fillStyle(0x1a3a4a, 1);
          bg.lineStyle(2, inPattern && selFormation ? 0xffd700 : 0x4488aa, 1);
        } else if (!inPattern && selFormation) {
          // Non-pattern cell: dimmed/locked
          bg.fillStyle(0x0e0e1a, 0.6);
          bg.lineStyle(1, 0x222233, 0.5);
        } else if (canPlace) {
          bg.fillStyle(0x2a3a2a, 1);
          bg.lineStyle(2, selFormation ? 0xffd700 : 0x44aa44, 1);
        } else {
          bg.fillStyle(0x1a1a2a, 1);
          bg.lineStyle(1, inPattern && selFormation ? 0x88aa44 : 0x333344, 1);
        }
        bg.fillRoundedRect(x, y, CELL_W - 4, CELL_H - 4, 4);
        bg.strokeRoundedRect(x, y, CELL_W - 4, CELL_H - 4, 4);

        if (unit) {
          const grade = unit.grade ?? 'N';
          const gradeColor = getGradeColor(grade as HeroGrade);
          this.add.text(x + (CELL_W - 4) / 2, y + 12, `[${grade}]`, {
            fontSize: '13px', color: gradeColor, fontStyle: 'bold',
          }).setOrigin(0.5);
          this.add.text(x + (CELL_W - 4) / 2, y + 28, unit.name, {
            fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
          }).setOrigin(0.5);
          const cls = unit.unitClass ? UNIT_CLASS_DEFS[unit.unitClass]?.name ?? '' : '';
          this.add.text(x + (CELL_W - 4) / 2, y + 50, `${cls} Lv.${unit.level ?? 1}`, {
            fontSize: '13px', color: '#88aacc',
          }).setOrigin(0.5);

          // 제거 버튼
          const removeBtn = this.add.text(x + CELL_W - 12, y + 2, '×', {
            fontSize: '16px', color: '#ff6666',
          }).setInteractive({ useHandCursor: true });
          removeBtn.on('pointerdown', () => {
            this.playerSlots[idx] = null;
            this.deployedCount--;
            this.selectedHeroForDeploy = null;
            this.showDeployPhase();
          });
        } else if (!inPattern && selFormation) {
          // Locked cell
          this.add.text(x + (CELL_W - 4) / 2, y + (CELL_H - 4) / 2, '✕', {
            fontSize: '16px', color: '#333344',
          }).setOrigin(0.5);
        } else {
          // Empty cell
          const cellText = canPlace ? '배치' : (inPattern && selFormation ? '배치' : '빈칸');
          const cellColor = canPlace ? '#44aa44' : (inPattern && selFormation ? '#667744' : '#444444');
          this.add.text(x + (CELL_W - 4) / 2, y + (CELL_H - 4) / 2, cellText, {
            fontSize: '14px', color: cellColor,
          }).setOrigin(0.5);

          if (canPlace) {
            const hitArea = this.add.rectangle(x + (CELL_W - 4) / 2, y + (CELL_H - 4) / 2, CELL_W - 4, CELL_H - 4, 0x000000, 0)
              .setInteractive({ useHandCursor: true });
            hitArea.on('pointerdown', () => {
              this.playerSlots[idx] = this.selectedHeroForDeploy;
              this.deployedCount++;
              this.selectedHeroForDeploy = null;
              this.showDeployPhase();
            });
          }
        }
      }
    }

    // ── 장수 목록 ──
    const listY = gridY + GRID_ROWS * CELL_H + 12;
    this.add.text(15, listY, '── 장수 선택 ──', {
      fontSize: '16px', color: '#88aacc', fontStyle: 'bold',
    });

    if (this.selectedHeroForDeploy) {
      const cancelBtn = this.add.text(GW - 80, listY, '선택 취소', {
        fontSize: '14px', color: '#ff8888', backgroundColor: '#2a1a1a', padding: { x: 10, y: 6 },
      }).setInteractive({ useHandCursor: true });
      cancelBtn.on('pointerdown', () => {
        this.selectedHeroForDeploy = null;
        this.showDeployPhase();
      });
    }

    const allUnits = this.campaignManager.getProgress().playerUnits;
    const deployedIds = new Set(this.playerSlots.filter(Boolean).map(u => u!.id));
    const available = allUnits.filter(u => !deployedIds.has(u.id));

    const itemH = 52;
    const maxShow = Math.min(available.length, 5);
    for (let i = 0; i < maxShow; i++) {
      const unit = available[i];
      const y = listY + 28 + i * itemH;
      const grade = unit.grade ?? 'N';
      const gradeColor = getGradeColor(grade as HeroGrade);
      const cls = unit.unitClass ? UNIT_CLASS_DEFS[unit.unitClass]?.name ?? '' : '';
      const isSelected = this.selectedHeroForDeploy?.id === unit.id;

      const rowBg = this.add.graphics();
      rowBg.fillStyle(isSelected ? 0x2a3a2a : 0x111122, 0.8);
      rowBg.fillRoundedRect(12, y - 2, GW - 24, itemH - 2, 3);

      this.add.text(18, y + 8, `[${grade}]`, { fontSize: '14px', color: gradeColor, fontStyle: 'bold' });
      this.add.text(52, y + 4, unit.name, { fontSize: '17px', color: isSelected ? '#44ff44' : '#ffffff', fontStyle: 'bold' });
      this.add.text(52, y + 26, `${cls} Lv.${unit.level ?? 1}  ATK:${unit.stats.attack}`, { fontSize: '14px', color: '#888888' });

      if (this.deployedCount < MAX_DEPLOY && !isSelected) {
        const selectBtn = this.add.text(GW - 70, y + 8, '선택', {
          fontSize: '16px', color: '#ffffff', backgroundColor: '#3366aa', padding: { x: 14, y: 10 },
        }).setInteractive({ useHandCursor: true });
        selectBtn.on('pointerdown', () => {
          this.selectedHeroForDeploy = unit;
          this.showDeployPhase();
        });
      } else if (isSelected) {
        this.add.text(GW - 70, y + 8, '선택됨', {
          fontSize: '14px', color: '#44ff44',
        });
      }
    }

    // ── 전투 시작 버튼 ──
    if (this.deployedCount > 0 && !this.selectedHeroForDeploy) {
      // Check formation completeness
      const formationComplete = selFormation ? isFormationComplete(selFormation, this.playerSlots) : true;
      const canStart = selFormation ? formationComplete : true;

      const btnG = this.add.graphics();
      btnG.fillStyle(canStart ? 0xaa3333 : 0x333333, 1);
      btnG.fillRoundedRect(20, GH - 70, GW - 40, 54, 8);
      btnG.lineStyle(2, canStart ? 0xffd700 : 0x555555, 0.6);
      btnG.strokeRoundedRect(20, GH - 70, GW - 40, 54, 8);

      if (selFormation && !formationComplete) {
        this.add.text(GW / 2, GH - 43, '진형을 완성하세요', {
          fontSize: '18px', color: '#ff8888', fontStyle: 'bold',
        }).setOrigin(0.5);
      } else {
        this.add.text(GW / 2, GH - 43, '⚔️ 전투 시작', {
          fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);

        this.add.rectangle(GW / 2, GH - 43, GW - 40, 54, 0x000000, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.startArenaBattle());
      }
    }
  }

  // ── 전투 실행 ──

  private startArenaBattle(): void {
    // battle phase
    this.battleLog = [];
    this.battleUnits = [];

    // 아군 유닛 생성
    const deployed = this.playerSlots.filter(Boolean) as UnitData[];
    for (let i = 0; i < deployed.length; i++) {
      const u = deployed[i];
      const slotIdx = this.playerSlots.indexOf(u);
      const col = slotIdx % GRID_COLS;
      const row = Math.floor(slotIdx / GRID_COLS);
      this.battleUnits.push({
        data: u, col, row, side: 'player',
        hp: u.stats.maxHp, maxHp: u.stats.maxHp,
        attack: u.stats.attack, defense: u.stats.defense,
        speed: u.stats.speed, spirit: u.stats.spirit ?? 10, alive: true,
        mp: u.maxMp ?? 10, maxMp: u.maxMp ?? 10, skillCooldowns: {},
      });
    }

    // 적군 유닛 생성 (AI 랜덤 배치)
    const enemyPool = this.generateEnemyTeam(deployed.length);
    const enemyPositions = this.generateEnemyPositions(enemyPool.length);
    for (let i = 0; i < enemyPool.length; i++) {
      const { col, row } = enemyPositions[i];
      this.battleUnits.push({
        data: enemyPool[i], col, row, side: 'enemy',
        hp: enemyPool[i].stats.maxHp, maxHp: enemyPool[i].stats.maxHp,
        attack: enemyPool[i].stats.attack, defense: enemyPool[i].stats.defense,
        speed: enemyPool[i].stats.speed, spirit: enemyPool[i].stats.spirit ?? 10, alive: true,
        mp: 15, maxMp: 15, skillCooldowns: {},
      });
    }

    // 진형 버프 적용 (패턴 완성 시에만)
    if (this.selectedFormation) {
      const formation = FORMATIONS.find(f => f.id === this.selectedFormation);
      if (formation && isFormationComplete(formation, this.playerSlots)) {
        const playerUnits = this.battleUnits.filter(u => u.side === 'player');
        for (const buff of formation.buffs) {
          for (const unit of playerUnits) {
            if (buff.statusEffect === 'attack_up') unit.attack += buff.magnitude;
            if (buff.statusEffect === 'defense_up') unit.defense += buff.magnitude;
            if (buff.statusEffect === 'speed_up') unit.speed += buff.magnitude;
            if (buff.statusEffect === 'morale_up') unit.spirit += buff.magnitude;
          }
        }
        this.battleLog.push(`진형: ${formation.name} 활성화!`);
      }
    }

    this.showBattlePhase();
  }

  private generateEnemyPositions(count: number): { col: number; row: number }[] {
    // 전열 우선, 그 다음 중열, 후열 순서로 배치
    const positions: { col: number; row: number }[] = [];
    const order = [
      { col: 2, row: 1 }, // 전열 중앙
      { col: 2, row: 0 }, // 전열 상단
      { col: 2, row: 2 }, // 전열 하단
      { col: 1, row: 1 }, // 중열 중앙
      { col: 0, row: 1 }, // 후열 중앙
    ];
    for (let i = 0; i < count && i < order.length; i++) {
      positions.push(order[i]);
    }
    return positions;
  }

  private generateEnemyTeam(count: number): UnitData[] {
    const classes = [UnitClass.CAVALRY, UnitClass.INFANTRY, UnitClass.ARCHER, UnitClass.STRATEGIST, UnitClass.MARTIAL_ARTIST];
    const names = ['적장 A', '적장 B', '적장 C', '적장 D', '적장 E'];
    const team: UnitData[] = [];
    for (let i = 0; i < count; i++) {
      const cls = classes[i % classes.length];
      const level = Math.max(1, Math.floor(Math.random() * 5) + 1);
      team.push({
        id: `enemy_pvp_${i}`, name: names[i], faction: 'enemy',
        unitClass: cls, grade: 'SR', level,
        position: { x: 0, y: 0 },
        stats: {
          maxHp: 140 + level * 10, hp: 140 + level * 10,
          attack: 30 + level * 3, defense: 18 + level * 2,
          spirit: 10 + level * 2, agility: 20 + level * 3,
          critical: 20 + level * 2, morale: 25 + level * 2,
          speed: 4 + Math.floor(Math.random() * 3),
          penetration: 5 + level, resist: 10 + level * 2,
          moveRange: 4, attackRange: 1,
        },
        hasActed: false, isAlive: true,
      });
    }
    return team;
  }

  private showBattlePhase(): void {
    this.children.removeAll();

    // ── Battlefield background with sky + ground gradients ──
    const bgGfx = this.add.graphics();
    const skyH = Math.floor(GH * 0.4);
    const groundH = GH - skyH;
    // Sky gradient (dark blue to lighter blue)
    const skySteps = 24;
    for (let i = 0; i < skySteps; i++) {
      const t = i / skySteps;
      const r = Math.round(10 + t * 20);
      const g = Math.round(15 + t * 35);
      const b = Math.round(40 + t * 60);
      bgGfx.fillStyle((r << 16) | (g << 8) | b, 1);
      bgGfx.fillRect(0, Math.floor(skyH * t), GW, Math.ceil(skyH / skySteps) + 1);
    }
    // Ground gradient (dark green to brown)
    const gndSteps = 24;
    for (let i = 0; i < gndSteps; i++) {
      const t = i / gndSteps;
      const r = Math.round(20 + t * 50);
      const g = Math.round(35 + t * (-10));
      const b = Math.round(15 + t * 5);
      bgGfx.fillStyle((r << 16) | (Math.max(0, g) << 8) | b, 1);
      bgGfx.fillRect(0, skyH + Math.floor(groundH * t), GW, Math.ceil(groundH / gndSteps) + 1);
    }
    // Center dividing line (golden)
    bgGfx.lineStyle(2, 0xffd700, 0.6);
    bgGfx.lineBetween(GW / 2, 45, GW / 2, GH - 140);

    // 턴 카운터
    const turnText = this.add.text(GW / 2, 12, '턴 1', {
      fontSize: '16px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(60);

    // 전장 배치 (왼쪽: 아군 후→전, 오른쪽: 적군 전→후)
    const unitW = 56;
    const unitH = 62;
    const gapX = 16;
    const playerStartX = GW / 2 - gapX - GRID_COLS * unitW;
    const enemyStartX = GW / 2 + gapX;
    const fieldY = 50;

    // 열 라벨 (아군: 후→전, 적군: 전→후)
    const pLabels = ['후', '중', '전'];
    const eLabels = ['전', '중', '후'];
    for (let c = 0; c < GRID_COLS; c++) {
      this.add.text(playerStartX + c * unitW + unitW / 2, fieldY - 10, pLabels[c], {
        fontSize: '12px', color: '#4466aa',
      }).setOrigin(0.5);
      this.add.text(enemyStartX + c * unitW + unitW / 2, fieldY - 10, eLabels[c], {
        fontSize: '12px', color: '#aa4444',
      }).setOrigin(0.5);
    }

    for (const unit of this.battleUnits) {
      const isPlayer = unit.side === 'player';
      const baseX = isPlayer ? playerStartX : enemyStartX;
      const displayCol = isPlayer ? unit.col : (GRID_COLS - 1 - unit.col);
      const x = baseX + displayCol * unitW + unitW / 2;
      const y = fieldY + unit.row * unitH + unitH / 2;

      const container = this.add.container(x, y);
      const cls = unit.data.unitClass ?? UnitClass.INFANTRY;
      const grade = unit.data.grade ?? 'N';
      const gradeColor = Phaser.Display.Color.HexStringToColor(getGradeColor(grade as HeroGrade)).color;

      // 초상화 크기
      const portraitR = 22;

      // 원형 배경 (등급 색상)
      const circleBg = this.add.graphics();
      circleBg.fillStyle(0x111122, 1);
      circleBg.fillCircle(0, -4, portraitR + 2);
      circleBg.lineStyle(2, gradeColor, 1);
      circleBg.strokeCircle(0, -4, portraitR + 2);
      container.add(circleBg);

      // 유닛 이미지 또는 병종 아이콘
      const hasImage = hasUnitImage(this, cls, unit.data.faction ?? 'player');
      if (hasImage) {
        const imgKey = `unit_img_${cls}_${unit.data.faction ?? 'player'}`;
        const portrait = this.add.sprite(0, -4, imgKey);
        const tex = this.textures.get(imgKey);
        const frame = tex.get(0);
        const scale = (portraitR * 2) / Math.max(frame.width, frame.height);
        portrait.setScale(scale);
        // 원형 마스크
        const maskShape = this.make.graphics({ x: container.x ?? x, y: container.y ?? y });
        maskShape.fillCircle(0, -4, portraitR);
        portrait.setMask(maskShape.createGeometryMask());
        container.add(portrait);
      } else {
        // 병종 아이콘 (이미지 없을 때)
        const clsIcons: Record<string, string> = {
          cavalry: '🐎', infantry: '🛡️', archer: '🏹',
          strategist: '📜', martial_artist: '👊', bandit: '🗡️',
        };
        const icon = clsIcons[cls] ?? '⚔️';
        const iconText = this.add.text(0, -8, icon, { fontSize: '20px' }).setOrigin(0.5);
        container.add(iconText);
      }

      // 진영 표시 (파란/빨간 작은 점)
      const sideIndicator = this.add.graphics();
      sideIndicator.fillStyle(isPlayer ? 0x4488ff : 0xff4444, 1);
      sideIndicator.fillCircle(portraitR - 2, -portraitR + 2, 4);
      container.add(sideIndicator);

      // 이름 (초상화 아래)
      const nameText = this.add.text(0, portraitR + 4, unit.data.name, {
        fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 1,
      }).setOrigin(0.5);
      container.add(nameText);

      // HP 바 배경
      const hpBg = this.add.graphics();
      hpBg.fillStyle(0x333333, 1).fillRoundedRect(-22, portraitR + 14, 44, 5, 2);
      container.add(hpBg);

      // HP 바
      const hpBar = this.add.graphics();
      hpBar.fillStyle(0x00ff00, 1).fillRoundedRect(-22, portraitR + 14, 44, 5, 2);
      container.add(hpBar);

      // MP 바 (작게)
      const mpBg = this.add.graphics();
      mpBg.fillStyle(0x222233, 1).fillRoundedRect(-22, portraitR + 20, 44, 3, 1);
      container.add(mpBg);
      const mpBar = this.add.graphics();
      const mpRatio = unit.mp / Math.max(1, unit.maxMp);
      mpBar.fillStyle(0x4488ff, 1).fillRoundedRect(-22, portraitR + 20, 44 * mpRatio, 3, 1);
      container.add(mpBar);

      unit.sprite = container;
    }

    // 배속 버튼
    const speedBtn = this.add.text(GW - 45, 10, '1x', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#000000cc', padding: { x: 10, y: 6 },
    }).setInteractive({ useHandCursor: true }).setDepth(50);
    speedBtn.on('pointerdown', () => {
      this.battleSpeed = this.battleSpeed === 1 ? 2 : this.battleSpeed === 2 ? 3 : 1;
      speedBtn.setText(`${this.battleSpeed}x`);
    });

    // 전투 로그 영역
    const logBg = this.add.graphics();
    logBg.fillStyle(0x0a0a0a, 0.8).fillRoundedRect(10, GH - 130, GW - 20, 120, 6);

    this.add.text(GW / 2, GH - 125, '── 전투 로그 ──', {
      fontSize: '12px', color: '#666666',
    }).setOrigin(0.5);

    const logTexts: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < 5; i++) {
      const lt = this.add.text(20, GH - 108 + i * 20, '', {
        fontSize: '12px', color: '#aaaaaa', wordWrap: { width: GW - 40 },
      });
      logTexts.push(lt);
    }

    // ── Action order bar (below turn counter) ──
    const orderBarY = 34;
    const orderIcons: Phaser.GameObjects.Graphics[] = [];
    const orderLabels: Phaser.GameObjects.Text[] = [];
    const allSorted = [...this.battleUnits.filter(u => u.alive)]
      .sort((a, b) => b.speed - a.speed);
    const iconSize = 16;
    const orderStartX = GW / 2 - (allSorted.length * (iconSize + 4)) / 2;
    for (let i = 0; i < allSorted.length; i++) {
      const u = allSorted[i];
      const ox = orderStartX + i * (iconSize + 4) + iconSize / 2;
      const circle = this.add.graphics();
      circle.fillStyle(u.side === 'player' ? 0x2244aa : 0xaa2222, 1);
      circle.fillCircle(ox, orderBarY, iconSize / 2);
      circle.lineStyle(1, 0xffffff, 0.5);
      circle.strokeCircle(ox, orderBarY, iconSize / 2);
      circle.setDepth(60);
      orderIcons.push(circle);
      const label = this.add.text(ox, orderBarY, u.data.name.charAt(0), {
        fontSize: '9px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(61);
      orderLabels.push(label);
    }

    // ── VS Cut-in animation ──
    const vsText = this.add.text(GW / 2, GH / 2 - 40, 'VS', {
      fontSize: '48px', color: '#ff2222', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setScale(0.5).setDepth(200);

    // Dark overlay for VS moment
    const vsOverlay = this.add.graphics();
    vsOverlay.fillStyle(0x000000, 0.5);
    vsOverlay.fillRect(0, 0, GW, GH);
    vsOverlay.setDepth(199);

    // Camera flash
    this.cameras.main.flash(300, 255, 255, 255);

    // VS scale animation: 0.5 -> 1.2 -> 1.0
    this.tweens.add({
      targets: vsText, scaleX: 1.2, scaleY: 1.2, duration: 400, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: vsText, scaleX: 1.0, scaleY: 1.0, duration: 200, ease: 'Sine.easeInOut',
        });
      },
    });

    // After 1.5s, fade VS and start battle
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: [vsText, vsOverlay], alpha: 0, duration: 300,
        onComplete: () => {
          vsText.destroy();
          vsOverlay.destroy();
          this.executeBattleTurns(turnText, logTexts, orderIcons, orderLabels);
        },
      });
    });
  }

  /** 상성 배율 */
  private getTypeBonus(attacker: string, defender: string): { mult: number; label: string } {
    const strong: [string, string][] = [
      ['cavalry', 'infantry'], ['infantry', 'archer'], ['archer', 'cavalry'],
      ['martial_artist', 'strategist'],
    ];
    for (const [s, w] of strong) {
      if (attacker === s && defender === w) return { mult: 1.3, label: '유리!' };
      if (attacker === w && defender === s) return { mult: 0.7, label: '불리' };
    }
    return { mult: 1.0, label: '' };
  }

  /** 스킬 자동 사용 판단 */
  private tryUseSkill(unit: ArenaUnit, allUnits: ArenaUnit[]): { target: ArenaUnit; skillName: string; value: number; type: 'damage' | 'heal' } | null {
    // 유닛의 스킬 목록 수집
    const skillIds: string[] = [];
    // 병종 기본 스킬
    if (unit.data.unitClass) {
      skillIds.push(unit.data.classSkillId ?? getClassSkillId(unit.data.unitClass, unit.data.promotionLevel ?? 0));
    }
    // 고유 스킬 (해금된 경우)
    if (unit.data.uniqueSkill && (unit.data.uniqueSkillUnlocked || (unit.data.level ?? 1) >= 20)) {
      skillIds.push(unit.data.uniqueSkill);
    }
    // 장착 스킬
    if (unit.data.equippedSkills) skillIds.push(...unit.data.equippedSkills);

    const enemySide = unit.side === 'player' ? 'enemy' : 'player';
    const allies = allUnits.filter(u => u.side === unit.side && u.alive);
    const enemies = allUnits.filter(u => u.side === enemySide && u.alive);

    for (const skillId of skillIds) {
      const skill = SKILL_DEFS[skillId];
      if (!skill) continue;
      if (skill.mpCost > unit.mp) continue;
      if ((unit.skillCooldowns[skillId] ?? 0) > 0) continue;

      // 힐 스킬: 아군 HP 50% 이하가 있으면 사용
      if (skill.effectType === SkillEffectType.HEAL) {
        const wounded = allies.filter(u => u.hp < u.maxHp * 0.5).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        if (wounded.length > 0) {
          const healAmount = Math.floor(skill.power + unit.spirit * 0.5);
          unit.mp -= skill.mpCost;
          unit.skillCooldowns[skillId] = skill.cooldown;
          return { target: wounded[0], skillName: skill.name, value: healAmount, type: 'heal' };
        }
      }

      // 데미지 스킬: 적에게 사용
      if (skill.effectType === SkillEffectType.DAMAGE && enemies.length > 0) {
        const targets = this.getValidTargets(unit, allUnits);
        if (targets.length === 0) continue;
        const target = targets.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
        // 병종에 따라 공격력/정신력 기반 결정
        const cls = unit.data.unitClass ?? 'infantry';
        const isMagic = cls === 'strategist';
        const atkStat = isMagic ? unit.spirit : unit.attack;
        const defStat = isMagic ? (target.data.stats.spirit ?? 10) : target.defense;
        const skillDamage = Math.floor(skill.power + atkStat * 0.8 - defStat * 0.3);
        const finalDamage = Math.max(1, skillDamage);
        unit.mp -= skill.mpCost;
        unit.skillCooldowns[skillId] = skill.cooldown;
        return { target, skillName: skill.name, value: finalDamage, type: 'damage' };
      }

      // 버프/디버프: 데미지로 처리 (간략화)
      if (skill.effectType === SkillEffectType.BUFF && allies.length > 0) {
        // 버프는 자신에게 적용 (HP 회복으로 간략화)
        const healAmount = Math.floor(skill.power * 0.5 + unit.spirit * 0.3);
        if (healAmount > 0) {
          unit.mp -= skill.mpCost;
          unit.skillCooldowns[skillId] = skill.cooldown;
          return { target: unit, skillName: skill.name, value: healAmount, type: 'heal' };
        }
      }

      if (skill.effectType === SkillEffectType.DEBUFF && enemies.length > 0) {
        const targets = this.getValidTargets(unit, allUnits);
        if (targets.length === 0) continue;
        const target = targets[0];
        const cls = unit.data.unitClass ?? 'infantry';
        const isMagic = cls === 'strategist';
        const debufDmg = Math.max(1, Math.floor(skill.power + (isMagic ? unit.spirit : unit.attack) * 0.5));
        unit.mp -= skill.mpCost;
        unit.skillCooldowns[skillId] = skill.cooldown;
        return { target, skillName: skill.name, value: debufDmg, type: 'damage' };
      }
    }

    return null;
  }

  /** 전열 보호: 전열(col=2)이 살아있으면 중열/후열 공격 불가 */
  private getValidTargets(attacker: ArenaUnit, allUnits: ArenaUnit[]): ArenaUnit[] {
    const enemySide = attacker.side === 'player' ? 'enemy' : 'player';
    const enemies = allUnits.filter(u => u.side === enemySide && u.alive);
    if (enemies.length === 0) return [];

    // 궁병/책사는 모든 열 공격 가능
    const atkClass = attacker.data.unitClass ?? 'infantry';
    if (atkClass === 'archer' || atkClass === 'strategist') {
      return enemies;
    }

    // 전열(col=2)에 살아있는 유닛이 있으면 전열만 공격 가능
    const frontCol = enemies.filter(u => u.col === 2);
    if (frontCol.length > 0) return frontCol;

    // 중열(col=1) 체크
    const midCol = enemies.filter(u => u.col === 1);
    if (midCol.length > 0) return midCol;

    return enemies;
  }

  private executeBattleTurns(
    turnText: Phaser.GameObjects.Text,
    logTexts: Phaser.GameObjects.Text[],
    orderIcons?: Phaser.GameObjects.Graphics[],
    orderLabels?: Phaser.GameObjects.Text[],
  ): void {
    let turnCount = 0;
    const maxTurns = 30;
    const recentLogs: string[] = [];

    const addLog = (msg: string) => {
      recentLogs.push(msg);
      this.battleLog.push(msg);
      // 최근 5개만 표시
      const show = recentLogs.slice(-5);
      for (let i = 0; i < logTexts.length; i++) {
        logTexts[i].setText(show[i] ?? '');
      }
    };

    const showDamagePopup = (unit: ArenaUnit, damage: number, color: string = '#ff4444') => {
      if (!unit.sprite) return;
      const dmgText = this.add.text(unit.sprite.x, unit.sprite.y - 25, `-${damage}`, {
        fontSize: '14px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({
        targets: dmgText, y: dmgText.y - 30, alpha: 0, duration: 800,
        onComplete: () => dmgText.destroy(),
      });
    };

    const showLabel = (unit: ArenaUnit, text: string, color: string) => {
      if (!unit.sprite) return;
      const label = this.add.text(unit.sprite.x, unit.sprite.y - 35, text, {
        fontSize: '12px', color, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({
        targets: label, y: label.y - 15, alpha: 0, duration: 600,
        onComplete: () => label.destroy(),
      });
    };

    const shakeUnit = (unit: ArenaUnit) => {
      if (!unit.sprite) return;
      const origX = unit.sprite.x;
      this.tweens.add({
        targets: unit.sprite, x: origX + 4, duration: 40, yoyo: true, repeat: 3,
        onComplete: () => { if (unit.sprite) unit.sprite.x = origX; },
      });
    };

    const attackAnim = (attacker: ArenaUnit, target: ArenaUnit) => {
      if (!attacker.sprite || !target.sprite) return;
      const origX = attacker.sprite.x;
      const origY = attacker.sprite.y;
      const dx = target.sprite.x > attacker.sprite.x ? 35 : -35;
      const dy = (target.sprite.y - attacker.sprite.y) * 0.15;
      // Dash toward target
      this.tweens.add({
        targets: attacker.sprite,
        x: origX + dx,
        y: origY + dy,
        duration: 120 / this.battleSpeed,
        ease: 'Quad.easeIn',
        onComplete: () => {
          // Screen shake on impact
          this.cameras.main.shake(100 / this.battleSpeed, 0.008);
          // White flash on target
          if (target.sprite) {
            const flash = this.add.graphics();
            flash.fillStyle(0xffffff, 0.7);
            flash.fillCircle(target.sprite.x, target.sprite.y - 4, 26);
            flash.setDepth(150);
            this.tweens.add({
              targets: flash, alpha: 0, duration: 100 / this.battleSpeed,
              onComplete: () => flash.destroy(),
            });
          }
          // Return to original position
          this.tweens.add({
            targets: attacker.sprite,
            x: origX,
            y: origY,
            duration: 150 / this.battleSpeed,
            ease: 'Quad.easeOut',
          });
        },
      });
    };

    const portraitR = 22;
    const updateHpBars = () => {
      for (const unit of this.battleUnits) {
        if (!unit.sprite) continue;
        const len = unit.sprite.length;
        // HP 바 = 끝에서 3번째, MP 바 = 끝에서 1번째
        const hpBar = unit.sprite.getAt(len - 3) as Phaser.GameObjects.Graphics;
        const mpBar = unit.sprite.getAt(len - 1) as Phaser.GameObjects.Graphics;
        hpBar.clear();
        mpBar.clear();
        if (unit.alive) {
          const hpRatio = unit.hp / unit.maxHp;
          const hpColor = hpRatio > 0.5 ? 0x00ff00 : hpRatio > 0.25 ? 0xffff00 : 0xff0000;
          hpBar.fillStyle(hpColor, 1).fillRoundedRect(-22, portraitR + 14, 44 * hpRatio, 5, 2);
          const mpRatio = unit.mp / Math.max(1, unit.maxMp);
          mpBar.fillStyle(0x4488ff, 1).fillRoundedRect(-22, portraitR + 20, 44 * mpRatio, 3, 1);
        }
        if (!unit.alive && unit.sprite.alpha > 0.15) {
          // Death animation: rotate, fade, red flash
          const deathX = unit.sprite.x;
          const deathY = unit.sprite.y;
          this.tweens.add({
            targets: unit.sprite,
            angle: 15,
            alpha: 0,
            duration: 500 / this.battleSpeed,
            ease: 'Sine.easeIn',
          });
          const deathFlash = this.add.graphics();
          deathFlash.fillStyle(0xff0000, 0.5);
          deathFlash.fillCircle(deathX, deathY, 20);
          deathFlash.setDepth(120);
          this.tweens.add({
            targets: deathFlash, alpha: 0, duration: 400 / this.battleSpeed,
            onComplete: () => deathFlash.destroy(),
          });
        }
      }
    };

    const doTurn = () => {
      if (turnCount >= maxTurns) { this.endBattle('timeout'); return; }

      const alive = this.battleUnits.filter(u => u.alive);
      const players = alive.filter(u => u.side === 'player');
      const enemies = alive.filter(u => u.side === 'enemy');

      if (players.length === 0) { this.endBattle('lose'); return; }
      if (enemies.length === 0) { this.endBattle('win'); return; }

      turnCount++;
      turnText.setText(`턴 ${turnCount}`);

      // ── Turn number center announcement ──
      const turnAnnounce = this.add.text(GW / 2, GH / 2 - 60, `턴 ${turnCount}`, {
        fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(180).setAlpha(0);
      this.tweens.add({
        targets: turnAnnounce, alpha: 1, duration: 150,
        onComplete: () => {
          this.time.delayedCall(350 / this.battleSpeed, () => {
            this.tweens.add({
              targets: turnAnnounce, alpha: 0, y: turnAnnounce.y - 15, duration: 200,
              onComplete: () => turnAnnounce.destroy(),
            });
          });
        },
      });

      // ── Update action order bar ──
      const turnAlive = this.battleUnits.filter(u => u.alive);
      const turnSorted = [...turnAlive].sort((a, b) => b.speed - a.speed);
      if (orderIcons && orderLabels) {
        // Clear old icons
        for (const ic of orderIcons) ic.destroy();
        for (const lb of orderLabels) lb.destroy();
        orderIcons.length = 0;
        orderLabels.length = 0;
        const oBarY = 34;
        const oSize = 16;
        const oStartX = GW / 2 - (turnSorted.length * (oSize + 4)) / 2;
        for (let i = 0; i < turnSorted.length; i++) {
          const u = turnSorted[i];
          const ox = oStartX + i * (oSize + 4) + oSize / 2;
          const circle = this.add.graphics();
          circle.fillStyle(u.side === 'player' ? 0x2244aa : 0xaa2222, 1);
          circle.fillCircle(ox, oBarY, oSize / 2);
          circle.lineStyle(1, 0xffffff, 0.5);
          circle.strokeCircle(ox, oBarY, oSize / 2);
          circle.setDepth(60);
          orderIcons.push(circle);
          const label = this.add.text(ox, oBarY, u.data.name.charAt(0), {
            fontSize: '9px', color: '#ffffff', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(61);
          orderLabels.push(label);
        }
      }

      // 쿨다운 감소
      for (const u of alive) {
        for (const key of Object.keys(u.skillCooldowns)) {
          if (u.skillCooldowns[key] > 0) u.skillCooldowns[key]--;
        }
      }

      // 속도순 + 랜덤 보정
      const sorted = [...alive].sort((a, b) => (b.speed + Math.random() * 2) - (a.speed + Math.random() * 2));

      let actionIdx = 0;
      const doAction = () => {
        if (actionIdx >= sorted.length) {
          // 턴 끝, 승패 체크
          updateHpBars();
          const p = this.battleUnits.filter(u => u.side === 'player' && u.alive);
          const e = this.battleUnits.filter(u => u.side === 'enemy' && u.alive);
          if (p.length === 0) { this.time.delayedCall(300, () => this.endBattle('lose')); return; }
          if (e.length === 0) { this.time.delayedCall(300, () => this.endBattle('win')); return; }
          this.time.delayedCall(800 / this.battleSpeed, doTurn);
          return;
        }

        const unit = sorted[actionIdx];
        actionIdx++;
        if (!unit.alive) { doAction(); return; }

        // Highlight current acting unit in order bar
        if (orderIcons && orderLabels) {
          const turnSortedNow = [...this.battleUnits.filter(u => u.alive)].sort((a, b) => b.speed - a.speed);
          const idx = turnSortedNow.indexOf(unit);
          if (idx >= 0 && idx < orderIcons.length) {
            // Reset all
            for (let oi = 0; oi < orderIcons.length; oi++) {
              orderIcons[oi].setAlpha(0.5);
            }
            orderIcons[idx].setAlpha(1.0);
            // Add glow ring
            const oBarY = 34;
            const oSize = 16;
            const oStartX = GW / 2 - (turnSortedNow.length * (oSize + 4)) / 2;
            const glowX = oStartX + idx * (oSize + 4) + oSize / 2;
            const glow = this.add.graphics();
            glow.lineStyle(2, 0xffd700, 1);
            glow.strokeCircle(glowX, oBarY, oSize / 2 + 2);
            glow.setDepth(62);
            this.time.delayedCall(800 / this.battleSpeed, () => glow.destroy());
          }
        }

        // 스킬 사용 시도
        const skillResult = this.tryUseSkill(unit, this.battleUnits);
        if (skillResult) {
          // ── Skill cut-in effect ──
          const skillOverlay = this.add.graphics();
          skillOverlay.fillStyle(0x000000, 0.3);
          skillOverlay.fillRect(0, 0, GW, GH);
          skillOverlay.setDepth(190);

          const skillNameText = this.add.text(GW / 2, GH / 2 - 40, skillResult.skillName, {
            fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4,
          }).setOrigin(0.5).setDepth(191).setScale(0.5);

          this.tweens.add({
            targets: skillNameText, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut',
          });

          this.time.delayedCall(300 / this.battleSpeed, () => {
            this.tweens.add({
              targets: [skillOverlay, skillNameText], alpha: 0, duration: 200,
              onComplete: () => { skillOverlay.destroy(); skillNameText.destroy(); },
            });

            attackAnim(unit, skillResult.target);
            this.time.delayedCall(400 / this.battleSpeed, () => {
              showLabel(unit, `${skillResult.skillName}`, '#cc88ff');

              if (skillResult.type === 'heal') {
                const healAmount = skillResult.value;
                skillResult.target.hp = Math.min(skillResult.target.maxHp, skillResult.target.hp + healAmount);
                showDamagePopup(skillResult.target, healAmount, '#44ff44');
                addLog(`${unit.data.name} → ${skillResult.target.data.name} 회복 +${healAmount} (${skillResult.skillName})`);
                // Green rising particles for heal
                if (skillResult.target.sprite) {
                  for (let p = 0; p < 6; p++) {
                    const px = skillResult.target.sprite.x + (Math.random() - 0.5) * 30;
                    const py = skillResult.target.sprite.y + 10;
                    const particle = this.add.graphics();
                    particle.fillStyle(0x44ff44, 0.8);
                    particle.fillCircle(0, 0, 3);
                    particle.setPosition(px, py).setDepth(130);
                    this.tweens.add({
                      targets: particle, y: py - 40 - Math.random() * 20, alpha: 0,
                      duration: 600 / this.battleSpeed, delay: p * 50,
                      onComplete: () => particle.destroy(),
                    });
                  }
                }
              } else {
                skillResult.target.hp -= skillResult.value;
                showDamagePopup(skillResult.target, skillResult.value, '#cc44ff');
                shakeUnit(skillResult.target);
                // Red particles/flash for damage skills
                if (skillResult.target.sprite) {
                  for (let p = 0; p < 8; p++) {
                    const px = skillResult.target.sprite.x + (Math.random() - 0.5) * 30;
                    const py = skillResult.target.sprite.y + (Math.random() - 0.5) * 20;
                    const particle = this.add.graphics();
                    particle.fillStyle(0xff2222, 0.8);
                    particle.fillCircle(0, 0, 2 + Math.random() * 2);
                    particle.setPosition(px, py).setDepth(130);
                    this.tweens.add({
                      targets: particle,
                      x: px + (Math.random() - 0.5) * 40,
                      y: py + (Math.random() - 0.5) * 40,
                      alpha: 0,
                      duration: 400 / this.battleSpeed,
                      delay: p * 30,
                      onComplete: () => particle.destroy(),
                    });
                  }
                }
                let logMsg = `${unit.data.name} → ${skillResult.target.data.name} (${skillResult.value} ${skillResult.skillName})`;
                if (skillResult.target.hp <= 0) {
                  skillResult.target.hp = 0;
                  skillResult.target.alive = false;
                  logMsg += ' 격파!';
                }
                addLog(logMsg);
              }

              updateHpBars();
              this.time.delayedCall(600 / this.battleSpeed, doAction);
            });
          });
          return;
        }

        const targets = this.getValidTargets(unit, this.battleUnits);
        if (targets.length === 0) { doAction(); return; }

        // 타겟 선택: HP 비율 낮은 적 우선
        const target = targets.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

        // 상성 체크
        const atkClass = unit.data.unitClass ?? 'infantry';
        const defClass = target.data.unitClass ?? 'infantry';
        const typeBonus = this.getTypeBonus(atkClass, defClass);

        // 명중 판정
        const atkAgi = unit.data.stats.agility ?? 20;
        const defAgi = target.data.stats.agility ?? 20;
        const hitRate = Math.min(99, Math.max(30, 90 + (atkAgi - defAgi) * 2));
        const missed = Math.random() * 100 >= hitRate;

        // 크리티컬 판정
        const critRate = (unit.data.stats.critical ?? 20) / 200;
        const isCrit = !missed && Math.random() < critRate;
        const hpRatio = unit.hp / unit.maxHp;
        const moraleBonus = (unit.data.stats.morale ?? 25) * 0.5;
        const lowHpBonus = hpRatio < 0.3 ? 30 : hpRatio < 0.5 ? 15 : 0;
        const critMult = isCrit ? (150 + moraleBonus + lowHpBonus) / 100 : 1.0;

        // 관통
        const pen = (unit.data.stats.penetration ?? 0) / 100;
        const effDef = target.defense * (1 - pen);

        // 2회 공격 판정
        const spdRatio = unit.speed / Math.max(1, target.speed);
        const isDouble = spdRatio >= 2 ? Math.random() < 0.6 : spdRatio >= 1.5 ? Math.random() < 0.3 : false;

        // 데미지 계산
        const rawDmg = unit.attack - effDef * 0.5 + Math.floor(Math.random() * 8);
        let damage = missed ? 0 : Math.max(1, Math.floor(rawDmg * typeBonus.mult * critMult));
        if (isDouble && !missed) damage = Math.floor(damage * 1.5);

        // 애니메이션
        attackAnim(unit, target);

        this.time.delayedCall(400 / this.battleSpeed, () => {
          if (missed) {
            showLabel(target, 'MISS', '#888888');
            addLog(`${unit.data.name} → ${target.data.name} (빗나감!)`);
            this.time.delayedCall(500 / this.battleSpeed, doAction);
            return;
          }

          target.hp -= damage;
          showDamagePopup(target, damage, isCrit ? '#ffaa00' : '#ff4444');
          shakeUnit(target);

          if (isCrit) showLabel(unit, '크리티컬!', '#ffaa00');
          if (isDouble) showLabel(unit, '2회 공격!', '#44aaff');
          if (typeBonus.label) {
            showLabel(unit, typeBonus.label, typeBonus.mult > 1 ? '#44ff44' : '#ff6666');
          }

          let logMsg = `${unit.data.name} → ${target.data.name} (${damage}${isCrit ? ' 크리!' : ''}${isDouble ? ' 2연격' : ''})`;

          if (target.hp <= 0) {
            target.hp = 0;
            target.alive = false;
            logMsg += ' 격파!';
          }

          addLog(logMsg);
          updateHpBars();

          this.time.delayedCall(500 / this.battleSpeed, doAction);
        });
      };

      doAction();
    };

    this.time.delayedCall(800, doTurn);
  }

  private endBattle(result: 'win' | 'lose' | 'timeout'): void {
    // result phase
    this.ticketsUsed++;
    const won = result === 'win';
    const eloChange = calculateEloChange(this.playerElo, this.playerElo, won); // 상대 ELO는 동급으로 가정
    this.playerElo = Math.max(0, this.playerElo + eloChange);
    if (won) this.pvpWins++;
    else this.pvpLosses++;

    // 서버에 결과 기록
    pvpRecordResult(0, won).catch(() => {});

    this.campaignManager.incrementMission('battle_3');
    this.campaignManager.incrementMission('pvp_1');

    this.children.removeAll();
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    // Camera flash on victory
    if (won) {
      this.cameras.main.flash(500, 255, 215, 0);
    } else {
      this.cameras.main.flash(300, 180, 40, 40);
    }

    const resultText = result === 'win' ? '승리!' : result === 'lose' ? '패배...' : '시간 초과';
    const resultColor = result === 'win' ? '#ffd700' : '#ff4444';

    const resultLabel = this.add.text(GW / 2, GH * 0.12, resultText, {
      fontSize: '42px', color: resultColor, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setScale(0.5);

    // Result text scale-in animation
    this.tweens.add({
      targets: resultLabel, scaleX: 1, scaleY: 1, duration: 400, ease: 'Back.easeOut',
    });

    // Particle effects (gold sparkles for win, red for loss)
    const particleColor = won ? 0xffd700 : 0xff4444;
    for (let i = 0; i < 20; i++) {
      const px = GW / 2 + (Math.random() - 0.5) * GW * 0.8;
      const py = GH * 0.12 + (Math.random() - 0.5) * 60;
      const sparkle = this.add.graphics();
      sparkle.fillStyle(particleColor, 0.9);
      sparkle.fillCircle(0, 0, 2 + Math.random() * 3);
      sparkle.setPosition(px, py).setAlpha(0);
      this.tweens.add({
        targets: sparkle,
        alpha: 1,
        y: py - 30 - Math.random() * 40,
        x: px + (Math.random() - 0.5) * 30,
        duration: 800 + Math.random() * 600,
        delay: i * 60,
        onComplete: () => {
          this.tweens.add({
            targets: sparkle, alpha: 0, duration: 400,
            onComplete: () => sparkle.destroy(),
          });
        },
      });
    }

    // ELO 변동
    const eloText = eloChange >= 0 ? `+${eloChange}` : `${eloChange}`;
    const eloColor = eloChange >= 0 ? '#44ff44' : '#ff4444';
    this.add.text(GW / 2, GH * 0.22, `ELO: ${this.playerElo} (${eloText})`, {
      fontSize: '18px', color: eloColor,
    }).setOrigin(0.5);

    // 티어
    const tier = getTier(this.playerElo);
    this.add.text(GW / 2, GH * 0.30, `${tier.icon} ${tier.name}`, {
      fontSize: '20px', color: tier.color, fontStyle: 'bold',
    }).setOrigin(0.5);

    // 보상
    if (won) {
      const gold = 300 + Math.floor(Math.random() * 300);
      const progress = this.campaignManager.getProgress();
      progress.gold += gold; // optimistic UI update
      addGold(gold, 'pvp:victory_reward').catch(() => {}); // server sync
      this.campaignManager.save();

      this.add.text(GW / 2, GH * 0.38, `💰 금화 +${gold}`, {
        fontSize: '16px', color: '#ffaa00',
      }).setOrigin(0.5);
    }

    // 전적
    this.add.text(GW / 2, GH * 0.45, `전적: ${this.pvpWins}승 ${this.pvpLosses}패  |  티켓: ${DAILY_PVP_TICKETS - this.ticketsUsed}/${DAILY_PVP_TICKETS}`, {
      fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);

    // 전투 로그
    const logY = GH * 0.52;
    this.add.text(GW / 2, logY, '── 전투 기록 ──', {
      fontSize: '13px', color: '#666666',
    }).setOrigin(0.5);

    const lastLogs = this.battleLog.slice(-6);
    for (let i = 0; i < lastLogs.length; i++) {
      this.add.text(GW / 2, logY + 18 + i * 16, lastLogs[i], {
        fontSize: '12px', color: '#888888',
      }).setOrigin(0.5);
    }

    // 버튼
    const remainTickets = DAILY_PVP_TICKETS - this.ticketsUsed;

    if (remainTickets > 0) {
      const retryBtn = this.add.text(GW / 2 - 70, GH - 45, '다시 도전', {
        fontSize: '16px', color: '#ffffff', backgroundColor: '#aa3333', padding: { x: 16, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      retryBtn.on('pointerdown', () => {
        this.playerSlots = Array(GRID_COLS * GRID_ROWS).fill(null);
        this.deployedCount = 0;
        this.showDeployPhase();
      });
    }

    const homeBtn = this.add.text(GW / 2 + 70, GH - 45, '아레나 홈', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#2a2a4a', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    homeBtn.on('pointerdown', () => this.showArenaHome());
  }
}
