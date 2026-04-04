import type { DailyMissionId, DailyMissionState } from '../types/dailyMission.ts';

export interface DailyMissionDef {
  id: DailyMissionId;
  name: string;
  description: string;
  icon: string;
  target: number;
  reward: { gold: number };
}

export const DAILY_MISSIONS: DailyMissionDef[] = [
  { id: 'battle_3',  name: '전투 완료',   description: '전투를 3회 완료하세요', icon: '⚔️', target: 3, reward: { gold: 300 } },
  { id: 'dungeon_1', name: '던전 클리어', description: '일일 던전을 1회 클리어하세요', icon: '🏰', target: 1, reward: { gold: 200 } },
  { id: 'pvp_1',     name: 'PvP 대전',    description: 'PvP 아레나에서 1회 대전하세요', icon: '🏟️', target: 1, reward: { gold: 200 } },
  { id: 'heroes_1',  name: '장수 확인',   description: '장수 관리 화면을 확인하세요', icon: '👥', target: 1, reward: { gold: 100 } },
  { id: 'gacha_1',   name: '장수 뽑기',   description: '가챠 뽑기를 1회 실행하세요', icon: '🎰', target: 1, reward: { gold: 500 } },
];

export const ALL_COMPLETE_BONUS = { gems: 50, gold: 1000 };

export interface LoginBonusDef {
  day: number;
  gold: number;
  gems: number;
}

export const LOGIN_BONUS_TABLE: LoginBonusDef[] = [
  { day: 1, gold: 500,  gems: 0 },
  { day: 2, gold: 0,    gems: 30 },
  { day: 3, gold: 1000, gems: 0 },
  { day: 4, gold: 0,    gems: 50 },
  { day: 5, gold: 2000, gems: 0 },
  { day: 6, gold: 0,    gems: 100 },
  { day: 7, gold: 5000, gems: 200 },
];

export function createDailyMissionState(): DailyMissionState {
  const today = new Date().toISOString().split('T')[0];
  const missions = {} as Record<DailyMissionId, { current: number; claimed: boolean }>;
  for (const m of DAILY_MISSIONS) {
    missions[m.id] = { current: 0, claimed: false };
  }
  return { date: today, missions, allClaimedBonusTaken: false };
}

export function areAllMissionsComplete(state: DailyMissionState): boolean {
  return DAILY_MISSIONS.every(def => {
    const p = state.missions[def.id];
    return p && p.current >= def.target;
  });
}
