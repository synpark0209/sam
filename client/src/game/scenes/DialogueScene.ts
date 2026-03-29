import Phaser from 'phaser';
import type { DialogueEvent } from '@shared/types/dialogue.ts';
import { GAME_WIDTH, GAME_HEIGHT } from '@shared/constants.ts';
import type { AudioManager } from '../systems/AudioManager.ts';

const GW = GAME_WIDTH;
const GH = GAME_HEIGHT;
const BOX_H = 160;
const BOX_Y = GH - BOX_H;

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
  private isTyping = false;
  private fullText = '';

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
    const audio = this.registry.get('audioManager') as AudioManager;
    audio?.playBgm('dialogue');

    // 배경 그라데이션
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a20, 0x0a0a20, 0x1a1020, 0x1a1020, 1);
    bg.fillRect(0, 0, GW, GH);

    // 배경 장식 (달빛 효과)
    const moon = this.add.graphics();
    moon.fillStyle(0x223344, 0.15);
    moon.fillCircle(GW * 0.8, GH * 0.15, 60);
    moon.fillStyle(0x334455, 0.1);
    moon.fillCircle(GW * 0.8, GH * 0.15, 80);

    // 음소거 버튼
    const muteBtn = this.add.text(GW - 35, 12, audio?.isMuted() ? '🔇' : '🔊', {
      fontSize: '18px',
    }).setInteractive({ useHandCursor: true }).setDepth(100);
    muteBtn.on('pointerdown', () => {
      if (!audio) return;
      audio.setMuted(!audio.isMuted());
      muteBtn.setText(audio.isMuted() ? '🔇' : '🔊');
      if (!audio.isMuted()) audio.playBgm('dialogue');
    });

    // 대사창 배경 (그라데이션 + 테두리)
    const box = this.add.graphics();
    box.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x141428, 0x141428, 0.95);
    box.fillRoundedRect(8, BOX_Y, GW - 16, BOX_H, 12);
    box.lineStyle(1.5, 0x4a4a8a, 0.8);
    box.strokeRoundedRect(8, BOX_Y, GW - 16, BOX_H, 12);

    // 상단 장식선
    const boxLine = this.add.graphics();
    boxLine.fillGradientStyle(0xffd700, 0xff8800, 0xff8800, 0xffd700, 0.6);
    boxLine.fillRect(20, BOX_Y - 1, GW - 40, 2);

    // 화자 이름 배경
    this.speakerText = this.add.text(25, BOX_Y + 15, '', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    });

    // 본문
    this.bodyText = this.add.text(25, BOX_Y + 45, '', {
      fontSize: '16px', color: '#e0e0e0',
      wordWrap: { width: GW - 50 }, lineSpacing: 6,
    });

    // 계속 표시 (깜빡임)
    const continueText = this.add.text(GW - 30, GH - 18, '▼', {
      fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: continueText, alpha: { from: 1, to: 0.3 },
      duration: 600, yoyo: true, repeat: -1,
    });

    // 진행도 표시
    this.add.text(20, 10, `${this.currentLine + 1}/${this.dialogue.lines.length}`, {
      fontSize: '12px', color: '#444455',
    });

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

    // 타이핑 효과
    this.fullText = line.text;
    this.bodyText.setText('');
    this.isTyping = true;
    let charIdx = 0;
    const typeTimer = this.time.addEvent({
      delay: 30,
      repeat: this.fullText.length - 1,
      callback: () => {
        charIdx++;
        this.bodyText.setText(this.fullText.substring(0, charIdx));
        if (charIdx >= this.fullText.length) {
          this.isTyping = false;
        }
      },
    });

    // 타이핑 중 클릭하면 즉시 완성
    this.bodyText.setData('typeTimer', typeTimer);
  }

  private advance(): void {
    if (this.isTyping) {
      // 타이핑 스킵
      const timer = this.bodyText.getData('typeTimer') as Phaser.Time.TimerEvent;
      if (timer) timer.destroy();
      this.bodyText.setText(this.fullText);
      this.isTyping = false;
      return;
    }
    this.currentLine++;
    this.showLine();
  }

  private endDialogue(): void {
    this.scene.start(this.nextSceneName, this.nextSceneData ?? {});
  }
}
