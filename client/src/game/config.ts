import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene.ts';
import { WorldMapScene } from './scenes/WorldMapScene.ts';
import { DialogueScene } from './scenes/DialogueScene.ts';
import { BattleScene } from './scenes/BattleScene.ts';
import { RankingScene } from './scenes/RankingScene.ts';
import { PvpLobbyScene } from './scenes/PvpLobbyScene.ts';
import { LobbyScene } from './scenes/LobbyScene.ts';
import { PvPArenaScene } from './scenes/PvPArenaScene.ts';
import { DailyDungeonScene } from './scenes/DailyDungeonScene.ts';
import { GAME_WIDTH, GAME_HEIGHT } from '@shared/constants.ts';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0a0a1a',
  scene: [TitleScene, LobbyScene, WorldMapScene, DialogueScene, BattleScene, RankingScene, PvpLobbyScene, PvPArenaScene, DailyDungeonScene],
  pixelArt: true,
  input: {
    touch: true,
    activePointers: 2,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
  },
};
