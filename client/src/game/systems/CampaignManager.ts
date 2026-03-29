import { UnitClass } from '@shared/types/index.ts';
import type { UnitData } from '@shared/types/index.ts';
import type { CampaignProgress, Stage, BattleConfig } from '@shared/types/campaign.ts';
import type { DailyMissionId, DailyMissionState, LoginBonusState } from '@shared/types/dailyMission.ts';
import { ALL_CHAPTERS } from '@shared/data/campaign/chapters.ts';
import { createDailyMissionState, DAILY_MISSIONS } from '@shared/data/dailyMissionDefs.ts';
import { saveToServer, loadServerSave } from '../../api/client.ts';

function createDefaultPlayerUnits(): UnitData[] {
  return [
    {
      id: 'p1', name: '여포', faction: 'player', unitClass: UnitClass.CAVALRY, grade: 'SR', isScenarioUnit: true,
      level: 1, exp: 0, mp: 20, maxMp: 20,
      classSkillId: 'class_cavalry_1',
      uniqueSkill: 'musou', uniqueSkillUnlocked: false,
      equippedSkills: [],
      promotionLevel: 0,
      equipment: { weapon: 'steel_sword', armor: 'iron_armor' },
      position: { x: 0, y: 0 },
      stats: { maxHp: 200, hp: 200, attack: 48, defense: 25, spirit: 15, agility: 30, critical: 40, morale: 50, speed: 6, penetration: 10, resist: 20, moveRange: 6, attackRange: 1 },
      hasActed: false, isAlive: true,
    },
    {
      id: 'p2', name: '장료', faction: 'player', unitClass: UnitClass.CAVALRY, grade: 'R', isScenarioUnit: true,
      level: 1, exp: 0, mp: 15, maxMp: 15,
      classSkillId: 'class_cavalry_1',
      uniqueSkill: 'hebi_fury', uniqueSkillUnlocked: false,
      equippedSkills: [],
      promotionLevel: 0,
      equipment: { weapon: 'iron_spear', armor: 'iron_armor' },
      position: { x: 0, y: 0 },
      stats: { maxHp: 160, hp: 160, attack: 40, defense: 20, spirit: 12, agility: 35, critical: 30, morale: 35, speed: 5, penetration: 5, resist: 15, moveRange: 6, attackRange: 1 },
      hasActed: false, isAlive: true,
    },
    {
      id: 'p3', name: '고순', faction: 'player', unitClass: UnitClass.INFANTRY, grade: 'R', isScenarioUnit: true,
      level: 1, exp: 0, mp: 15, maxMp: 15,
      classSkillId: 'class_infantry_1',
      uniqueSkill: 'hamjin_charge', uniqueSkillUnlocked: false,
      equippedSkills: [],
      promotionLevel: 0,
      equipment: { weapon: 'steel_sword', armor: 'leather_armor' },
      position: { x: 0, y: 0 },
      stats: { maxHp: 170, hp: 170, attack: 38, defense: 28, spirit: 10, agility: 20, critical: 25, morale: 45, speed: 4, penetration: 15, resist: 30, moveRange: 4, attackRange: 1 },
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
      equipmentBag: ['bronze_sword', 'leather_armor', 'war_drum'],
      skillBag: ['encourage', 'fortify', 'heal'],
      materialBag: {},
      stamina: 120,
      lastStaminaUpdate: Date.now(),
      dungeonClears: {},
      dungeonStars: {},
      lastDungeonReset: new Date().toISOString().split('T')[0],
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

  /** 시나리오 전투용 출전 장수 준비 (시나리오 장수 + 게스트 1명) */
  prepareBattle(battleConfig: BattleConfig, guestUnitId?: string): UnitData[] {
    // 시나리오 기본 장수만 선택
    const scenarioUnits = this.progress.playerUnits.filter(u => u.isScenarioUnit);

    // 게스트 장수 추가 (가챠/이벤트 장수 중 1명)
    const battleUnits = [...scenarioUnits];
    if (guestUnitId) {
      const guest = this.progress.playerUnits.find(u => u.id === guestUnitId && !u.isScenarioUnit);
      if (guest) battleUnits.push(guest);
    }

    return battleUnits.map((u, i) => {
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

  /** 가챠/이벤트 장수 목록 (게스트 후보) */
  getGuestCandidates(): UnitData[] {
    return this.progress.playerUnits.filter(u => !u.isScenarioUnit);
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

  // ── 일일 임무 ──

  getDailyMissions(): DailyMissionState {
    const today = new Date().toISOString().split('T')[0];
    if (!this.progress.dailyMissions || this.progress.dailyMissions.date !== today) {
      this.progress.dailyMissions = createDailyMissionState();
    }
    return this.progress.dailyMissions;
  }

  incrementMission(missionId: DailyMissionId): void {
    const state = this.getDailyMissions();
    const mission = state.missions[missionId];
    if (!mission) return;
    const def = DAILY_MISSIONS.find(m => m.id === missionId);
    if (!def) return;
    if (mission.current < def.target) {
      mission.current++;
      this.save();
    }
  }

  // ── 출석 보너스 ──

  getLoginBonus(): LoginBonusState {
    const today = new Date().toISOString().split('T')[0];
    if (!this.progress.loginBonus) {
      this.progress.loginBonus = { lastLoginDate: today, consecutiveDays: 1, claimedDays: [] };
      return this.progress.loginBonus;
    }
    const lb = this.progress.loginBonus;
    if (lb.lastLoginDate === today) return lb;

    const last = new Date(lb.lastLoginDate);
    const now = new Date(today);
    const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1 && lb.consecutiveDays < 7) {
      lb.consecutiveDays++;
    } else if (diffDays > 1 || lb.consecutiveDays >= 7) {
      lb.consecutiveDays = 1;
      lb.claimedDays = [];
    }
    lb.lastLoginDate = today;
    this.save();
    return lb;
  }
}
