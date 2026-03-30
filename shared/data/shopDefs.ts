import type { CampaignProgress } from '../types/campaign.ts';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'general' | 'premium' | 'daily';
  currency: 'gold' | 'gems';
  price: number;
  reward: {
    type: 'material' | 'equipment' | 'skill' | 'stamina' | 'fragment' | 'gold';
    itemId?: string;
    amount?: number;
  };
  dailyLimit?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── 일반 (금화) ──
  {
    id: 'shop_promotion_seal_1',
    name: '하급 인수',
    description: '장수 승급에 필요한 기본 인수',
    icon: '📜',
    category: 'general',
    currency: 'gold',
    price: 2000,
    reward: { type: 'material', itemId: 'promotion_seal_1', amount: 1 },
  },
  {
    id: 'shop_promotion_seal_2',
    name: '상급 인수',
    description: '장수 상위 승급에 필요한 인수',
    icon: '📜',
    category: 'general',
    currency: 'gold',
    price: 8000,
    reward: { type: 'material', itemId: 'promotion_seal_2', amount: 1 },
  },
  {
    id: 'shop_bronze_sword',
    name: '청동검',
    description: '기본적인 청동 검 (공격+3)',
    icon: '⚔️',
    category: 'general',
    currency: 'gold',
    price: 500,
    reward: { type: 'equipment', itemId: 'bronze_sword' },
  },
  {
    id: 'shop_iron_armor',
    name: '철갑옷',
    description: '튼튼한 철제 갑옷 (방어+5)',
    icon: '🛡️',
    category: 'general',
    currency: 'gold',
    price: 1500,
    reward: { type: 'equipment', itemId: 'iron_armor' },
  },
  {
    id: 'shop_war_drum',
    name: '전고',
    description: '전투의 사기를 높이는 북 (공격+2)',
    icon: '🥁',
    category: 'general',
    currency: 'gold',
    price: 1000,
    reward: { type: 'equipment', itemId: 'war_drum' },
  },
  {
    id: 'shop_skill_encourage',
    name: '격려 스킬서',
    description: '아군 공격력을 일시 상승시키는 스킬',
    icon: '📖',
    category: 'general',
    currency: 'gold',
    price: 800,
    reward: { type: 'skill', itemId: 'encourage' },
  },
  {
    id: 'shop_skill_fortify',
    name: '방어 스킬서',
    description: '아군 방어력을 일시 상승시키는 스킬',
    icon: '📖',
    category: 'general',
    currency: 'gold',
    price: 800,
    reward: { type: 'skill', itemId: 'fortify' },
  },
  {
    id: 'shop_skill_heal',
    name: '회복 스킬서',
    description: '아군 HP를 회복하는 스킬',
    icon: '📖',
    category: 'general',
    currency: 'gold',
    price: 1200,
    reward: { type: 'skill', itemId: 'heal' },
  },

  // ── 프리미엄 (보석) ──
  {
    id: 'shop_prem_promotion_seal_2',
    name: '상급 인수',
    description: '장수 상위 승급에 필요한 인수',
    icon: '📜',
    category: 'premium',
    currency: 'gems',
    price: 100,
    reward: { type: 'material', itemId: 'promotion_seal_2', amount: 1 },
  },
  {
    id: 'shop_prem_stamina',
    name: '스태미나 회복 60',
    description: '스태미나를 60 회복합니다',
    icon: '⚡',
    category: 'premium',
    currency: 'gems',
    price: 30,
    reward: { type: 'stamina', amount: 60 },
  },
  {
    id: 'shop_prem_fragment',
    name: '범용 장수 조각 10개',
    description: '모든 장수 승급에 사용 가능한 조각',
    icon: '🧩',
    category: 'premium',
    currency: 'gems',
    price: 50,
    reward: { type: 'fragment', itemId: 'universal', amount: 10 },
  },

  // ── 일일 한정 (매일 리셋) ──
  {
    id: 'shop_daily_promotion_seal_1',
    name: '하급 인수 (할인)',
    description: '오늘만 50% 할인!',
    icon: '📜',
    category: 'daily',
    currency: 'gold',
    price: 1000,
    reward: { type: 'material', itemId: 'promotion_seal_1', amount: 1 },
    dailyLimit: 1,
  },
  {
    id: 'shop_daily_stamina',
    name: '스태미나 회복 30',
    description: '스태미나를 30 회복합니다',
    icon: '⚡',
    category: 'daily',
    currency: 'gems',
    price: 10,
    reward: { type: 'stamina', amount: 30 },
    dailyLimit: 3,
  },
  {
    id: 'shop_daily_gold',
    name: '금화 1000',
    description: '보석으로 금화를 구매합니다',
    icon: '💰',
    category: 'daily',
    currency: 'gems',
    price: 20,
    reward: { type: 'gold', amount: 1000 },
    dailyLimit: 5,
  },
];

export function getShopItems(category: ShopItem['category']): ShopItem[] {
  return SHOP_ITEMS.filter(item => item.category === category);
}

export function getDailyPurchases(progress: CampaignProgress): Record<string, number> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (!progress.shopDailyPurchases || progress.shopDailyPurchases.date !== today) {
    progress.shopDailyPurchases = { date: today, counts: {} };
  }
  return progress.shopDailyPurchases.counts;
}
