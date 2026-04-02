import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import type { Position, UnitData, BattleState, Faction } from '@shared/types/index.ts';
import { UnitClass } from '@shared/types/index.ts';
import type { SkillDef } from '@shared/types/skill.ts';
import { SkillEffectType } from '@shared/types/skill.ts';
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
  hasSpriteSheet, createSpriteSheetSprite, playSpriteSheetAnim, createSpriteSheetAnimations,
  hasPixelLabCharacter, createPixelLabSprite, playPixelLabAnim,
  setPixelLabDirection, getPixelLabDirection,
} from '../systems/UnitSpriteManager.ts';
import { TEST_MAP, TEST_UNITS } from '../data/testBattle.ts';
import { EventBus } from '../EventBus.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { Stage, BattleConfig } from '@shared/types/campaign.ts';
import { pvpRecordResult } from '../../api/client.ts';
import type { AudioManager, SfxName } from '../systems/AudioManager.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import { SKILL_DEFS, HERO_UNIQUE_SKILLS } from '@shared/data/skillDefs.ts';

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

const UI_BAR_H = 80;

export class BattleScene extends Phaser.Scene {
  private battleState!: BattleState;
  private gridSystem!: GridSystem;
  private combatSystem!: CombatSystem;
  private turnSystem!: TurnSystem;
  private aiSystem!: AISystem;
  private skillSystem!: SkillSystem;
  private expSystem!: ExperienceSystem;

  private mapW!: number;
  private mapH!: number;

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
  private preMovePosition: Position | null = null;

  // Phaser display objects
  private tileGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private turnText!: Phaser.GameObjects.Text;
  private endTurnButton!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private actionMenu: Phaser.GameObjects.Text[] = [];
  private _menuClickConsumed = false;
  private imageUnits: Set<string> = new Set();
  private spriteSheetUnits: Map<string, string> = new Map();
  private pixelLabUnits: Map<string, string> = new Map();

  // 자동 전투 / 배속
  private autoMode = false;
  private gameSpeed = 1;
  private autoBtn!: Phaser.GameObjects.Text;
  private speedBtn!: Phaser.GameObjects.Text;

  // 카메라 드래그
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private camStartX = 0;
  private camStartY = 0;
  private readonly dragThreshold = 8;

  // 캠페인 모드
  private campaignMode = false;
  private campaignManager?: CampaignManager;
  private campaignStage?: Stage;
  private externalBattleConfig?: BattleConfig;
  private externalPlayerUnits?: UnitData[];

  // PvP 모드
  private pvpMode = false;
  private pvpOpponentId?: number;

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
    this.spriteSheetUnits = new Map();
    this.actionMenu = [];
    this._menuClickConsumed = false;
    this.isDragging = false;

    let units: UnitData[];
    let tiles: import('@shared/types/index.ts').TileData[][];

    const hasExternalConfig = this.externalBattleConfig && (this.campaignMode || this.pvpMode);
    if (hasExternalConfig && this.externalBattleConfig) {
      const bc = this.externalBattleConfig;
      this.mapW = bc.mapWidth;
      this.mapH = bc.mapHeight;
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
      this.mapW = MAP_WIDTH;
      this.mapH = MAP_HEIGHT;
      tiles = TEST_MAP;
      units = TEST_UNITS.map(u => ({
        ...u, position: { ...u.position }, stats: { ...u.stats },
        skills: u.skills ? [...u.skills] : [], statusEffects: [], skillCooldowns: {},
      }));
    }

    this.battleState = {
      turn: 0, phase: 'player', units,
      mapWidth: this.mapW, mapHeight: this.mapH, tiles,
      selectedUnitId: null, gameOver: false, winner: null,
    };

    this.gridSystem = new GridSystem(this.battleState.tiles, this.mapW, this.mapH);
    this.combatSystem = new CombatSystem();
    this.turnSystem = new TurnSystem(this.battleState);
    this.aiSystem = new AISystem(this.gridSystem, this.combatSystem, this.turnSystem);
    this.skillSystem = new SkillSystem();
    this.skillSystem.setMode(this.campaignMode ? 'scenario' : this.pvpMode ? 'pvp' : 'dungeon');
    this.expSystem = new ExperienceSystem();

    this.tileGraphics = this.add.graphics().setDepth(1);
    this.overlayGraphics = this.add.graphics().setDepth(5);

    this.drawGrid();
    this.createUnits();
    this.setupCamera();
    this.createUI();
    this.setupInput();

    // 모든 기존 월드 오브젝트를 UI 카메라에서 숨기기
    for (const child of this.children.list) {
      if (!this.uiObjects.includes(child)) {
        this.uiCam.ignore(child);
      }
    }

    this.turnSystem.startPlayerTurn();
    this.updateTurnUI();

    EventBus.on('end-turn-clicked', this.onEndTurnClicked, this);
    EventBus.emit('current-scene-ready', this);

    // BGM 시작
    this.getAudio()?.playBgm('battle');

    // AUTO/배속 버튼 (카메라 ignore 루프 이후에 생성 → 양쪽 카메라 모두에서 보임)
    const zoom = this.cameras.main.zoom;
    this.autoBtn = this.add.text(10 / zoom, 10 / zoom, 'AUTO', {
      fontSize: `${Math.round(14 / zoom)}px`, color: '#888888',
      backgroundColor: '#000000cc', padding: { x: Math.round(8 / zoom), y: Math.round(6 / zoom) },
    }).setInteractive({ useHandCursor: true }).setDepth(500).setScrollFactor(0);
    this.autoBtn.on('pointerdown', () => {
      this._menuClickConsumed = true;
      this.autoMode = !this.autoMode;
      this.autoBtn.setStyle({
        color: this.autoMode ? '#44ff44' : '#888888',
        backgroundColor: this.autoMode ? '#003300cc' : '#000000cc',
      });
      if (this.autoMode && this.interactionState === 'IDLE' && this.battleState.phase === 'player') {
        this.executeAutoTurn();
      }
    });

    this.speedBtn = this.add.text(75 / zoom, 10 / zoom, '1x', {
      fontSize: `${Math.round(14 / zoom)}px`, color: '#ffffff',
      backgroundColor: '#000000cc', padding: { x: Math.round(8 / zoom), y: Math.round(6 / zoom) },
    }).setInteractive({ useHandCursor: true }).setDepth(500).setScrollFactor(0);
    this.speedBtn.on('pointerdown', () => {
      this._menuClickConsumed = true;
      this.gameSpeed = this.gameSpeed === 1 ? 2 : this.gameSpeed === 2 ? 3 : 1;
      this.speedBtn.setText(`${this.gameSpeed}x`);
      this.time.timeScale = this.gameSpeed;
      this.tweens.timeScale = this.gameSpeed;
    });

