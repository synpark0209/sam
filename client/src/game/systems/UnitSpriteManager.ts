import Phaser from 'phaser';
import { UnitClass } from '@shared/types/index.ts';
import { TILE_SIZE } from '@shared/constants.ts';

type Faction = 'player' | 'enemy';

/** 유닛 이미지 키 */
function imageKey(unitClass: UnitClass, faction: Faction): string {
  return `unit_img_${unitClass}_${faction}`;
}

/** 유닛 이미지 경로 */
function imagePath(unitClass: UnitClass, faction: Faction): string {
  return `assets/units/${unitClass}_${faction}.png`;
}

/** 모든 유닛 클래스 */
const ALL_CLASSES: UnitClass[] = [
  UnitClass.INFANTRY,
  UnitClass.CAVALRY,
  UnitClass.ARCHER,
  UnitClass.STRATEGIST,
  UnitClass.BANDIT,
  UnitClass.MARTIAL_ARTIST,
];

// ── 스프라이트 시트 캐릭터 정의 ──
// 캐릭터별 스프라이트 시트 (4x4 그리드, 512x512 프레임)
interface SpriteSheetDef {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  // 행별 애니메이션 매핑
  anims: {
    idle: { start: number; end: number; frameRate: number };
    walk: { start: number; end: number; frameRate: number };
    attack: { start: number; end: number; frameRate: number };
    die: { start: number; end: number; frameRate: number };
  };
}

// ── PixelLab 캐릭터 정의 ──
// 개별 PNG 프레임 기반 (방향별 애니메이션)
interface PixelLabAnimDef {
  folder: string;       // PixelLab 애니메이션 폴더명
  frames: number;       // 프레임 수
  frameRate: number;
}

interface PixelLabCharacterDef {
  key: string;          // 고유 키 (예: 'pl_lubu')
  basePath: string;     // 에셋 기본 경로
  size: number;         // 캔버스 크기 (96 등)
  displayScale?: number; // 표시 배율 보정 (기본 1.0)
  // 게임 애니메이션 → PixelLab 폴더 매핑
  anims: {
    idle: PixelLabAnimDef;
    walk: PixelLabAnimDef;
    attack: PixelLabAnimDef;
    hit: PixelLabAnimDef;
    die: PixelLabAnimDef;
    skill?: PixelLabAnimDef;
  };
}

/** 장수 ID → 스프라이트 시트 매핑 (레거시) */
const HERO_SPRITE_SHEETS: Record<string, SpriteSheetDef> = {};

/** 장수 ID → PixelLab 캐릭터 매핑 */
const PIXELLAB_CHARACTERS: Record<string, PixelLabCharacterDef> = {
  p1: { // 여포
    key: 'pl_lubu',
    basePath: 'assets/characters/lubu',
    size: 96, displayScale: 1.1,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'halberd-attack',     frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
      skill:  { folder: 'halberd-skill',      frames: 4, frameRate: 6 },
    },
  },
  p2: { // 장료
    key: 'pl_zhangliao',
    basePath: 'assets/characters/zhangliao',
    size: 96, displayScale: 1.1,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'polearm-attack',     frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
      skill:  { folder: 'charge-skill',       frames: 4, frameRate: 6 },
    },
  },
  p5: { // 초선
    key: 'pl_diaochan',
    basePath: 'assets/characters/diaochan',
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'fan-attack',         frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
      skill:  { folder: 'fan-skill',          frames: 4, frameRate: 6 },
    },
  },
  gacha_zhaoyun: { // 조운
    key: 'pl_zhaoyun',
    basePath: 'assets/characters/zhaoyun',
    size: 96, displayScale: 0.85,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'spear-attack',       frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
      skill:  { folder: 'charge-skill',       frames: 4, frameRate: 6 },
    },
  },
  gacha_zhangfei: { // 장비
    key: 'pl_zhangfei',
    basePath: 'assets/characters/zhangfei',
    size: 96, displayScale: 0.85,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'spear-attack',       frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
      skill:  { folder: 'roar-skill',         frames: 4, frameRate: 6 },
    },
  },
  gacha_zhouyu: { // 주유
    key: 'pl_zhouyu',
    basePath: 'assets/characters/zhouyu',
    size: 96, displayScale: 0.85,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'sword-attack',       frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
      skill:  { folder: 'fire-skill',         frames: 4, frameRate: 6 },
    },
  },
  gacha_zhuge: { // 제갈량
    key: 'pl_zhuge',
    basePath: 'assets/characters/zhuge',
    size: 96, displayScale: 0.85,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'fan-attack',         frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
      skill:  { folder: 'fire-skill',         frames: 4, frameRate: 6 },
    },
  },
  gacha_caocao: { // 조조
    key: 'pl_caocao',
    basePath: 'assets/characters/caocao',
    size: 96, displayScale: 0.85,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'sword-attack',       frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
      skill:  { folder: 'command-skill',      frames: 4, frameRate: 6 },
    },
  },
  gacha_guanyu: { // 관우
    key: 'pl_guanyu',
    basePath: 'assets/characters/guanyu',
    size: 96, displayScale: 0.85,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'blade-attack',       frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
      skill:  { folder: 'blade-skill',        frames: 4, frameRate: 6 },
    },
  },
};

