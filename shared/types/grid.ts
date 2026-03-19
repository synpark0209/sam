export interface Position {
  x: number;
  y: number;
}

export enum TileType {
  PLAIN = 'plain',
  FOREST = 'forest',
  MOUNTAIN = 'mountain',
  WATER = 'water',
  BRIDGE = 'bridge',
}

export interface TileData {
  type: TileType;
  movementCost: number;
  defenseBonus: number;
  isPassable: boolean;
}
