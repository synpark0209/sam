import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@shared/constants.ts';
import type { UnitData } from '@shared/types/index.ts';
import { SKILL_DEFS } from '@shared/data/skillDefs.ts';
import { SkillEffectType } from '@shared/types/index.ts';
import { getClassSkillId } from '@shared/data/classSkillDefs.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { AudioManager } from '../systems/AudioManager.ts';
import { EQUIPMENT_DEFS } from '@shared/data/equipmentDefs.ts';
import {
  getTodayDungeons, generateReward, MAX_STAMINA, STAMINA_REGEN_MINUTES, DUNGEON_DAILY_LIMIT,
} from '@shared/data/dungeonDefs.ts';
import type { DungeonDef, DungeonDifficulty, DungeonReward } from '@shared/data/dungeonDefs.ts';
import { dungeonComplete } from '../../api/client.ts';
import { FORMATIONS, isFormationComplete } from '@shared/data/formationDefs.ts';
import { DeploymentUI } from '../ui/DeploymentUI.ts';
import { preloadUnitImages, createSpriteSheetAnimations } from '../systems/UnitSpriteManager.ts';

const GW = GAME_WIDTH;
const GH = GAME_HEIGHT;

interface DungeonUnit {
  data: UnitData;
  hp: number; maxHp: number;
  attack: number; defense: number; speed: number; spirit: number;
  alive: boolean; side: 'player' | 'enemy';
  mp: number; maxMp: number;
  skillCooldowns: Record<string, number>;
}

const GRID_COLS = 3;
const GRID_ROWS = 3;

export class DailyDungeonScene extends Phaser.Scene {
  private campaignManager!: CampaignManager;
  private selectedDungeon: DungeonDef | null = null;
  private selectedDifficulty: DungeonDifficulty | null = null;
  private battleUnits: DungeonUnit[] = [];
  private battleSpeed = 1;
  private selectedFormation: string | null = null;
  private playerSlots: (UnitData | null)[] = Array(GRID_COLS * GRID_ROWS).fill(null);
  constructor() {
    super('DailyDungeonScene');
  }

  init(data: { campaignManager: CampaignManager }) {
    this.campaignManager = data.campaignManager;
  }

  preload(): void {
    preloadUnitImages(this);
  }

  create(): void {
    (this.registry.get('audioManager') as AudioManager)?.playBgm('battle');
    createSpriteSheetAnimations(this);
    this.updateStamina();
    this.showDungeonList();
  }

  // ── 스태미나 계산 ──

  private updateStamina(): void {
    const progress = this.campaignManager.getProgress();
    if (!progress.stamina && progress.stamina !== 0) progress.stamina = MAX_STAMINA;
    if (!progress.lastStaminaUpdate) progress.lastStaminaUpdate = Date.now();

    const now = Date.now();
    const elapsed = Math.floor((now - progress.lastStaminaUpdate) / (STAMINA_REGEN_MINUTES * 60 * 1000));
    if (elapsed > 0) {
      progress.stamina = Math.min(MAX_STAMINA, (progress.stamina ?? 0) + elapsed);
      progress.lastStaminaUpdate = now;
    }

    // 일일 리셋
    const today = new Date().toISOString().split('T')[0];
    if (progress.lastDungeonReset !== today) {
      progress.dungeonClears = {};
      progress.lastDungeonReset = today;
    }
  }

  // ── 던전 목록 ──

  private showDungeonList(): void {
    this.children.removeAll();
    const g = this.add.graphics();
    const pad = 20;
    const cardW = GW - pad * 2;

    // 1. Dark gradient background
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(6 + t * 8);
      const green = Math.round(12 + t * 10);
      const b = Math.round(10 + t * 16);
      const color = (r << 16) | (green << 8) | b;
      g.fillStyle(color, 1);
      g.fillRect(0, Math.round((GH / steps) * i), GW, Math.ceil(GH / steps) + 1);
    }

