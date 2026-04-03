import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@shared/constants.ts';
import type { UnitData } from '@shared/types/index.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import { FORMATIONS, isFormationReady, isPatternSlot, getFirstEmptyPatternSlot } from '@shared/data/formationDefs.ts';
import type { FormationDef } from '@shared/data/formationDefs.ts';
import { getGradeColor } from '@shared/data/gachaDefs.ts';
import type { HeroGrade } from '@shared/data/gachaDefs.ts';

const GW = GAME_WIDTH;
const GH = GAME_HEIGHT;

export interface DeploymentConfig {
  mode: 'pvp' | 'dungeon';
  campaignManager: CampaignManager;
  onBack: () => void;
  onStartBattle: (formationId: string | null, slots: (UnitData | null)[]) => void;
  title: string;
  subtitle?: string;
}

export class DeploymentUI {
  private scene: Phaser.Scene;
  private config: DeploymentConfig;
  private selectedFormation: FormationDef;
  private playerSlots: (UnitData | null)[] = Array(9).fill(null);
  private deployedCount = 0;
  private heroPage = 0;
  private readonly HEROES_PER_PAGE = 8; // 4 columns x 2 rows

  constructor(scene: Phaser.Scene, config: DeploymentConfig) {
    this.scene = scene;
    this.config = config;

    // Restore last formation
    const progress = config.campaignManager.getProgress();
    const lastSetup = progress.lastFormation?.[config.mode];
    if (lastSetup) {
      this.selectedFormation = FORMATIONS.find(f => f.id === lastSetup.formationId) ?? FORMATIONS[0];
      // Restore unit placements
      const allUnits = progress.playerUnits;
      for (let i = 0; i < 9; i++) {
        const uid = lastSetup.unitIds?.[i];
        if (uid) {
          const unit = allUnits.find(u => u.id === uid);
          if (unit) {
            this.playerSlots[i] = unit;
            this.deployedCount++;
          }
        }
      }
    } else {
      this.selectedFormation = FORMATIONS[0];
    }

    this.render();
  }

  private saveLastFormation(): void {
    const progress = this.config.campaignManager.getProgress();
    if (!progress.lastFormation) progress.lastFormation = {};
    progress.lastFormation[this.config.mode] = {
      formationId: this.selectedFormation.id,
      unitIds: this.playerSlots.map(u => u?.id ?? null),
    };
    this.config.campaignManager.save();
  }