/** 병종 → PixelLab 캐릭터 매핑 (장수 ID에 매칭 안 될 때 폴백) */
const PIXELLAB_CLASS_UNITS: Record<string, PixelLabCharacterDef> = {
  [UnitClass.INFANTRY]: {
    key: 'pl_infantry',
    basePath: 'assets/characters/infantry', displayScale: 1.1,
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'sword-attack',       frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
    },
  },
  [UnitClass.CAVALRY]: {
    key: 'pl_cavalry',
    basePath: 'assets/characters/cavalry', displayScale: 1.1,
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'spear-attack',       frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
    },
  },
  [UnitClass.ARCHER]: {
    key: 'pl_archer',
    basePath: 'assets/characters/archer', displayScale: 1.1,
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'bow-attack',         frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
    },
  },
  [UnitClass.STRATEGIST]: {
    key: 'pl_strategist',
    basePath: 'assets/characters/strategist', displayScale: 1.1,
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'fan-attack',         frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
    },
  },
  [UnitClass.BANDIT]: {
    key: 'pl_bandit',
    basePath: 'assets/characters/bandit', displayScale: 1.1,
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'dagger-attack',      frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
    },
  },
  [UnitClass.MARTIAL_ARTIST]: {
    key: 'pl_martial_artist',
    basePath: 'assets/characters/martial_artist', displayScale: 1.1,
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'cross-punch',        frames: 6, frameRate: 8 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
    },
  },
  // 새 병종: 전용 스프라이트 없으면 유사 병종 스프라이트 재사용
  [UnitClass.DANCER]: {
    key: 'pl_strategist', // 책사 스프라이트 재사용 (초선은 p5로 전용 매핑)
    basePath: 'assets/characters/strategist', displayScale: 1.1,
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'fan-attack',         frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
    },
  },
  [UnitClass.TAOIST]: {
    key: 'pl_strategist', // 책사 스프라이트 재사용
    basePath: 'assets/characters/strategist', displayScale: 1.1,
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'fan-attack',         frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
    },
  },
  [UnitClass.GEOMANCER]: {
    key: 'pl_strategist',
    basePath: 'assets/characters/strategist', displayScale: 1.1, // 책사 스프라이트 재사용
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'fan-attack',         frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
    },
  },
  [UnitClass.SIEGE]: {
    key: 'pl_infantry',
    basePath: 'assets/characters/infantry', // 보병 스프라이트 재사용 (임시)
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'sword-attack',       frames: 4, frameRate: 6 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
    },
  },
};

/** PixelLab 기본 방향 (남쪽 = 정면) */
const PL_DEFAULT_DIR = 'south';
/** 전투에서 사용할 4방향 */
const PL_DIRECTIONS = ['south', 'east', 'north', 'west'] as const;

/** 이미지가 로드되었는지 확인 */
export function hasUnitImage(scene: Phaser.Scene, unitClass: UnitClass, faction: Faction): boolean {
  return scene.textures.exists(imageKey(unitClass, faction));
}

/** 장수 ID 또는 병종으로 PixelLab 캐릭터 정의 가져오기 */
function getPixelLabDef(heroId: string, unitClass?: UnitClass): PixelLabCharacterDef | undefined {
  // 1. 장수 ID로 정확히 매칭
  if (PIXELLAB_CHARACTERS[heroId]) return PIXELLAB_CHARACTERS[heroId];
  // 2. 가챠 장수: ID prefix로 매칭 (gacha_guanyu_123456 → gacha_guanyu)
  for (const [key, def] of Object.entries(PIXELLAB_CHARACTERS)) {
    if (heroId.startsWith(key)) return def;
  }
  // 3. 병종으로 폴백
  if (unitClass && PIXELLAB_CLASS_UNITS[unitClass]) return PIXELLAB_CLASS_UNITS[unitClass];
  return undefined;
}

