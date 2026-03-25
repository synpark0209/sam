import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import type { UnitData } from '@shared/types/index.ts';
import { UnitClass } from '@shared/types/index.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { AudioManager } from '../systems/AudioManager.ts';
import { getGradeColor } from '@shared/data/gachaDefs.ts';
import type { HeroGrade } from '@shared/data/gachaDefs.ts';

const GW = TILE_SIZE * MAP_WIDTH;
const GH = TILE_SIZE * MAP_HEIGHT + 60;
const GRID_COLS = 4;
const GRID_ROWS = 3;
const CELL_W = 80;
const CELL_H = 70;
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
  alive: boolean;
  side: 'player' | 'enemy';
  sprite?: Phaser.GameObjects.Container;
}

export class PvPArenaScene extends Phaser.Scene {
  private campaignManager!: CampaignManager;
  private playerSlots: (UnitData | null)[] = Array(GRID_COLS * GRID_ROWS).fill(null);
  private deployedCount = 0;
  private battleUnits: ArenaUnit[] = [];
  private battleSpeed = 1;
  private battleLog: string[] = [];

  constructor() {
    super('PvPArenaScene');
  }

  init(data: { campaignManager: CampaignManager }) {
    this.campaignManager = data.campaignManager;
  }

  create(): void {
    (this.registry.get('audioManager') as AudioManager)?.playBgm('battle');
    this.playerSlots = Array(GRID_COLS * GRID_ROWS).fill(null);
    this.deployedCount = 0;
    this.showDeployPhase();
  }

  // ── 배치 화면 ──