    // 2. Back button
    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('LobbyScene', { campaignManager: this.campaignManager }));

    // 3. Title with decorative gold line
    this.add.text(GW / 2, 24, '일일 던전', {
      fontSize: '22px', color: '#ffd700', fontStyle: 'bold', fontFamily: 'sans-serif',
    }).setOrigin(0.5, 0);
    const lineY = 54;
    g.fillStyle(0xffd700, 0.4);
    g.fillRect(pad, lineY, cardW, 1);
    g.fillStyle(0xffd700, 0.8);
    g.fillRect(GW / 2 - 40, lineY, 80, 2);

    // -- Data --
    const progress = this.campaignManager.getProgress();
    const stamina = progress.stamina ?? MAX_STAMINA;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date().getDay();

    // 4. Stamina card (full width)
    const staminaY = 64;
    const staminaH = 62;
    g.fillStyle(0x1a1a2e, 0.9);
    g.fillRoundedRect(pad, staminaY, cardW, staminaH, 12);
    g.lineStyle(1, 0x334466, 0.5);
    g.strokeRoundedRect(pad, staminaY, cardW, staminaH, 12);

    // Stamina label + day
    this.add.text(pad + 14, staminaY + 10, '⚡ 스태미나', {
      fontSize: '14px', color: '#8899aa', fontFamily: 'sans-serif',
    });
    this.add.text(cardW + pad - 14, staminaY + 10, `${dayNames[today]}요일`, {
      fontSize: '13px', color: '#667788', fontFamily: 'sans-serif',
    }).setOrigin(1, 0);

    // Stamina value
    const staminaColor = stamina > 20 ? '#44ff88' : stamina > 0 ? '#ffaa44' : '#ff4444';
    this.add.text(pad + 14, staminaY + 32, `${stamina} / ${MAX_STAMINA}`, {
      fontSize: '20px', color: staminaColor, fontStyle: 'bold', fontFamily: 'sans-serif',
    });

    // Stamina bar
    const barX = pad + 110;
    const barW = cardW - 124;
    const barH = 14;
    const barY = staminaY + 38;
    g.fillStyle(0x222244, 1);
    g.fillRoundedRect(barX, barY, barW, barH, 7);
    const staminaRatio = Math.min(1, stamina / MAX_STAMINA);
    if (staminaRatio > 0) {
      const barColor = stamina > 20 ? 0x44cc66 : stamina > 0 ? 0xcc8822 : 0xcc3333;
      g.fillStyle(barColor, 1);
      g.fillRoundedRect(barX, barY, Math.max(barW * staminaRatio, 12), barH, 7);
    }

    // 5. Today's dungeons
    const todayDungeons = getTodayDungeons();

    if (todayDungeons.length === 0) {
      const emptyY = staminaY + staminaH + 40;
      g.fillStyle(0x1a1a2e, 0.6);
      g.fillRoundedRect(pad, emptyY, cardW, 80, 12);
      this.add.text(GW / 2, emptyY + 40, '오늘은 열린 던전이 없습니다', {
        fontSize: '16px', color: '#555566', fontFamily: 'sans-serif',
      }).setOrigin(0.5);
      return;
    }

    let curY = staminaY + staminaH + 14;

    for (let i = 0; i < todayDungeons.length; i++) {
      const dungeon = todayDungeons[i];

      // Dungeon card
      const cardH = 54 + dungeon.difficulties.length * 52;
      g.fillStyle(0x14142a, 0.9);
      g.fillRoundedRect(pad, curY, cardW, cardH, 14);
      g.lineStyle(1, 0x334466, 0.5);
      g.strokeRoundedRect(pad, curY, cardW, cardH, 14);

      // Dungeon header bar
      g.fillStyle(0x1e1e40, 1);
      g.fillRoundedRect(pad, curY, cardW, 42, { tl: 14, tr: 14, bl: 0, br: 0 });

      // Dungeon icon + name
      this.add.text(pad + 14, curY + 8, `${dungeon.icon} ${dungeon.name}`, {
        fontSize: '18px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'sans-serif',
      });
      this.add.text(pad + 14, curY + 28, dungeon.description, {
        fontSize: '12px', color: '#667788', fontFamily: 'sans-serif',
      });

      // Difficulty buttons (large, touch-friendly)
      const diffStartY = curY + 48;
      for (let d = 0; d < dungeon.difficulties.length; d++) {
        const diff = dungeon.difficulties[d];
        const key = `${dungeon.id}_${diff.level}`;
        const clears = (progress.dungeonClears ?? {})[key] ?? 0;
        const stars = (progress.dungeonStars ?? {})[key] ?? 0;
        const canPlay = clears < DUNGEON_DAILY_LIMIT && stamina >= diff.stamina;

        const btnY = diffStartY + d * 52;
        const btnH = 48;

        // Button background
        const btnBgColor = canPlay
          ? (d === 0 ? 0x1a3a2a : d === 1 ? 0x2a2a1a : 0x3a1a1a)
          : 0x181822;
        const btnBorderColor = canPlay
          ? (d === 0 ? 0x44aa66 : d === 1 ? 0xaaaa44 : 0xaa4444)
          : 0x2a2a33;
        g.fillStyle(btnBgColor, 1);
        g.fillRoundedRect(pad + 8, btnY, cardW - 16, btnH, 10);
        g.lineStyle(1, btnBorderColor, canPlay ? 0.6 : 0.3);
        g.strokeRoundedRect(pad + 8, btnY, cardW - 16, btnH, 10);

        // Difficulty label (left)
        const labelColor = canPlay ? '#ffffff' : '#444455';
        this.add.text(pad + 20, btnY + 8, diff.label, {
          fontSize: '16px', color: labelColor, fontStyle: 'bold', fontFamily: 'sans-serif',
        });

        // Stamina cost
        this.add.text(pad + 20, btnY + 28, `⚡${diff.stamina}`, {
          fontSize: '12px', color: canPlay ? '#88aacc' : '#333344', fontFamily: 'sans-serif',
        });

        // Stars display (center)
        const starStr = stars > 0
          ? '★'.repeat(stars) + '☆'.repeat(3 - stars)
          : '☆☆☆';
        const starColor = stars > 0 ? '#ffd700' : '#333344';
        this.add.text(GW / 2, btnY + btnH / 2, starStr, {
          fontSize: '18px', color: starColor,
        }).setOrigin(0.5);

        // Clears remaining (right)
        this.add.text(cardW + pad - 20, btnY + 10, `${clears}/${DUNGEON_DAILY_LIMIT}`, {
          fontSize: '13px', color: canPlay ? '#88aa88' : '#333344', fontFamily: 'sans-serif',
        }).setOrigin(1, 0);

        // Play indicator
        if (canPlay) {
          this.add.text(cardW + pad - 20, btnY + 28, '도전 ▶', {
            fontSize: '13px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'sans-serif',
          }).setOrigin(1, 0);
        }

        // Hit area
        const hitZone = this.add.zone(GW / 2, btnY + btnH / 2, cardW - 16, btnH)
          .setInteractive({ useHandCursor: canPlay });
        if (canPlay) {
          hitZone.on('pointerdown', () => this.showTeamSelect(dungeon, diff));
        }
      }

      curY += cardH + 12;
    }
  }

  // ── 팀 선택 (3x3 그리드 배치) ──

  private showTeamSelect(dungeon: DungeonDef, difficulty: DungeonDifficulty): void {
    this.selectedDungeon = dungeon;
    this.selectedDifficulty = difficulty;

    new DeploymentUI(this, {
      mode: 'dungeon',
      campaignManager: this.campaignManager,
      title: `${dungeon.icon} ${dungeon.name} - ${difficulty.label}`,
      subtitle: `웨이브 ${difficulty.waves} | 적 Lv.${difficulty.enemyLevel} | ⚡${difficulty.stamina}`,
      onBack: () => this.showDungeonList(),
      onStartBattle: (_formationId, slots) => {
        this.playerSlots = slots;
        this.selectedFormation = _formationId;
        this.startDungeonBattle();
      },
    });
  }

  // ── 소탕 ──

  // TODO: Re-integrate sweep button into DeploymentUI or as a separate UI element
  // private executeSweep(): void {
  //   if (!this.selectedDungeon || !this.selectedDifficulty) return;
  //   this.campaignManager.incrementMission('battle_3');
  //   this.campaignManager.incrementMission('dungeon_1');
  //   this.completeDungeonOnServer(3, true);
  // }

  // ── 전투 시작 ──

  private startDungeonBattle(): void {
    if (!this.selectedDungeon || !this.selectedDifficulty) return;
    const progress = this.campaignManager.getProgress();
    progress.stamina = (progress.stamina ?? 0) - this.selectedDifficulty.stamina;

    // Collect deployed units from the 3x3 grid
    const playerUnits = this.playerSlots.filter(Boolean) as UnitData[];

    this.battleUnits = [];

    // 진형 버프를 statusEffects로 적용 (패턴 완성 시에만)
    if (this.selectedFormation) {
      const formation = FORMATIONS.find(f => f.id === this.selectedFormation);
      if (formation && isFormationComplete(formation, this.playerSlots)) {
        for (const buff of formation.buffs) {
          for (const unit of playerUnits) {
            if (!unit.statusEffects) unit.statusEffects = [];
            unit.statusEffects.push({
              effect: buff.statusEffect,
              remainingTurns: buff.duration,
              magnitude: buff.magnitude,
              sourceUnitId: 'formation',
            });
          }
        }
      }
    }

    // 아군
    for (const u of playerUnits) {
      this.battleUnits.push({
        data: u, side: 'player',
        hp: u.stats.maxHp, maxHp: u.stats.maxHp,
        attack: u.stats.attack, defense: u.stats.defense,
        speed: u.stats.speed, spirit: u.stats.spirit ?? 10,
        alive: true, mp: u.maxMp ?? 10, maxMp: u.maxMp ?? 10,
        skillCooldowns: {},
      });
    }

    this.runWave(1);
  }

  // ── 웨이브 전투 ──

  private runWave(waveNum: number): void {
    if (!this.selectedDifficulty || !this.selectedDungeon) return;

    // 적 생성
    const diff = this.selectedDifficulty;
    const isBoss = waveNum === diff.waves;
    const enemyCount = isBoss ? 3 : 2 + Math.floor(Math.random() * 2);
    const enemies: DungeonUnit[] = [];

    for (let i = 0; i < enemyCount; i++) {
      const cls = diff.enemyClasses[i % diff.enemyClasses.length];
      const level = diff.enemyLevel + (isBoss ? 3 : 0);
      const bossBonus = isBoss && i === 0 ? 1.5 : 1;
      const name = isBoss && i === 0 ? `보스 Lv.${level}` : `적 ${i + 1}`;

      enemies.push({
        data: {
          id: `dungeon_e_${waveNum}_${i}`, name, faction: 'enemy', unitClass: cls,
          position: { x: 0, y: 0 },
          stats: {
            maxHp: Math.floor((100 + level * 10) * bossBonus), hp: Math.floor((100 + level * 10) * bossBonus),
            attack: Math.floor((25 + level * 3) * bossBonus), defense: 15 + level * 2,
            spirit: 10 + level, agility: 18 + level, critical: 15 + level,
            morale: 20 + level, speed: 4 + Math.floor(Math.random() * 3),
            penetration: 3 + level, resist: 10 + level,
            moveRange: 4, attackRange: 1,
          },
          hasActed: false, isAlive: true,
        },
        side: 'enemy',
        hp: Math.floor((100 + level * 10) * bossBonus), maxHp: Math.floor((100 + level * 10) * bossBonus),
        attack: Math.floor((25 + level * 3) * bossBonus), defense: 15 + level * 2,
        speed: 4 + Math.floor(Math.random() * 3), spirit: 10 + level,
        alive: true, mp: 15, maxMp: 15, skillCooldowns: {},
      });
    }

    // 기존 적 제거, 새 적 추가
    this.battleUnits = this.battleUnits.filter(u => u.side === 'player');
    this.battleUnits.push(...enemies);

    this.showWaveBattle(waveNum);
  }


  private unitContainers: Map<string, Phaser.GameObjects.Container> = new Map();

  // ── Sprite texture helper ──

  private getDungeonSpriteKey(unit: DungeonUnit, direction: string): string {
    const heroId = unit.data.id;
    const heroKeys: Record<string, string> = { p1: 'pl_lubu', p2: 'pl_zhangliao' };
    const heroKey = heroKeys[heroId];
    if (heroKey) {
      const key = `${heroKey}_idle_${direction}_0`;
      if (this.textures.exists(key)) return key;
    }
    // Try hero-specific PixelLab key
    const plHeroKey = `pl_${heroId}_idle_${direction}_0`;
    if (this.textures.exists(plHeroKey)) return plHeroKey;
    // Fallback to class-based
    const cls = unit.data.unitClass ?? 'infantry';
    const classKey = `pl_${cls}_idle_${direction}_0`;
    if (this.textures.exists(classKey)) return classKey;
    return '';
  }

  /** Get a Phaser animation key for a dungeon unit, or null if not registered */
  private getDungeonAnimKey(unit: DungeonUnit, anim: string, direction: string): string | null {
    const heroId = unit.data.id;
    const heroKeys: Record<string, string> = { p1: 'pl_lubu', p2: 'pl_zhangliao' };
    const heroKey = heroKeys[heroId];
    if (heroKey) {
      const key = `${heroKey}_${anim}_${direction}`;
      if (this.anims.exists(key)) return key;
    }
    // Try hero-specific PixelLab key
    const plHeroKey = `pl_${heroId}_${anim}_${direction}`;
    if (this.anims.exists(plHeroKey)) return plHeroKey;
    // Fallback to class-based
    const cls = unit.data.unitClass ?? 'infantry';
    const classKey = `pl_${cls}_${anim}_${direction}`;
    if (this.anims.exists(classKey)) return classKey;
    return null;
  }

  // ── Grid position helpers ──

  private getPlayerGridPos(slotIndex: number): { x: number; y: number } {
    const cellW = 110;
    // slot index = row * GRID_COLS + col
    // In formation: col 0=rear, col 2=front (left-to-right in PvP)
    // For vertical dungeon: col maps to Y (front=top, rear=bottom), row maps to X
    const col = slotIndex % GRID_COLS;
    const row = Math.floor(slotIndex / GRID_COLS);

    // Row (0-2) → X positions, centered across width
    const gridStartX = (GW - GRID_ROWS * cellW) / 2;
    const x = gridStartX + row * cellW + cellW / 2;

    // Col 2 (front) → y=320 (closer to enemies at top)
    // Col 1 (mid)   → y=400
    // Col 0 (rear)  → y=480 (farther from enemies)
    const yPositions = [480, 400, 320]; // col 0=rear(bottom), col 1=mid, col 2=front(top)
    const y = yPositions[col] ?? 400;

    return { x, y };
  }

  private getEnemyGridPositions(count: number): { x: number; y: number }[] {
    const cellW = 110;
    const positions: { x: number; y: number }[] = [];
    if (count <= 3) {
      // Single row, centered
      const startX = (GW - count * cellW) / 2;
      const y = 120;
      for (let i = 0; i < count; i++) {
        positions.push({ x: startX + i * cellW + cellW / 2, y });
      }
    } else {
      // Two rows
      const topCount = Math.ceil(count / 2);
      const bottomCount = count - topCount;
      const startXTop = (GW - topCount * cellW) / 2;
      for (let i = 0; i < topCount; i++) {
        positions.push({ x: startXTop + i * cellW + cellW / 2, y: 80 });
      }
      const startXBot = (GW - bottomCount * cellW) / 2;
      for (let i = 0; i < bottomCount; i++) {
        positions.push({ x: startXBot + i * cellW + cellW / 2, y: 170 });
      }
    }
    return positions;
  }

  private showWaveBattle(waveNum: number): void {
    this.children.removeAll();
    this.unitContainers.clear();
    const diff = this.selectedDifficulty!;
    const isBoss = waveNum === diff.waves;

    // -- Dark battlefield background --
    const bgGfx = this.add.graphics();
    const bgSteps = 32;
    for (let i = 0; i < bgSteps; i++) {
      const t = i / bgSteps;
      const r = Math.round(8 + t * 12);
      const g = Math.round(10 + t * 18);
      const b = Math.round(20 + t * 30);
      bgGfx.fillStyle((r << 16) | (g << 8) | b, 1);
      bgGfx.fillRect(0, Math.floor((GH / bgSteps) * i), GW, Math.ceil(GH / bgSteps) + 1);
    }

    // Boss wave: red tint overlay
    if (isBoss) {
      bgGfx.fillStyle(0xff0000, 0.06);
      bgGfx.fillRect(0, 0, GW, GH);
    }

    // Golden horizontal dividing line at y=305
    bgGfx.lineStyle(2, 0xffd700, 0.5);
    bgGfx.lineBetween(20, 305, GW - 20, 305);
    // Subtle glow
    bgGfx.lineStyle(4, 0xffd700, 0.15);
    bgGfx.lineBetween(20, 305, GW - 20, 305);

    // Wave header (y=0-35)
    this.add.text(GW / 2, 14, `⚔️ Wave ${waveNum}/${diff.waves}${isBoss ? ' 🔥BOSS' : ''}`, {
      fontSize: '16px', color: isBoss ? '#ff4444' : '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Speed button
    const speedBtn = this.add.text(GW - 45, 8, `${this.battleSpeed}x`, {
      fontSize: '15px', color: '#ffffff', backgroundColor: '#000000cc', padding: { x: 8, y: 6 },
    }).setInteractive({ useHandCursor: true }).setDepth(50);
    speedBtn.on('pointerdown', () => {
      this.battleSpeed = this.battleSpeed === 1 ? 2 : this.battleSpeed === 2 ? 3 : 1;
      speedBtn.setText(`${this.battleSpeed}x`);
    });

    // -- Enemy area (top, y=50-300) --
    const enemies = this.battleUnits.filter(u => u.side === 'enemy' && u.alive);
    const enemyPositions = this.getEnemyGridPositions(enemies.length);

    for (let i = 0; i < enemies.length; i++) {
      const u = enemies[i];
      const pos = enemyPositions[i];
      // Start above and tween down (push-in effect)
      const c = this.createDungeonUnitSprite(u, pos.x, pos.y - 60, 'south', false);
      this.unitContainers.set(u.data.id, c);
      this.tweens.add({
        targets: c, y: pos.y,
        duration: 500, ease: 'Back.easeOut', delay: i * 120,
      });
    }

    // -- Player area (bottom, y=310-530) --
    const players = this.battleUnits.filter(u => u.side === 'player');
    // Map players to their formation slots
    for (let slotIdx = 0; slotIdx < this.playerSlots.length; slotIdx++) {
      const slotUnit = this.playerSlots[slotIdx];
      if (!slotUnit) continue;
      const battleUnit = players.find(p => p.data.id === slotUnit.id);
      if (!battleUnit) continue;
      const pos = this.getPlayerGridPos(slotIdx);
      const c = this.createDungeonUnitSprite(battleUnit, pos.x, pos.y, 'north', true);
      this.unitContainers.set(battleUnit.data.id, c);
    }
    // Place any players not found in slots (fallback)
    const unplacedPlayers = players.filter(p => !this.unitContainers.has(p.data.id));
    let fallbackSlot = 0;
    for (const u of unplacedPlayers) {
      while (fallbackSlot < GRID_COLS * GRID_ROWS && this.playerSlots[fallbackSlot]) fallbackSlot++;
      const pos = this.getPlayerGridPos(Math.min(fallbackSlot, GRID_COLS * GRID_ROWS - 1));
      const c = this.createDungeonUnitSprite(u, pos.x, pos.y, 'north', true);
      this.unitContainers.set(u.data.id, c);
      fallbackSlot++;
    }

    // -- Battle log (y=540-690) --
    const logBg = this.add.graphics();
    logBg.fillStyle(0x0a0a14, 0.9).fillRoundedRect(8, GH - 150, GW - 16, 143, 8);
    logBg.lineStyle(1, 0x2a2a44, 0.5).strokeRoundedRect(8, GH - 150, GW - 16, 143, 8);
    this.add.text(GW / 2, GH - 145, '── 전투 로그 ──', { fontSize: '12px', color: '#555566' }).setOrigin(0.5);

    const logTexts: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < 6; i++) {
      logTexts.push(this.add.text(18, GH - 128 + i * 20, '', { fontSize: '12px', color: '#aaaaaa' }));
    }

    this.time.delayedCall(600 + enemies.length * 120, () => {
      this.executeWaveBattle(waveNum, logTexts);
    });
  }

  /** Create a sprite-based unit container for the vertical battle view */
  private createDungeonUnitSprite(
    u: DungeonUnit,
    x: number, y: number,
    direction: 'south' | 'north',
    isPlayer: boolean,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const hpBarW = 60;

    // Index 0: Faction indicator dot
    const dotColor = isPlayer ? 0x4488ff : 0xff4444;
    const dot = this.add.graphics();
    dot.fillStyle(dotColor, 0.8);
    dot.fillCircle(0, -38, 4);
    container.add(dot);

    // Index 1: Sprite or emoji fallback
    const texKey = this.getDungeonSpriteKey(u, direction);
    if (texKey) {
      const sprite = this.add.sprite(0, -10, texKey);
      const tex = this.textures.get(texKey);
      const frame = tex.get(0);
      const targetSize = 52;
      const scale = targetSize / Math.max(frame.width, frame.height);
      sprite.setScale(scale * 1.3);
      container.add(sprite);
      // Play idle animation if available
      const idleAnimKey = this.getDungeonAnimKey(u, 'idle', direction);
      if (idleAnimKey) sprite.play(idleAnimKey);
    } else {
      // Emoji fallback
      const clsIcons: Record<string, string> = {
        cavalry: '🐎', infantry: '🛡️', archer: '🏹',
        strategist: '📜', martial_artist: '👊', bandit: '🗡️',
      };
      const unitClass = u.data.unitClass ?? 'infantry';
      const icon = this.add.text(0, -14, clsIcons[unitClass] ?? '⚔️', {
        fontSize: '28px',
      }).setOrigin(0.5);
      container.add(icon);
    }

    // Index 2: Name text (below sprite)
    const name = this.add.text(0, 22, u.data.name, {
      fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(name);

    // Index 3: HP text
    const hpText = this.add.text(0, 34, `${u.hp}/${u.maxHp}`, {
      fontSize: '9px', color: '#aaaaaa',
      stroke: '#000000', strokeThickness: 1,
    }).setOrigin(0.5);
    container.add(hpText);

    // Index 4: HP bar background
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x222233, 1).fillRoundedRect(-hpBarW / 2, 42, hpBarW, 6, 3);
    container.add(hpBg);

    // Index 5: HP bar fill
    const hpBar = this.add.graphics();
    const ratio = u.hp / u.maxHp;
    const barColor = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000;
    hpBar.fillStyle(barColor, 1);
    hpBar.fillRoundedRect(-hpBarW / 2, 42, hpBarW * ratio, 6, 3);
    container.add(hpBar);

    if (!u.alive) container.setAlpha(0.15);
    return container;
  }

  private updateDungeonCards(): void {
    const hpBarW = 60;
    for (const unit of this.battleUnits) {
      const c = this.unitContainers.get(unit.data.id);
      if (!c) continue;

      // Index 5: HP bar fill
      const hpBar = c.getAt(5) as Phaser.GameObjects.Graphics;
      hpBar.clear();
      if (unit.alive) {
        const ratio = unit.hp / unit.maxHp;
        const barColor = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000;
        hpBar.fillStyle(barColor, 1);
        hpBar.fillRoundedRect(-hpBarW / 2, 42, hpBarW * ratio, 6, 3);
      }

      // Index 3: HP text
      const hpText = c.getAt(3) as Phaser.GameObjects.Text;
      hpText.setText(`${Math.max(0, unit.hp)}/${unit.maxHp}`);

      if (!unit.alive) c.setAlpha(0.15);
    }
  }

  private tryUseDungeonSkill(unit: DungeonUnit, allUnits: DungeonUnit[]): { target: DungeonUnit; skillName: string; value: number; type: 'damage' | 'heal' } | null {
    // Collect unit's skill IDs
    const skillIds: string[] = [];
    if (unit.data.unitClass) {
      skillIds.push(unit.data.classSkillId ?? getClassSkillId(unit.data.unitClass, unit.data.promotionLevel ?? 0));
    }
    if (unit.data.uniqueSkill && (unit.data.uniqueSkillUnlocked || (unit.data.level ?? 1) >= 20)) {
      skillIds.push(unit.data.uniqueSkill);
    }
    if (unit.data.equippedSkills) skillIds.push(...unit.data.equippedSkills);

    const enemySide = unit.side === 'player' ? 'enemy' : 'player';
    const allies = allUnits.filter(u => u.side === unit.side && u.alive);
    const enemies = allUnits.filter(u => u.side === enemySide && u.alive);

    for (const skillId of skillIds) {
      const skill = SKILL_DEFS[skillId];
      if (!skill) continue;
      if (skill.mpCost > unit.mp) continue;
      if ((unit.skillCooldowns[skillId] ?? 0) > 0) continue;

      // Heal skill: use on wounded ally (HP < 50%)
      if (skill.effectType === SkillEffectType.HEAL) {
        const wounded = allies.filter(u => u.hp < u.maxHp * 0.5).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        if (wounded.length > 0) {
          const healAmount = Math.floor(skill.power + unit.spirit * 0.5);
          unit.mp -= skill.mpCost;
          unit.skillCooldowns[skillId] = skill.cooldown;
          return { target: wounded[0], skillName: skill.name, value: healAmount, type: 'heal' };
        }
      }

      // Damage skill: use on weakest enemy
      if (skill.effectType === SkillEffectType.DAMAGE && enemies.length > 0) {
        const target = enemies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
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

      // Buff: simplified as self-heal
      if (skill.effectType === SkillEffectType.BUFF && allies.length > 0) {
        const healAmount = Math.floor(skill.power * 0.5 + unit.spirit * 0.3);
        if (healAmount > 0) {
          unit.mp -= skill.mpCost;
          unit.skillCooldowns[skillId] = skill.cooldown;
          return { target: unit, skillName: skill.name, value: healAmount, type: 'heal' };
        }
      }

      // Debuff: simplified as damage
      if (skill.effectType === SkillEffectType.DEBUFF && enemies.length > 0) {
        const target = enemies[0];
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

  private executeWaveBattle(waveNum: number, logTexts: Phaser.GameObjects.Text[]): void {
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      const show = logs.slice(-6);
      for (let i = 0; i < logTexts.length; i++) logTexts[i].setText(show[i] ?? '');
    };

    let turnCount = 0;
    const doTurn = () => {
      if (turnCount >= 20) { this.onWaveEnd(waveNum, false); return; }

      const alive = this.battleUnits.filter(u => u.alive);
      const pAlive = alive.filter(u => u.side === 'player');
      const eAlive = alive.filter(u => u.side === 'enemy');

      if (pAlive.length === 0) { this.onWaveEnd(waveNum, false); return; }
      if (eAlive.length === 0) { this.onWaveEnd(waveNum, true); return; }

      turnCount++;
      const sorted = [...alive].sort((a, b) => b.speed - a.speed + (Math.random() - 0.5) * 2);

      let idx = 0;
      const doAction = () => {
        if (idx >= sorted.length) {
          // Cooldown reduction
          for (const u of alive) {
            for (const k of Object.keys(u.skillCooldowns)) {
              if (u.skillCooldowns[k] > 0) u.skillCooldowns[k]--;
            }
          }

          const p = this.battleUnits.filter(u => u.side === 'player' && u.alive);
          const e = this.battleUnits.filter(u => u.side === 'enemy' && u.alive);
          if (p.length === 0) { this.time.delayedCall(300, () => this.onWaveEnd(waveNum, false)); return; }
          if (e.length === 0) { this.time.delayedCall(300, () => this.onWaveEnd(waveNum, true)); return; }
          this.time.delayedCall(500 / this.battleSpeed, doTurn);
          return;
        }

        const unit = sorted[idx];
        idx++;
        if (!unit.alive) { doAction(); return; }

        // Try skill first
        const skillResult = this.tryUseDungeonSkill(unit, this.battleUnits);
        if (skillResult) {
          const atkContainer = this.unitContainers.get(unit.data.id);
          const tgtContainer = this.unitContainers.get(skillResult.target.data.id);

          // Play attack animation on attacker sprite
          if (atkContainer) {
            const atkChild = atkContainer.getAt(1);
            if (atkChild instanceof Phaser.GameObjects.Sprite) {
              const atkDir = unit.side === 'player' ? 'north' : 'south';
              const atkAnimKey = this.getDungeonAnimKey(unit, 'attack', atkDir);
              if (atkAnimKey) {
                atkChild.play(atkAnimKey);
                atkChild.once('animationcomplete', () => {
                  const idleKey = this.getDungeonAnimKey(unit, 'idle', atkDir);
                  if (idleKey) atkChild.play(idleKey);
                });
              }
            }

            // Show skill name in gold above attacker
            const skillLabel = this.add.text(atkContainer.x, atkContainer.y - 55, `✨ ${skillResult.skillName}`, {
              fontSize: '14px', color: '#ffd700', fontStyle: 'bold',
              stroke: '#000000', strokeThickness: 3,
            }).setOrigin(0.5).setDepth(101);
            this.tweens.add({
              targets: skillLabel, y: skillLabel.y - 25, alpha: 0,
              duration: 1200, onComplete: () => skillLabel.destroy(),
            });
          }

          this.time.delayedCall(500 / this.battleSpeed, () => {
            if (skillResult.type === 'heal') {
              skillResult.target.hp = Math.min(skillResult.target.maxHp, skillResult.target.hp + skillResult.value);
              addLog(`${unit.data.name} → ${skillResult.target.data.name} (+${skillResult.value} ${skillResult.skillName})`);

              if (tgtContainer) {
                const healText = this.add.text(tgtContainer.x, tgtContainer.y - 40, `+${skillResult.value}`, {
                  fontSize: '18px', color: '#44ff88', fontStyle: 'bold',
                  stroke: '#000000', strokeThickness: 3,
                }).setOrigin(0.5).setDepth(100);
                this.tweens.add({
                  targets: healText, y: healText.y - 35, alpha: 0,
                  duration: 900, onComplete: () => healText.destroy(),
                });
              }
            } else {
              skillResult.target.hp -= skillResult.value;
              let msg = `${unit.data.name} → ${skillResult.target.data.name} (${skillResult.value} ${skillResult.skillName})`;
              if (skillResult.target.hp <= 0) { skillResult.target.hp = 0; skillResult.target.alive = false; msg += ' 격파!'; }
              addLog(msg);

              if (tgtContainer) {
                this.cameras.main.shake(80 / this.battleSpeed, 0.005);

                const flashCircle = this.add.graphics().setDepth(99);
                flashCircle.fillStyle(0xff44ff, 0.7);
                flashCircle.fillCircle(tgtContainer.x, tgtContainer.y - 10, 20);
                this.tweens.add({
                  targets: flashCircle, alpha: 0,
                  duration: 300 / this.battleSpeed,
                  onComplete: () => flashCircle.destroy(),
                });

                const dmgText = this.add.text(tgtContainer.x, tgtContainer.y - 40, `-${skillResult.value}`, {
                  fontSize: '20px', color: '#ff44ff', fontStyle: 'bold',
                  stroke: '#000000', strokeThickness: 3,
                }).setOrigin(0.5).setDepth(100);
                this.tweens.add({
                  targets: dmgText, y: dmgText.y - 35, alpha: 0,
                  duration: 900, onComplete: () => dmgText.destroy(),
                });

                // Death handling
                if (!skillResult.target.alive) {
                  const defChild = tgtContainer.getAt(1);
                  const defDir = skillResult.target.side === 'player' ? 'north' : 'south';
                  if (defChild instanceof Phaser.GameObjects.Sprite) {
                    const dieKey = this.getDungeonAnimKey(skillResult.target, 'die', defDir);
                    if (dieKey) {
                      defChild.play(dieKey);
                      defChild.once('animationcomplete', () => {
                        this.tweens.add({ targets: tgtContainer, alpha: 0, duration: 300 / this.battleSpeed, ease: 'Power2' });
                      });
                    } else {
                      this.tweens.add({ targets: tgtContainer, alpha: 0, angle: skillResult.target.side === 'player' ? -15 : 15, duration: 500 / this.battleSpeed, ease: 'Power2' });
                    }
                  } else {
                    this.tweens.add({ targets: tgtContainer, alpha: 0, angle: skillResult.target.side === 'player' ? -15 : 15, duration: 500 / this.battleSpeed, ease: 'Power2' });
                  }
                }
              }
            }
            this.updateDungeonCards();
            this.time.delayedCall(600 / this.battleSpeed, doAction);
          });
          return;
        }

        const targets = this.battleUnits.filter(u => u.side !== unit.side && u.alive);
        if (targets.length === 0) { doAction(); return; }

        const target = targets.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

        // Damage calculation
        const atkAgi = unit.data.stats.agility ?? 20;
        const defAgi = target.data.stats.agility ?? 20;
        const hitRate = Math.min(99, Math.max(30, 90 + (atkAgi - defAgi) * 2));
        const missed = Math.random() * 100 >= hitRate;

        const pen = (unit.data.stats.penetration ?? 0) / 100;
        const effDef = target.defense * (1 - pen);
        const rawDmg = unit.attack - effDef * 0.5 + Math.floor(Math.random() * 8);
        const critRate = (unit.data.stats.critical ?? 20) / 200;
        const isCrit = !missed && Math.random() < critRate;
        const critMult = isCrit ? 1.5 : 1;

        const damage = missed ? 0 : Math.max(1, Math.floor(rawDmg * critMult));

        // Vertical attack animation
        const atkContainer = this.unitContainers.get(unit.data.id);
        const defContainer = this.unitContainers.get(target.data.id);

        const unitClass = unit.data.unitClass ?? 'infantry';
        const isRanged = unitClass === 'archer' || unitClass === 'strategist';

        if (atkContainer && defContainer) {
          const origY = atkContainer.y;

          // Play attack animation on attacker sprite
          const atkChild = atkContainer.getAt(1);
          if (atkChild instanceof Phaser.GameObjects.Sprite) {
            const atkDir = unit.side === 'player' ? 'north' : 'south';
            const atkAnimKey = this.getDungeonAnimKey(unit, 'attack', atkDir);
            if (atkAnimKey) {
              atkChild.play(atkAnimKey);
              atkChild.once('animationcomplete', () => {
                const idleKey = this.getDungeonAnimKey(unit, 'idle', atkDir);
                if (idleKey) atkChild.play(idleKey);
              });
            }
          }

          if (isRanged) {
            // Ranged: stay in place, show projectile
            const projGfx = this.add.graphics().setDepth(80);
            const projColor = unitClass === 'strategist' ? 0x8844ff : 0xffaa00;
            projGfx.fillStyle(projColor, 0.9);
            projGfx.fillCircle(atkContainer.x, atkContainer.y, 5);
            this.tweens.add({
              targets: projGfx,
              x: defContainer.x - atkContainer.x,
              y: defContainer.y - atkContainer.y,
              duration: 250 / this.battleSpeed,
              ease: 'Power1',
              onComplete: () => projGfx.destroy(),
            });
          } else {
            // Melee: move toward target vertically
            const dashDir = unit.side === 'player' ? -50 : 50;
            this.tweens.add({
              targets: atkContainer, y: origY + dashDir,
              duration: 150 / this.battleSpeed, ease: 'Power2',
              yoyo: true, yoyoDelay: 60 / this.battleSpeed,
            });
          }
        }

        this.time.delayedCall(250 / this.battleSpeed, () => {
          if (missed) {
            addLog(`${unit.data.name} → ${target.data.name} (빗나감!)`);
            if (defContainer) {
              const missText = this.add.text(defContainer.x, defContainer.y - 30, 'MISS', {
                fontSize: '16px', color: '#888888', fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 2,
              }).setOrigin(0.5).setDepth(100);
              this.tweens.add({
                targets: missText, y: missText.y - 30, alpha: 0,
                duration: 700, onComplete: () => missText.destroy(),
              });
            }
          } else {
            target.hp -= damage;
            let msg = `${unit.data.name} → ${target.data.name} (${damage}${isCrit ? ' 크리!' : ''})`;
            if (target.hp <= 0) { target.hp = 0; target.alive = false; msg += ' 격파!'; }
            addLog(msg);

            if (defContainer) {
              // Screen shake on impact
              this.cameras.main.shake(80 / this.battleSpeed, 0.005);

              // Impact flash circle on target
              const flashCircle = this.add.graphics().setDepth(99);
              flashCircle.fillStyle(isCrit ? 0xffaa00 : 0xffffff, 0.7);
              flashCircle.fillCircle(defContainer.x, defContainer.y - 10, 20);
              this.tweens.add({
                targets: flashCircle, alpha: 0,
                duration: 200 / this.battleSpeed,
                onComplete: () => flashCircle.destroy(),
              });

              // Damage text floating up
              const dmgColor = isCrit ? '#ffaa00' : '#ff4444';
              const dmgSize = isCrit ? '22px' : '18px';
              const dmgText = this.add.text(defContainer.x, defContainer.y - 40, `-${damage}`, {
                fontSize: dmgSize, color: dmgColor, fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 3,
              }).setOrigin(0.5).setDepth(100);
              this.tweens.add({
                targets: dmgText, y: dmgText.y - 35, alpha: 0,
                duration: 800, onComplete: () => dmgText.destroy(),
              });

              // Defender knockback (vertical)
              const oy = defContainer.y;
              const knockDir = target.side === 'player' ? 8 : -8;
              this.tweens.add({
                targets: defContainer, y: oy + knockDir,
                duration: 50 / this.battleSpeed, yoyo: true,
                onComplete: () => {
                  defContainer.y = oy;
                  this.tweens.add({
                    targets: defContainer, y: oy + 3,
                    duration: 30, yoyo: true, repeat: 2,
                    onComplete: () => { defContainer.y = oy; },
                  });
                },
              });

              // Play hit or die animation on defender sprite
              const defChild = defContainer.getAt(1);
              const defDir = target.side === 'player' ? 'north' : 'south';
              if (defChild instanceof Phaser.GameObjects.Sprite) {
                if (!target.alive) {
                  // Death animation then fade
                  const dieKey = this.getDungeonAnimKey(target, 'die', defDir);
                  if (dieKey) {
                    defChild.play(dieKey);
                    defChild.once('animationcomplete', () => {
                      this.tweens.add({
                        targets: defContainer,
                        alpha: 0,
                        duration: 300 / this.battleSpeed,
                        ease: 'Power2',
                      });
                    });
                  } else {
                    // No die animation: just fade + rotation
                    this.tweens.add({
                      targets: defContainer,
                      alpha: 0, angle: target.side === 'player' ? -15 : 15,
                      duration: 500 / this.battleSpeed,
                      ease: 'Power2',
                    });
                  }
                } else {
                  // Hit animation then return to idle
                  const hitKey = this.getDungeonAnimKey(target, 'hit', defDir);
                  if (hitKey) {
                    defChild.play(hitKey);
                    defChild.once('animationcomplete', () => {
                      const idleKey = this.getDungeonAnimKey(target, 'idle', defDir);
                      if (idleKey) defChild.play(idleKey);
                    });
                  }
                }
              } else if (!target.alive) {
                // Emoji fallback death: fade + rotation
                this.tweens.add({
                  targets: defContainer,
                  alpha: 0, angle: target.side === 'player' ? -15 : 15,
                  duration: 500 / this.battleSpeed,
                  ease: 'Power2',
                });
              }

            }
          }
          this.updateDungeonCards();
          this.time.delayedCall(350 / this.battleSpeed, doAction);
        });
      };

      doAction();
    };

    this.time.delayedCall(500, doTurn);
  }

  private onWaveEnd(waveNum: number, cleared: boolean): void {
    if (!cleared) {
      // 패배 - 서버에서 보상 생성 (stars=0)
      this.completeDungeonOnServer(0, false);
      return;
    }

    const diff = this.selectedDifficulty!;
    if (waveNum < diff.waves) {
      // Wave transition announcement
      const nextWave = waveNum + 1;
      const overlay = this.add.rectangle(GW / 2, GH / 2, GW, GH, 0x000000, 0.6).setDepth(200);
      const waveAnnounce = this.add.text(GW / 2, GH / 2, `Wave ${nextWave}/${diff.waves} 시작!`, {
        fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(201).setScale(0.3).setAlpha(0);

      this.tweens.add({
        targets: waveAnnounce, scale: 1, alpha: 1,
        duration: 300, ease: 'Back.easeOut',
        onComplete: () => {
          this.time.delayedCall(700, () => {
            this.tweens.add({
              targets: [overlay, waveAnnounce], alpha: 0,
              duration: 300,
              onComplete: () => {
                overlay.destroy();
                waveAnnounce.destroy();
                this.runWave(nextWave);
              },
            });
          });
        },
      });
    } else {
      // 전체 클리어
      const survivors = this.battleUnits.filter(u => u.side === 'player' && u.alive);
      const stars = survivors.length === this.battleUnits.filter(u => u.side === 'player').length ? 3
        : survivors.length >= 2 ? 2 : 1;

      this.campaignManager.incrementMission('battle_3');
      this.campaignManager.incrementMission('dungeon_1');

      this.completeDungeonOnServer(stars, false);
    }
  }

  // ── 서버 던전 완료 처리 ──

  private completeDungeonOnServer(stars: number, isSweep: boolean): void {
    const dungeonId = this.selectedDungeon!.id;
    const diff = this.selectedDifficulty!;

    // 서버 호출 → 서버가 보상 생성, 스태미나 차감, 클리어 기록
    dungeonComplete(dungeonId, diff.level, stars)
      .then((result) => {
        // 서버 응답으로 로컬 진행 상태 동기화
        const progress = this.campaignManager.getProgress();
        progress.gold = result.gold;

        const key = `${dungeonId}_${diff.level}`;
        if (!progress.dungeonClears) progress.dungeonClears = {};
        progress.dungeonClears[key] = (progress.dungeonClears[key] ?? 0) + 1;
        if (stars > 0) {
          if (!progress.dungeonStars) progress.dungeonStars = {};
          if ((progress.dungeonStars[key] ?? 0) < stars) progress.dungeonStars[key] = stars;
        }

        // 서버가 생성한 보상을 로컬에 반영
        this.applyRewardLocal(result.reward);
        this.campaignManager.save();
        this.showResult(stars, result.reward, isSweep);
      })
      .catch(() => {
        // 서버 실패 시 로컬 폴백
        const reward = generateReward(dungeonId, diff);
        if (stars === 0) {
          reward.gold = Math.floor(reward.gold * 0.3);
          reward.equipment = undefined;
          reward.skills = undefined;
        }
        this.applyRewardLocal(reward);

        const key = `${dungeonId}_${diff.level}`;
        const progress = this.campaignManager.getProgress();
        if (!progress.dungeonClears) progress.dungeonClears = {};
        progress.dungeonClears[key] = (progress.dungeonClears[key] ?? 0) + 1;
        if (stars > 0) {
          if (!progress.dungeonStars) progress.dungeonStars = {};
          if ((progress.dungeonStars[key] ?? 0) < stars) progress.dungeonStars[key] = stars;
        }

        progress.gold += reward.gold;
        this.campaignManager.save();
        this.showResult(stars, reward, isSweep);
      });
  }

  // ── 보상 적용 (금화 제외 - 서버가 관리) ──

  private applyRewardLocal(reward: DungeonReward): void {
    const progress = this.campaignManager.getProgress();
    if (reward.equipment) {
      if (!progress.equipmentBag) progress.equipmentBag = [];
      progress.equipmentBag.push(...reward.equipment);
    }
    if (reward.skills) {
      if (!progress.skillBag) progress.skillBag = [];
      progress.skillBag.push(...reward.skills);
    }
    if (reward.materials) {
      if (!progress.materialBag) progress.materialBag = {};
      for (const [k, v] of Object.entries(reward.materials)) {
        progress.materialBag[k] = (progress.materialBag[k] ?? 0) + v;
      }
    }
  }

  // ── 결과 화면 ──

  private showResult(stars: number, reward: DungeonReward, isSweep: boolean): void {
    this.children.removeAll();

    // Background
    const rbg = this.add.graphics();
    rbg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    rbg.fillRect(0, 0, GW, GH);

    // Camera flash (gold for win, red for loss)
    const flashColor = stars > 0 ? 0xffd700 : 0xff2222;
    const flash = this.add.rectangle(GW / 2, GH / 2, GW, GH, flashColor, 0.4).setDepth(300);
    this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });

    // Result text (larger)
    const resultText = stars > 0 ? (isSweep ? '소탕 완료!' : '클리어!') : '패배...';
    const resultColor = stars > 0 ? '#ffd700' : '#ff4444';

    const resultLabel = this.add.text(GW / 2, GH * 0.12, resultText, {
      fontSize: '40px', color: resultColor, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: resultLabel, scale: 1, alpha: 1, duration: 400, ease: 'Back.easeOut' });

    // Stars display - bounce in one by one
    if (stars > 0) {
      for (let i = 0; i < 3; i++) {
        const isFilled = i < stars;
        const starChar = isFilled ? '★' : '☆';
        const starColor = isFilled ? '#ffd700' : '#333355';
        const starObj = this.add.text(GW / 2 - 40 + i * 40, GH * 0.22, starChar, {
          fontSize: '36px', color: starColor,
          stroke: isFilled ? '#aa8800' : '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setScale(0).setAlpha(0);

        this.tweens.add({
          targets: starObj, scale: 1, alpha: 1,
          duration: 300, ease: 'Back.easeOut',
          delay: 500 + i * 200,
        });
      }
    }

    // 보상 (delayed appearance)
    const rewardDelay = stars > 0 ? 1200 : 600;

    this.time.delayedCall(rewardDelay, () => {
      let y = GH * 0.35;
      const rewardTitle = this.add.text(GW / 2, y, '── 보상 ──', {
        fontSize: '16px', color: '#88aacc', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: rewardTitle, alpha: 1, duration: 300 });
      y += 28;

      const goldText = this.add.text(GW / 2, y, `💰 금화 +${reward.gold}`, {
        fontSize: '18px', color: '#ffaa00', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: goldText, alpha: 1, duration: 300, delay: 100 });
      y += 28;

      let itemDelay = 200;
      if (reward.equipment && reward.equipment.length > 0) {
        const names = reward.equipment.map(e => EQUIPMENT_DEFS[e]?.name ?? e).join(', ');
        const eqText = this.add.text(GW / 2, y, `⚔️ ${names}`, {
          fontSize: '15px', color: '#44ccff',
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: eqText, alpha: 1, duration: 300, delay: itemDelay });
        y += 24;
        itemDelay += 100;
      }

      if (reward.skills && reward.skills.length > 0) {
        const names = reward.skills.map(s => SKILL_DEFS[s]?.name ?? s).join(', ');
        const skText = this.add.text(GW / 2, y, `✨ ${names}`, {
          fontSize: '15px', color: '#cc88ff',
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: skText, alpha: 1, duration: 300, delay: itemDelay });
        y += 24;
        itemDelay += 100;
      }

      if (reward.materials) {
        for (const [k, v] of Object.entries(reward.materials)) {
          const matText = this.add.text(GW / 2, y, `📦 ${k} x${v}`, {
            fontSize: '15px', color: '#88cc88',
          }).setOrigin(0.5).setAlpha(0);
          this.tweens.add({ targets: matText, alpha: 1, duration: 300, delay: itemDelay });
          y += 24;
          itemDelay += 100;
        }
      }
    });

    // Buttons (appear after rewards)
    const btnDelay = stars > 0 ? 1800 : 1000;
    this.time.delayedCall(btnDelay, () => {
      const retryBtn = this.add.text(GW / 2 - 70, GH - 45, '다시 도전', {
        fontSize: '16px', color: '#ffffff', backgroundColor: '#3366aa', padding: { x: 16, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);
      this.tweens.add({ targets: retryBtn, alpha: 1, duration: 300 });
      retryBtn.on('pointerdown', () => this.showDungeonList());

      const lobbyBtn = this.add.text(GW / 2 + 70, GH - 45, '로비로', {
        fontSize: '16px', color: '#ffffff', backgroundColor: '#2a2a4a', padding: { x: 16, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);
      this.tweens.add({ targets: lobbyBtn, alpha: 1, duration: 300 });
      lobbyBtn.on('pointerdown', () => this.scene.start('LobbyScene', { campaignManager: this.campaignManager }));
    });
  }
}
