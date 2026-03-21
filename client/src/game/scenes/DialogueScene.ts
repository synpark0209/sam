import Phaser from 'phaser';
import type { DialogueEvent } from '@shared/types/dialogue.ts';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import type { AudioManager } from '../systems/AudioManager.ts';

const GAME_W = TILE_SIZE * MAP_WIDTH;
const GAME_H = TILE_SIZE * MAP_HEIGHT + 60;
const BOX_H = 120;
const BOX_Y = GAME_H - BOX_H;

export interface DialogueSceneData {
  dialogue: DialogueEvent;
  nextScene: string;
  nextSceneData?: Record<string, unknown>;
}

export class DialogueScene extends Phaser.Scene {
  private dialogue!: DialogueEvent;
  private currentLine = 0;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private nextSceneName!: string;
  private nextSceneData?: Record<string, unknown>;

  constructor() {
    super('DialogueScene');
  }

  init(data: DialogueSceneData) {
    this.dialogue = data.dialogue;
    this.nextSceneName = data.nextScene;
    this.nextSceneData = data.nextSceneData;
    this.currentLine = 0;
  }

  create(): void {
    (this.registry.get('audioManager') as AudioManager)?.playBgm('dialogue');
    // 배경
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GAME_W, GAME_H);

    // 대사창
    const box = this.add.graphics();
    box.fillStyle(0x1a1a2e, 0.95);
    box.fillRect(0, BOX_Y, GAME_W, BOX_H);
    box.lineStyle(2, 0x4a4a6a, 1);
    box.strokeRect(0, BOX_Y, GAME_W, BOX_H);

    this.speakerText = this.add.text(20, BOX_Y + 10, '', {
      fontSize: '18px', color: '#ffd700', fontStyle: 'bold',
    });

    this.bodyText = this.add.text(20, BOX_Y + 38, '', {
      fontSize: '16px', color: '#e0e0e0',
      wordWrap: { width: GAME_W - 40 }, lineSpacing: 6,
    });

    this.add.text(GAME_W - 30, GAME_H - 20, '▼', { fontSize: '14px', color: '#888888' });

    this.showLine();

    this.input.on('pointerdown', () => this.advance());
    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
  }

  private showLine(): void {
    if (this.currentLine >= this.dialogue.lines.length) {
      this.endDialogue();
      return;
    }
    const line = this.dialogue.lines[this.currentLine];
    this.speakerText.setText(line.speaker);
    this.bodyText.setText(line.text);
  }

  private advance(): void {
    this.currentLine++;
    this.showLine();
  }

  private endDialogue(): void {
    this.scene.start(this.nextSceneName, this.nextSceneData ?? {});
  }
}
