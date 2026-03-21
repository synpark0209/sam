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

/** 이미지가 로드되었는지 확인 */
export function hasUnitImage(scene: Phaser.Scene, unitClass: UnitClass, faction: Faction): boolean {
  return scene.textures.exists(imageKey(unitClass, faction));
}

/** preload에서 유닛 이미지 로드 시도 */
export function preloadUnitImages(scene: Phaser.Scene): void {
  for (const uc of ALL_CLASSES) {
    for (const f of ['player', 'enemy'] as Faction[]) {
      const key = imageKey(uc, f);
      const path = imagePath(uc, f);
      scene.load.image(key, path);
    }
  }
  // 로드 실패해도 에러 무시 (프로시저럴 폴백)
  scene.load.on('loaderror', (file: Phaser.Loader.File) => {
    if (file.key.startsWith('unit_img_')) {
      // 조용히 무시 - 프로시저럴 생성 사용
    }
  });
}

/** 이미지 기반 유닛 스프라이트 생성 */
export function createImageSprite(
  scene: Phaser.Scene,
  unitClass: UnitClass,
  faction: Faction,
): Phaser.GameObjects.Sprite | null {
  const key = imageKey(unitClass, faction);
  if (!scene.textures.exists(key)) return null;

  const sprite = scene.add.sprite(0, 0, key);
  // 이미지를 TILE_SIZE에 맞게 스케일
  const tex = scene.textures.get(key);
  const frame = tex.get(0);
  const scale = Math.max(TILE_SIZE / frame.width, TILE_SIZE / frame.height);
  sprite.setScale(scale);
  return sprite;
}

/** 트윈 기반 애니메이션 재생 */
export function playImageAnim(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  sprite: Phaser.GameObjects.Sprite,
  anim: string,
): void {
  // 기존 트윈 제거
  scene.tweens.killTweensOf(sprite);
  scene.tweens.killTweensOf(container);
  sprite.setAlpha(1);
  sprite.setAngle(0);
  sprite.setPosition(0, 0);
  sprite.setTint(0xffffff);

  switch (anim) {
    case 'idle':
      scene.tweens.add({
        targets: sprite,
        y: -2,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      break;

    case 'walk':
      scene.tweens.add({
        targets: sprite,
        y: -3,
        duration: 250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      scene.tweens.add({
        targets: sprite,
        angle: { from: -3, to: 3 },
        duration: 250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      break;

    case 'attack':
      scene.tweens.add({
        targets: sprite,
        x: 8,
        duration: 100,
        yoyo: true,
        repeat: 1,
        ease: 'Power2',
        onStart: () => sprite.setTint(0xffffaa),
        onComplete: () => {
          sprite.setTint(0xffffff);
          sprite.setPosition(0, 0);
        },
      });
      break;

    case 'hit':
      scene.tweens.add({
        targets: sprite,
        alpha: { from: 0.3, to: 1 },
        duration: 100,
        repeat: 3,
        onStart: () => sprite.setTint(0xff4444),
        onComplete: () => {
          sprite.setTint(0xffffff);
          sprite.setAlpha(1);
        },
      });
      scene.tweens.add({
        targets: sprite,
        x: { from: -3, to: 3 },
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => sprite.setX(0),
      });
      break;

    case 'die':
      scene.tweens.add({
        targets: sprite,
        alpha: 0,
        angle: 90,
        y: 5,
        duration: 600,
        ease: 'Power2',
      });
      break;
  }
}
