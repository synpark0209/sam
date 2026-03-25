import type { DialogueEvent } from './dialogue.ts';
import type { UnitData } from './unit.ts';
import type { TileData } from './grid.ts';

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
}
