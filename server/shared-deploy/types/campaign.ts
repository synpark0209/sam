import type { DialogueEvent } from './dialogue.ts';
import type { UnitData } from './unit.ts';
import type { TileData } from './grid.ts';
import type { DailyMissionState, LoginBonusState } from './dailyMission.ts';

export interface StageReward {
  gold?: number;
  recruitUnits?: UnitData[];
  items?: string[];
}

export interface BattleConfig {
  mapWidth: number;
  mapHeight: number;
  tiles: TileData[][];
  enemyUnits: UnitData[];
  playerStartPositions: { x: number; y: number }[];
}

export interface Stage {
  id: string;
  name: string;
  description: string;
  preDialogue: DialogueEvent;
  battleConfig: BattleConfig;
  postDialogue: DialogueEvent;
  rewards: StageReward;
}

export interface Chapter {
  id: string;
  name: string;
  description: string;
  stages: Stage[];
}

export type StageStatus = 'locked' | 'available' | 'completed';

export interface CampaignProgress {
  currentChapterId: string;
  currentStageIdx: number;
  completedStages: string[];
  playerUnits: UnitData[];
  gold: number;
  inventory: string[];           // 레거시
  equipmentBag: string[];        // 보유 장비 ID 목록 (미장착)
  skillBag: string[];            // 보유 스킬 ID 목록 (미장착)
  materialBag: Record<string, number>; // 소재 (스킬서 등) {id: 수량}
  stamina: number;                    // 현재 스태미나
  lastStaminaUpdate: number;          // 마지막 스태미나 업데이트 시각 (ms)
  dungeonClears: Record<string, number>; // 오늘 던전 클리어 횟수 {dungeonId_difficulty: count}
  dungeonStars: Record<string, number>;  // 던전 최고 별 {dungeonId_difficulty: stars}
  lastDungeonReset: string;           // 마지막 일일 리셋 날짜 (YYYY-MM-DD)
  dailyMissions?: DailyMissionState;
  loginBonus?: LoginBonusState;
  heroFragments?: Record<string, number>;  // 장수 조각 { heroBaseId: count }
  shopDailyPurchases?: { date: string; counts: Record<string, number> };
  pvpElo?: number;
  pvpWins?: number;
  pvpLosses?: number;
  pvpTicketsDate?: string;               // 일일 티켓 리셋 날짜
  pvpTicketsUsed?: number;
  lastFormation?: Record<string, {       // 모드별 마지막 진형/배치 기억
    formationId: string;
    unitIds: (string | null)[];          // 9칸 그리드 (3x3)
  }>;
}