  private render(): void {
    this.scene.children.removeAll();

    // 1. Background gradient
    const bg = this.scene.add.graphics();
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(8 + t * 6);
      const g = Math.round(8 + t * 14);
      const b = Math.round(16 + t * 12);
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, Math.round((GH / steps) * i), GW, Math.ceil(GH / steps) + 1);
    }

    // 2. Title
    this.scene.add.text(GW / 2, 20, this.config.title, {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Gold line
    bg.fillStyle(0xffd700, 0.4);
    bg.fillRect(20, 42, GW - 40, 1);

    // Back button
    const backBtn = this.scene.add.text(16, 14, '\u2190 \uB4A4\uB85C', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', this.config.onBack);

    // Subtitle
    if (this.config.subtitle) {
      this.scene.add.text(GW / 2, 52, this.config.subtitle, {
        fontSize: '13px', color: '#aaaaaa',
      }).setOrigin(0.5);
    }

    // 3. Formation selector (horizontal bar)
    const formY = 65;
    const formBtnW = (GW - 30) / FORMATIONS.length;
    for (let i = 0; i < FORMATIONS.length; i++) {
      const f = FORMATIONS[i];
      const x = 10 + i * (formBtnW + 2);
      const isSelected = f.id === this.selectedFormation.id;

      const fbg = this.scene.add.graphics();
      fbg.fillStyle(isSelected ? 0x2a3a2a : 0x1a1a2e, 1);
      fbg.fillRoundedRect(x, formY, formBtnW - 2, 38, 4);
      if (isSelected) {
        fbg.lineStyle(2, 0xffd700, 1);
        fbg.strokeRoundedRect(x, formY, formBtnW - 2, 38, 4);
      }

      this.scene.add.text(x + (formBtnW - 2) / 2, formY + 10, f.icon, {
        fontSize: '16px',
      }).setOrigin(0.5);
      this.scene.add.text(x + (formBtnW - 2) / 2, formY + 28, f.name.split('(')[0], {
        fontSize: '9px', color: isSelected ? '#ffd700' : '#666666',
      }).setOrigin(0.5);

      const hit = this.scene.add.rectangle(x + (formBtnW - 2) / 2, formY + 19, formBtnW - 2, 38, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        // Switch formation, clear slots that don't match new pattern
        this.selectedFormation = f;
        for (let s = 0; s < 9; s++) {
          const row = Math.floor(s / 3);
          const col = s % 3;
          if (!isPatternSlot(f, row, col) && this.playerSlots[s]) {
            this.playerSlots[s] = null;
            this.deployedCount--;
          }
        }
        this.render();
      });
    }

    // Formation description
    this.scene.add.text(GW / 2, formY + 44, this.selectedFormation.description, {
      fontSize: '12px', color: '#88ccff',
    }).setOrigin(0.5);

    // 4. 3x3 Grid (top-bottom: row0=front, row2=rear)
    const gridY = formY + 60;
    const cellW = 90;
    const cellH = 72;
    const gridX = (GW - 3 * cellW) / 2;

    // Row labels
    const rowLabels = ['\uC804\uC5F4', '\uC911\uC5F4', '\uD6C4\uC5F4'];
    for (let r = 0; r < 3; r++) {
      this.scene.add.text(gridX - 8, gridY + r * cellH + cellH / 2, rowLabels[r], {
        fontSize: '10px', color: '#446688',
      }).setOrigin(1, 0.5);
    }

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const x = gridX + c * cellW;
        const y = gridY + r * cellH;
        const isPattern = isPatternSlot(this.selectedFormation, r, c);
        const unit = this.playerSlots[idx];

        const cellBg = this.scene.add.graphics();
        if (unit) {
          cellBg.fillStyle(0x1a3a4a, 1);
          cellBg.fillRoundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 6);
          cellBg.lineStyle(1.5, 0x4488aa, 1);
          cellBg.strokeRoundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 6);

          // Show unit sprite
          this.renderUnitInCell(unit, x + cellW / 2, y + cellH / 2 - 6);

          // Unit name
          this.scene.add.text(x + cellW / 2, y + cellH - 10, unit.name, {
            fontSize: '10px', color: '#ffffff',
          }).setOrigin(0.5);

          // Remove button
          const removeBtn = this.scene.add.text(x + cellW - 10, y + 6, '\u2715', {
            fontSize: '14px', color: '#ff6666',
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          removeBtn.on('pointerdown', () => {
            this.playerSlots[idx] = null;
            this.deployedCount--;
            this.render();
          });
        } else if (isPattern) {
          cellBg.fillStyle(0x1a2a1a, 0.8);
          cellBg.fillRoundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 6);
          cellBg.lineStyle(1, 0x44aa44, 0.5);
          cellBg.strokeRoundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 6);
          this.scene.add.text(x + cellW / 2, y + cellH / 2, '\uBC30\uCE58', {
            fontSize: '13px', color: '#44aa44',
          }).setOrigin(0.5);
        } else {
          cellBg.fillStyle(0x111118, 0.5);
          cellBg.fillRoundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 6);
          this.scene.add.text(x + cellW / 2, y + cellH / 2, '\u2715', {
            fontSize: '14px', color: '#333333',
          }).setOrigin(0.5);
        }
      }
    }

    // 5. Hero selection grid (sprite thumbnails)
    const heroY = gridY + 3 * cellH + 10;
    this.scene.add.text(GW / 2, heroY, '\u2500\u2500 \uC7A5\uC218 \uC120\uD0DD \u2500\u2500', {
      fontSize: '14px', color: '#88aacc', fontStyle: 'bold',
    }).setOrigin(0.5);

    const allUnits = this.config.campaignManager.getProgress().playerUnits;
    const deployedIds = new Set(this.playerSlots.filter(Boolean).map(u => u!.id));
    const available = allUnits.filter(u => !deployedIds.has(u.id));

    const heroGridY = heroY + 22;
    const heroCellW = 88;
    const heroCellH = 80;
    const heroCols = 4;
    const startIdx = this.heroPage * this.HEROES_PER_PAGE;
    const pageHeroes = available.slice(startIdx, startIdx + this.HEROES_PER_PAGE);
    const totalPages = Math.ceil(available.length / this.HEROES_PER_PAGE);

    for (let i = 0; i < pageHeroes.length; i++) {
      const unit = pageHeroes[i];
      const col = i % heroCols;
      const row = Math.floor(i / heroCols);
      const hx = (GW - heroCols * heroCellW) / 2 + col * heroCellW + heroCellW / 2;
      const hy = heroGridY + row * heroCellH + heroCellH / 2;

      // Hero card background
      const grade = unit.grade ?? 'N';
      const gradeColor = getGradeColor(grade as HeroGrade);
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(0x1a1a2e, 1);
      cardBg.fillRoundedRect(hx - heroCellW / 2 + 4, hy - heroCellH / 2 + 2, heroCellW - 8, heroCellH - 4, 6);
      cardBg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(gradeColor).color, 0.8);
      cardBg.strokeRoundedRect(hx - heroCellW / 2 + 4, hy - heroCellH / 2 + 2, heroCellW - 8, heroCellH - 4, 6);

      // Hero sprite
      this.renderUnitInCell(unit, hx, hy - 10);

      // Grade badge
      this.scene.add.text(hx - heroCellW / 2 + 10, hy - heroCellH / 2 + 6, `[${grade}]`, {
        fontSize: '9px', color: gradeColor, fontStyle: 'bold',
      });

      // Name
      this.scene.add.text(hx, hy + 24, unit.name, {
        fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      // Tap to auto-place
      const hitArea = this.scene.add.rectangle(hx, hy, heroCellW - 8, heroCellH - 4, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        const emptySlot = getFirstEmptyPatternSlot(this.selectedFormation, this.playerSlots);
        if (emptySlot >= 0) {
          this.playerSlots[emptySlot] = unit;
          this.deployedCount++;
          this.render();
        }
      });
    }

    // Pagination
    if (totalPages > 1) {
      const pagY = heroGridY + 2 * heroCellH + 4;
      this.scene.add.text(GW / 2, pagY, `${this.heroPage + 1} / ${totalPages}`, {
        fontSize: '12px', color: '#888888',
      }).setOrigin(0.5);

      if (this.heroPage > 0) {
        const prevBtn = this.scene.add.text(GW / 2 - 60, pagY, '\u25C0 \uC774\uC804', {
          fontSize: '13px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 8, y: 4 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        prevBtn.on('pointerdown', () => { this.heroPage--; this.render(); });
      }
      if (this.heroPage < totalPages - 1) {
        const nextBtn = this.scene.add.text(GW / 2 + 60, pagY, '\uB2E4\uC74C \u25B6', {
          fontSize: '13px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 8, y: 4 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        nextBtn.on('pointerdown', () => { this.heroPage++; this.render(); });
      }
    }

    // 6. Start button
    const canStart = isFormationReady(this.selectedFormation, this.playerSlots);
    const btnY = GH - 60;
    const btnG = this.scene.add.graphics();
    btnG.fillStyle(canStart ? 0xaa3333 : 0x333333, 1);
    btnG.fillRoundedRect(20, btnY, GW - 40, 50, 8);
    btnG.lineStyle(2, canStart ? 0xffd700 : 0x555555, 0.6);
    btnG.strokeRoundedRect(20, btnY, GW - 40, 50, 8);

    const btnText = canStart
      ? '\u2694\uFE0F \uC804\uD22C \uC2DC\uC791'
      : `4\uBA85 \uC774\uC0C1 \uBC30\uCE58\uD558\uC138\uC694 (${this.deployedCount}/5)`;
    this.scene.add.text(GW / 2, btnY + 25, btnText, {
      fontSize: canStart ? '20px' : '16px', color: canStart ? '#ffffff' : '#ff8888', fontStyle: 'bold',
    }).setOrigin(0.5);

    if (canStart) {
      this.scene.add.rectangle(GW / 2, btnY + 25, GW - 40, 50, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.saveLastFormation();
          this.config.onStartBattle(this.selectedFormation.id, this.playerSlots);
        });
    }
  }

  /** Render a unit sprite in a cell */
  private renderUnitInCell(unit: UnitData, cx: number, cy: number): void {
    // Try PixelLab rotation image first
    const heroKeys: Record<string, string> = { p1: 'pl_lubu', p2: 'pl_zhangliao' };
    const heroKey = heroKeys[unit.id];
    let texKey: string | null = null;

    if (heroKey) {
      const k = `${heroKey}_rotation_south`;
      if (this.scene.textures.exists(k)) texKey = k;
    }
    if (!texKey) {
      const cls = unit.unitClass ?? 'infantry';
      const k = `pl_${cls}_rotation_south`;
      if (this.scene.textures.exists(k)) texKey = k;
    }
    if (!texKey) {
      const cls = unit.unitClass ?? 'infantry';
      const k = `pl_${cls}_idle_south_0`;
      if (this.scene.textures.exists(k)) texKey = k;
    }

    if (texKey) {
      const sprite = this.scene.add.sprite(cx, cy, texKey);
      const tex = this.scene.textures.get(texKey);
      const frame = tex.get(0);
      const scale = 42 / Math.max(frame.width, frame.height);
      sprite.setScale(scale);
    } else {
      const clsIcons: Record<string, string> = {
        cavalry: '\uD83D\uDC0E', infantry: '\uD83D\uDEE1\uFE0F', archer: '\uD83C\uDFF9',
        strategist: '\uD83D\uDCDC', martial_artist: '\uD83D\uDC4A', bandit: '\uD83D\uDDE1\uFE0F',
      };
      this.scene.add.text(cx, cy, clsIcons[unit.unitClass ?? 'infantry'] ?? '\u2694\uFE0F', {
        fontSize: '24px',
      }).setOrigin(0.5);
    }
  }

  getSlots(): (UnitData | null)[] { return this.playerSlots; }
  getFormation(): FormationDef { return this.selectedFormation; }
}
