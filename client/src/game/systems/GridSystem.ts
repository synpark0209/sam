import type { Position, TileData } from '@shared/types/index.ts';
import type { UnitData, Faction } from '@shared/types/index.ts';
import { UnitClass } from '@shared/types/index.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';

export class GridSystem {
  constructor(
    private tiles: TileData[][],
    private width: number,
    private height: number,
  ) {}

  getTile(x: number, y: number): TileData | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.tiles[y][x];
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getAdjacentPositions(pos: Position): Position[] {
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    return dirs
      .map(d => ({ x: pos.x + d.x, y: pos.y + d.y }))
      .filter(p => this.isInBounds(p.x, p.y));
  }

  getMovementCostForClass(tile: TileData, unitClass?: UnitClass): number {
    if (!unitClass) return tile.movementCost;
    const classDef = UNIT_CLASS_DEFS[unitClass];
    const classCost = classDef.terrainCosts[tile.type];
    if (classCost !== undefined) return classCost;
    return tile.movementCost;
  }

  isPassableForClass(tile: TileData, unitClass?: UnitClass): boolean {
    if (tile.isPassable) return true;
    if (!unitClass) return false;
    const classDef = UNIT_CLASS_DEFS[unitClass];
    return classDef.passableTerrain.includes(tile.type);
  }

  getMovementRange(origin: Position, moveRange: number, units: UnitData[], faction: Faction, unitClass?: UnitClass): Position[] {
    const visited = new Map<string, number>();
    const queue: Array<{ pos: Position; remaining: number }> = [];
    const key = (p: Position) => `${p.x},${p.y}`;

    queue.push({ pos: origin, remaining: moveRange });
    visited.set(key(origin), moveRange);

    while (queue.length > 0) {
      const { pos, remaining } = queue.shift()!;

      for (const adj of this.getAdjacentPositions(pos)) {
        const tile = this.getTile(adj.x, adj.y);
        if (!tile || !this.isPassableForClass(tile, unitClass)) continue;

        const cost = this.getMovementCostForClass(tile, unitClass);
        const newRemaining = remaining - cost;
        if (newRemaining < 0) continue;

        const occupying = units.find(u => u.position.x === adj.x && u.position.y === adj.y && u.isAlive);
        if (occupying && occupying.faction !== faction) continue;

        const k = key(adj);
        if (!visited.has(k) || visited.get(k)! < newRemaining) {
          visited.set(k, newRemaining);
          queue.push({ pos: adj, remaining: newRemaining });
        }
      }
    }

    visited.delete(key(origin));

    return [...visited.keys()]
      .map(k => {
        const [x, y] = k.split(',').map(Number);
        return { x, y };
      })
      .filter(p => {
        const occupying = units.find(u => u.position.x === p.x && u.position.y === p.y && u.isAlive);
        return !occupying;
      });
  }

  getAttackRange(origin: Position, attackRange: number): Position[] {
    const result: Position[] = [];
    for (let dx = -attackRange; dx <= attackRange; dx++) {
      for (let dy = -attackRange; dy <= attackRange; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > attackRange) continue;
        const nx = origin.x + dx;
        const ny = origin.y + dy;
        if (this.isInBounds(nx, ny)) {
          result.push({ x: nx, y: ny });
        }
      }
    }
    return result;
  }

  getPath(from: Position, to: Position, units: UnitData[], faction: Faction, unitClass?: UnitClass): Position[] {
    const key = (p: Position) => `${p.x},${p.y}`;
    const openSet = [from];
    const cameFrom = new Map<string, Position>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(key(from), 0);
    fScore.set(key(from), this.heuristic(from, to));

    while (openSet.length > 0) {
      openSet.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
      const current = openSet.shift()!;

      if (current.x === to.x && current.y === to.y) {
        const path: Position[] = [];
        let c: Position | undefined = current;
        while (c) {
          path.unshift(c);
          c = cameFrom.get(key(c));
        }
        return path;
      }

      for (const neighbor of this.getAdjacentPositions(current)) {
        const tile = this.getTile(neighbor.x, neighbor.y);
        if (!tile || !this.isPassableForClass(tile, unitClass)) continue;

        const occupying = units.find(u => u.position.x === neighbor.x && u.position.y === neighbor.y && u.isAlive);
        if (occupying && occupying.faction !== faction && !(neighbor.x === to.x && neighbor.y === to.y)) continue;

        const tentativeG = (gScore.get(key(current)) ?? Infinity) + this.getMovementCostForClass(tile, unitClass);
        if (tentativeG < (gScore.get(key(neighbor)) ?? Infinity)) {
          cameFrom.set(key(neighbor), current);
          gScore.set(key(neighbor), tentativeG);
          fScore.set(key(neighbor), tentativeG + this.heuristic(neighbor, to));
          if (!openSet.find(p => p.x === neighbor.x && p.y === neighbor.y)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return [];
  }

  private heuristic(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  manhattanDistance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}
