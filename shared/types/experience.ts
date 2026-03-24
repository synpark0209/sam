import type { UnitStats } from './unit.ts';

export interface LevelUpResult {
  unitId: string;
  newLevel: number;
  statGains: Partial<UnitStats & { maxMp: number }>;
  promoted?: boolean;
  promotionName?: string;
}
