import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './config.ts';
import { EventBus } from './EventBus.ts';
import { AudioManager } from './systems/AudioManager.ts';

export interface IRefPhaserGame {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

export const PhaserGame = forwardRef<IRefPhaserGame>(function PhaserGame(_props, ref) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (gameRef.current) return;

    const game = new Phaser.Game({
      ...gameConfig,
      parent: containerRef.current ?? undefined,
    });
    gameRef.current = game;

    // AudioManager 초기화 및 글로벌 등록
    const audioManager = new AudioManager();
    audioManager.init();
    game.registry.set('audioManager', audioManager);

    // 첫 터치/클릭 시 오디오 잠금 해제
    const unlockAudio = () => {
      audioManager.unlock();
      document.removeEventListener('pointerdown', unlockAudio);
    };
    document.addEventListener('pointerdown', unlockAudio);

    if (typeof ref === 'function') {
      ref({ game, scene: null });
    } else if (ref) {
      ref.current = { game, scene: null };
    }

    return () => {
      audioManager.destroy();
      document.removeEventListener('pointerdown', unlockAudio);
      game.destroy(true);
      gameRef.current = null;
    };
  }, [ref]);

  useEffect(() => {
    const handler = (scene: Phaser.Scene) => {
      if (typeof ref === 'function') {
        ref({ game: gameRef.current, scene });
      } else if (ref) {
        ref.current = { game: gameRef.current, scene };
      }
    };

    EventBus.on('current-scene-ready', handler);
    return () => {
      EventBus.off('current-scene-ready', handler);
    };
  }, [ref]);

  return <div ref={containerRef} id="game-container" style={{ width: '100vw', height: '100dvh' }} />;
});
