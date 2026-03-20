import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import type { Position, UnitData, BattleState, Faction } from '@shared/types/index.ts';
import { UnitClass } from '@shared/types/index.ts';
import type { SkillDef } from '@shared/types/skill.ts';
import { GridSystem } from '../systems/GridSystem.ts';
import { CombatSystem } from '../systems/CombatSystem.ts';
import { TurnSystem } from '../systems/TurnSystem.ts';
import { AISystem } from '../systems/AISystem.ts';
import { SkillSystem } from '../systems/SkillSystem.ts';
import { ExperienceSystem } from '../systems/ExperienceSystem.ts';
import {
  generateUnitSpritesheet, createUnitAnimations,
  generateTileset, getTileFrame, generateEffectSprites,
} from '../systems/SpriteGenerator.ts';
import {
  preloadUnitImages, hasUnitImage, createImageSprite, playImageAnim,
} from '../systems/UnitSpriteManager.ts';
import { TEST_MAP, TEST_UNITS } from '../data/testBattle.ts';
import { EventBus } from '../EventBus.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { Stage, BattleConfig } from '@shared/types/campaign.ts';
import { pvpRecordResult } from '../../api/client.ts';

type InteractionState =
  | 'IDLE'
  | 'UNIT_SELECTED'
  | 'AWAITING_ACTION'
  | 'AWAITING_ATTACK'
  | 'SKILL_TARGETING'
  | 'MOVING'
  | 'ANIMATING'
  | 'ENEMY_TURN'
  | 'GAME_OVER';

const UI_BAR_Y = MAP_HEIGHT * TILE_SIZE;

export class BattleScene extends Phaser.Scene {
  private battleState!: BattleState;
  private gridSystem!: GridSystem;
  private combatSystem!: CombatSystem;
  private turnSystem!: TurnSystem;
  private aiSystem!: AISystem;
  private skillSystem!: SkillSystem;
  private expSystem!: ExperienceSystem;

  private interactionState: InteractionState = 'IDLE';
  private selectedUnit: UnitData | null = null;
  private movementTiles: Position[] = [];
  private attackTiles: Position[] = [];
  private skillTargetTiles: Position[] = [];
  private skillRangeTiles: Position[] = [];
  private attackRangeTiles: Position[] = [];
  private enemyPreviewMoveTiles: Position[] = [];
  private enemyPreviewAttackTiles: Position[] = [];
  private activeSkill: SkillDef | null = null;
  private preMovePosition: Position | null = null; // 이동 취소용 원래 위치

  // Phaser display objects
  private tileGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private turnText!: Phaser.GameObjects.Text;
  private endTurnButton!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private actionMenu: Phaser.GameObjects.Text[] = [];
  private _menuClickConsumed = false;
  private imageUnits: Set<string> = new Set(); // 이미지 기반 유닛 ID 추적

  // 캠페인 모드
  private campaignMode = false;
  private campaignManager?: CampaignManager;
  private campaignStage?: Stage;
  private externalBattleConfig?: BattleConfig;
  private externalPlayerUnits?: UnitData[];

  // PvP 모드
  private pvpMode = false;
  private pvpOpponentId?: number;
  // pvpOpponentName은 향후 UI 표시용으로 보존

  constructor() {
    super('BattleScene');
  }

  init(data?: {
    campaignMode?: boolean;
    campaignManager?: CampaignManager;
    stage?: Stage;
    battleConfig?: BattleConfig;
    playerUnits?: UnitData[];
    pvpMode?: boolean;
    pvpOpponentId?: number;
    pvpOpponentName?: string;
  }) {
    this.campaignMode = data?.campaignMode ?? false;
    this.campaignManager = data?.campaignManager;
    this.campaignStage = data?.stage;
    this.externalBattleConfig = data?.battleConfig;
    this.externalPlayerUnits = data?.playerUnits;
    this.pvpMode = data?.pvpMode ?? false;
    this.pvpOpponentId = data?.pvpOpponentId;
    void data?.pvpOpponentName;
  }

  preload(): void {
    preloadUnitImages(this);
  }

