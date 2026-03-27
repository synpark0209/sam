import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import type { UnitData } from '@shared/types/index.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import { SKILL_DEFS } from '@shared/data/skillDefs.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { AudioManager } from '../systems/AudioManager.ts';
import { getGradeColor } from '@shared/data/gachaDefs.ts';
import type { HeroGrade } from '@shared/data/gachaDefs.ts';
import { EQUIPMENT_DEFS } from '@shared/data/equipmentDefs.ts';
import {
  getTodayDungeons, generateReward, MAX_STAMINA, STAMINA_REGEN_MINUTES, DUNGEON_DAILY_LIMIT,
} from '@shared/data/dungeonDefs.ts';
import type { DungeonDef, DungeonDifficulty, DungeonReward } from '@shared/data/dungeonDefs.ts';

const GW = TILE_SIZE * MAP_WIDTH;
const GH = TILE_SIZE * MAP_HEIGHT + 60;

interface DungeonUnit {
  data: UnitData;
  hp: number; maxHp: number;
  attack: number; defense: number; speed: number; spirit: number;
  alive: boolean; side: 'player' | 'enemy';
  mp: number; maxMp: number;
  skillCooldowns: Record<string, number>;
}

export class DailyDungeonScene extends Phaser.Scene {
  private campaignManager!: CampaignManager;
  private selectedDungeon: DungeonDef | null = null;
  private selectedDifficulty: DungeonDifficulty | null = null;
  private battleUnits: DungeonUnit[] = [];
  private battleSpeed = 1;

  constructor() {
    super('DailyDungeonScene');
  }

  init(data: { campaignManager: CampaignManager }) {
    this.campaignManager = data.campaignManager;
  }

