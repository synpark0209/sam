import type { BattleState } from '@shared/types/index.ts';
import type { Faction, UnitData } from '@shared/types/index.ts';

export class TurnSystem {
  constructor(private state: BattleState) {}

  getState(): BattleState {
    return this.state;
  }

  startPlayerTurn(): void {
    this.state.phase = 'player';
    this.state.turn++;
    this.getUnitsByFaction('player').forEach(u => { u.hasActed = false; });
  }

  startEnemyTurn(): void {
    this.state.phase = 'enemy';
    this.getUnitsByFaction('enemy').forEach(u => { u.hasActed = false; });
  }

  isAllActed(faction: Faction): boolean {
    return this.getUnitsByFaction(faction).every(u => u.hasActed);
  }

  getUnitsByFaction(faction: Faction): UnitData[] {
    return this.state.units.filter(u => u.faction === faction && u.isAlive);
  }

  checkVictory(): Faction | null {
    const playerAlive = this.state.units.some(u => u.faction === 'player' && u.isAlive);
    const enemyAlive = this.state.units.some(u => u.faction === 'enemy' && u.isAlive);
    if (!playerAlive) return 'enemy';
    if (!enemyAlive) return 'player';
    return null;
  }

  getUnitById(id: string): UnitData | undefined {
    return this.state.units.find(u => u.id === id);
  }
}