  create(): void {
    // 씬 재시작 시 모든 상태 리셋 (Phaser는 인스턴스를 재사용함)
    this.interactionState = 'IDLE';
    this.selectedUnit = null;
    this.movementTiles = [];
    this.attackTiles = [];
    this.skillTargetTiles = [];
    this.skillRangeTiles = [];
    this.attackRangeTiles = [];
    this.enemyPreviewMoveTiles = [];
    this.enemyPreviewAttackTiles = [];
    this.activeSkill = null;
    this.preMovePosition = null;
    this.unitSprites = new Map();
    this.imageUnits = new Set();
    this.actionMenu = [];
    this._menuClickConsumed = false;

    let units: UnitData[];
    let mapW: number;
    let mapH: number;
    let tiles: import('@shared/types/index.ts').TileData[][];

    const hasExternalConfig = this.externalBattleConfig && (this.campaignMode || this.pvpMode);
    if (hasExternalConfig && this.externalBattleConfig) {
      const bc = this.externalBattleConfig;
      mapW = bc.mapWidth;
      mapH = bc.mapHeight;
      tiles = bc.tiles;
      units = [
        ...(this.externalPlayerUnits ?? []).map(u => ({
          ...u, position: { ...u.position }, stats: { ...u.stats },
          skills: u.skills ? [...u.skills] : [], statusEffects: [], skillCooldowns: {},
        })),
        ...bc.enemyUnits.map(u => ({
          ...u, position: { ...u.position }, stats: { ...u.stats },
          skills: u.skills ? [...u.skills] : [], statusEffects: [], skillCooldowns: {},
        })),
      ];
    } else {
      mapW = MAP_WIDTH;
      mapH = MAP_HEIGHT;
      tiles = TEST_MAP;
      units = TEST_UNITS.map(u => ({
        ...u, position: { ...u.position }, stats: { ...u.stats },
        skills: u.skills ? [...u.skills] : [], statusEffects: [], skillCooldowns: {},
      }));
    }

    this.battleState = {
      turn: 0, phase: 'player', units,
      mapWidth: mapW, mapHeight: mapH, tiles,
      selectedUnitId: null, gameOver: false, winner: null,
    };

    this.gridSystem = new GridSystem(this.battleState.tiles, MAP_WIDTH, MAP_HEIGHT);
    this.combatSystem = new CombatSystem();
    this.turnSystem = new TurnSystem(this.battleState);
    this.aiSystem = new AISystem(this.gridSystem, this.combatSystem, this.turnSystem);
    this.skillSystem = new SkillSystem();
    this.expSystem = new ExperienceSystem();

    this.tileGraphics = this.add.graphics().setDepth(1);
    this.overlayGraphics = this.add.graphics().setDepth(5);

    this.drawGrid();
    this.createUnits();
    this.createUI();
    this.setupInput();

    this.turnSystem.startPlayerTurn();
    this.updateTurnUI();

    EventBus.on('end-turn-clicked', this.onEndTurnClicked, this);
    EventBus.emit('current-scene-ready', this);
  }

  // ── 그리드 렌더링 ──