/** 장수 ID 또는 병종으로 PixelLab 캐릭터 확인 */
export function hasPixelLabCharacter(scene: Phaser.Scene, heroId: string, unitClass?: UnitClass): boolean {
  const def = getPixelLabDef(heroId, unitClass);
  if (!def) return false;
  return scene.textures.exists(`${def.key}_idle_${PL_DEFAULT_DIR}_0`);
}

/** 장수 ID로 스프라이트 시트 확인 */
export function hasSpriteSheet(scene: Phaser.Scene, heroId: string): boolean {
  const def = HERO_SPRITE_SHEETS[heroId];
  return !!def && scene.textures.exists(def.key);
}

/** preload에서 유닛 이미지 + 스프라이트 시트 + PixelLab 캐릭터 로드 */
export function preloadUnitImages(scene: Phaser.Scene): void {
  // 기존 단일 이미지
  for (const uc of ALL_CLASSES) {
    for (const f of ['player', 'enemy'] as Faction[]) {
      const key = imageKey(uc, f);
      const path = imagePath(uc, f);
      scene.load.image(key, path);
    }
  }

  // 레거시 스프라이트 시트
  for (const def of Object.values(HERO_SPRITE_SHEETS)) {
    if (!scene.textures.exists(def.key)) {
      scene.load.spritesheet(def.key, def.path, {
        frameWidth: def.frameWidth,
        frameHeight: def.frameHeight,
      });
    }
  }

  // PixelLab 캐릭터 + 병종 유닛 개별 프레임 로드 (4방향 전부)
  const allPixelLabDefs = [...Object.values(PIXELLAB_CHARACTERS), ...Object.values(PIXELLAB_CLASS_UNITS)];
  for (const def of allPixelLabDefs) {
    for (const dir of PL_DIRECTIONS) {
      // 정지 이미지
      const rotKey = `${def.key}_rotation_${dir}`;
      if (!scene.textures.exists(rotKey)) {
        scene.load.image(rotKey, `${def.basePath}/rotations/${dir}.png`);
      }
      // 애니메이션 프레임 로드
      for (const [animName, animDef] of Object.entries(def.anims)) {
        if (!animDef) continue;
        for (let i = 0; i < animDef.frames; i++) {
          const frameKey = `${def.key}_${animName}_${dir}_${i}`;
          if (!scene.textures.exists(frameKey)) {
            const framePath = `${def.basePath}/animations/${animDef.folder}/${dir}/frame_${String(i).padStart(3, '0')}.png`;
            scene.load.image(frameKey, framePath);
          }
        }
      }
    }
  }

  // 로드 실패 무시
  scene.load.on('loaderror', (file: Phaser.Loader.File) => {
    if (file.key.startsWith('unit_img_') || file.key.startsWith('ss_') || file.key.startsWith('pl_')) {
      // 조용히 무시
    }
  });
}

/** 스프라이트 시트 애니메이션 생성 */
export function createSpriteSheetAnimations(scene: Phaser.Scene): void {
  // 레거시 스프라이트 시트
  for (const [, def] of Object.entries(HERO_SPRITE_SHEETS)) {
    if (!scene.textures.exists(def.key)) continue;
    for (const [animName, animDef] of Object.entries(def.anims)) {
      const animKey = `${def.key}_${animName}`;
      if (scene.anims.exists(animKey)) continue;
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(def.key, { start: animDef.start, end: animDef.end }),
        frameRate: animDef.frameRate,
        repeat: animName === 'idle' || animName === 'walk' ? -1 : 0,
      });
    }
  }

  // PixelLab 캐릭터 + 병종 유닛 애니메이션 (방향별 개별 텍스처 기반)
  const allPixelLabDefs2 = [...Object.values(PIXELLAB_CHARACTERS), ...Object.values(PIXELLAB_CLASS_UNITS)];
  for (const def of allPixelLabDefs2) {
    for (const [animName, animDef] of Object.entries(def.anims)) {
      if (!animDef) continue;
      for (const dir of PL_DIRECTIONS) {
        const animKey = `${def.key}_${animName}_${dir}`;
        if (scene.anims.exists(animKey)) continue;
        const firstFrameKey = `${def.key}_${animName}_${dir}_0`;
        if (!scene.textures.exists(firstFrameKey)) {
          if (def.key === 'pl_diaochan') console.warn(`[ANIM] Missing frame: ${firstFrameKey}`);
          continue;
        }

        const frames: Phaser.Types.Animations.AnimationFrame[] = [];
        for (let i = 0; i < animDef.frames; i++) {
          frames.push({ key: `${def.key}_${animName}_${dir}_${i}` });
        }
        scene.anims.create({
          key: animKey,
          frames,
          frameRate: animDef.frameRate,
          repeat: (animName === 'idle' || animName === 'walk') ? -1 : 0,
        });
      }
    }
  }
}

