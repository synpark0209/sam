import { UnitClass } from '@shared/types/index.ts';
import type { UnitData } from '@shared/types/index.ts';
import type { CampaignProgress, Stage, BattleConfig } from '@shared/types/campaign.ts';
import { ALL_CHAPTERS } from '@shared/data/campaign/chapters.ts';
import { saveToServer, loadServerSave } from '../../api/client.ts';

function createDefaultPlayerUnits(): UnitData[] {
  return [
    {
      id: 'p1', name: '여포', faction: 'player', unitClass: UnitClass.CAVALRY,
      level: 1, exp: 0, mp: 15, maxMp: 15, skills: ['charge'],
      equipment: { weapon: 'steel_sword', armor: 'iron_armor' },
      position: { x: 0, y: 0 },
      stats: { maxHp: 200, hp: 200, attack: 48, defense: 25, speed: 6, moveRange: 6, attackRange: 1 },
      hasActed: false, isAlive: true,
    },
    {
      id: 'p2', name: '장료', faction: 'player', unitClass: UnitClass.INFANTRY,
      level: 1, exp: 0, mp: 10, maxMp: 10, skills: ['encourage'],
      equipment: { weapon: 'iron_spear', armor: 'iron_armor' },
      position: { x: 0, y: 0 },
      stats: { maxHp: 160, hp: 160, attack: 40, defense: 24, speed: 5, moveRange: 4, attackRange: 1 },
      hasActed: false, isAlive: true,
    },
    {
      id: 'p3', name: '고순', faction: 'player', unitClass: UnitClass.INFANTRY,
      level: 1, exp: 0, mp: 10, maxMp: 10, skills: ['encourage'],
      equipment: { weapon: 'steel_sword', armor: 'leather_armor' },
      position: { x: 0, y: 0 },
      stats: { maxHp: 170, hp: 170, attack: 38, defense: 28, speed: 4, moveRange: 4, attackRange: 1 },
      hasActed: false, isAlive: true,
    },
  ];
}

export class CampaignManager {
  private progress: CampaignProgress;
  private _hasSave = false;

  constructor() {
    this.progress = this.createNew();
  }

  createNew(): CampaignProgress {
    return {
      currentChapterId: 'prologue',
      currentStageIdx: 0,
      completedStages: [],
      playerUnits: createDefaultPlayerUnits(),
      gold: 0,
      inventory: [],
    };
  }

  getProgress(): CampaignProgress {
    return this.progress;
  }

  resetProgress(): void {
    this.progress = this.createNew();
    this.save();
  }

  getCurrentChapter() {
    return ALL_CHAPTERS.find(c => c.id === this.progress.currentChapterId);
  }

  getCurrentStage(): Stage | undefined {
    const chapter = this.getCurrentChapter();
    return chapter?.stages[this.progress.currentStageIdx];
  }

  getStageStatus(stageId: string): 'locked' | 'available' | 'completed' {
    if (this.progress.completedStages.includes(stageId)) return 'completed';
    const chapter = this.getCurrentChapter();
    if (!chapter) return 'locked';
    const stageIdx = chapter.stages.findIndex(s => s.id === stageId);
    if (stageIdx === this.progress.currentStageIdx) return 'available';
    return 'locked';
  }

  prepareBattle(battleConfig: BattleConfig): UnitData[] {
    return this.progress.playerUnits.map((u, i) => {
      const pos = battleConfig.playerStartPositions[i] ?? { x: 0, y: 0 };
      return {
        ...u,
        position: { ...pos },
        stats: { ...u.stats, hp: u.stats.maxHp },
        mp: u.maxMp,
        hasActed: false,
        isAlive: true,
      };
    });
  }

  completeBattle(survivingUnits: UnitData[], stage: Stage): void {
    for (const survived of survivingUnits) {
      const original = this.progress.playerUnits.find(u => u.id === survived.id);
      if (original) {
        original.stats = { ...survived.stats, hp: survived.stats.maxHp };
        original.level = survived.level;
        original.exp = survived.exp;
        original.mp = original.maxMp;
      }
    }

    this.progress.gold += stage.rewards.gold ?? 0;
    if (stage.rewards.items) {
      this.progress.inventory.push(...stage.rewards.items);
    }
    if (stage.rewards.recruitUnits) {
      this.progress.playerUnits.push(...stage.rewards.recruitUnits);
    }

    if (!this.progress.completedStages.includes(stage.id)) {
      this.progress.completedStages.push(stage.id);
    }

    const chapter = this.getCurrentChapter();
    if (chapter && this.progress.currentStageIdx < chapter.stages.length - 1) {
      this.progress.currentStageIdx++;
    } else {
      const chapterIdx = ALL_CHAPTERS.findIndex(c => c.id === this.progress.currentChapterId);
      if (chapterIdx < ALL_CHAPTERS.length - 1) {
        this.progress.currentChapterId = ALL_CHAPTERS[chapterIdx + 1].id;
        this.progress.currentStageIdx = 0;
      }
    }

    this.save();
  }

  save(): void {
    saveToServer(this.progress as unknown as Record<string, unknown>);
  }

  async loadFromServer(): Promise<boolean> {
    try {
      const data = await loadServerSave();
      if (data) {
        this.progress = data as unknown as CampaignProgress;
        this._hasSave = true;
        return true;
      }
    } catch { /* 서버 로드 실패 */ }
    return false;
  }

  hasSave(): boolean {
    return this._hasSave;
  }

  setHasSave(value: boolean): void {
    this._hasSave = value;
  }
}
