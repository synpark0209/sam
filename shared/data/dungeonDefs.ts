import { UnitClass } from '../types/unitClass.ts';

export interface DungeonDef {
  id: string;
  name: string;
  description: string;
  dayOfWeek: number[]; // 0=일, 1=월, ..., 6=토 (금~일=5,6,0)
  icon: string;
  difficulties: DungeonDifficulty[];
}

export interface DungeonDifficulty {
  level: 'easy' | 'medium' | 'hard';
  label: string;
  stamina: number;
  waves: number;
  enemyLevel: number;
  rewardMultiplier: number;
  enemyClasses: UnitClass[];
}

export interface DungeonReward {
  gold: number;
  equipment?: string[];
  skills?: string[];
  materials?: Record<string, number>;
}

// ── 요일별 던전 정의 ──

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'exp_dungeon', name: '경험의 전장', description: '경험치 서적을 획득합니다',
    dayOfWeek: [1], icon: '📚',
    difficulties: [
      { level: 'easy', label: '초급', stamina: 10, waves: 3, enemyLevel: 3, rewardMultiplier: 1, enemyClasses: [UnitClass.INFANTRY, UnitClass.BANDIT] },
      { level: 'medium', label: '중급', stamina: 15, waves: 4, enemyLevel: 12, rewardMultiplier: 2, enemyClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.BANDIT] },
      { level: 'hard', label: '고급', stamina: 20, waves: 5, enemyLevel: 22, rewardMultiplier: 3, enemyClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.ARCHER, UnitClass.MARTIAL_ARTIST] },
    ],
  },
  {
    id: 'gold_dungeon', name: '금화의 보고', description: '금화를 대량으로 획득합니다',
    dayOfWeek: [2], icon: '💰',
    difficulties: [
      { level: 'easy', label: '초급', stamina: 10, waves: 3, enemyLevel: 3, rewardMultiplier: 1, enemyClasses: [UnitClass.BANDIT, UnitClass.BANDIT] },
      { level: 'medium', label: '중급', stamina: 15, waves: 4, enemyLevel: 12, rewardMultiplier: 2, enemyClasses: [UnitClass.BANDIT, UnitClass.CAVALRY, UnitClass.ARCHER] },
      { level: 'hard', label: '고급', stamina: 20, waves: 5, enemyLevel: 22, rewardMultiplier: 3, enemyClasses: [UnitClass.BANDIT, UnitClass.CAVALRY, UnitClass.MARTIAL_ARTIST, UnitClass.STRATEGIST] },
    ],
  },
  {
    id: 'equip_dungeon', name: '장비의 동굴', description: '장비 아이템을 획득합니다',
    dayOfWeek: [3], icon: '⚔️',
    difficulties: [
      { level: 'easy', label: '초급', stamina: 10, waves: 3, enemyLevel: 5, rewardMultiplier: 1, enemyClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY] },
      { level: 'medium', label: '중급', stamina: 15, waves: 4, enemyLevel: 14, rewardMultiplier: 2, enemyClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.MARTIAL_ARTIST] },
      { level: 'hard', label: '고급', stamina: 20, waves: 5, enemyLevel: 24, rewardMultiplier: 3, enemyClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.ARCHER, UnitClass.STRATEGIST] },
    ],
  },
  {
    id: 'skill_dungeon', name: '스킬의 서재', description: '스킬을 획득합니다',
    dayOfWeek: [4], icon: '✨',
    difficulties: [
      { level: 'easy', label: '초급', stamina: 10, waves: 3, enemyLevel: 5, rewardMultiplier: 1, enemyClasses: [UnitClass.STRATEGIST, UnitClass.INFANTRY] },
      { level: 'medium', label: '중급', stamina: 15, waves: 4, enemyLevel: 14, rewardMultiplier: 2, enemyClasses: [UnitClass.STRATEGIST, UnitClass.CAVALRY, UnitClass.ARCHER] },
      { level: 'hard', label: '고급', stamina: 20, waves: 5, enemyLevel: 24, rewardMultiplier: 3, enemyClasses: [UnitClass.STRATEGIST, UnitClass.MARTIAL_ARTIST, UnitClass.CAVALRY, UnitClass.INFANTRY] },
    ],
  },
  {
    id: 'mixed_dungeon', name: '혼합 던전', description: '다양한 보상을 획득합니다',
    dayOfWeek: [5, 6, 0], icon: '🎁',
    difficulties: [
      { level: 'easy', label: '초급', stamina: 10, waves: 3, enemyLevel: 5, rewardMultiplier: 1, enemyClasses: [UnitClass.INFANTRY, UnitClass.ARCHER] },
      { level: 'medium', label: '중급', stamina: 15, waves: 4, enemyLevel: 14, rewardMultiplier: 2, enemyClasses: [UnitClass.CAVALRY, UnitClass.STRATEGIST, UnitClass.BANDIT] },
      { level: 'hard', label: '고급', stamina: 20, waves: 5, enemyLevel: 24, rewardMultiplier: 3, enemyClasses: [UnitClass.INFANTRY, UnitClass.CAVALRY, UnitClass.ARCHER, UnitClass.STRATEGIST, UnitClass.MARTIAL_ARTIST] },
    ],
  },
];

