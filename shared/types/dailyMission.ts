export type DailyMissionId =
  | 'battle_3'
  | 'dungeon_1'
  | 'pvp_1'
  | 'heroes_1'
  | 'gacha_1';

export interface DailyMissionProgress {
  current: number;
  claimed: boolean;
}

export interface DailyMissionState {
  date: string;
  missions: Record<DailyMissionId, DailyMissionProgress>;
  allClaimedBonusTaken: boolean;
}

export interface LoginBonusState {
  lastLoginDate: string;
  consecutiveDays: number;
  claimedDays: number[];
}