  create(): void {
    (this.registry.get('audioManager') as AudioManager)?.playBgm('battle');
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
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c1a10, 0x0c1a10, 0x0c1220, 0x0c1220, 1);
    bg.fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 18, '🏰 일일 던전', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const backBg = this.add.graphics();
    backBg.fillStyle(0x1a1a3a, 1).fillRoundedRect(10, 8, 55, 24, 6);
    const backBtn = this.add.text(37, 20, '← 홈', {
      fontSize: '11px', color: '#88aacc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('LobbyScene', { campaignManager: this.campaignManager }));

    // 스태미나 표시
    const progress = this.campaignManager.getProgress();
    const stamina = progress.stamina ?? MAX_STAMINA;
    this.add.text(GW / 2, 42, `⚡ 스태미나: ${stamina} / ${MAX_STAMINA}`, {
      fontSize: '13px', color: stamina > 20 ? '#44ff44' : '#ff4444',
    }).setOrigin(0.5);

    // 오늘 던전 목록
    const todayDungeons = getTodayDungeons();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date().getDay();
    this.add.text(GW / 2, 62, `오늘: ${dayNames[today]}요일`, {
      fontSize: '10px', color: '#888888',
    }).setOrigin(0.5);

    if (todayDungeons.length === 0) {
      this.add.text(GW / 2, GH * 0.4, '오늘은 열린 던전이 없습니다', {
        fontSize: '14px', color: '#555555',
      }).setOrigin(0.5);
      return;
    }

    const startY = 80;
    for (let i = 0; i < todayDungeons.length; i++) {
      const dungeon = todayDungeons[i];
      const y = startY + i * 80;

      const bg = this.add.graphics();
      bg.fillStyle(0x1a2a3a, 1).fillRoundedRect(15, y, GW - 30, 72, 6);
      bg.lineStyle(1, 0x3366aa, 1).strokeRoundedRect(15, y, GW - 30, 72, 6);

      this.add.text(25, y + 8, `${dungeon.icon} ${dungeon.name}`, {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      });
      this.add.text(25, y + 28, dungeon.description, {
        fontSize: '10px', color: '#888888',
      });

      // 난이도 버튼
      for (let d = 0; d < dungeon.difficulties.length; d++) {
        const diff = dungeon.difficulties[d];
        const key = `${dungeon.id}_${diff.level}`;
        const clears = (progress.dungeonClears ?? {})[key] ?? 0;
        const stars = (progress.dungeonStars ?? {})[key] ?? 0;
        const canPlay = clears < DUNGEON_DAILY_LIMIT && stamina >= diff.stamina;

        const btnX = 25 + d * 100;
        const btnColor = canPlay ? (d === 0 ? '#2a4a2a' : d === 1 ? '#3a3a2a' : '#4a2a2a') : '#222222';
        const btn = this.add.text(btnX, y + 44, `${diff.label} (${diff.stamina}⚡) ${'★'.repeat(stars)}`, {
          fontSize: '10px', color: canPlay ? '#ffffff' : '#555555',
          backgroundColor: btnColor, padding: { x: 6, y: 4 },
        }).setInteractive({ useHandCursor: canPlay });

        if (canPlay) {
          btn.on('pointerdown', () => this.showTeamSelect(dungeon, diff));
        }

        // 남은 횟수
        this.add.text(btnX + 80, y + 46, `${clears}/${DUNGEON_DAILY_LIMIT}`, {
          fontSize: '8px', color: '#666666',
        });
      }
    }
  }

  // ── 팀 선택 ──

  private showTeamSelect(dungeon: DungeonDef, difficulty: DungeonDifficulty): void {
    this.selectedDungeon = dungeon;
    this.selectedDifficulty = difficulty;
    this.children.removeAll();
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 15, `${dungeon.icon} ${dungeon.name} - ${difficulty.label}`, {
      fontSize: '18px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    const backBtn = this.add.text(20, 10, '← 뒤로', {
      fontSize: '12px', color: '#aaaaaa', backgroundColor: '#1a1a3a', padding: { x: 6, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showDungeonList());

    this.add.text(GW / 2, 40, `웨이브 ${difficulty.waves}  |  적 Lv.${difficulty.enemyLevel}  |  ⚡${difficulty.stamina}`, {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 장수 목록 (전체 선택 → 상위 5명 자동 출전)
    this.add.text(GW / 2, 60, '보유 장수 중 상위 5명이 자동 출전합니다', {
      fontSize: '10px', color: '#888888',
    }).setOrigin(0.5);

    const units = this.campaignManager.getProgress().playerUnits;
    const sortedUnits = [...units].sort((a, b) => (b.level ?? 1) - (a.level ?? 1)).slice(0, 5);

    const startY = 80;
    for (let i = 0; i < sortedUnits.length; i++) {
      const unit = sortedUnits[i];
      const y = startY + i * 35;
      const grade = unit.grade ?? 'N';
      const gradeColor = getGradeColor(grade as HeroGrade);
      const cls = unit.unitClass ? UNIT_CLASS_DEFS[unit.unitClass]?.name ?? '' : '';

      this.add.text(20, y, `[${grade}]`, { fontSize: '10px', color: gradeColor, fontStyle: 'bold' });
      this.add.text(48, y, `${unit.name}  ${cls} Lv.${unit.level ?? 1}`, {
        fontSize: '12px', color: '#ffffff',
      });
      this.add.text(GW - 60, y, `ATK:${unit.stats.attack}`, { fontSize: '9px', color: '#888888' });
    }

    // 전투 시작 버튼
    const startBtn = this.add.text(GW / 2, GH - 40, '⚔️ 전투 시작', {
      fontSize: '18px', color: '#ffffff', backgroundColor: '#aa3333',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startBtn.on('pointerdown', () => this.startDungeonBattle(sortedUnits));

    // 소탕 버튼 (★3 클리어 시)
    const key = `${dungeon.id}_${difficulty.level}`;
    const stars = (this.campaignManager.getProgress().dungeonStars ?? {})[key] ?? 0;
    if (stars >= 3) {
      const sweepBtn = this.add.text(GW / 2, GH - 80, '🧹 소탕 (전투 스킵)', {
        fontSize: '14px', color: '#44ff44', backgroundColor: '#1a3a1a',
        padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      sweepBtn.on('pointerdown', () => this.executeSweep());
    }
  }

  // ── 소탕 ──

  private executeSweep(): void {
    if (!this.selectedDungeon || !this.selectedDifficulty) return;
    const progress = this.campaignManager.getProgress();
    const diff = this.selectedDifficulty;

    progress.stamina = (progress.stamina ?? 0) - diff.stamina;
    const key = `${this.selectedDungeon.id}_${diff.level}`;
    if (!progress.dungeonClears) progress.dungeonClears = {};
    progress.dungeonClears[key] = (progress.dungeonClears[key] ?? 0) + 1;

    const reward = generateReward(this.selectedDungeon.id, diff);
    this.applyReward(reward);
    this.campaignManager.save();
    this.showResult(3, reward, true);
  }

  // ── 전투 시작 ──

  private startDungeonBattle(playerUnits: UnitData[]): void {
    if (!this.selectedDungeon || !this.selectedDifficulty) return;
    const progress = this.campaignManager.getProgress();
    progress.stamina = (progress.stamina ?? 0) - this.selectedDifficulty.stamina;

    this.battleUnits = [];

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

  private showWaveBattle(waveNum: number): void {
    this.children.removeAll();
    this.unitContainers.clear();
    const diff = this.selectedDifficulty!;
    const isBoss = waveNum === diff.waves;

    // 배경
    const bg = this.add.graphics();
    bg.fillGradientStyle(isBoss ? 0x200a0a : 0x0a1a10, isBoss ? 0x200a0a : 0x0a1a10, 0x0a0a1a, 0x0a0a1a, 1);
    bg.fillRect(0, 0, GW, GH);

    // 중앙 전장 라인
    const line = this.add.graphics();
    line.lineStyle(1, 0x333344, 0.3);
    line.lineBetween(GW / 2, 35, GW / 2, GH - 120);

    // 웨이브 표시
    this.add.text(GW / 2, 14, `⚔️ Wave ${waveNum}/${diff.waves}${isBoss ? ' 🔥BOSS' : ''}`, {
      fontSize: '14px', color: isBoss ? '#ff4444' : '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    // 배속 버튼
    const speedBtn = this.add.text(GW - 40, 8, `${this.battleSpeed}x`, {
      fontSize: '13px', color: '#ffffff', backgroundColor: '#000000cc', padding: { x: 6, y: 4 },
    }).setInteractive({ useHandCursor: true }).setDepth(50);
    speedBtn.on('pointerdown', () => {
      this.battleSpeed = this.battleSpeed === 1 ? 2 : this.battleSpeed === 2 ? 3 : 1;
      speedBtn.setText(`${this.battleSpeed}x`);
    });

    // 아군 (좌측)
    const players = this.battleUnits.filter(u => u.side === 'player');
    const enemies = this.battleUnits.filter(u => u.side === 'enemy' && u.alive);
    const unitH = 48;
    const cardW = 125;

    for (let i = 0; i < players.length; i++) {
      const u = players[i];
      const y = 36 + i * unitH;
      const c = this.createDungeonUnitCard(u, 10, y, cardW, true);
      this.unitContainers.set(u.data.id, c);
    }

    // 적군 (우측, 슬라이드 인)
    for (let i = 0; i < enemies.length; i++) {
      const u = enemies[i];
      const y = 36 + i * unitH;
      const c = this.createDungeonUnitCard(u, GW + 30, y, cardW, false);
      this.unitContainers.set(u.data.id, c);
      this.tweens.add({
        targets: c, x: GW - cardW - 10, duration: 400, ease: 'Back.easeOut', delay: i * 100,
      });
    }

    // 전투 로그
    const logBg = this.add.graphics();
    logBg.fillStyle(0x0a0a14, 0.85).fillRoundedRect(8, GH - 115, GW - 16, 108, 8);
    logBg.lineStyle(1, 0x2a2a44, 0.5).strokeRoundedRect(8, GH - 115, GW - 16, 108, 8);
    this.add.text(GW / 2, GH - 110, '── 전투 로그 ──', { fontSize: '9px', color: '#555566' }).setOrigin(0.5);

    const logTexts: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < 5; i++) {
      logTexts.push(this.add.text(18, GH - 96 + i * 18, '', { fontSize: '10px', color: '#aaaaaa' }));
    }

    this.time.delayedCall(600 + enemies.length * 100, () => {
      this.executeWaveBattle(waveNum, logTexts);
    });
  }

  private createDungeonUnitCard(u: DungeonUnit, x: number, y: number, w: number, isPlayer: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const h = 42;

    const card = this.add.graphics();
    card.fillStyle(isPlayer ? 0x1a2a4a : 0x4a1a1a, 0.85);
    card.fillRoundedRect(0, 0, w, h, 5);
    card.lineStyle(1, isPlayer ? 0x3366aa : 0xaa3333, 0.5);
    card.strokeRoundedRect(0, 0, w, h, 5);
    container.add(card);

    const clsIcons: Record<string, string> = {
      cavalry: '🐎', infantry: '🛡️', archer: '🏹',
      strategist: '📜', martial_artist: '👊', bandit: '🗡️',
    };
    const icon = this.add.text(6, h / 2, clsIcons[u.data.unitClass ?? 'infantry'] ?? '⚔️', { fontSize: '14px' }).setOrigin(0, 0.5);
    container.add(icon);

    const name = this.add.text(24, 5, u.data.name, { fontSize: '10px', color: '#ffffff', fontStyle: 'bold' });
    container.add(name);

    const hpText = this.add.text(w - 5, 5, `${u.hp}`, { fontSize: '8px', color: '#aaaaaa' }).setOrigin(1, 0);
    container.add(hpText);

    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x222233, 1).fillRoundedRect(24, 20, w - 30, 6, 3);
    container.add(hpBg);

    const hpBar = this.add.graphics();
    const ratio = u.hp / u.maxHp;
    hpBar.fillStyle(ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000, 1);
    hpBar.fillRoundedRect(24, 20, (w - 30) * ratio, 6, 3);
    container.add(hpBar);

    const mpBar = this.add.graphics();
    mpBar.fillStyle(0x4488ff, 1).fillRoundedRect(24, 28, (w - 30) * (u.mp / Math.max(1, u.maxMp)), 3, 2);
    container.add(mpBar);

    if (!u.alive) container.setAlpha(0.15);
    return container;
  }

  private updateDungeonCards(): void {
    for (const unit of this.battleUnits) {
      const c = this.unitContainers.get(unit.data.id);
      if (!c) continue;
      const w = 125;
      const hpBar = c.getAt(5) as Phaser.GameObjects.Graphics;
      hpBar.clear();
      if (unit.alive) {
        const ratio = unit.hp / unit.maxHp;
        hpBar.fillStyle(ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000, 1);
        hpBar.fillRoundedRect(24, 20, (w - 30) * ratio, 6, 3);
      }
      const hpText = c.getAt(3) as Phaser.GameObjects.Text;
      hpText.setText(`${Math.max(0, unit.hp)}`);
      if (!unit.alive) c.setAlpha(0.15);
    }
  }

  private executeWaveBattle(waveNum: number, logTexts: Phaser.GameObjects.Text[]): void {
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      const show = logs.slice(-4);
      for (let i = 0; i < logTexts.length; i++) logTexts[i].setText(show[i] ?? '');
    };

    let turnCount = 0;
    const doTurn = () => {
      if (turnCount >= 20) { this.onWaveEnd(waveNum, false); return; }

      const alive = this.battleUnits.filter(u => u.alive);
      const players = alive.filter(u => u.side === 'player');
      const enemies = alive.filter(u => u.side === 'enemy');

      if (players.length === 0) { this.onWaveEnd(waveNum, false); return; }
      if (enemies.length === 0) { this.onWaveEnd(waveNum, true); return; }

      turnCount++;
      const sorted = [...alive].sort((a, b) => b.speed - a.speed + (Math.random() - 0.5) * 2);

      let idx = 0;
      const doAction = () => {
        if (idx >= sorted.length) {
          // 쿨다운 감소
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

        const targets = this.battleUnits.filter(u => u.side !== unit.side && u.alive);
        if (targets.length === 0) { doAction(); return; }

        const target = targets.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

        // 데미지 계산
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

        // 공격 애니메이션: 유닛 전진 → 복귀
        const atkContainer = this.unitContainers.get(unit.data.id);
        const defContainer = this.unitContainers.get(target.data.id);
        if (atkContainer) {
          const origX = atkContainer.x;
          const moveDir = unit.side === 'player' ? 30 : -30;
          this.tweens.add({
            targets: atkContainer, x: origX + moveDir, duration: 120 / this.battleSpeed, yoyo: true,
          });
        }

        this.time.delayedCall(250 / this.battleSpeed, () => {
          if (missed) {
            addLog(`${unit.data.name} → ${target.data.name} (빗나감!)`);
            // MISS 텍스트
            if (defContainer) {
              const missText = this.add.text(defContainer.x + 60, defContainer.y, 'MISS', {
                fontSize: '12px', color: '#888888', fontStyle: 'bold',
              }).setOrigin(0.5).setDepth(100);
              this.tweens.add({ targets: missText, y: missText.y - 20, alpha: 0, duration: 600, onComplete: () => missText.destroy() });
            }
          } else {
            target.hp -= damage;
            let msg = `${unit.data.name} → ${target.data.name} (${damage}${isCrit ? ' 크리!' : ''})`;
            if (target.hp <= 0) { target.hp = 0; target.alive = false; msg += ' 격파!'; }
            addLog(msg);
            // 데미지 팝업
            if (defContainer) {
              const dmgColor = isCrit ? '#ffaa00' : '#ff4444';
              const dmgText = this.add.text(defContainer.x + 60, defContainer.y, `-${damage}`, {
                fontSize: '14px', color: dmgColor, fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
              }).setOrigin(0.5).setDepth(100);
              this.tweens.add({ targets: dmgText, y: dmgText.y - 25, alpha: 0, duration: 700, onComplete: () => dmgText.destroy() });
              // 피격 흔들림
              const ox = defContainer.x;
              this.tweens.add({ targets: defContainer, x: ox + 4, duration: 40, yoyo: true, repeat: 3, onComplete: () => { defContainer.x = ox; } });
            }
          }
          this.updateDungeonCards();
          this.time.delayedCall(300 / this.battleSpeed, doAction);
        });
      };

      doAction();
    };

    this.time.delayedCall(500, doTurn);
  }

  private onWaveEnd(waveNum: number, cleared: boolean): void {
    if (!cleared) {
      // 패배
      const reward = generateReward(this.selectedDungeon!.id, this.selectedDifficulty!);
      reward.gold = Math.floor(reward.gold * 0.3); // 패배 시 30% 보상
      reward.equipment = undefined;
      reward.skills = undefined;
      this.applyReward(reward);
      this.campaignManager.save();
      this.showResult(0, reward, false);
      return;
    }

    const diff = this.selectedDifficulty!;
    if (waveNum < diff.waves) {
      // 다음 웨이브
      this.time.delayedCall(500, () => this.runWave(waveNum + 1));
    } else {
      // 전체 클리어
      const survivors = this.battleUnits.filter(u => u.side === 'player' && u.alive);
      const stars = survivors.length === this.battleUnits.filter(u => u.side === 'player').length ? 3
        : survivors.length >= 2 ? 2 : 1;

      const key = `${this.selectedDungeon!.id}_${diff.level}`;
      const progress = this.campaignManager.getProgress();
      if (!progress.dungeonClears) progress.dungeonClears = {};
      progress.dungeonClears[key] = (progress.dungeonClears[key] ?? 0) + 1;
      if (!progress.dungeonStars) progress.dungeonStars = {};
      if ((progress.dungeonStars[key] ?? 0) < stars) progress.dungeonStars[key] = stars;

      const reward = generateReward(this.selectedDungeon!.id, diff);
      this.applyReward(reward);
      this.campaignManager.save();
      this.showResult(stars, reward, false);
    }
  }

  // ── 보상 적용 ──

  private applyReward(reward: DungeonReward): void {
    const progress = this.campaignManager.getProgress();
    progress.gold += reward.gold;
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
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    const resultText = stars > 0 ? (isSweep ? '소탕 완료!' : '클리어!') : '패배...';
    const resultColor = stars > 0 ? '#ffd700' : '#ff4444';

    this.add.text(GW / 2, GH * 0.12, resultText, {
      fontSize: '32px', color: resultColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    // 별 표시
    if (stars > 0) {
      const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      this.add.text(GW / 2, GH * 0.22, starText, {
        fontSize: '28px', color: '#ffd700',
      }).setOrigin(0.5);
    }

    // 보상
    let y = GH * 0.35;
    this.add.text(GW / 2, y, '── 보상 ──', {
      fontSize: '14px', color: '#88aacc', fontStyle: 'bold',
    }).setOrigin(0.5);
    y += 25;

    this.add.text(GW / 2, y, `💰 금화 +${reward.gold}`, {
      fontSize: '14px', color: '#ffaa00',
    }).setOrigin(0.5);
    y += 22;

    if (reward.equipment && reward.equipment.length > 0) {
      const names = reward.equipment.map(e => EQUIPMENT_DEFS[e]?.name ?? e).join(', ');
      this.add.text(GW / 2, y, `⚔️ ${names}`, {
        fontSize: '12px', color: '#44ccff',
      }).setOrigin(0.5);
      y += 20;
    }

    if (reward.skills && reward.skills.length > 0) {
      const names = reward.skills.map(s => SKILL_DEFS[s]?.name ?? s).join(', ');
      this.add.text(GW / 2, y, `✨ ${names}`, {
        fontSize: '12px', color: '#cc88ff',
      }).setOrigin(0.5);
      y += 20;
    }

    if (reward.materials) {
      for (const [k, v] of Object.entries(reward.materials)) {
        this.add.text(GW / 2, y, `📦 ${k} x${v}`, {
          fontSize: '12px', color: '#88cc88',
        }).setOrigin(0.5);
        y += 18;
      }
    }

    // 버튼
    const retryBtn = this.add.text(GW / 2 - 70, GH - 40, '다시 도전', {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#3366aa', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => this.showDungeonList());

    const lobbyBtn = this.add.text(GW / 2 + 70, GH - 40, '로비로', {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#2a2a4a', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lobbyBtn.on('pointerdown', () => this.scene.start('LobbyScene', { campaignManager: this.campaignManager }));
  }
}