/** 스프라이트 시트 기반 유닛 스프라이트 생성 */
export function createSpriteSheetSprite(
  scene: Phaser.Scene,
  heroId: string,
): Phaser.GameObjects.Sprite | null {
  const def = HERO_SPRITE_SHEETS[heroId];
  if (!def || !scene.textures.exists(def.key)) return null;

  const sprite = scene.add.sprite(0, 0, def.key, 0);
  const scale = TILE_SIZE / def.frameWidth * 1.2; // 약간 크게
  sprite.setScale(scale);

  // idle 애니메이션 시작
  const idleKey = `${def.key}_idle`;
  if (scene.anims.exists(idleKey)) {
    sprite.play(idleKey);
  }

  return sprite;
}

/** 스프라이트 시트 애니메이션 재생 */
export function playSpriteSheetAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  heroId: string,
  anim: string,
): void {
  const def = HERO_SPRITE_SHEETS[heroId];
  if (!def) return;

  const animKey = `${def.key}_${anim}`;
  if (scene.anims.exists(animKey)) {
    sprite.play(animKey);
    // 공격/사망 후 idle로 복귀
    if (anim === 'attack') {
      sprite.once('animationcomplete', () => {
        const idleKey = `${def.key}_idle`;
        if (scene.anims.exists(idleKey)) sprite.play(idleKey);
      });
    }
  }
}

/** 그리드 좌표 차이로 방향 결정 */
export function getPixelLabDirection(dx: number, dy: number): string {
  // dy > 0: 아래(south), dy < 0: 위(north)
  // dx > 0: 오른쪽(east), dx < 0: 왼쪽(west)
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'east' : 'west';
  }
  return dy > 0 ? 'south' : 'north';
}

/** PixelLab 캐릭터 스프라이트 생성 */
export function createPixelLabSprite(
  scene: Phaser.Scene,
  heroId: string,
  unitClass?: UnitClass,
): Phaser.GameObjects.Sprite | null {
  const def = getPixelLabDef(heroId, unitClass);
  if (!def) return null;

  const firstFrameKey = `${def.key}_idle_${PL_DEFAULT_DIR}_0`;
  if (!scene.textures.exists(firstFrameKey)) {
    console.warn(`[SPRITE] Missing texture: ${firstFrameKey} for hero ${heroId}`);
    return null;
  }

  const sprite = scene.add.sprite(0, 0, firstFrameKey);
  const scale = TILE_SIZE / def.size * 1.3 * (def.displayScale ?? 1.0);
  sprite.setScale(scale);
  sprite.setData('plDirection', PL_DEFAULT_DIR);

  // idle 애니메이션 시작 (남쪽 = 정면)
  const idleKey = `${def.key}_idle_${PL_DEFAULT_DIR}`;
  if (scene.anims.exists(idleKey)) {
    sprite.play(idleKey);
  }

  return sprite;
}

/** PixelLab 캐릭터 방향 설정 */
export function setPixelLabDirection(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  heroId: string,
  direction: string,
  unitClass?: UnitClass,
): void {
  const def = getPixelLabDef(heroId, unitClass);
  if (!def) return;

  const currentDir = sprite.getData('plDirection') as string;
  if (currentDir === direction) return;

  sprite.setData('plDirection', direction);
  sprite.setFlipX(false);

  // 현재 재생 중인 애니메이션을 새 방향으로 전환
  const currentAnim = sprite.anims.currentAnim;
  if (currentAnim) {
    const prefix = `${def.key}_`;
    const animName = currentAnim.key.slice(prefix.length, currentAnim.key.lastIndexOf('_'));
    const newAnimKey = `${def.key}_${animName}_${direction}`;
    if (scene.anims.exists(newAnimKey)) {
      sprite.play(newAnimKey);
      return;
    }
  }

  // 애니메이션이 없으면 정지 이미지(rotation)로 폴백
  const rotKey = `${def.key}_rotation_${direction}`;
  if (scene.textures.exists(rotKey)) {
    sprite.stop();
    sprite.setTexture(rotKey);
  }
}

