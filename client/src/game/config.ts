import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene.ts';
import { WorldMapScene } from './scenes/WorldMapScene.ts';
import { DialogueScene } from './scenes/DialogueScene.ts';
import { BattleScene } from './scenes/BattleScene.ts';
import { RankingScene } from './scenes/RankingScene.ts';
import { PvpLobbyScene } from './scenes/PvpLobbyScene.ts';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: TILE_SIZE * MAP_WIDTH,
  height: TILE_SIZE * MAP_HEIGHT + 60,
  backgroundColor: '#0a0a1a',
  scene: [TitleScene, WorldMapScene, DialogueScene, BattleScene, RankingScene, PvpLobbyScene],
  pixelArt: true,
  input: {
    touch: true,
    activePointers: 1,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
  },
};