  private showDeployPhase(): void {
    this.children.removeAll();
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 15, '⚔️ PvP 아레나 - 배치', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    const backBtn = this.add.text(20, 10, '← 뒤로', {
      fontSize: '12px', color: '#aaaaaa', backgroundColor: '#1a1a3a', padding: { x: 6, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('LobbyScene', { campaignManager: this.campaignManager }));

    this.add.text(GW / 2, 38, `장수를 배치하세요 (${this.deployedCount}/${MAX_DEPLOY})`, {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 3x4 그리드 그리기
    const gridX = (GW - GRID_COLS * CELL_W) / 2;
    const gridY = 55;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = gridX + c * CELL_W;
        const y = gridY + r * CELL_H;
        const idx = r * GRID_COLS + c;
        const unit = this.playerSlots[idx];

        const bg = this.add.graphics();
        bg.fillStyle(unit ? 0x1a3a4a : 0x1a1a2a, 1);
        bg.fillRoundedRect(x, y, CELL_W - 4, CELL_H - 4, 4);
        bg.lineStyle(1, unit ? 0x4488aa : 0x333344, 1);
        bg.strokeRoundedRect(x, y, CELL_W - 4, CELL_H - 4, 4);

        if (unit) {
          const grade = unit.grade ?? 'N';
          const gradeColor = getGradeColor(grade as HeroGrade);
          this.add.text(x + (CELL_W - 4) / 2, y + 10, `[${grade}]`, {
            fontSize: '9px', color: gradeColor, fontStyle: 'bold',
          }).setOrigin(0.5);
          this.add.text(x + (CELL_W - 4) / 2, y + 25, unit.name, {
            fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
          }).setOrigin(0.5);
          const cls = unit.unitClass ? UNIT_CLASS_DEFS[unit.unitClass]?.name ?? '' : '';
          this.add.text(x + (CELL_W - 4) / 2, y + 40, `${cls} Lv.${unit.level ?? 1}`, {
            fontSize: '9px', color: '#88aacc',
          }).setOrigin(0.5);

          // 제거 버튼
          const removeBtn = this.add.text(x + CELL_W - 12, y + 2, '×', {
            fontSize: '12px', color: '#ff6666',
          }).setInteractive({ useHandCursor: true });
          removeBtn.on('pointerdown', () => {
            this.playerSlots[idx] = null;
            this.deployedCount--;
            this.showDeployPhase();
          });
        } else {
          this.add.text(x + (CELL_W - 4) / 2, y + (CELL_H - 4) / 2, '빈칸', {
            fontSize: '10px', color: '#444444',
          }).setOrigin(0.5);
        }
      }
    }

    // 장수 목록 (배치 가능)
    const listY = gridY + GRID_ROWS * CELL_H + 15;
    this.add.text(15, listY, '── 장수 선택 ──', {
      fontSize: '12px', color: '#88aacc', fontStyle: 'bold',
    });

    const allUnits = this.campaignManager.getProgress().playerUnits;
    const deployedIds = new Set(this.playerSlots.filter(Boolean).map(u => u!.id));
    const available = allUnits.filter(u => !deployedIds.has(u.id));

    const itemH = 32;
    for (let i = 0; i < Math.min(available.length, 6); i++) {
      const unit = available[i];
      const y = listY + 22 + i * itemH;
      const grade = unit.grade ?? 'N';
      const gradeColor = getGradeColor(grade as HeroGrade);

      this.add.text(15, y, `[${grade}]`, { fontSize: '10px', color: gradeColor, fontStyle: 'bold' });
      this.add.text(40, y, `${unit.name} Lv.${unit.level ?? 1}`, { fontSize: '11px', color: '#ffffff' });

      if (this.deployedCount < MAX_DEPLOY) {
        const addBtn = this.add.text(GW - 60, y, '배치', {
          fontSize: '10px', color: '#ffffff', backgroundColor: '#3366aa', padding: { x: 8, y: 3 },
        }).setInteractive({ useHandCursor: true });
        addBtn.on('pointerdown', () => {
          // 빈 슬롯 찾기
          const emptyIdx = this.playerSlots.findIndex(s => s === null);
          if (emptyIdx >= 0) {
            this.playerSlots[emptyIdx] = unit;
            this.deployedCount++;
            this.showDeployPhase();
          }
        });
      }
    }

    // 전투 시작 버튼
    if (this.deployedCount > 0) {
      const startBtn = this.add.text(GW / 2, GH - 30, '⚔️ 전투 시작', {
        fontSize: '18px', color: '#ffffff', backgroundColor: '#aa3333',
        padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      startBtn.on('pointerdown', () => this.startArenaBattle());
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
        speed: u.stats.speed, alive: true,
      });
    }

    // 적군 유닛 생성 (AI 랜덤 팀)
    const enemyPool = this.generateEnemyTeam(deployed.length);
    for (let i = 0; i < enemyPool.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      this.battleUnits.push({
        data: enemyPool[i], col: GRID_COLS - 1 - col, row, side: 'enemy',
        hp: enemyPool[i].stats.maxHp, maxHp: enemyPool[i].stats.maxHp,
        attack: enemyPool[i].stats.attack, defense: enemyPool[i].stats.defense,
        speed: enemyPool[i].stats.speed, alive: true,
      });
    }

    this.showBattlePhase();
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
          speed: 4 + Math.floor(Math.random() * 3), moveRange: 4, attackRange: 1,
        },
        hasActed: false, isAlive: true,
      });
    }
    return team;
  }

  private showBattlePhase(): void {
    this.children.removeAll();
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 10, '⚔️ 전투 진행 중...', {
      fontSize: '18px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 전장 그리드 (왼쪽: 아군, 오른쪽: 적군)
    const fieldX = 30;
    const fieldY = 40;
    const cellW = (GW - 60) / (GRID_COLS * 2 + 1);
    const cellH = 55;

    // 유닛 스프라이트 배치
    for (const unit of this.battleUnits) {
      const isPlayer = unit.side === 'player';
      const x = fieldX + (isPlayer ? unit.col : GRID_COLS * 2 - unit.col) * cellW + cellW / 2;
      const y = fieldY + unit.row * cellH + cellH / 2;

      const container = this.add.container(x, y);

      // 유닛 표시 (간단한 텍스트)
      const bgColor = isPlayer ? 0x2244aa : 0xaa2222;
      const bg = this.add.graphics();
      bg.fillStyle(bgColor, 0.6).fillRoundedRect(-28, -22, 56, 44, 4);
      container.add(bg);

      const nameText = this.add.text(0, -10, unit.data.name, {
        fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(nameText);

      // HP 바
      const hpBg = this.add.graphics();
      hpBg.fillStyle(0x333333, 1).fillRect(-20, 8, 40, 4);
      container.add(hpBg);

      const hpBar = this.add.graphics();
      hpBar.fillStyle(0x00ff00, 1).fillRect(-20, 8, 40, 4);
      container.add(hpBar);

      unit.sprite = container;
    }

    // 전투 실행 (턴 기반 자동)
    this.executeBattleTurns();
  }

  private executeBattleTurns(): void {
    let turnCount = 0;
    const maxTurns = 30;

    const doTurn = () => {
      if (turnCount >= maxTurns) {
        this.endBattle('timeout');
        return;
      }

      const alive = this.battleUnits.filter(u => u.alive);
      const players = alive.filter(u => u.side === 'player');
      const enemies = alive.filter(u => u.side === 'enemy');

      if (players.length === 0) { this.endBattle('lose'); return; }
      if (enemies.length === 0) { this.endBattle('win'); return; }

      // 속도순 정렬
      const sorted = [...alive].sort((a, b) => b.speed - a.speed);

      for (const unit of sorted) {
        if (!unit.alive) continue;

        const targets = alive.filter(u => u.side !== unit.side && u.alive);
        if (targets.length === 0) break;

        // 가장 약한 적 공격
        const target = targets.sort((a, b) => a.hp - b.hp)[0];
        const damage = Math.max(1, unit.attack - target.defense + Math.floor(Math.random() * 10));
        target.hp -= damage;

        this.battleLog.push(`${unit.data.name} → ${target.data.name} (${damage} 데미지)`);

        if (target.hp <= 0) {
          target.hp = 0;
          target.alive = false;
          this.battleLog.push(`${target.data.name} 격파!`);
        }
      }

      // HP 바 업데이트
      for (const unit of this.battleUnits) {
        if (!unit.sprite) continue;
        const hpBar = unit.sprite.getAt(3) as Phaser.GameObjects.Graphics;
        hpBar.clear();
        if (unit.alive) {
          const ratio = unit.hp / unit.maxHp;
          const color = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000;
          hpBar.fillStyle(color, 1).fillRect(-20, 8, 40 * ratio, 4);
        }
        if (!unit.alive) unit.sprite.setAlpha(0.3);
      }

      turnCount++;

      // 다음 턴
      const players2 = this.battleUnits.filter(u => u.side === 'player' && u.alive);
      const enemies2 = this.battleUnits.filter(u => u.side === 'enemy' && u.alive);
      if (players2.length > 0 && enemies2.length > 0) {
        this.time.delayedCall(800 / this.battleSpeed, doTurn);
      } else if (players2.length === 0) {
        this.time.delayedCall(500, () => this.endBattle('lose'));
      } else {
        this.time.delayedCall(500, () => this.endBattle('win'));
      }
    };

    this.time.delayedCall(500, doTurn);
  }

  private endBattle(result: 'win' | 'lose' | 'timeout'): void {
    // result phase
    this.children.removeAll();
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    const resultText = result === 'win' ? '승리!' : result === 'lose' ? '패배...' : '시간 초과';
    const resultColor = result === 'win' ? '#ffd700' : '#ff4444';

    this.add.text(GW / 2, GH * 0.2, resultText, {
      fontSize: '36px', color: resultColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    // 보상
    if (result === 'win') {
      const gold = 500 + Math.floor(Math.random() * 500);
      const progress = this.campaignManager.getProgress();
      progress.gold += gold;
      this.campaignManager.save();

      this.add.text(GW / 2, GH * 0.35, `💰 금화 +${gold}`, {
        fontSize: '16px', color: '#ffaa00',
      }).setOrigin(0.5);
    }

    // 전투 로그
    const logY = GH * 0.45;
    this.add.text(GW / 2, logY, '── 전투 기록 ──', {
      fontSize: '12px', color: '#666666',
    }).setOrigin(0.5);

    const lastLogs = this.battleLog.slice(-8);
    for (let i = 0; i < lastLogs.length; i++) {
      this.add.text(GW / 2, logY + 18 + i * 16, lastLogs[i], {
        fontSize: '10px', color: '#888888',
      }).setOrigin(0.5);
    }

    // 버튼
    const retryBtn = this.add.text(GW / 2 - 70, GH - 40, '다시 도전', {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#aa3333', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => {
      this.playerSlots = Array(GRID_COLS * GRID_ROWS).fill(null);
      this.deployedCount = 0;
      this.showDeployPhase();
    });

    const lobbyBtn = this.add.text(GW / 2 + 70, GH - 40, '로비로', {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#2a2a4a', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lobbyBtn.on('pointerdown', () => this.scene.start('LobbyScene', { campaignManager: this.campaignManager }));
  }
}