/** PixelLab 애니메이션 재생 (현재 방향 기준) */
export function playPixelLabAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  heroId: string,
  anim: string,
  unitClass?: UnitClass,
): void {
  const def = getPixelLabDef(heroId, unitClass);
  if (!def) return;

  const dir = (sprite.getData('plDirection') as string) || PL_DEFAULT_DIR;
  let animKey = `${def.key}_${anim}_${dir}`;

  // skill 애니메이션이 없으면 attack으로 폴백
  if (!scene.anims.exists(animKey) && anim === 'skill') {
    animKey = `${def.key}_attack_${dir}`;
  }

  if (scene.anims.exists(animKey)) {
    sprite.play(animKey);
    // 공격/스킬/피격 후 idle로 복귀
    if (anim === 'attack' || anim === 'skill' || anim === 'hit') {
      sprite.once('animationcomplete', () => {
        const idleKey = `${def.key}_idle_${dir}`;
        if (scene.anims.exists(idleKey)) sprite.play(idleKey);
        else {
          const rotKey = `${def.key}_rotation_${dir}`;
          if (scene.textures.exists(rotKey)) { sprite.stop(); sprite.setTexture(rotKey); }
        }
      });
    }
  } else {
    // 애니메이션 없으면 정지 이미지로 폴백
    const rotKey = `${def.key}_rotation_${dir}`;
    if (scene.textures.exists(rotKey)) { sprite.stop(); sprite.setTexture(rotKey); }
  }
}

/** 이미지 기반 유닛 스프라이트 생성 (기존) */
export function createImageSprite(
  scene: Phaser.Scene,
  unitClass: UnitClass,
  faction: Faction,
): Phaser.GameObjects.Sprite | null {
  const key = imageKey(unitClass, faction);
  if (!scene.textures.exists(key)) return null;

  const sprite = scene.add.sprite(0, 0, key);
  const tex = scene.textures.get(key);
  const frame = tex.get(0);
  const scale = Math.max(TILE_SIZE / frame.width, TILE_SIZE / frame.height);
  sprite.setScale(scale);
  return sprite;
}

/** 트윈 기반 애니메이션 재생 (단일 이미지용) */
export function playImageAnim(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  sprite: Phaser.GameObjects.Sprite,
  anim: string,
): void {
  scene.tweens.killTweensOf(sprite);
  scene.tweens.killTweensOf(container);
  sprite.setAlpha(1);
  sprite.setAngle(0);
  sprite.setPosition(0, 0);
  sprite.setTint(0xffffff);

  switch (anim) {
    case 'idle':
      scene.tweens.add({
        targets: sprite, y: -2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      break;
    case 'walk':
      scene.tweens.add({
        targets: sprite, y: -3, duration: 250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      scene.tweens.add({
        targets: sprite, angle: { from: -3, to: 3 }, duration: 250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      break;
    case 'attack':
      scene.tweens.add({
        targets: sprite, x: 8, duration: 100, yoyo: true, repeat: 1, ease: 'Power2',
        onStart: () => sprite.setTint(0xffffaa),
        onComplete: () => { sprite.setTint(0xffffff); sprite.setPosition(0, 0); },
      });
      break;
    case 'hit':
      scene.tweens.add({
        targets: sprite, alpha: { from: 0.3, to: 1 }, duration: 100, repeat: 3,
        onStart: () => sprite.setTint(0xff4444),
        onComplete: () => { sprite.setTint(0xffffff); sprite.setAlpha(1); },
      });
      scene.tweens.add({
        targets: sprite, x: { from: -3, to: 3 }, duration: 50, yoyo: true, repeat: 3,
        onComplete: () => sprite.setX(0),
      });
      break;
    case 'die':
      scene.tweens.add({
        targets: sprite, alpha: 0, angle: 90, y: 5, duration: 600, ease: 'Power2',
      });
      break;
  }
}