    // 포기 버튼 (AUTO/속도 버튼과 같은 방식)
    const retreatBtn = this.add.text(140 / zoom, 10 / zoom, '🏳️ 포기', {
      fontSize: `${Math.round(14 / zoom)}px`, color: '#ff8888',
      backgroundColor: '#1a0000cc', padding: { x: Math.round(8 / zoom), y: Math.round(6 / zoom) },
    }).setInteractive({ useHandCursor: true }).setDepth(500).setScrollFactor(0);
    retreatBtn.on('pointerdown', () => {
      this._menuClickConsumed = true;
      this.showRetreatConfirm();
    });
  }

  /** 유닛 스프라이트를 대상 방향으로 회전 */
  private faceToward(unit: UnitData, targetPos: Position): void {
    const container = this.unitSprites.get(unit.id);
    if (!container) return;
    const sprite = container.getAt(1) as Phaser.GameObjects.Sprite;

    // PixelLab 캐릭터: 방향별 애니메이션 전환
    if (this.pixelLabUnits.has(unit.id)) {
      const dx = targetPos.x - unit.position.x;
      const dy = targetPos.y - unit.position.y;
      const dir = getPixelLabDirection(dx, dy);
      setPixelLabDirection(this, sprite, this.pixelLabUnits.get(unit.id)!, dir, unit.unitClass);
    } else {
      // 기존: 좌우 반전
      if (targetPos.x < unit.position.x) {
        sprite.setFlipX(true);
      } else if (targetPos.x > unit.position.x) {
        sprite.setFlipX(false);
      }
    }
  }

  private isDiagonalAttack(unit: UnitData): boolean {
    const cls = unit.unitClass ?? UnitClass.INFANTRY;
    return UNIT_CLASS_DEFS[cls]?.diagonalAttack ?? false;
  }

  private getAudio(): AudioManager | null {
    return this.registry.get('audioManager') as AudioManager | null;
  }

  private playSfx(name: SfxName): void {
    this.getAudio()?.playSfx(name);
  }

  // ── 카메라 설정 ──

  private setupCamera(): void {
    const worldW = this.mapW * TILE_SIZE;
    const worldH = this.mapH * TILE_SIZE;

    // 모바일에서 적절한 줌 레벨 계산
    // 화면에 가로 6~7칸 정도 보이도록 줌
    const viewW = this.scale.width;
    const viewH = this.scale.height - UI_BAR_H;
    const desiredVisibleTiles = 7;
    const zoomByWidth = viewW / (desiredVisibleTiles * TILE_SIZE);
    const maxZoom = Math.min(viewW / (4 * TILE_SIZE), viewH / (4 * TILE_SIZE)); // 최소 4칸은 보이게
    const zoom = Math.min(Math.max(zoomByWidth, 1), maxZoom);

    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // 아군 유닛 중앙으로 포커싱
    const playerUnits = this.battleState.units.filter(u => u.faction === 'player' && u.isAlive);
    if (playerUnits.length > 0) {
      const avgX = playerUnits.reduce((s, u) => s + u.position.x, 0) / playerUnits.length;
      const avgY = playerUnits.reduce((s, u) => s + u.position.y, 0) / playerUnits.length;
      this.cameras.main.centerOn(avgX * TILE_SIZE + TILE_SIZE / 2, avgY * TILE_SIZE + TILE_SIZE / 2);
    } else {
      this.cameras.main.centerOn(worldW / 2, worldH / 2);
    }
  }

  private centerCameraOn(pos: Position, duration = 300): void {
    const pixel = this.gridToPixel(pos);
    this.cameras.main.pan(pixel.x, pixel.y, duration, 'Power2');
  }

  // ── 그리드 렌더링 ──

  private drawGrid(): void {
    const tilesetKey = generateTileset(this);

    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        const tile = this.battleState.tiles[y][x];
        const frame = getTileFrame(tile.type);
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = y * TILE_SIZE + TILE_SIZE / 2;
        this.add.image(px, py, tilesetKey, frame).setDepth(0);
      }
    }

    this.tileGraphics.clear();
    this.tileGraphics.lineStyle(1, 0x000000, 0.15);
    this.tileGraphics.setDepth(1);
    for (let y = 0; y <= this.mapH; y++) {
      this.tileGraphics.lineBetween(0, y * TILE_SIZE, this.mapW * TILE_SIZE, y * TILE_SIZE);
    }
    for (let x = 0; x <= this.mapW; x++) {
      this.tileGraphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, this.mapH * TILE_SIZE);
    }
  }

  // ── 유닛 렌더링 ──

  private createUnits(): void {
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
    createSpriteSheetAnimations(this);

    for (const unit of this.battleState.units) {
      this.createUnitSprite(unit);
    }
  }

  private createUnitSprite(unit: UnitData): void {
    const { x, y } = this.gridToPixel(unit.position);
    const container = this.add.container(x, y);

    const uc = unit.unitClass ?? UnitClass.INFANTRY;

    let sprite: Phaser.GameObjects.Sprite;
    // 0. PixelLab 캐릭터 (최우선)
    if (hasPixelLabCharacter(this, unit.id, uc)) {
      sprite = createPixelLabSprite(this, unit.id, uc)!;
      this.pixelLabUnits.set(unit.id, unit.id);
    // 1. 스프라이트 시트 (장수별)
    } else if (hasSpriteSheet(this, unit.id)) {
      sprite = createSpriteSheetSprite(this, unit.id)!;
      this.spriteSheetUnits.set(unit.id, unit.id);
    // 2. 단일 이미지 (병종별)
    } else if (hasUnitImage(this, uc, unit.faction)) {
      sprite = createImageSprite(this, uc, unit.faction)!;
      this.imageUnits.add(unit.id);
      playImageAnim(this, container, sprite, 'idle');
    // 3. 프로시저럴
    } else {
      const texKey = `unit_${uc}_${unit.faction}`;
      sprite = this.add.sprite(0, 0, texKey, 0);
      sprite.play(`${texKey}_idle`);
    }

    // 진영 표시 베이스 (유닛 발밑 타원)
    const factionBase = this.add.graphics();
    const baseColor = unit.faction === 'player' ? 0x3366ff : 0xdd3333;
    factionBase.fillStyle(baseColor, 0.5);
    factionBase.fillEllipse(0, TILE_SIZE * 0.28, TILE_SIZE * 0.5, TILE_SIZE * 0.18);
    factionBase.lineStyle(1, baseColor, 0.8);
    factionBase.strokeEllipse(0, TILE_SIZE * 0.28, TILE_SIZE * 0.5, TILE_SIZE * 0.18);

    const hpBarBg = this.add.graphics();
    hpBarBg.fillStyle(0x000000, 0.6);
    hpBarBg.fillRect(-TILE_SIZE * 0.35, TILE_SIZE * 0.32, TILE_SIZE * 0.7, 4);

    const hpBar = this.add.graphics();
    this.drawHpBar(hpBar, unit);

    const mpBar = this.add.graphics();
    this.drawMpBar(mpBar, unit);

    container.add([factionBase, sprite, hpBarBg, hpBar, mpBar]);
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

    // 인덱스: 0=factionBase, 1=sprite, 2=hpBarBg, 3=hpBar, 4=mpBar
    const hpBar = container.getAt(3) as Phaser.GameObjects.Graphics;
    this.drawHpBar(hpBar, unit);
    const mpBar = container.getAt(4) as Phaser.GameObjects.Graphics;
    this.drawMpBar(mpBar, unit);

    container.setAlpha(unit.hasActed ? 0.5 : 1);
  }

  private playUnitAnim(unit: UnitData, anim: string): void {
    const container = this.unitSprites.get(unit.id);
    if (!container) return;
    const sprite = container.getAt(1) as Phaser.GameObjects.Sprite;

    if (this.pixelLabUnits.has(unit.id)) {
      playPixelLabAnim(this, sprite, this.pixelLabUnits.get(unit.id)!, anim, unit.unitClass);
    } else if (this.spriteSheetUnits.has(unit.id)) {
      playSpriteSheetAnim(this, sprite, this.spriteSheetUnits.get(unit.id)!, anim);
    } else if (this.imageUnits.has(unit.id)) {
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

  // ── UI (별도 카메라로 줌 독립) ──

  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private uiObjects: Phaser.GameObjects.GameObject[] = [];

  private createUI(): void {
    const gw = this.scale.width;  // 게임 논리 너비 (576)
    const gh = this.scale.height; // 게임 논리 높이 (540)
    const uiY = gh - UI_BAR_H;

    // UI 전용 카메라 (줌 1, 스크롤 0)
    this.uiCam = this.cameras.add(0, 0, gw, gh);
    this.uiCam.setScroll(0, 0);
    this.uiCam.setZoom(1);

    const uiBg = this.add.graphics().setDepth(200);
    uiBg.fillStyle(0x1a1a2e, 1);
    uiBg.fillRect(0, uiY, gw, UI_BAR_H);
    uiBg.lineStyle(2, 0x4a4a6a, 1);
    uiBg.strokeRect(0, uiY, gw, UI_BAR_H);

    this.turnText = this.add.text(16, uiY + 25, '', {
      fontSize: '20px', color: '#ffffff',
    }).setDepth(201);

    this.endTurnButton = this.add.text(gw - 130, uiY + 16, '턴 종료', {
      fontSize: '20px', color: '#ffffff', backgroundColor: '#4a4a6a',
      padding: { x: 16, y: 10 },
    }).setInteractive({ useHandCursor: true }).setDepth(201);
    this.endTurnButton.on('pointerdown', () => { this._menuClickConsumed = true; this.onEndTurnClicked(); });
    this.endTurnButton.on('pointerover', () => this.endTurnButton.setStyle({ backgroundColor: '#6a6a8a' }));
    this.endTurnButton.on('pointerout', () => this.endTurnButton.setStyle({ backgroundColor: '#4a4a6a' }));

    // 음소거 토글 버튼
    const muteBtn = this.add.text(gw - 35, uiY + 22, this.getAudio()?.isMuted() ? '🔇' : '🔊', {
      fontSize: '24px',
    }).setInteractive({ useHandCursor: true }).setDepth(201);
    muteBtn.on('pointerdown', () => {
      this._menuClickConsumed = true;
      const a = this.getAudio();
      if (!a) return;
      a.setMuted(!a.isMuted());
      muteBtn.setText(a.isMuted() ? '🔇' : '🔊');
      if (!a.isMuted()) a.playBgm('battle');
    });
    this.uiObjects.push(muteBtn);
    this.cameras.main.ignore(muteBtn);

    // AUTO/배속 버튼은 create() 맨 마지막에 추가 (카메라 ignore 루프 이후)

    this.gameOverText = this.add.text(gw / 2, gh / 2, '', {
      fontSize: '32px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#000000aa', padding: { x: 30, y: 20 },
    }).setOrigin(0.5).setVisible(false).setDepth(300);

    // UI 요소를 메인 카메라에서 숨기기
    this.uiObjects = [uiBg, this.turnText, this.endTurnButton, this.gameOverText];
    for (const obj of this.uiObjects) {
      this.cameras.main.ignore(obj);
    }
  }

  /** 새로 생성된 오브젝트를 UI 카메라에서 숨기기 (월드 오브젝트) */
  private ignoreFromUiCam(obj: Phaser.GameObjects.GameObject): void {
    if (this.uiCam) this.uiCam.ignore(obj);
  }

  private updateTurnUI(): void {
    const phaseText = this.battleState.phase === 'player' ? '아군 턴' : '적군 턴';
    this.turnText.setText(`턴 ${this.battleState.turn} - ${phaseText}`);
    this.endTurnButton.setVisible(this.battleState.phase === 'player');
  }

  // ── 액션 메뉴 (화면 좌표) ──

  private showActionMenu(unit: UnitData): void {
    this.hideActionMenu();
    this.hideUnitInfoPanel(); // 액션 메뉴와 겹치지 않도록
    this.interactionState = 'AWAITING_ACTION';

    // UI 카메라 좌표 (줌 무관)
    const gw = this.scale.width;
    const gh = this.scale.height;
    const screenX = gw / 2 - 40;
    const screenY = gh - UI_BAR_H - 160;

    const menuStyle = { fontSize: '14px', color: '#ffffff', backgroundColor: '#2a2a4a', padding: { x: 10, y: 6 } };

    // 공격
    const attackRange = this.gridSystem.getAttackRange(unit.position, unit.stats.attackRange, this.isDiagonalAttack(unit));
    const hasEnemyInRange = attackRange.some(pos => {
      const t = this.getUnitAt(pos);
      return t && t.faction !== unit.faction && t.isAlive;
    });

    const atkBtn = this.add.text(screenX, screenY, '공격', menuStyle)
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
    const itemGap = 28;
    let yOffset = itemGap;

    for (const skill of usableSkills) {
      const skillBtn = this.add.text(screenX, screenY + yOffset, `${skill.name} (MP${skill.mpCost})`, menuStyle)
        .setInteractive({ useHandCursor: true }).setDepth(90);
      skillBtn.on('pointerdown', () => {
        this._menuClickConsumed = true;
        this.hideActionMenu();
        this.enterSkillTargeting(unit, skill);
      });
      this.actionMenu.push(skillBtn);
      yOffset += itemGap;
    }

    // 대기
    const waitBtn = this.add.text(screenX, screenY + yOffset, '대기', menuStyle)
      .setInteractive({ useHandCursor: true }).setDepth(90).setScrollFactor(0);
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

    // 취소
    if (this.preMovePosition) {
      const cancelBtn = this.add.text(screenX, screenY + yOffset, '취소', {
        ...menuStyle, color: '#ff8888',
      }).setInteractive({ useHandCursor: true }).setDepth(90);
      cancelBtn.on('pointerdown', () => {
        this._menuClickConsumed = true;
        this.cancelMove(unit);
      });
      this.actionMenu.push(cancelBtn);
    }

    this.registerMenuAsUI();
  }

  private cancelMove(unit: UnitData): void {
    this.hideActionMenu();
    if (!this.preMovePosition) return;

    const originalPos = this.preMovePosition;
    this.preMovePosition = null;

    unit.position = { ...originalPos };
    const container = this.unitSprites.get(unit.id);
    if (container) {
      const pixel = this.gridToPixel(originalPos);
      container.setPosition(pixel.x, pixel.y);
    }

    this.selectUnit(unit);
  }

  /** 액션 메뉴 버튼들을 UI 카메라 전용으로 설정 */
  private registerMenuAsUI(): void {
    for (const btn of this.actionMenu) {
      this.cameras.main.ignore(btn);
    }
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

    for (const pos of this.movementTiles) {
      this.overlayGraphics.fillStyle(0x4169e1, 0.35);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
    for (const pos of this.attackRangeTiles) {
      this.overlayGraphics.fillStyle(0xff4444, 0.15);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
    for (const pos of this.attackTiles) {
      this.overlayGraphics.fillStyle(0xff4444, 0.45);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
    for (const pos of this.skillRangeTiles) {
      this.overlayGraphics.fillStyle(0x9944ff, 0.15);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
    for (const pos of this.skillTargetTiles) {
      this.overlayGraphics.fillStyle(0x9944ff, 0.45);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
    for (const pos of this.enemyPreviewMoveTiles) {
      this.overlayGraphics.fillStyle(0xff8800, 0.25);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
    for (const pos of this.enemyPreviewAttackTiles) {
      this.overlayGraphics.fillStyle(0xff4444, 0.2);
      this.overlayGraphics.fillRect(pos.x * TILE_SIZE + 1, pos.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

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

  // ── 입력 처리 (드래그 + 탭 구분) ──

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this._menuClickConsumed) {
        // pointerup에서 소비하도록 플래그 유지
        return;
      }
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.camStartX = this.cameras.main.scrollX;
      this.camStartY = this.cameras.main.scrollY;
      this.isDragging = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || this._menuClickConsumed) return;
      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      if (!this.isDragging && (Math.abs(dx) > this.dragThreshold || Math.abs(dy) > this.dragThreshold)) {
        this.isDragging = true;
        this.hideActionMenu();
      }
      if (this.isDragging) {
        const zoom = this.cameras.main.zoom;
        this.cameras.main.scrollX = this.camStartX - dx / zoom;
        this.cameras.main.scrollY = this.camStartY - dy / zoom;
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this._menuClickConsumed) {
        this._menuClickConsumed = false;
        return;
      }
      if (this.isDragging) {
        this.isDragging = false;
        return;
      }

      if (pointer.y >= this.scale.height - UI_BAR_H) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const gridX = Math.floor(worldPoint.x / TILE_SIZE);
      const gridY = Math.floor(worldPoint.y / TILE_SIZE);
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
    } else if (unit.isAlive) {
      // 행동 완료된 아군 또는 적군: 정보만 표시
      this.showUnitInfoPanel(unit);
      if (unit.faction === 'enemy') this.showEnemyPreview(unit);
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
    this.centerCameraOn(unit.position);
    this.showUnitInfoPanel(unit);
    EventBus.emit('unit-selected', unit);
  }

  private handleUnitSelectedClick(pos: Position): void {
    if (this.selectedUnit && pos.x === this.selectedUnit.position.x && pos.y === this.selectedUnit.position.y) {
      this.preMovePosition = { ...this.selectedUnit.position };
      this.clearOverlays();
      this.drawOverlays();
      this.showActionMenu(this.selectedUnit);
      return;
    }

    const unitAtPos = this.getUnitAt(pos);
    if (unitAtPos && unitAtPos.faction === 'enemy' && unitAtPos.isAlive) {
      this.showEnemyPreview(unitAtPos);
      return;
    }

    if (unitAtPos && unitAtPos.faction === 'player' && !unitAtPos.hasActed && unitAtPos.isAlive) {
      this.deselectUnit();
      this.selectUnit(unitAtPos);
      return;
    }

    const isMoveTile = this.movementTiles.some(t => t.x === pos.x && t.y === pos.y);
    if (isMoveTile && this.selectedUnit) {
      this.preMovePosition = { ...this.selectedUnit.position };
      this.moveUnit(this.selectedUnit, pos);
      return;
    }

    this.deselectUnit();
  }

  private handleAwaitingActionClick(pos: Position): void {
    // 액션메뉴 외 그리드 클릭 → 메뉴 닫고 선택 해제 또는 다른 유닛 선택
    if (!this.selectedUnit) { this.deselectUnit(); return; }

    const unitAtPos = this.getUnitAt(pos);
    if (unitAtPos && unitAtPos.faction === 'player' && !unitAtPos.hasActed && unitAtPos.isAlive && unitAtPos.id !== this.selectedUnit.id) {
      // 다른 아군 클릭 → 현재 유닛 취소 후 새 유닛 선택
      this.cancelMove(this.selectedUnit);
      return;
    }

    // 빈 타일 클릭 → 이동 취소
    this.cancelMove(this.selectedUnit);
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

    this.playSfx('move');

    // 각 경로 구간을 순차적으로 이동 (구간마다 방향 전환)
    const moveStep = (stepIdx: number) => {
      if (stepIdx >= path.length) {
        this.playUnitAnim(unit, 'idle');
        onComplete();
        return;
      }
      // 이동 방향 설정
      const prevPos = path[stepIdx - 1];
      const nextPos = path[stepIdx];
      const fakeUnit = { ...unit, position: prevPos } as UnitData;
      this.faceToward(fakeUnit, nextPos);
      this.playUnitAnim(unit, 'walk');

      const target = this.gridToPixel(nextPos);
      this.tweens.add({
        targets: container, x: target.x, y: target.y, duration: 120, ease: 'Linear',
        onComplete: () => moveStep(stepIdx + 1),
      });
    };
    moveStep(1);
  }

  private onMoveComplete(unit: UnitData): void {
    this.centerCameraOn(unit.position);
    if (this.autoMode && unit.faction === 'player') {
      // 자동 모드: 메뉴 없이 바로 행동
      this.time.delayedCall(200, () => this.autoSelectAction(unit));
    } else {
      this.time.delayedCall(350, () => {
        this.showActionMenu(unit);
      });
    }
  }

  // ── 공격 이펙트 ──

  /** 근접 공격 이펙트: 검/창 휘두르기 호 궤적 */
  private showMeleeSlash(fromPos: Position, toPos: Position): void {
    const from = this.gridToPixel(fromPos);
    const to = this.gridToPixel(toPos);
    const g = this.add.graphics().setDepth(40);
    this.ignoreFromUiCam(g);

    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // 호 궤적 3단계 애니메이션
    let step = 0;
    const timer = this.time.addEvent({
      delay: 60,
      repeat: 4,
      callback: () => {
        g.clear();
        const a = angle - 0.8 + step * 0.4;
        const len = 20 + step * 4;
        g.lineStyle(3 - step * 0.4, 0xffffff, 1 - step * 0.15);
        g.beginPath();
        g.arc(cx, cy, len, a - 0.5, a + 0.5, false);
        g.strokePath();
        // 검 반짝임
        g.lineStyle(2, 0xaaddff, 0.8 - step * 0.15);
        g.beginPath();
        g.arc(cx, cy, len - 4, a - 0.3, a + 0.3, false);
        g.strokePath();
        step++;
      },
    });
    this.time.delayedCall(360, () => { timer.destroy(); g.destroy(); });
  }

  /** 원거리 공격 이펙트: 화살 투사체 */
  private showArrowProjectile(fromPos: Position, toPos: Position): void {
    const from = this.gridToPixel(fromPos);
    const to = this.gridToPixel(toPos);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // 화살 그래픽
    const arrow = this.add.graphics().setDepth(40);
    this.ignoreFromUiCam(arrow);
    arrow.setPosition(from.x, from.y);

    // 화살 모양
    arrow.lineStyle(2, 0x8B4513, 1); // 갈색 몸통
    arrow.lineBetween(0, 0, -12, 0);
    arrow.lineStyle(2, 0xC0C8D8, 1); // 은색 촉
    arrow.lineBetween(0, 0, 4, 0);
    // 깃
    arrow.lineStyle(1, 0xffffff, 0.8);
    arrow.lineBetween(-10, 0, -12, -3);
    arrow.lineBetween(-10, 0, -12, 3);

    arrow.setRotation(angle);

    this.tweens.add({
      targets: arrow,
      x: to.x,
      y: to.y,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        // 착탄 이펙트
        const hit = this.add.graphics().setDepth(41);
        this.ignoreFromUiCam(hit);
        hit.setPosition(to.x, to.y);
        hit.fillStyle(0xffffff, 0.8);
        hit.fillCircle(0, 0, 6);
        this.tweens.add({
          targets: hit, alpha: 0, duration: 200,
          onComplete: () => hit.destroy(),
        });
        arrow.destroy();
      },
    });
  }

  /** 병종 스킬 이펙트: 파란 기운 + 가벼운 화면 흔들림 */
  private showClassSkillEffect(targetPos: Position): void {
    const pos = this.gridToPixel(targetPos);
    const g = this.add.graphics().setDepth(40);
    this.ignoreFromUiCam(g);
    g.setPosition(pos.x, pos.y);

    // 화면 흔들림 (약하게)
    this.cameras.main.shake(200, 0.005);

    let step = 0;
    const timer = this.time.addEvent({
      delay: 70,
      repeat: 5,
      callback: () => {
        g.clear();
        const radius = 10 + step * 4;
        const alpha = 0.9 - step * 0.13;
        // 파란 기운 원
        g.lineStyle(2, 0x4488ff, alpha);
        g.strokeCircle(0, 0, radius);
        // 내부 글로우
        g.fillStyle(0x4488ff, alpha * 0.2);
        g.fillCircle(0, 0, radius * 0.7);
        // 상승 파티클 (작은 원)
        for (let i = 0; i < 3; i++) {
          const px = (Math.random() - 0.5) * radius * 1.5;
          const py = -step * 4 - Math.random() * 10;
          g.fillStyle(0x88ccff, alpha * 0.6);
          g.fillCircle(px, py, 2);
        }
        step++;
      },
    });
    this.time.delayedCall(450, () => { timer.destroy(); g.destroy(); });
  }

  /** 고유 스킬 이펙트: 강한 기운 + 화면 플래시 + 흔들림 */
  private showUniqueSkillEffect(casterPos: Position, targetPos: Position, color: number = 0xff6600): void {
    const cPos = this.gridToPixel(casterPos);
    const tPos = this.gridToPixel(targetPos);

    // 화면 흔들림 (강하게)
    this.cameras.main.shake(300, 0.012);

    // 화면 플래시
    this.cameras.main.flash(200, 255, 200, 100);

    // 시전자 기운 폭발
    const gCaster = this.add.graphics().setDepth(41);
    this.ignoreFromUiCam(gCaster);
    gCaster.setPosition(cPos.x, cPos.y);

    let step = 0;
    const timer1 = this.time.addEvent({
      delay: 50,
      repeat: 6,
      callback: () => {
        gCaster.clear();
        const radius = 15 + step * 5;
        const alpha = 1 - step * 0.13;
        // 바깥 기운
        gCaster.lineStyle(3, color, alpha);
        gCaster.strokeCircle(0, 0, radius);
        // 안쪽 글로우
        gCaster.fillStyle(color, alpha * 0.25);
        gCaster.fillCircle(0, 0, radius * 0.5);
        // 방사형 라인
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + step * 0.5;
          gCaster.lineStyle(2, 0xffffff, alpha * 0.5);
          gCaster.lineBetween(
            Math.cos(a) * radius * 0.3, Math.sin(a) * radius * 0.3,
            Math.cos(a) * radius, Math.sin(a) * radius,
          );
        }
        step++;
      },
    });
    this.time.delayedCall(400, () => { timer1.destroy(); gCaster.destroy(); });

    // 타겟 위치 임팩트
    this.time.delayedCall(150, () => {
      const gTarget = this.add.graphics().setDepth(41);
      this.ignoreFromUiCam(gTarget);
      gTarget.setPosition(tPos.x, tPos.y);

      let s2 = 0;
      const timer2 = this.time.addEvent({
        delay: 60,
        repeat: 5,
        callback: () => {
          gTarget.clear();
          const r = 5 + s2 * 6;
          const a = 0.9 - s2 * 0.15;
          gTarget.lineStyle(3, 0xffffff, a);
          gTarget.strokeCircle(0, 0, r);
          gTarget.fillStyle(color, a * 0.3);
          gTarget.fillCircle(0, 0, r * 0.6);
          s2++;
        },
      });
      this.time.delayedCall(380, () => { timer2.destroy(); gTarget.destroy(); });
    });
  }

  /** 힐 스킬 이펙트: 녹색 빛기둥 */
  private showHealEffect(targetPos: Position): void {
    const pos = this.gridToPixel(targetPos);
    const g = this.add.graphics().setDepth(40);
    this.ignoreFromUiCam(g);
    g.setPosition(pos.x, pos.y);

    let step = 0;
    const timer = this.time.addEvent({
      delay: 80,
      repeat: 5,
      callback: () => {
        g.clear();
        const alpha = 0.8 - step * 0.12;
        const h = 10 + step * 5;
        // 상승 빛기둥
        g.fillStyle(0x44ff88, alpha * 0.3);
        g.fillRect(-8, -h, 16, h * 2);
        // 십자 빛
        g.lineStyle(2, 0x44ff88, alpha);
        g.lineBetween(-6, 0, 6, 0);
        g.lineBetween(0, -8, 0, 8);
        // 파티클
        for (let i = 0; i < 4; i++) {
          const px = (Math.random() - 0.5) * 20;
          const py = -step * 6 - Math.random() * 8;
          g.fillStyle(0x88ffaa, alpha * 0.7);
          g.fillCircle(px, py, 1.5);
        }
        step++;
      },
    });
    this.time.delayedCall(500, () => { timer.destroy(); g.destroy(); });
  }

  /** 계략 공격 이펙트: 마법진 + 빛 */
  private showMagicEffect(targetPos: Position, color: number = 0x9944ff): void {
    const pos = this.gridToPixel(targetPos);
    const g = this.add.graphics().setDepth(40);
    this.ignoreFromUiCam(g);
    g.setPosition(pos.x, pos.y);

    let step = 0;
    const timer = this.time.addEvent({
      delay: 80,
      repeat: 5,
      callback: () => {
        g.clear();
        const radius = 8 + step * 5;
        const alpha = 1 - step * 0.15;
        // 마법진 원
        g.lineStyle(2, color, alpha);
        g.strokeCircle(0, 0, radius);
        // 내부 빛
        g.fillStyle(color, alpha * 0.3);
        g.fillCircle(0, 0, radius * 0.6);
        // 광선
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + step * 0.3;
          g.lineStyle(1, 0xffffff, alpha * 0.6);
          g.lineBetween(
            Math.cos(a) * radius * 0.3, Math.sin(a) * radius * 0.3,
            Math.cos(a) * radius, Math.sin(a) * radius,
          );
        }
        step++;
      },
    });
    this.time.delayedCall(520, () => { timer.destroy(); g.destroy(); });
  }

  /** 유닛 병종에 따른 공격 이펙트 표시 */
  private showAttackEffect(attacker: UnitData, defender: UnitData): void {
    const cls = attacker.unitClass ?? UnitClass.INFANTRY;
    switch (cls) {
      case UnitClass.ARCHER:
        this.showArrowProjectile(attacker.position, defender.position);
        break;
      case UnitClass.STRATEGIST:
        this.showMagicEffect(defender.position);
        break;
      default: // 보병, 기병, 무도가, 도적 등 근접
        this.showMeleeSlash(attacker.position, defender.position);
        break;
    }
  }

  // ── 공격 ──

  private executeAttack(attacker: UnitData, defender: UnitData): void {
    this.interactionState = 'ANIMATING';
    this.clearOverlays();
    this.hideActionMenu();

    this.faceToward(attacker, defender.position);
    this.playUnitAnim(attacker, 'attack');
    this.playSfx('attack_hit');
    this.showAttackEffect(attacker, defender);

    const defenderTile = this.battleState.tiles[defender.position.y][defender.position.x];
    const attackerTile = this.battleState.tiles[attacker.position.y][attacker.position.x];
    const result = this.combatSystem.executeAttack(attacker, defender, defenderTile, attackerTile, this.battleState.units);

    // 상성/협공 표시
    const atkPos = this.gridToPixel(attacker.position);
    if (result.typeAdvantage === 'strong') {
      this.showFloatingText(atkPos.x, atkPos.y - 30, '유리!', '#44ff44');
    } else if (result.typeAdvantage === 'weak') {
      this.showFloatingText(atkPos.x, atkPos.y - 30, '불리...', '#ff6666');
    }
    if (result.flanking) {
      this.showFloatingText(atkPos.x, atkPos.y - 45, '협공!', '#ffaa00');
    }
    if (result.missed) {
      const defPos2 = this.gridToPixel(defender.position);
      this.showFloatingText(defPos2.x, defPos2.y - 30, 'MISS!', '#888888');
    }
    if (result.critical) {
      this.showFloatingText(atkPos.x, atkPos.y - 55, '크리티컬!', '#ffaa00');
    }
    if (result.doubleAttack) {
      this.showFloatingText(atkPos.x, atkPos.y - 65, '2회 공격!', '#44aaff');
    }

    this.time.delayedCall(200, () => {
      this.faceToward(defender, attacker.position);
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

    this.awardExp(attacker, 'attack', defender.level ?? 1);
    if (result.defenderDied) this.awardExp(attacker, 'kill', defender.level ?? 1);

    if (result.counterDamage > 0) {
      this.time.delayedCall(400, () => {
        this.faceToward(defender, attacker.position);
        this.playUnitAnim(defender, 'idle');
        this.showAttackEffect(defender, attacker);
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

    // 스킬 등급 판별: 고유 스킬 vs 병종 스킬 vs 힐
    const isUniqueSkill = Object.values(HERO_UNIQUE_SKILLS).includes(skill.id);
    const isHealSkill = skill.effectType === SkillEffectType.HEAL;

    // 스킬 애니메이션 재생
    this.faceToward(caster, targetPos);
    this.playUnitAnim(caster, 'skill');

    this.playSfx('skill_cast');
    const casterPos = this.gridToPixel(caster.position);
    const nameColor = isUniqueSkill ? '#ffaa00' : '#cc88ff';
    this.showFloatingText(casterPos.x, casterPos.y - 20, skill.name, nameColor);

    // 스킬 등급별 이펙트
    if (isUniqueSkill) {
      this.showUniqueSkillEffect(caster.position, targetPos);
    } else if (isHealSkill) {
      this.showHealEffect(targetPos);
    } else {
      this.showClassSkillEffect(targetPos);
    }

    this.time.delayedCall(300, () => {
      for (const effect of result.effects) {
        const unit = this.turnSystem.getUnitById(effect.unitId);
        if (!unit) continue;
        const pos = this.gridToPixel(unit.position);

        if (effect.damageDealt) {
          this.playSfx('skill_fire');
          const dmgColor = isUniqueSkill ? '#ff6600' : '#cc44ff';
          this.showDamageText(pos.x, pos.y, effect.damageDealt, dmgColor);
          this.playUnitAnim(unit, 'hit');
        }
        if (effect.healingDone) {
          this.playSfx('skill_heal');
          this.showFloatingText(pos.x, pos.y, `+${effect.healingDone}`, '#44ff44');
        }
        if (effect.statusApplied) {
          this.showFloatingText(pos.x, pos.y + 15, effect.statusApplied, '#ffff44');
        }
        if (effect.unitDied) {
          this.playUnitAnim(unit, 'die');
          this.fadeOutUnit(effect.unitId);
        }

        this.updateUnitSprite(unit);

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
    this.ignoreFromUiCam(text);
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
      this.playSfx('level_up');
      this.time.delayedCall(400, () => {
        this.showFloatingText(pos.x, pos.y - 5, `LEVEL UP! Lv.${levelUp.newLevel}`, '#ffdd44');
        if (levelUp.promoted && levelUp.promotionName) {
          this.time.delayedCall(600, () => {
            this.showFloatingText(pos.x, pos.y - 20, `승급! → ${levelUp.promotionName}`, '#ff88ff');
          });
        }
        this.updateUnitSprite(unit);
      });
    }
  }

  private fadeOutUnit(unitId: string): void {
    this.playSfx('unit_die');
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
    this.ignoreFromUiCam(text);
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
    this.hideUnitInfoPanel();
    EventBus.emit('unit-selected', null);

    const winner = this.turnSystem.checkVictory();
    if (winner) { this.onGameOver(winner); return; }

    if (this.battleState.phase === 'player' && this.turnSystem.isAllActed('player')) {
      this.startEnemyTurn();
    } else {
      this.interactionState = 'IDLE';
      // 자동 전투: 다음 유닛 자동 조작
      if (this.autoMode && this.battleState.phase === 'player') {
        this.time.delayedCall(300, () => this.executeAutoTurn());
      }
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
      // AI 유닛 액션 전에 카메라 이동
      this.centerCameraOn(action.unit.position, 200);
      await this.delay(200);
      await this.executeAIAction(action);
      await this.delay(400);
      const winner = this.turnSystem.checkVictory();
      if (winner) { this.onGameOver(winner); return; }
    }

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
    this.playSfx('turn_start');
    this.battleState.units.forEach(u => this.updateUnitSprite(u));
    this.interactionState = 'IDLE';

    // 아군 턴 시작 시
    const firstAvail = this.turnSystem.getUnitsByFaction('player').find(u => !u.hasActed);
    if (firstAvail) this.centerCameraOn(firstAvail.position, 400);

    // 자동 전투 모드면 자동 진행
    if (this.autoMode) {
      this.time.delayedCall(500, () => this.executeAutoTurn());
    }
  }

  /** 자동 전투: 아군 유닛을 AI가 조작 */
  private executeAutoTurn(): void {
    if (this.interactionState !== 'IDLE' || this.battleState.phase !== 'player') return;
    if (!this.autoMode) return;

    const available = this.turnSystem.getUnitsByFaction('player').find(u => !u.hasActed);
    if (!available) {
      this.onEndTurnClicked();
      return;
    }

    const enemies = this.turnSystem.getUnitsByFaction('enemy');
    if (enemies.length === 0) { available.hasActed = true; this.finishAction(); return; }

    // 가장 가까운 적 찾기
    let nearestEnemy = enemies[0];
    let minDist = Infinity;
    for (const e of enemies) {
      const dist = Math.abs(available.position.x - e.position.x) + Math.abs(available.position.y - e.position.y);
      if (dist < minDist) { minDist = dist; nearestEnemy = e; }
    }

    // 이동 범위 계산
    const moveRange = this.gridSystem.getMovementRange(
      available.position, available.stats.moveRange, this.battleState.units, 'player', available.unitClass,
    );

    // 가장 가까운 적에게 접근하는 타일 선택
    let bestTile = available.position;
    let bestDist = minDist;
    for (const tile of moveRange) {
      const dist = Math.abs(tile.x - nearestEnemy.position.x) + Math.abs(tile.y - nearestEnemy.position.y);
      if (dist < bestDist) { bestDist = dist; bestTile = tile; }
    }

    // 선택 → 이동 → onMoveComplete에서 autoSelectAction 호출
    this.selectUnit(available);
    this.time.delayedCall(200, () => {
      if (bestTile.x !== available.position.x || bestTile.y !== available.position.y) {
        this.preMovePosition = { ...available.position };
        this.moveUnit(available, bestTile);
        // onMoveComplete에서 autoMode 체크 후 자동 행동
      } else {
        this.autoSelectAction(available);
      }
    });
  }

  /** 자동 전투: 액션 자동 선택 (공격 가능하면 공격, 아니면 대기) */
  private autoSelectAction(unit: UnitData): void {
    this.hideActionMenu();
    this.hideUnitInfoPanel();

    // 공격 가능한 적 찾기
    const attackRange = this.gridSystem.getAttackRange(unit.position, unit.stats.attackRange, this.isDiagonalAttack(unit));
    const target = attackRange
      .map(pos => this.getUnitAt(pos))
      .find(u => u && u.faction === 'enemy' && u.isAlive);

    if (target) {
      this.preMovePosition = null;
      this.executeAttack(unit, target);
    } else {
      // 스킬 사용 시도
      const usableSkills = this.skillSystem.getUsableSkills(unit);
      const healSkill = usableSkills.find(s => s.effectType === SkillEffectType.HEAL);
      const damageSkill = usableSkills.find(s => s.effectType === SkillEffectType.DAMAGE);

      if (damageSkill) {
        const skillTargets = this.skillSystem.getSkillTargetPositions(unit, damageSkill, this.battleState.units, this.gridSystem);
        if (skillTargets.length > 0) {
          this.executeSkill(unit, damageSkill, skillTargets[0]);
          return;
        }
      }
      if (healSkill) {
        const wounded = this.battleState.units.find(u => u.faction === 'player' && u.isAlive && u.stats.hp < u.stats.maxHp * 0.7);
        if (wounded) {
          this.executeSkill(unit, healSkill, wounded.position);
          return;
        }
      }

      // 대기
      this.preMovePosition = null;
      unit.hasActed = true;
      this.updateUnitSprite(unit);
      this.finishAction();
    }
  }

  private executeAIAction(action: ReturnType<AISystem['planActions']>[number]): Promise<void> {
    return new Promise(resolve => {
      const { unit, moveTo, attackTarget, skillAction } = action;

      const doAttack = (target: UnitData, onDone: () => void) => {
        this.centerCameraOn(target.position, 200);
        this.faceToward(unit, target.position);
        this.showAttackEffect(unit, target);
        const defTile = this.battleState.tiles[target.position.y][target.position.x];
        const atkTile = this.battleState.tiles[unit.position.y][unit.position.x];
        const result = this.combatSystem.executeAttack(unit, target, defTile, atkTile, this.battleState.units);
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
        this.centerCameraOn(targetPos, 200);
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
        this.centerCameraOn(moveTo, 300);
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
    this.getAudio()?.stopBgm();
    this.playSfx(winner === 'player' ? 'game_over_win' : 'game_over_lose');
    this.gameOverText.setText(message).setVisible(true);
    EventBus.emit('game-over', winner);

    if (this.campaignMode && this.campaignManager && this.campaignStage) {
      this.time.delayedCall(1500, () => {
        this.gameOverText.setText(message + '\n\n(클릭하여 계속)');
        this.input.once('pointerdown', () => {
          if (winner === 'player') {
            const survivors = this.battleState.units.filter(u => u.faction === 'player' && u.isAlive);
            this.campaignManager!.completeBattle(survivors, this.campaignStage!);
            this.campaignManager!.incrementMission('battle_3');
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

  // ── 포기 확인 ──

  private showRetreatConfirm(): void {
    const gw = this.scale.width;
    const gh = this.scale.height;

    const overlay = this.add.graphics().setDepth(300);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, gw, gh);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, gw, gh), Phaser.Geom.Rectangle.Contains);
    overlay.setScrollFactor(0);

    const objects: Phaser.GameObjects.GameObject[] = [overlay];

    const panelW = 280;
    const panelH = 160;
    const px = (gw - panelW) / 2;
    const py = (gh - panelH) / 2;

    const panel = this.add.graphics().setDepth(301).setScrollFactor(0);
    panel.fillStyle(0x1a1a2e, 1);
    panel.fillRoundedRect(px, py, panelW, panelH, 12);
    panel.lineStyle(2, 0xff4444, 0.6);
    panel.strokeRoundedRect(px, py, panelW, panelH, 12);
    objects.push(panel);

    const title = this.add.text(gw / 2, py + 30, '전투를 포기하시겠습니까?', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302).setScrollFactor(0);
    objects.push(title);

    const desc = this.add.text(gw / 2, py + 58, '진행 상황이 저장되지 않습니다.', {
      fontSize: '13px', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(302).setScrollFactor(0);
    objects.push(desc);

    const cleanup = () => objects.forEach(o => o.destroy());

    // 포기 버튼
    const confirmBg = this.add.graphics().setDepth(301).setScrollFactor(0);
    confirmBg.fillStyle(0xaa3333, 1);
    confirmBg.fillRoundedRect(px + 15, py + 85, panelW / 2 - 25, 44, 8);
    objects.push(confirmBg);

    const confirmBtn = this.add.text(px + 15 + (panelW / 2 - 25) / 2, py + 107, '포기', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    confirmBtn.on('pointerdown', () => {
      cleanup();
      this.getAudio()?.stopBgm();
      if (this.campaignMode && this.campaignManager) {
        this.scene.start('WorldMapScene', { campaignManager: this.campaignManager });
      } else {
        this.scene.start('LobbyScene', { campaignManager: this.campaignManager });
      }
    });
    objects.push(confirmBtn);

    // 취소 버튼
    const cancelBg = this.add.graphics().setDepth(301).setScrollFactor(0);
    cancelBg.fillStyle(0x4a4a6a, 1);
    cancelBg.fillRoundedRect(px + panelW / 2 + 10, py + 85, panelW / 2 - 25, 44, 8);
    objects.push(cancelBg);

    const cancelBtn = this.add.text(px + panelW / 2 + 10 + (panelW / 2 - 25) / 2, py + 107, '계속 전투', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerdown', cleanup);
    objects.push(cancelBtn);
  }

  // ── 유틸리티 ──

  // ── 유닛 정보 패널 ──

  private unitInfoPanel: Phaser.GameObjects.GameObject[] = [];

  private showUnitInfoPanel(unit: UnitData, expanded = false): void {
    this.hideUnitInfoPanel();

    const gw = this.scale.width;
    const gh = this.scale.height;
    const panelH = expanded ? 170 : 95;
    const panelY = gh - UI_BAR_H - panelH - 5;

    // 패널 배경
    const bg = this.add.graphics().setDepth(180);
    bg.fillStyle(0x0a0a2a, 0.92);
    bg.fillRoundedRect(5, panelY, gw - 10, panelH, 8);
    bg.lineStyle(1, 0x4466aa, 1);
    bg.strokeRoundedRect(5, panelY, gw - 10, panelH, 8);
    this.unitInfoPanel.push(bg);
    this.cameras.main.ignore(bg);

    const addText = (x: number, y: number, text: string, opts: object) => {
      const t = this.add.text(x, y, text, opts as Phaser.Types.GameObjects.Text.TextStyle).setDepth(181);
      this.unitInfoPanel.push(t);
      this.cameras.main.ignore(t);
      return t;
    };

    // 이름/병종/레벨
    const cls = unit.unitClass ? (UNIT_CLASS_DEFS[unit.unitClass]?.name ?? '') : '';
    const promo = unit.promotionClass ?? cls;
    const faction = unit.faction === 'player' ? '아군' : '적군';
    const fColor = unit.faction === 'player' ? '#44aaff' : '#ff4444';

    addText(15, panelY + 6, `${unit.name}  ${promo} Lv.${unit.level ?? 1}`, {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    });
    addText(gw - 50, panelY + 6, faction, { fontSize: '13px', color: fColor });

    // HP/MP
    const hp = unit.stats.hp;
    const maxHp = unit.stats.maxHp;
    const hpRatio = hp / maxHp;
    const hpColor = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffff44' : '#ff4444';
    addText(15, panelY + 26, `HP: ${hp}/${maxHp}`, { fontSize: '13px', color: hpColor });
    if (unit.maxMp && unit.maxMp > 0) {
      addText(150, panelY + 26, `MP: ${unit.mp ?? 0}/${unit.maxMp}`, { fontSize: '13px', color: '#4488ff' });
    }

    // 병종별 핵심 스탯 (항상 표시)
    const { attack, defense, speed, spirit, moveRange, attackRange } = unit.stats;
    let keyStats = '';
    switch (unit.unitClass) {
      case 'strategist':
        keyStats = `정신:${spirit ?? 0}  공격:${attack}  방어:${defense}  속도:${speed}`;
        break;
      case 'archer':
        keyStats = `공격:${attack}  사거리:${attackRange}  속도:${speed}  방어:${defense}`;
        break;
      case 'cavalry':
        keyStats = `공격:${attack}  속도:${speed}  이동:${moveRange}  방어:${defense}`;
        break;
      case 'bandit':
        keyStats = `공격:${attack}  속도:${speed}  민첩:${unit.stats.agility ?? 0}  관통:${unit.stats.penetration ?? 0}`;
        break;
      default:
        keyStats = `공격:${attack}  방어:${defense}  속도:${speed}  이동:${moveRange}`;
    }
    addText(15, panelY + 44, keyStats, { fontSize: '12px', color: '#cccccc' });

    // 스킬 목록
    const skillIds = this.skillSystem.getAllSkillIds(unit);
    if (skillIds.length > 0) {
      const skillNames = skillIds.map(id => SKILL_DEFS[id]).filter(Boolean).map(s => s!.name).join('  ');
      addText(15, panelY + 60, `스킬: ${skillNames}`, {
        fontSize: '12px', color: '#cc88ff', wordWrap: { width: gw - 80 },
      });
    }

    // 펼치기/접기 버튼
    const toggleText = expanded ? '▲ 접기' : '▼ 상세';
    const toggleBtn = addText(gw - 65, panelY + 60, toggleText, {
      fontSize: '12px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 6, y: 3 },
    });
    toggleBtn.setInteractive({ useHandCursor: true });
    toggleBtn.on('pointerdown', () => {
      this.showUnitInfoPanel(unit, !expanded);
    });

    // 상세 스탯 (펼쳤을 때만)
    if (expanded) {
      const s = unit.stats;
      addText(15, panelY + 85, `공격:${s.attack}  방어:${s.defense}  속도:${s.speed}  정신:${s.spirit ?? 0}`, {
        fontSize: '12px', color: '#aaaaaa',
      });
      addText(15, panelY + 101, `민첩:${s.agility ?? 0}  순발:${s.critical ?? 0}  사기:${s.morale ?? 0}  관통:${s.penetration ?? 0}%`, {
        fontSize: '12px', color: '#aaaaaa',
      });
      addText(15, panelY + 117, `저항:${s.resist ?? 0}%  이동:${s.moveRange}  사거리:${s.attackRange}`, {
        fontSize: '12px', color: '#aaaaaa',
      });

      // 상태효과 표시
      if (unit.statusEffects && unit.statusEffects.length > 0) {
        const effects = unit.statusEffects.map(e => `${e.effect}(${e.remainingTurns}턴)`).join(' ');
        addText(15, panelY + 137, `상태: ${effects}`, {
          fontSize: '11px', color: '#ffaa44', wordWrap: { width: gw - 30 },
        });
      }

      // 각성 표시
      if (unit.awakeningLevel && unit.awakeningLevel > 0) {
        const stars = '★'.repeat(unit.awakeningLevel) + '☆'.repeat(5 - unit.awakeningLevel);
        addText(15, panelY + 153, `각성: ${stars}`, { fontSize: '11px', color: '#ffd700' });
      }
    }
  }

  private hideUnitInfoPanel(): void {
    for (const obj of this.unitInfoPanel) obj.destroy();
    this.unitInfoPanel = [];
  }

  private showEnemyPreview(unit: UnitData): void {
    this.clearOverlays();
    this.enemyPreviewMoveTiles = this.gridSystem.getMovementRange(
      unit.position, unit.stats.moveRange, this.battleState.units, unit.faction, unit.unitClass,
    );
    const allPositions = [unit.position, ...this.enemyPreviewMoveTiles];
    const attackSet = new Set<string>();
    for (const pos of allPositions) {
      const atkRange = this.gridSystem.getAttackRange(pos, unit.stats.attackRange, this.isDiagonalAttack(unit));
      for (const ap of atkRange) {
        attackSet.add(`${ap.x},${ap.y}`);
      }
    }
    const moveSet = new Set(this.enemyPreviewMoveTiles.map(p => `${p.x},${p.y}`));
    moveSet.add(`${unit.position.x},${unit.position.y}`);
    this.enemyPreviewAttackTiles = [...attackSet]
      .filter(k => !moveSet.has(k))
      .map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });

    this.drawOverlays();
    this.showUnitInfoPanel(unit);
    EventBus.emit('unit-selected', unit);
  }

  private deselectUnit(): void {
    this.selectedUnit = null;
    this.battleState.selectedUnitId = null;
    this.interactionState = 'IDLE';
    this.clearOverlays();
    this.hideActionMenu();
    this.hideUnitInfoPanel();
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
