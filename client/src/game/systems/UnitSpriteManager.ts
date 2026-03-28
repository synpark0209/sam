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
    size: 96,
    anims: {
      idle:   { folder: 'breathing-idle',     frames: 4, frameRate: 4 },
      walk:   { folder: 'walking-4-frames',   frames: 4, frameRate: 6 },
      attack: { folder: 'cross-punch',        frames: 6, frameRate: 8 },
      hit:    { folder: 'taking-punch',       frames: 6, frameRate: 8 },
      die:    { folder: 'falling-back-death', frames: 7, frameRate: 5 },
      skill:  { folder: 'fireball',           frames: 6, frameRate: 8 },
    },
  },
};

/** PixelLab 기본 방향 (남쪽 = 정면) */
const PL_DEFAULT_DIR = 'south';

/** 이미지가 로드되었는지 확인 */
export function hasUnitImage(scene: Phaser.Scene, unitClass: UnitClass, faction: Faction): boolean {
  return scene.textures.exists(imageKey(unitClass, faction));
}

/** 장수 ID로 PixelLab 캐릭터 확인 */
export function hasPixelLabCharacter(scene: Phaser.Scene, heroId: string): boolean {
  const def = PIXELLAB_CHARACTERS[heroId];
  if (!def) return false;
  // idle의 첫 프레임이 로드되었는지 확인
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

  // PixelLab 캐릭터 개별 프레임 로드
  for (const def of Object.values(PIXELLAB_CHARACTERS)) {
    // 정지 이미지 (south만 로드 — 기본 방향)
    const rotKey = `${def.key}_rotation_${PL_DEFAULT_DIR}`;
    if (!scene.textures.exists(rotKey)) {
      scene.load.image(rotKey, `${def.basePath}/rotations/${PL_DEFAULT_DIR}.png`);
    }
    // 애니메이션 프레임 로드
    for (const [animName, animDef] of Object.entries(def.anims)) {
      if (!animDef) continue;
      for (let i = 0; i < animDef.frames; i++) {
        const frameKey = `${def.key}_${animName}_${PL_DEFAULT_DIR}_${i}`;
        if (!scene.textures.exists(frameKey)) {
          const framePath = `${def.basePath}/animations/${animDef.folder}/${PL_DEFAULT_DIR}/frame_${String(i).padStart(3, '0')}.png`;
          scene.load.image(frameKey, framePath);
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

  // PixelLab 캐릭터 애니메이션 (개별 텍스처 기반)
  for (const def of Object.values(PIXELLAB_CHARACTERS)) {
    for (const [animName, animDef] of Object.entries(def.anims)) {
      if (!animDef) continue;
      const animKey = `${def.key}_${animName}`;
      if (scene.anims.exists(animKey)) continue;
      // 프레임이 로드되었는지 확인
      const firstFrameKey = `${def.key}_${animName}_${PL_DEFAULT_DIR}_0`;
      if (!scene.textures.exists(firstFrameKey)) continue;

      const frames: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let i = 0; i < animDef.frames; i++) {
        frames.push({ key: `${def.key}_${animName}_${PL_DEFAULT_DIR}_${i}` });
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

/** PixelLab 캐릭터 스프라이트 생성 */
export function createPixelLabSprite(
  scene: Phaser.Scene,
  heroId: string,
): Phaser.GameObjects.Sprite | null {
  const def = PIXELLAB_CHARACTERS[heroId];
  if (!def) return null;

  const firstFrameKey = `${def.key}_idle_${PL_DEFAULT_DIR}_0`;
  if (!scene.textures.exists(firstFrameKey)) return null;

  const sprite = scene.add.sprite(0, 0, firstFrameKey);
  const scale = TILE_SIZE / def.size * 1.3; // 타일에 맞게 스케일 (약간 크게)
  sprite.setScale(scale);

  // idle 애니메이션 시작
  const idleKey = `${def.key}_idle`;
  if (scene.anims.exists(idleKey)) {
    sprite.play(idleKey);
  }

  return sprite;
}

/** PixelLab 애니메이션 재생 */
export function playPixelLabAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  heroId: string,
  anim: string,
): void {
  const def = PIXELLAB_CHARACTERS[heroId];
  if (!def) return;

  const animKey = `${def.key}_${anim}`;
  if (scene.anims.exists(animKey)) {
    sprite.play(animKey);
    // 공격/스킬/피격 후 idle로 복귀
    if (anim === 'attack' || anim === 'skill' || anim === 'hit') {
      sprite.once('animationcomplete', () => {
        const idleKey = `${def.key}_idle`;
        if (scene.anims.exists(idleKey)) sprite.play(idleKey);
      });
    }
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
