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
  // ── 무기 ──
  {
    id: 'shop_bronze_sword', name: '청동검',
    description: '공격+3 (보병·기병·도적·무도가)',
    icon: '⚔️', category: 'general', currency: 'gold', price: 300,
    reward: { type: 'equipment', itemId: 'bronze_sword' },
  },
  {
    id: 'shop_steel_sword', name: '강철검',
    description: '공격+6 (보병·기병·도적·무도가)',
    icon: '⚔️', category: 'general', currency: 'gold', price: 800,
    reward: { type: 'equipment', itemId: 'steel_sword' },
  },
  {
    id: 'shop_iron_spear', name: '철창',
    description: '공격+5 (보병·기병)',
    icon: '⚔️', category: 'general', currency: 'gold', price: 600,
    reward: { type: 'equipment', itemId: 'iron_spear' },
  },
  {
    id: 'shop_short_bow', name: '단궁',
    description: '공격+3 (궁병 전용)',
    icon: '🏹', category: 'general', currency: 'gold', price: 300,
    reward: { type: 'equipment', itemId: 'short_bow' },
  },
  {
    id: 'shop_sage_staff', name: '현자의 지팡이',
    description: '공격+2, MP+10 (책사 전용)',
    icon: '📜', category: 'general', currency: 'gold', price: 400,
    reward: { type: 'equipment', itemId: 'sage_staff' },
  },
  {
    id: 'shop_throwing_knife', name: '비도',
    description: '공격+4, 속도+1 (도적 전용)',
    icon: '🗡️', category: 'general', currency: 'gold', price: 400,
    reward: { type: 'equipment', itemId: 'throwing_knife' },
  },
  {
    id: 'shop_iron_fist', name: '철권',
    description: '공격+4, HP+5 (무도가 전용)',
    icon: '👊', category: 'general', currency: 'gold', price: 400,
    reward: { type: 'equipment', itemId: 'iron_fist' },
  },
  // ── 방어구 ──
  {
    id: 'shop_leather_armor', name: '가죽갑',
    description: '방어+3 (책사 제외)',
    icon: '🛡️', category: 'general', currency: 'gold', price: 300,
    reward: { type: 'equipment', itemId: 'leather_armor' },
  },
  {
    id: 'shop_iron_armor', name: '철갑',
    description: '방어+6, 속도-1 (보병·기병·무도가)',
    icon: '🛡️', category: 'general', currency: 'gold', price: 1000,
    reward: { type: 'equipment', itemId: 'iron_armor' },
  },
  {
    id: 'shop_sage_robe', name: '현자의 로브',
    description: '방어+2, MP+5 (책사 전용)',
    icon: '👘', category: 'general', currency: 'gold', price: 400,
    reward: { type: 'equipment', itemId: 'sage_robe' },
  },
  {
    id: 'shop_shadow_cloak', name: '암행의',
    description: '방어+3, 속도+2 (도적 전용)',
    icon: '🧥', category: 'general', currency: 'gold', price: 600,
    reward: { type: 'equipment', itemId: 'shadow_cloak' },
  },
  // ── 악세서리 ──
  {
    id: 'shop_war_drum', name: '전고',
    description: '공격+2, 방어+2',
    icon: '🥁', category: 'general', currency: 'gold', price: 500,
    reward: { type: 'equipment', itemId: 'war_drum' },
  },
  {
    id: 'shop_sun_amulet', name: '태양부',
    description: '공격+3',
    icon: '☀️', category: 'general', currency: 'gold', price: 300,
    reward: { type: 'equipment', itemId: 'sun_amulet' },
  },
  {
    id: 'shop_iron_shield', name: '철방패',
    description: '방어+4',
    icon: '🛡️', category: 'general', currency: 'gold', price: 400,
    reward: { type: 'equipment', itemId: 'iron_shield' },
  },
  {
    id: 'shop_speed_boots', name: '경보화',
    description: '속도+2, 이동+1',
    icon: '👢', category: 'general', currency: 'gold', price: 800,
    reward: { type: 'equipment', itemId: 'speed_boots' },
  },
  {
    id: 'shop_life_gem', name: '생명석',
    description: 'HP+30',
    icon: '💎', category: 'general', currency: 'gold', price: 600,
    reward: { type: 'equipment', itemId: 'life_gem' },
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

  // ── 스킬 강화 소재 ──
  {
    id: 'shop_skill_book_basic',
    name: '초급 스킬서',
    description: 'Lv.1~3 스킬 강화에 필요',
    icon: '📕',
    category: 'general',
    currency: 'gold',
    price: 1000,
    reward: { type: 'material', itemId: 'skill_book_basic', amount: 1 },
  },
  {
    id: 'shop_skill_book_mid',
    name: '중급 스킬서',
    description: 'Lv.4~6 스킬 강화에 필요',
    icon: '📗',
    category: 'general',
    currency: 'gold',
    price: 3000,
    reward: { type: 'material', itemId: 'skill_book_mid', amount: 1 },
  },
  {
    id: 'shop_skill_book_high',
    name: '고급 스킬서',
    description: 'Lv.7~10 스킬 강화에 필요',
    icon: '📘',
    category: 'premium',
    currency: 'gems',
    price: 80,
    reward: { type: 'material', itemId: 'skill_book_high', amount: 1 },
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
