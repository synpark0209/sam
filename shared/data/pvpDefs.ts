/** PvP 티어 정의 */
export interface PvPTier {
  id: string;
  name: string;
  minElo: number;
  color: string;
  icon: string;
  seasonRewards: {
    gold: number;
    gems: number;
    skillBag?: string[];
    equipmentBag?: string[];
    description: string;
  };
}

export const PVP_TIERS: PvPTier[] = [
  {
    id: 'bronze', name: '브론즈', minElo: 0, color: '#cd7f32', icon: '🥉',
    seasonRewards: { gold: 200, gems: 50, description: '금화 200 + 보석 50' },
  },
  {
    id: 'silver', name: '실버', minElo: 1000, color: '#c0c0c0', icon: '🥈',
    seasonRewards: { gold: 500, gems: 100, skillBag: ['encourage'], description: '금화 500 + 보석 100 + 격려 스킬' },
  },
  {
    id: 'gold', name: '골드', minElo: 1200, color: '#ffd700', icon: '🥇',
    seasonRewards: { gold: 1000, gems: 200, skillBag: ['heal', 'fortify'], equipmentBag: ['war_drum'], description: '금화 1000 + 보석 200 + 스킬 2개 + 전고' },
  },
  {
    id: 'diamond', name: '다이아', minElo: 1400, color: '#00bfff', icon: '💎',
    seasonRewards: { gold: 2000, gems: 500, skillBag: ['heal', 'fortify', 'arrow_rain'], equipmentBag: ['iron_armor', 'longbow'], description: '금화 2000 + 보석 500 + 스킬 3개 + 장비 2개' },
  },
  {
    id: 'master', name: '마스터', minElo: 1600, color: '#ff4500', icon: '👑',
    seasonRewards: { gold: 5000, gems: 1000, skillBag: ['heal', 'fortify', 'arrow_rain', 'confuse'], equipmentBag: ['steel_sword', 'iron_armor', 'red_hare'], description: '금화 5000 + 보석 1000 + 스킬 4개 + 장비 3개 (적토마 포함!)' },
  },
];

/** ELO → 티어 변환 */
export function getTier(elo: number): PvPTier {
  for (let i = PVP_TIERS.length - 1; i >= 0; i--) {
    if (elo >= PVP_TIERS[i].minElo) return PVP_TIERS[i];
  }
  return PVP_TIERS[0];
}

/** ELO 변동 계산 */
export function calculateEloChange(playerElo: number, opponentElo: number, won: boolean): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actual = won ? 1 : 0;
  return Math.round(K * (actual - expected));
}

/** 다음 티어까지 필요한 ELO */
export function getNextTierProgress(elo: number): { current: PvPTier; next: PvPTier | null; progress: number } {
  const current = getTier(elo);
  const currentIdx = PVP_TIERS.indexOf(current);
  const next = currentIdx < PVP_TIERS.length - 1 ? PVP_TIERS[currentIdx + 1] : null;
  const progress = next
    ? (elo - current.minElo) / (next.minElo - current.minElo)
    : 1;
  return { current, next, progress: Math.min(1, Math.max(0, progress)) };
}

/** 시즌 기간 (2주) */
export const SEASON_DURATION_DAYS = 14;

/** 일일 PvP 티켓 */
export const DAILY_PVP_TICKETS = 5;
