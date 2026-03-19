import type { TileData } from './grid.ts';
import type { UnitData, Faction } from './unit.ts';

export type TurnPhase = 'player' | 'enemy';

export interface BattleState {
  turn: number;
  phase: TurnPhase;
  units: UnitData[];
  mapWidth: number;
  mapHeight: number;
  tiles: TileData[][];
  selectedUnitId: string | null;
  gameOver: boolean;
  winner: Faction | null;
}