  private drawGrid(): void {
    const tilesetKey = generateTileset(this);

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = this.battleState.tiles[y][x];
        const frame = getTileFrame(tile.type);
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = y * TILE_SIZE + TILE_SIZE / 2;
        this.add.image(px, py, tilesetKey, frame).setDepth(0);
      }
    }

    // 격자선
    this.tileGraphics.clear();
    this.tileGraphics.lineStyle(1, 0x000000, 0.15);
    this.tileGraphics.setDepth(1);
    for (let y = 0; y <= MAP_HEIGHT; y++) {
      this.tileGraphics.lineBetween(0, y * TILE_SIZE, MAP_WIDTH * TILE_SIZE, y * TILE_SIZE);
    }
    for (let x = 0; x <= MAP_WIDTH; x++) {
      this.tileGraphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    }
  }

  // ── 유닛 렌더링 ──

  private createUnits(): void {
    // 스프라이트시트 + 애니메이션 생성
    const classesUsed = new Set<string>();
    for (const unit of this.battleState.units) {
      const uc = unit.unitClass ?? UnitClass.INFANTRY;
      const key = `${uc}_${unit.faction}`;
      if (!classesUsed.has(key)) {
        const texKey = generateUnitSpritesheet(this, uc, unit.faction);
        createUnitAnimations(this, texKey);
        classesUsed.add(key);
      }
    }
    generateEffectSprites(this);

    for (const unit of this.battleState.units) {
      this.createUnitSprite(unit);
    }
  }

  private createUnitSprite(unit: UnitData): void {
    const { x, y } = this.gridToPixel(unit.position);
    const container = this.add.container(x, y);

    const uc = unit.unitClass ?? UnitClass.INFANTRY;
    const useImage = hasUnitImage(this, uc, unit.faction);

    let sprite: Phaser.GameObjects.Sprite;
    if (useImage) {
      sprite = createImageSprite(this, uc, unit.faction)!;
      this.imageUnits.add(unit.id);
      playImageAnim(this, container, sprite, 'idle');
    } else {
      const texKey = `unit_${uc}_${unit.faction}`;
      sprite = this.add.sprite(0, 0, texKey, 0);
      sprite.play(`${texKey}_idle`);
    }

    // 이름 라벨
    const label = this.add.text(0, -TILE_SIZE * 0.44, unit.name.charAt(0), {
      fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    // HP 바 배경
    const hpBarBg = this.add.graphics();
    hpBarBg.fillStyle(0x000000, 0.6);
    hpBarBg.fillRect(-TILE_SIZE * 0.35, TILE_SIZE * 0.32, TILE_SIZE * 0.7, 4);

    // HP 바
    const hpBar = this.add.graphics();
    this.drawHpBar(hpBar, unit);

    // MP 바 (MP가 있으면)
    const mpBar = this.add.graphics();
    this.drawMpBar(mpBar, unit);

    container.add([sprite, label, hpBarBg, hpBar, mpBar]);
    container.setSize(TILE_SIZE, TILE_SIZE);
    container.setInteractive();
    container.setData('unitId', unit.id);
    container.setDepth(10);
    this.unitSprites.set(unit.id, container);
  }

  private drawHpBar(graphics: Phaser.GameObjects.Graphics, unit: UnitData): void {
    graphics.clear();
    const ratio = unit.stats.hp / unit.stats.maxHp;
    const width = TILE_SIZE * 0.7 * ratio;
    const color = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000;
    graphics.fillStyle(color, 1);
    graphics.fillRect(-TILE_SIZE * 0.35, TILE_SIZE * 0.32, width, 4);
  }

  private drawMpBar(graphics: Phaser.GameObjects.Graphics, unit: UnitData): void {
    graphics.clear();
    if (!unit.maxMp || unit.maxMp <= 0) return;
    const ratio = (unit.mp ?? 0) / unit.maxMp;
    const width = TILE_SIZE * 0.7 * ratio;
    graphics.fillStyle(0x000000, 0.6);
    graphics.fillRect(-TILE_SIZE * 0.35, TILE_SIZE * 0.38, TILE_SIZE * 0.7, 3);
    graphics.fillStyle(0x4488ff, 1);
    graphics.fillRect(-TILE_SIZE * 0.35, TILE_SIZE * 0.38, width, 3);
  }

  private updateUnitSprite(unit: UnitData): void {
    const container = this.unitSprites.get(unit.id);
    if (!container) return;
    if (!unit.isAlive) { container.setVisible(false); return; }

    // HP/MP 바 업데이트 (인덱스: 0=sprite, 1=label, 2=hpBarBg, 3=hpBar, 4=mpBar)
    const hpBar = container.getAt(3) as Phaser.GameObjects.Graphics;
    this.drawHpBar(hpBar, unit);
    const mpBar = container.getAt(4) as Phaser.GameObjects.Graphics;
    this.drawMpBar(mpBar, unit);

    container.setAlpha(unit.hasActed ? 0.5 : 1);
  }

  private playUnitAnim(unit: UnitData, anim: string): void {
    const container = this.unitSprites.get(unit.id);
    if (!container) return;
    const sprite = container.getAt(0) as Phaser.GameObjects.Sprite;

    if (this.imageUnits.has(unit.id)) {
      playImageAnim(this, container, sprite, anim);
    } else {
      const uc = unit.unitClass ?? UnitClass.INFANTRY;
      const texKey = `unit_${uc}_${unit.faction}`;
      const animKey = `${texKey}_${anim}`;
      if (this.anims.exists(animKey)) {
        sprite.play(animKey);
      }
    }
  }

  // ── UI ──

  private createUI(): void {
    const uiBg = this.add.graphics();
    uiBg.fillStyle(0x1a1a2e, 1);
    uiBg.fillRect(0, UI_BAR_Y, MAP_WIDTH * TILE_SIZE, 60);
    uiBg.lineStyle(2, 0x4a4a6a, 1);
    uiBg.strokeRect(0, UI_BAR_Y, MAP_WIDTH * TILE_SIZE, 60);

    this.turnText = this.add.text(16, UI_BAR_Y + 18, '', { fontSize: '18px', color: '#ffffff' });

    this.endTurnButton = this.add.text(MAP_WIDTH * TILE_SIZE - 120, UI_BAR_Y + 14, '턴 종료', {
      fontSize: '18px', color: '#ffffff', backgroundColor: '#4a4a6a', padding: { x: 14, y: 8 },
    }).setInteractive({ useHandCursor: true });
    this.endTurnButton.on('pointerdown', () => { this._menuClickConsumed = true; this.onEndTurnClicked(); });
    this.endTurnButton.on('pointerover', () => this.endTurnButton.setStyle({ backgroundColor: '#6a6a8a' }));
    this.endTurnButton.on('pointerout', () => this.endTurnButton.setStyle({ backgroundColor: '#4a4a6a' }));

    this.gameOverText = this.add.text(
      (MAP_WIDTH * TILE_SIZE) / 2, (MAP_HEIGHT * TILE_SIZE) / 2, '',
      { fontSize: '36px', color: '#ffffff', fontStyle: 'bold', backgroundColor: '#000000aa', padding: { x: 30, y: 20 } },
    ).setOrigin(0.5).setVisible(false).setDepth(100);
  }

  private updateTurnUI(): void {
    const phaseText = this.battleState.phase === 'player' ? '아군 턴' : '적군 턴';
    this.turnText.setText(`턴 ${this.battleState.turn} - ${phaseText}`);
    this.endTurnButton.setVisible(this.battleState.phase === 'player');
  }

  // ── 액션 메뉴 ──

  private showActionMenu(unit: UnitData): void {
    this.hideActionMenu();
    this.interactionState = 'AWAITING_ACTION';

    const px = unit.position.x * TILE_SIZE + TILE_SIZE;
    const py = unit.position.y * TILE_SIZE;
    const menuStyle = { fontSize: '14px', color: '#ffffff', backgroundColor: '#2a2a4a', padding: { x: 10, y: 6 } };

    // 공격
    const attackRange = this.gridSystem.getAttackRange(unit.position, unit.stats.attackRange);
    const hasEnemyInRange = attackRange.some(pos => {
      const t = this.getUnitAt(pos);
      return t && t.faction !== unit.faction && t.isAlive;
    });

    const atkBtn = this.add.text(px, py, '공격', menuStyle)
      .setInteractive({ useHandCursor: true }).setDepth(90)
      .setAlpha(hasEnemyInRange ? 1 : 0.4);
    if (hasEnemyInRange) {
      atkBtn.on('pointerdown', () => {
        this._menuClickConsumed = true;
        this.hideActionMenu();
        this.interactionState = 'AWAITING_ATTACK';
        this.attackRangeTiles = attackRange;
        this.attackTiles = attackRange.filter(pos => {
          const t = this.getUnitAt(pos);
          return t && t.faction !== unit.faction && t.isAlive;
        });
        this.drawOverlays();
      });
    }
    this.actionMenu.push(atkBtn);

    // 스킬
    const usableSkills = this.skillSystem.getUsableSkills(unit);
    let yOffset = 28;

    for (const skill of usableSkills) {
      const skillBtn = this.add.text(px, py + yOffset, `${skill.name} (MP${skill.mpCost})`, menuStyle)
        .setInteractive({ useHandCursor: true }).setDepth(90);
      skillBtn.on('pointerdown', () => {
        this._menuClickConsumed = true;
        this.hideActionMenu();
        this.enterSkillTargeting(unit, skill);
      });
      this.actionMenu.push(skillBtn);
      yOffset += 28;
    }

    // 대기
    const waitBtn = this.add.text(px, py + yOffset, '대기', menuStyle)
      .setInteractive({ useHandCursor: true }).setDepth(90);
    waitBtn.on('pointerdown', () => {
      this._menuClickConsumed = true;
      this.hideActionMenu();
      this.preMovePosition = null;
      unit.hasActed = true;
      this.updateUnitSprite(unit);
      this.finishAction();
    });
    this.actionMenu.push(waitBtn);
    yOffset += 28;

    // 취소 (원래 위치로 복귀)
    if (this.preMovePosition) {
      const cancelBtn = this.add.text(px, py + yOffset, '취소', {
        ...menuStyle, color: '#ff8888',
      }).setInteractive({ useHandCursor: true }).setDepth(90);
      cancelBtn.on('pointerdown', () => {
        this._menuClickConsumed = true;
        this.cancelMove(unit);
      });
      this.actionMenu.push(cancelBtn);
    }
  }

  private cancelMove(unit: UnitData): void {
    this.hideActionMenu();
    if (!this.preMovePosition) return;

    const originalPos = this.preMovePosition;
    this.preMovePosition = null;

    // 유닛을 원래 위치로 복귀
    unit.position = { ...originalPos };
    const container = this.unitSprites.get(unit.id);
    if (container) {
      const pixel = this.gridToPixel(originalPos);
      container.setPosition(pixel.x, pixel.y);
    }

    // 다시 UNIT_SELECTED 상태로
    this.selectUnit(unit);
  }

  private hideActionMenu(): void {
    for (const btn of this.actionMenu) btn.destroy();
    this.actionMenu = [];
  }

  // ── 스킬 타겟팅 ──

  private enterSkillTargeting(unit: UnitData, skill: SkillDef): void {
    this.interactionState = 'SKILL_TARGETING';
    this.activeSkill = skill;
    this.skillRangeTiles = this.gridSystem.getAttackRange(unit.position, skill.range);
    this.skillTargetTiles = this.skillSystem.getSkillTargetPositions(
      unit, skill, this.battleState.units, this.gridSystem,
    );
    this.drawOverlays();
  }

  // ── 오버레이 ──

  private drawOverlays(): void {
    this.overlayGraphics.clear();

    // 이동 범위 (파란색)
    for (const pos of this.movementTiles) {
      this.overlayGraphics.fillStyle(0x4169e1, 0.35);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    // 공격 전체 범위 (연한 빨간색)
    for (const pos of this.attackRangeTiles) {
      this.overlayGraphics.fillStyle(0xff4444, 0.15);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    // 공격 가능 적 위치 (진한 빨간색)
    for (const pos of this.attackTiles) {
      this.overlayGraphics.fillStyle(0xff4444, 0.45);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    // 스킬 전체 범위 (연한 보라색)
    for (const pos of this.skillRangeTiles) {
      this.overlayGraphics.fillStyle(0x9944ff, 0.15);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    // 스킬 타겟 가능 위치 (진한 보라색)
    for (const pos of this.skillTargetTiles) {
      this.overlayGraphics.fillStyle(0x9944ff, 0.45);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    // 적 미리보기 이동 범위 (주황색)
    for (const pos of this.enemyPreviewMoveTiles) {
      this.overlayGraphics.fillStyle(0xff8800, 0.25);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    // 적 미리보기 공격 범위 (연한 빨간색)
    for (const pos of this.enemyPreviewAttackTiles) {
      this.overlayGraphics.fillStyle(0xff4444, 0.2);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    // 선택된 유닛 (노란색 테두리)
    if (this.selectedUnit) {
      const px = this.selectedUnit.position.x * TILE_SIZE;
      const py = this.selectedUnit.position.y * TILE_SIZE;
      this.overlayGraphics.lineStyle(3, 0xffd700, 1);
      this.overlayGraphics.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
  }

  private clearOverlays(): void {
    this.overlayGraphics.clear();
    this.movementTiles = [];
    this.attackTiles = [];
    this.attackRangeTiles = [];
    this.skillTargetTiles = [];
    this.skillRangeTiles = [];
    this.enemyPreviewMoveTiles = [];
    this.enemyPreviewAttackTiles = [];
    this.activeSkill = null;
  }

  // ── 입력 처리 ──

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 메뉴 버튼이 클릭을 소비했으면 무시
      if (this._menuClickConsumed) {
        this._menuClickConsumed = false;
        return;
      }
      if (pointer.y >= UI_BAR_Y) return;
      const gridX = Math.floor(pointer.x / TILE_SIZE);
      const gridY = Math.floor(pointer.y / TILE_SIZE);
      if (!this.gridSystem.isInBounds(gridX, gridY)) return;
      this.handleGridClick({ x: gridX, y: gridY });
    });
  }

  private handleGridClick(pos: Position): void {
    switch (this.interactionState) {
      case 'IDLE': this.handleIdleClick(pos); break;
      case 'UNIT_SELECTED': this.handleUnitSelectedClick(pos); break;
      case 'AWAITING_ACTION': this.handleAwaitingActionClick(pos); break;
      case 'AWAITING_ATTACK': this.handleAwaitingAttackClick(pos); break;
      case 'SKILL_TARGETING': this.handleSkillTargetClick(pos); break;
    }
  }

  private handleIdleClick(pos: Position): void {
    if (this.battleState.phase !== 'player') return;
    const unit = this.getUnitAt(pos);
    if (!unit) {
      this.clearOverlays();
      return;
    }

    if (unit.faction === 'player' && !unit.hasActed && unit.isAlive) {
      this.selectUnit(unit);
    } else if (unit.faction === 'enemy' && unit.isAlive) {
      this.showEnemyPreview(unit);
    }
  }

  private selectUnit(unit: UnitData): void {
    this.selectedUnit = unit;
    this.battleState.selectedUnitId = unit.id;
    this.interactionState = 'UNIT_SELECTED';
    this.movementTiles = this.gridSystem.getMovementRange(
      unit.position, unit.stats.moveRange, this.battleState.units, 'player', unit.unitClass,
    );
    this.attackTiles = [];
    this.drawOverlays();
    EventBus.emit('unit-selected', unit);
  }

  private handleUnitSelectedClick(pos: Position): void {
    // 제자리 클릭 → 이동 없이 액션 메뉴
    if (this.selectedUnit && pos.x === this.selectedUnit.position.x && pos.y === this.selectedUnit.position.y) {
      this.preMovePosition = { ...this.selectedUnit.position };
      this.clearOverlays();
      this.drawOverlays();
      this.showActionMenu(this.selectedUnit);
      return;
    }

    // 적 유닛 클릭 → 적 이동/공격 범위 미리보기
    const unitAtPos = this.getUnitAt(pos);
    if (unitAtPos && unitAtPos.faction === 'enemy' && unitAtPos.isAlive) {
      this.showEnemyPreview(unitAtPos);
      return;
    }

    // 다른 아군 클릭 → 선택 전환
    if (unitAtPos && unitAtPos.faction === 'player' && !unitAtPos.hasActed && unitAtPos.isAlive) {
      this.deselectUnit();
      this.selectUnit(unitAtPos);
      return;
    }

    // 이동 가능 타일 클릭 → 이동
    const isMoveTile = this.movementTiles.some(t => t.x === pos.x && t.y === pos.y);
    if (isMoveTile && this.selectedUnit) {
      this.preMovePosition = { ...this.selectedUnit.position };
      this.moveUnit(this.selectedUnit, pos);
      return;
    }

    this.deselectUnit();
  }

  private handleAwaitingActionClick(_pos: Position): void {
    // 액션메뉴 외 그리드 클릭 → 메뉴 무시 (메뉴 버튼으로만 조작)
  }

  private handleAwaitingAttackClick(pos: Position): void {
    if (!this.selectedUnit) return;
    const isAttackTile = this.attackTiles.some(t => t.x === pos.x && t.y === pos.y);
    const targetUnit = this.getUnitAt(pos);

    if (isAttackTile && targetUnit && targetUnit.faction === 'enemy' && targetUnit.isAlive) {
      this.preMovePosition = null;
      this.executeAttack(this.selectedUnit, targetUnit);
      return;
    }

    // 공격 취소 → 액션 메뉴로 복귀
    this.clearOverlays();
    this.drawOverlays();
    this.showActionMenu(this.selectedUnit);
  }

  private handleSkillTargetClick(pos: Position): void {
    if (!this.selectedUnit || !this.activeSkill) return;
    const isTarget = this.skillTargetTiles.some(t => t.x === pos.x && t.y === pos.y);

    if (isTarget) {
      this.executeSkill(this.selectedUnit, this.activeSkill, pos);
    } else {
      // 스킬 취소 → 액션 메뉴 복귀
      this.clearOverlays();
      this.drawOverlays();
      this.showActionMenu(this.selectedUnit);
    }
  }

  // ── 이동 ──

  private moveUnit(unit: UnitData, to: Position): void {
    this.interactionState = 'MOVING';
    this.clearOverlays();
    const path = this.gridSystem.getPath(unit.position, to, this.battleState.units, unit.faction, unit.unitClass);
    if (path.length <= 1) {
      unit.position = { ...to };
      this.onMoveComplete(unit);
      return;
    }
    this.animateMovement(unit, path, () => {
      unit.position = { ...to };
      this.onMoveComplete(unit);
    });
  }

  private animateMovement(unit: UnitData, path: Position[], onComplete: () => void): void {
    const container = this.unitSprites.get(unit.id);
    if (!container) { onComplete(); return; }

    this.playUnitAnim(unit, 'walk');

    const tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];
    for (let i = 1; i < path.length; i++) {
      const target = this.gridToPixel(path[i]);
      tweens.push({ targets: container, x: target.x, y: target.y, duration: 120, ease: 'Linear' });
    }
    void this.tweens.chain({
      tweens,
      onComplete: () => {
        this.playUnitAnim(unit, 'idle');
        onComplete();
      },
    });
  }

  private onMoveComplete(unit: UnitData): void {
    // 이동 후 액션 메뉴 표시
    this.showActionMenu(unit);
  }

  // ── 공격 ──

  private executeAttack(attacker: UnitData, defender: UnitData): void {
    this.interactionState = 'ANIMATING';
    this.clearOverlays();
    this.hideActionMenu();

    // 공격 애니메이션
    this.playUnitAnim(attacker, 'attack');

    const defenderTile = this.battleState.tiles[defender.position.y][defender.position.x];
    const attackerTile = this.battleState.tiles[attacker.position.y][attacker.position.x];
    const result = this.combatSystem.executeAttack(attacker, defender, defenderTile, attackerTile);

    // 피격 애니메이션
    this.time.delayedCall(200, () => {
      this.playUnitAnim(defender, 'hit');
    });

    const defPos = this.gridToPixel(defender.position);
    this.showDamageText(defPos.x, defPos.y, result.damage);
    this.updateUnitSprite(attacker);
    this.updateUnitSprite(defender);

    if (result.defenderDied) {
      this.playUnitAnim(defender, 'die');
      this.fadeOutUnit(defender.id);
    }

    // 경험치 부여
    this.awardExp(attacker, 'attack', defender.level ?? 1);
    if (result.defenderDied) this.awardExp(attacker, 'kill', defender.level ?? 1);

    if (result.counterDamage > 0) {
      this.time.delayedCall(400, () => {
        this.playUnitAnim(defender, 'idle');
        this.playUnitAnim(attacker, 'hit');
        const atkPos = this.gridToPixel(attacker.position);
        this.showDamageText(atkPos.x, atkPos.y, result.counterDamage, '#ffaa44');
        this.updateUnitSprite(attacker);
        if (result.attackerDied) {
          this.playUnitAnim(attacker, 'die');
          this.fadeOutUnit(attacker.id);
        }
        this.time.delayedCall(500, () => {
          this.playUnitAnim(attacker, 'idle');
          this.finishAction();
        });
      });
    } else {
      this.time.delayedCall(500, () => {
        this.playUnitAnim(attacker, 'idle');
        if (!result.defenderDied) this.playUnitAnim(defender, 'idle');
        this.finishAction();
      });
    }
  }

  // ── 스킬 실행 ──

  private executeSkill(caster: UnitData, skill: SkillDef, targetPos: Position): void {
    this.interactionState = 'ANIMATING';
    this.clearOverlays();
    this.hideActionMenu();

    const result = this.skillSystem.executeSkill(caster, skill, targetPos, this.battleState.units);

    // 스킬명 표시
    const casterPos = this.gridToPixel(caster.position);
    this.showFloatingText(casterPos.x, casterPos.y - 20, skill.name, '#cc88ff');

    // 효과 표시
    this.time.delayedCall(300, () => {
      for (const effect of result.effects) {
        const unit = this.turnSystem.getUnitById(effect.unitId);
        if (!unit) continue;
        const pos = this.gridToPixel(unit.position);

        if (effect.damageDealt) {
          this.showDamageText(pos.x, pos.y, effect.damageDealt, '#cc44ff');
        }
        if (effect.healingDone) {
          this.showFloatingText(pos.x, pos.y, `+${effect.healingDone}`, '#44ff44');
        }
        if (effect.statusApplied) {
          this.showFloatingText(pos.x, pos.y + 15, effect.statusApplied, '#ffff44');
        }
        if (effect.unitDied) {
          this.fadeOutUnit(effect.unitId);
        }

        this.updateUnitSprite(unit);

        // 스킬 경험치
        if (effect.damageDealt) {
          this.awardExp(caster, 'skill_damage', unit.level ?? 1);
          if (effect.unitDied) this.awardExp(caster, 'kill', unit.level ?? 1);
        }
        if (effect.healingDone) {
          this.awardExp(caster, 'heal', caster.level ?? 1);
        }
      }

      this.updateUnitSprite(caster);
      this.time.delayedCall(600, () => this.finishAction());
    });
  }

  private showFloatingText(x: number, y: number, message: string, color: string): void {
    const text = this.add.text(x, y - 10, message, {
      fontSize: '16px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: text, y: y - 45, alpha: 0, duration: 1000, ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  private awardExp(unit: UnitData, action: 'attack' | 'kill' | 'heal' | 'skill_damage', targetLevel: number): void {
    if (unit.faction !== 'player') return;
    const exp = this.expSystem.calculateExpGain(action, unit.level ?? 1, targetLevel);
    const pos = this.gridToPixel(unit.position);
    this.showFloatingText(pos.x, pos.y + 20, `+${exp} EXP`, '#aaaaff');

    const levelUp = this.expSystem.addExp(unit, exp);
    if (levelUp) {
      this.time.delayedCall(400, () => {
        this.showFloatingText(pos.x, pos.y - 5, `LEVEL UP! Lv.${levelUp.newLevel}`, '#ffdd44');
        this.updateUnitSprite(unit);
      });
    }
  }

  private fadeOutUnit(unitId: string): void {
    const sprite = this.unitSprites.get(unitId);
    if (sprite) {
      this.tweens.add({
        targets: sprite, alpha: 0, duration: 400,
        onComplete: () => sprite.setVisible(false),
      });
    }
  }

  private showDamageText(x: number, y: number, damage: number, color: string = '#ff4444'): void {
    const text = this.add.text(x, y - 10, `-${damage}`, {
      fontSize: '20px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: text, y: y - 50, alpha: 0, duration: 800, ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  // ── 턴 제어 ──

  private finishAction(): void {
    this.selectedUnit = null;
    this.battleState.selectedUnitId = null;
    this.clearOverlays();
    this.hideActionMenu();
    EventBus.emit('unit-selected', null);

    const winner = this.turnSystem.checkVictory();
    if (winner) { this.onGameOver(winner); return; }

    if (this.battleState.phase === 'player' && this.turnSystem.isAllActed('player')) {
      this.startEnemyTurn();
    } else {
      this.interactionState = 'IDLE';
    }
  }

  private onEndTurnClicked(): void {
    if (this.interactionState !== 'IDLE' && this.interactionState !== 'UNIT_SELECTED' && this.interactionState !== 'AWAITING_ACTION') return;
    if (this.battleState.phase !== 'player') return;
    this.deselectUnit();
    this.hideActionMenu();
    this.turnSystem.getUnitsByFaction('player').forEach(u => {
      u.hasActed = true;
      this.updateUnitSprite(u);
    });
    this.startEnemyTurn();
  }

  private async startEnemyTurn(): Promise<void> {
    this.interactionState = 'ENEMY_TURN';
    this.turnSystem.startEnemyTurn();
    this.updateTurnUI();

    // 상태효과 틱
    this.skillSystem.tickStatusEffects(this.turnSystem.getUnitsByFaction('enemy'));
    for (const unit of this.turnSystem.getUnitsByFaction('enemy')) {
      this.skillSystem.tickCooldowns(unit);
      const effects = this.skillSystem.processStatusEffectsOnTurnStart(unit);
      if (effects.damage > 0) {
        const pos = this.gridToPixel(unit.position);
        this.showDamageText(pos.x, pos.y, effects.damage, '#44ff44');
        this.updateUnitSprite(unit);
        if (!unit.isAlive) this.fadeOutUnit(unit.id);
      }
      if (effects.skipTurn) unit.hasActed = true;
    }

    const actions = this.aiSystem.planActions();

    for (const action of actions) {
      await this.executeAIAction(action);
      await this.delay(400);
      const winner = this.turnSystem.checkVictory();
      if (winner) { this.onGameOver(winner); return; }
    }

    // 아군 턴 시작 전 상태효과 틱
    this.turnSystem.startPlayerTurn();
    this.skillSystem.tickStatusEffects(this.turnSystem.getUnitsByFaction('player'));
    for (const unit of this.turnSystem.getUnitsByFaction('player')) {
      this.skillSystem.tickCooldowns(unit);
      const effects = this.skillSystem.processStatusEffectsOnTurnStart(unit);
      if (effects.damage > 0) {
        const pos = this.gridToPixel(unit.position);
        this.showDamageText(pos.x, pos.y, effects.damage, '#44ff44');
        this.updateUnitSprite(unit);
        if (!unit.isAlive) this.fadeOutUnit(unit.id);
      }
      if (effects.skipTurn) unit.hasActed = true;
    }

    this.updateTurnUI();
    this.battleState.units.forEach(u => this.updateUnitSprite(u));
    this.interactionState = 'IDLE';
  }

  private executeAIAction(action: ReturnType<AISystem['planActions']>[number]): Promise<void> {
    return new Promise(resolve => {
      const { unit, moveTo, attackTarget, skillAction } = action;

      const doAttack = (target: UnitData, onDone: () => void) => {
        const defTile = this.battleState.tiles[target.position.y][target.position.x];
        const atkTile = this.battleState.tiles[unit.position.y][unit.position.x];
        const result = this.combatSystem.executeAttack(unit, target, defTile, atkTile);
        const defPos = this.gridToPixel(target.position);
        this.showDamageText(defPos.x, defPos.y, result.damage);
        this.updateUnitSprite(unit);
        this.updateUnitSprite(target);
        if (result.defenderDied) this.fadeOutUnit(target.id);
        if (result.counterDamage > 0) {
          this.time.delayedCall(300, () => {
            const atkPos = this.gridToPixel(unit.position);
            this.showDamageText(atkPos.x, atkPos.y, result.counterDamage, '#ffaa44');
            this.updateUnitSprite(unit);
            if (result.attackerDied) this.fadeOutUnit(unit.id);
            this.time.delayedCall(300, onDone);
          });
        } else {
          this.time.delayedCall(300, onDone);
        }
      };

      const doSkill = (skillId: string, targetPos: Position, onDone: () => void) => {
        const skill = this.skillSystem.getUsableSkills(unit).find(s => s.id === skillId);
        if (!skill) { onDone(); return; }
        const result = this.skillSystem.executeSkill(unit, skill, targetPos, this.battleState.units);
        const casterPos = this.gridToPixel(unit.position);
        this.showFloatingText(casterPos.x, casterPos.y - 20, skill.name, '#cc88ff');
        this.time.delayedCall(300, () => {
          for (const effect of result.effects) {
            const target = this.turnSystem.getUnitById(effect.unitId);
            if (!target) continue;
            const pos = this.gridToPixel(target.position);
            if (effect.damageDealt) this.showDamageText(pos.x, pos.y, effect.damageDealt, '#cc44ff');
            if (effect.healingDone) this.showFloatingText(pos.x, pos.y, `+${effect.healingDone}`, '#44ff44');
            if (effect.unitDied) this.fadeOutUnit(effect.unitId);
            this.updateUnitSprite(target);
          }
          this.updateUnitSprite(unit);
          this.time.delayedCall(400, onDone);
        });
      };

      const afterMove = () => {
        if (skillAction) {
          this.time.delayedCall(200, () => doSkill(skillAction.skillId, skillAction.targetPos, resolve));
        } else if (attackTarget && attackTarget.isAlive) {
          this.time.delayedCall(200, () => {
            unit.hasActed = true;
            doAttack(attackTarget, resolve);
          });
        } else {
          unit.hasActed = true;
          resolve();
        }
      };

      if (moveTo) {
        const path = this.gridSystem.getPath(unit.position, moveTo, this.battleState.units, 'enemy', unit.unitClass);
        this.animateMovement(unit, path.length > 0 ? path : [unit.position, moveTo], () => {
          unit.position = { ...moveTo };
          afterMove();
        });
      } else if (skillAction) {
        doSkill(skillAction.skillId, skillAction.targetPos, resolve);
      } else if (attackTarget && attackTarget.isAlive) {
        unit.hasActed = true;
        doAttack(attackTarget, resolve);
      } else {
        unit.hasActed = true;
        resolve();
      }
    });
  }

  private onGameOver(winner: Faction): void {
    this.interactionState = 'GAME_OVER';
    this.battleState.gameOver = true;
    this.battleState.winner = winner;
    this.clearOverlays();
    this.hideActionMenu();
    const message = winner === 'player' ? '승리!' : '패배...';
    this.gameOverText.setText(message).setVisible(true);
    EventBus.emit('game-over', winner);

    // 캠페인 모드: 클릭 시 다음 흐름으로 진행
    if (this.campaignMode && this.campaignManager && this.campaignStage) {
      this.time.delayedCall(1500, () => {
        this.gameOverText.setText(message + '\n\n(클릭하여 계속)');
        this.input.once('pointerdown', () => {
          if (winner === 'player') {
            const survivors = this.battleState.units.filter(u => u.faction === 'player' && u.isAlive);
            this.campaignManager!.completeBattle(survivors, this.campaignStage!);
            this.scene.start('DialogueScene', {
              dialogue: this.campaignStage!.postDialogue,
              nextScene: 'WorldMapScene',
              nextSceneData: { campaignManager: this.campaignManager },
            });
          } else {
            this.scene.start('WorldMapScene', { campaignManager: this.campaignManager });
          }
        });
      });
    }

    // PvP 모드: 결과 전송 → 로비 복귀
    if (this.pvpMode && this.pvpOpponentId !== undefined) {
      const won = winner === 'player';
      pvpRecordResult(this.pvpOpponentId, won).then(result => {
        this.time.delayedCall(1500, () => {
          const eloText = result.eloDelta >= 0 ? `+${result.eloDelta}` : `${result.eloDelta}`;
          this.gameOverText.setText(
            `${message}\n\nELO: ${result.newElo} (${eloText})\n전적: ${result.wins}승 ${result.losses}패\n\n(클릭하여 계속)`,
          );
          this.input.once('pointerdown', () => {
            this.scene.start('TitleScene');
          });
        });
      }).catch(() => {
        this.time.delayedCall(1500, () => {
          this.gameOverText.setText(message + '\n\n(클릭하여 계속)');
          this.input.once('pointerdown', () => this.scene.start('TitleScene'));
        });
      });
    }
  }

  // ── 유틸리티 ──

  private showEnemyPreview(unit: UnitData): void {
    this.clearOverlays();
    // 적의 이동 범위 (주황색으로 표시)
    this.enemyPreviewMoveTiles = this.gridSystem.getMovementRange(
      unit.position, unit.stats.moveRange, this.battleState.units, unit.faction, unit.unitClass,
    );
    // 이동 가능 범위 + 현재 위치에서의 공격 범위 합산
    const allPositions = [unit.position, ...this.enemyPreviewMoveTiles];
    const attackSet = new Set<string>();
    for (const pos of allPositions) {
      const atkRange = this.gridSystem.getAttackRange(pos, unit.stats.attackRange);
      for (const ap of atkRange) {
        attackSet.add(`${ap.x},${ap.y}`);
      }
    }
    // 이동 범위와 겹치는 타일은 제외
    const moveSet = new Set(this.enemyPreviewMoveTiles.map(p => `${p.x},${p.y}`));
    moveSet.add(`${unit.position.x},${unit.position.y}`);
    this.enemyPreviewAttackTiles = [...attackSet]
      .filter(k => !moveSet.has(k))
      .map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });

    this.drawOverlays();
    EventBus.emit('unit-selected', unit);
  }

  private deselectUnit(): void {
    this.selectedUnit = null;
    this.battleState.selectedUnitId = null;
    this.interactionState = 'IDLE';
    this.clearOverlays();
    this.hideActionMenu();
    EventBus.emit('unit-selected', null);
  }

  private getUnitAt(pos: Position): UnitData | undefined {
    return this.battleState.units.find(u => u.position.x === pos.x && u.position.y === pos.y && u.isAlive);
  }

  private gridToPixel(pos: Position): { x: number; y: number } {
    return { x: pos.x * TILE_SIZE + TILE_SIZE / 2, y: pos.y * TILE_SIZE + TILE_SIZE / 2 };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  shutdown(): void {
    EventBus.off('end-turn-clicked', this.onEndTurnClicked, this);
  }
}
