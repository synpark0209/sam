/**
 * 프로시저럴 오디오 매니저 (Web Audio API)
 * 외부 파일 없이 BGM/SFX를 코드로 생성
 */

export type SfxName =
  | 'attack_hit'
  | 'skill_cast'
  | 'skill_heal'
  | 'skill_fire'
  | 'move'
  | 'level_up'
  | 'unit_die'
  | 'game_over_win'
  | 'game_over_lose'
  | 'menu_click'
  | 'turn_start';

export type BgmName = 'title' | 'worldmap' | 'battle' | 'dialogue';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentBgm: BgmName | null = null;
  private bgmTimer: number | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private muted: boolean;
  private unlocked = false;

  constructor() {
    this.muted = localStorage.getItem('jojo_audio_muted') === 'true';
  }

  private visibilityHandler: (() => void) | null = null;

  init(): void {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.3;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.masterGain);

      // 앱 백그라운드/포그라운드 전환 시 오디오 suspend/resume
      this.visibilityHandler = () => {
        if (!this.ctx) return;
        if (document.hidden) {
          this.ctx.suspend().catch(() => {});
        } else if (!this.muted) {
          this.ctx.resume().catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    } catch {
      // Web Audio not supported
    }
  }

  unlock(): void {
    if (this.unlocked || !this.ctx) return;
    this.ctx.resume().then(() => {
      this.unlocked = true;
    }).catch(() => {});
  }

  destroy(): void {
    this.stopBgm();
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }

  // ── 설정 ──

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem('jojo_audio_muted', String(muted));
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  // ── SFX ──

  playSfx(name: SfxName): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const t = this.ctx.currentTime;

    switch (name) {
      case 'attack_hit': this.sfxAttackHit(t); break;
      case 'skill_cast': this.sfxSkillCast(t); break;
      case 'skill_heal': this.sfxHeal(t); break;
      case 'skill_fire': this.sfxFire(t); break;
      case 'move': this.sfxMove(t); break;
      case 'level_up': this.sfxLevelUp(t); break;
      case 'unit_die': this.sfxUnitDie(t); break;
      case 'game_over_win': this.sfxGameOverWin(t); break;
      case 'game_over_lose': this.sfxGameOverLose(t); break;
      case 'menu_click': this.sfxClick(t); break;
      case 'turn_start': this.sfxTurnStart(t); break;
    }
  }

  private playTone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.3): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  private playNoise(start: number, dur: number, vol = 0.2): void {
    if (!this.ctx || !this.sfxGain) return;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    src.connect(gain);
    gain.connect(this.sfxGain);
    src.start(start);
  }

  private sfxAttackHit(t: number): void {
    this.playNoise(t, 0.12, 0.4);
    this.playTone(200, t, 0.08, 'square', 0.2);
    this.playTone(100, t + 0.03, 0.1, 'square', 0.15);
  }

  private sfxSkillCast(t: number): void {
    this.playTone(400, t, 0.15, 'sine', 0.25);
    this.playTone(500, t + 0.08, 0.15, 'sine', 0.25);
    this.playTone(650, t + 0.16, 0.2, 'sine', 0.3);
  }

  private sfxHeal(t: number): void {
    this.playTone(523, t, 0.4, 'sine', 0.2);
    this.playTone(659, t, 0.4, 'sine', 0.15);
    this.playTone(784, t + 0.1, 0.4, 'sine', 0.2);
  }

  private sfxFire(t: number): void {
    this.playNoise(t, 0.3, 0.35);
    this.playTone(300, t, 0.1, 'sawtooth', 0.15);
    this.playTone(150, t + 0.1, 0.15, 'sawtooth', 0.1);
  }

  private sfxMove(t: number): void {
    this.playTone(600, t, 0.05, 'sine', 0.15);
    this.playTone(700, t + 0.06, 0.05, 'sine', 0.15);
  }

  private sfxLevelUp(t: number): void {
    const notes = [523, 587, 659, 784, 1047]; // C5 D5 E5 G5 C6
    notes.forEach((f, i) => {
      this.playTone(f, t + i * 0.1, 0.2, 'sine', 0.25);
      this.playTone(f, t + i * 0.1, 0.2, 'triangle', 0.15);
    });
  }

  private sfxUnitDie(t: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  private sfxGameOverWin(t: number): void {
    // C major chord held
    [523, 659, 784].forEach(f => this.playTone(f, t, 1.2, 'sine', 0.2));
    [523, 659, 784].forEach(f => this.playTone(f, t, 1.2, 'triangle', 0.1));
    // Fanfare
    this.playTone(1047, t + 0.3, 0.8, 'sine', 0.15);
  }

  private sfxGameOverLose(t: number): void {
    // C minor chord
    [262, 311, 392].forEach(f => this.playTone(f, t, 1.5, 'sine', 0.2));
    this.playTone(196, t + 0.5, 1.0, 'sine', 0.15);
  }

  private sfxClick(t: number): void {
    this.playTone(800, t, 0.03, 'sine', 0.2);
  }

  private sfxTurnStart(t: number): void {
    this.playTone(660, t, 0.1, 'sine', 0.2);
    this.playTone(880, t + 0.1, 0.15, 'sine', 0.25);
  }

  // ── BGM ──

  playBgm(name: BgmName): void {
    if (this.currentBgm === name) return;
    this.stopBgm();
    this.currentBgm = name;
    if (!this.ctx || !this.bgmGain || this.muted) return;
    this.scheduleBgm(name);
  }

  stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    for (const osc of this.bgmOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.bgmOscillators = [];
    this.currentBgm = null;
  }

  private scheduleBgm(name: BgmName): void {
    if (!this.ctx || !this.bgmGain) return;

    const melodies: Record<BgmName, { notes: number[]; tempo: number; type: OscillatorType }> = {
      title: {
        notes: [294, 330, 392, 440, 392, 330, 294, 262, 294, 330, 294, 0, 392, 440, 523, 440, 392, 330, 294, 0],
        tempo: 200, type: 'sine',
      },
      worldmap: {
        notes: [523, 587, 659, 523, 587, 784, 659, 587, 523, 440, 392, 440, 523, 0, 0, 0],
        tempo: 180, type: 'triangle',
      },
      battle: {
        notes: [220, 262, 294, 330, 294, 262, 220, 196, 220, 262, 330, 392, 330, 262, 220, 0],
        tempo: 140, type: 'square',
      },
      dialogue: {
        notes: [262, 0, 330, 0, 392, 0, 330, 0, 262, 0, 0, 0, 294, 0, 349, 0],
        tempo: 350, type: 'sine',
      },
    };

    const melody = melodies[name];
    const t = this.ctx.currentTime;
    const noteDur = melody.tempo / 1000;

    for (let i = 0; i < melody.notes.length; i++) {
      const freq = melody.notes[i];
      if (freq === 0) continue;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = melody.type;
      osc.frequency.value = freq;

      const noteStart = t + i * noteDur;
      const noteEnd = noteStart + noteDur * 0.8;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.02);
      gain.gain.setValueAtTime(0.15, noteEnd - 0.02);
      gain.gain.linearRampToValueAtTime(0, noteEnd);

      osc.connect(gain);
      gain.connect(this.bgmGain!);
      osc.start(noteStart);
      osc.stop(noteEnd + 0.05);
      this.bgmOscillators.push(osc);
    }

    // 루프: 멜로디 끝나면 다시 스케줄
    const loopMs = melody.notes.length * melody.tempo;
    this.bgmTimer = window.setTimeout(() => {
      this.bgmOscillators = [];
      if (this.currentBgm === name) {
        this.scheduleBgm(name);
      }
    }, loopMs);
  }
}
