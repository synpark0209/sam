import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './config.ts';
import { EventBus } from './EventBus.ts';

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

    if (typeof ref === 'function') {
      ref({ game, scene: null });
    } else if (ref) {
      ref.current = { game, scene: null };
    }

    return () => {
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

  return <div ref={containerRef} id="game-container" />;
});