/** 오늘 열린 던전 목록 */
export function getTodayDungeons(): DungeonDef[] {
  const today = new Date().getDay();
  return DUNGEONS.filter(d => d.dayOfWeek.includes(today));
}

/** 던전 클리어 보상 생성 */
export function generateReward(dungeonId: string, difficulty: DungeonDifficulty): DungeonReward {
  const mult = difficulty.rewardMultiplier;
  const reward: DungeonReward = { gold: 200 * mult };

  switch (dungeonId) {
    case 'exp_dungeon':
      reward.materials = { 'exp_book_s': 3 * mult, 'exp_book_m': mult };
      break;
    case 'gold_dungeon':
      reward.gold = 500 * mult;
      break;
    case 'equip_dungeon': {
      const equipPool = ['bronze_sword', 'leather_armor', 'iron_spear', 'longbow', 'war_drum', 'steel_sword', 'iron_armor'];
      const count = Math.random() < 0.3 * mult ? 2 : 1;
      reward.equipment = [];
      for (let i = 0; i < count; i++) {
        reward.equipment.push(equipPool[Math.floor(Math.random() * equipPool.length)]);
      }
      break;
    }
    case 'skill_dungeon': {
      const skillPool = ['encourage', 'fortify', 'heal', 'confuse', 'poison', 'arrow_rain', 'charge'];
      reward.skills = [skillPool[Math.floor(Math.random() * skillPool.length)]];
      if (Math.random() < 0.2 * mult) {
        reward.skills.push(skillPool[Math.floor(Math.random() * skillPool.length)]);
      }
      break;
    }
    case 'mixed_dungeon': {
      reward.gold = 300 * mult;
      if (Math.random() < 0.5) {
        const equipPool = ['bronze_sword', 'leather_armor', 'war_drum'];
        reward.equipment = [equipPool[Math.floor(Math.random() * equipPool.length)]];
      }
      if (Math.random() < 0.4) {
        const skillPool = ['encourage', 'fortify', 'heal'];
        reward.skills = [skillPool[Math.floor(Math.random() * skillPool.length)]];
      }
      reward.materials = { 'exp_book_s': mult };
      break;
    }
  }

  return reward;
}

// ── 스태미나 ──
export const MAX_STAMINA = 120;
export const STAMINA_REGEN_MINUTES = 6; // 6분당 1 회복
export const STAMINA_REFILL_COST = 50; // 보석 50개로 60 회복
export const STAMINA_REFILL_AMOUNT = 60;
export const MAX_DAILY_REFILLS = 5;
export const DUNGEON_DAILY_LIMIT = 3; // 각 던전 1일 3회
