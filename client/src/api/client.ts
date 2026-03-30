const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('jojo_auth_token', token);
  } else {
    localStorage.removeItem('jojo_auth_token');
  }
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('jojo_auth_token');
  }
  return authToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth API ──

export interface AuthResponse {
  accessToken: string;
  userId: number;
  username: string;
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(res.accessToken);
  return res;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(res.accessToken);
  return res;
}

export async function loginWithTelegram(initData: string): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
  setAuthToken(res.accessToken);
  return res;
}

export function logout() {
  setAuthToken(null);
  localStorage.removeItem('jojo_auth_username');
}

// ── Save API ──

export async function loadServerSave(): Promise<Record<string, unknown> | null> {
  try {
    return await apiRequest<Record<string, unknown>>('/save');
  } catch {
    return null;
  }
}

export async function saveToServer(data: Record<string, unknown>): Promise<void> {
  try {
    await apiRequest('/save', { method: 'POST', body: JSON.stringify(data) });
  } catch { /* 서버 저장 실패 시 무시 (로컬에 이미 저장됨) */ }
}

// ── Ranking API ──

export interface RankingEntry {
  username: string;
  maxLevel: number;
  currentChapterId: string;
  currentStageIdx: number;
}

export async function getRanking(): Promise<RankingEntry[]> {
  try {
    return await apiRequest<RankingEntry[]>('/save/ranking');
  } catch {
    return [];
  }
}

// ── PvP API ──

export interface PvpMatchResult {
  opponentId: number;
  opponentName: string;
  opponentElo: number;
  opponentUnits: unknown[];
}

export interface PvpResultResponse {
  newElo: number;
  eloDelta: number;
  wins: number;
  losses: number;
}

export interface PvpRankingEntry {
  username: string;
  pvpElo: number;
  pvpWins: number;
  pvpLosses: number;
}

export async function pvpFindMatch(): Promise<PvpMatchResult> {
  return apiRequest<PvpMatchResult>('/pvp/match', { method: 'POST' });
}

export async function pvpRecordResult(opponentId: number, won: boolean): Promise<PvpResultResponse> {
  return apiRequest<PvpResultResponse>('/pvp/result', {
    method: 'POST',
    body: JSON.stringify({ opponentId, won }),
  });
}

export async function getPvpRanking(): Promise<PvpRankingEntry[]> {
  try {
    return await apiRequest<PvpRankingEntry[]>('/pvp/ranking');
  } catch {
    return [];
  }
}

// ── Gacha API ──

export interface GachaPullResult {
  results: Array<{
    name: string;
    grade: string;
    unitClass: string;
    isNew: boolean;
    fragments: number;
  }>;
  remainingGold: number;
  remainingGems: number;
  pity: number;
}

export interface GachaStatus {
  gems: number;
  gold: number;
  pity: number;
}

export async function gachaPull(type: 'normal' | 'premium', count: 1 | 10): Promise<GachaPullResult> {
  return apiRequest<GachaPullResult>('/gacha/pull', {
    method: 'POST',
    body: JSON.stringify({ type, count }),
  });
}

export async function getGachaStatus(): Promise<GachaStatus> {
  return apiRequest<GachaStatus>('/gacha/status');
}

// ── 상점 API ──

export async function shopBuy(itemId: string): Promise<{ success: boolean; gold: number; gems: number }> {
  return apiRequest('/save/shop-buy', { method: 'POST', body: JSON.stringify({ itemId }) });
}

// ── 승급/각성 API (서버 권위적) ──

export async function promoteUnit(unitId: string): Promise<{ success: boolean; promotionName?: string }> {
  return apiRequest('/save/promote', { method: 'POST', body: JSON.stringify({ unitId }) });
}

export async function awakenUnit(unitId: string): Promise<{ success: boolean; awakeningLevel?: number }> {
  return apiRequest('/save/awaken', { method: 'POST', body: JSON.stringify({ unitId }) });
}

// ── 재화 API (서버 권위적) ──

export async function addGold(amount: number, reason: string): Promise<{ gold: number }> {
  return apiRequest('/save/add-gold', { method: 'POST', body: JSON.stringify({ amount, reason }) });
}

// ── 던전 완료 API (서버 권위적) ──

export interface DungeonCompleteResult {
  success: boolean;
  gold: number;
  reward: {
    gold: number;
    equipment?: string[];
    skills?: string[];
    materials?: Record<string, number>;
  };
}

export async function dungeonComplete(
  dungeonId: string,
  difficulty: string,
  stars: number,
): Promise<DungeonCompleteResult> {
  return apiRequest('/save/dungeon-complete', {
    method: 'POST',
    body: JSON.stringify({ dungeonId, difficulty, stars }),
  });
}

// ── 캠페인 전투 완료 API (서버 권위적) ──

export async function battleComplete(stageId: string): Promise<{ success: boolean; gold: number }> {
  return apiRequest('/save/battle-complete', {
    method: 'POST',
    body: JSON.stringify({ stageId }),
  });
}

// ── 일일 임무 보상 수령 API (서버 권위적) ──

export async function missionClaim(
  missionId?: string,
  type?: string,
): Promise<{ success: boolean; gold: number; gems: number }> {
  return apiRequest('/save/mission-claim', {
    method: 'POST',
    body: JSON.stringify({ missionId, type }),
  });
}

// ── 출석 보너스 수령 API (서버 권위적) ──

export async function loginClaim(day: number): Promise<{ success: boolean; gold: number; gems: number }> {
  return apiRequest('/save/login-claim', {
    method: 'POST',
    body: JSON.stringify({ day }),
  });
}

export async function spendGold(amount: number, reason: string): Promise<{ gold: number }> {
  return apiRequest('/save/spend-gold', { method: 'POST', body: JSON.stringify({ amount, reason }) });
}

export async function spendGems(amount: number, reason: string): Promise<{ gems: number }> {
  return apiRequest('/save/spend-gems', { method: 'POST', body: JSON.stringify({ amount, reason }) });
}

export async function getCurrencies(): Promise<{ gold: number; gems: number }> {
  return apiRequest('/save/currencies');
}

export function isLoggedIn(): boolean {
  return !!getAuthToken();
}

export function getSavedUsername(): string | null {
  return localStorage.getItem('jojo_auth_username');
}
