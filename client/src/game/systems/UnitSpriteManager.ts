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

/** 장수 ID → 스프라이트 시트 매핑 */
const HERO_SPRITE_SHEETS: Record<string, SpriteSheetDef> = {
  p1: { // 여포
    key: 'ss_lubu', path: 'assets/units/LuBu.png',
    frameWidth: 512, frameHeight: 512, cols: 4, rows: 4,
    anims: {
      idle: { start: 0, end: 3, frameRate: 4 },   // 1행
      walk: { start: 4, end: 7, frameRate: 6 },   // 2행
      attack: { start: 8, end: 11, frameRate: 8 }, // 3행
      die: { start: 12, end: 15, frameRate: 3 },   // 4행
    },
  },
};

/** 이미지가 로드되었는지 확인 */
export function hasUnitImage(scene: Phaser.Scene, unitClass: UnitClass, faction: Faction): boolean {
  return scene.textures.exists(imageKey(unitClass, faction));
}

/** 장수 ID로 스프라이트 시트 확인 */
export function hasSpriteSheet(scene: Phaser.Scene, heroId: string): boolean {
  const def = HERO_SPRITE_SHEETS[heroId];
  return !!def && scene.textures.exists(def.key);
}

/** preload에서 유닛 이미지 + 스프라이트 시트 로드 */
export function preloadUnitImages(scene: Phaser.Scene): void {
  // 기존 단일 이미지
  for (const uc of ALL_CLASSES) {
    for (const f of ['player', 'enemy'] as Faction[]) {
      const key = imageKey(uc, f);
      const path = imagePath(uc, f);
      scene.load.image(key, path);
    }
  }

  // 스프라이트 시트
  for (const def of Object.values(HERO_SPRITE_SHEETS)) {
    if (!scene.textures.exists(def.key)) {
      scene.load.spritesheet(def.key, def.path, {
        frameWidth: def.frameWidth,
        frameHeight: def.frameHeight,
      });
    }
  }

  // 로드 실패 무시
  scene.load.on('loaderror', (file: Phaser.Loader.File) => {
    if (file.key.startsWith('unit_img_') || file.key.startsWith('ss_')) {
      // 조용히 무시
    }
  });
}

/** 스프라이트 시트 애니메이션 생성 */
export function createSpriteSheetAnimations(scene: Phaser.Scene): void {
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
