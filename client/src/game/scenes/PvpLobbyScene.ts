import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_CONFIGS } from '@shared/constants.ts';
import { TileType } from '@shared/types/index.ts';
import type { UnitData, TileData } from '@shared/types/index.ts';
import { pvpFindMatch } from '../../api/client.ts';
import type { PvpMatchResult } from '../../api/client.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';

const GAME_W = GAME_WIDTH;
const GAME_H = GAME_HEIGHT;

function createPvpMap(): TileData[][] {
  const tiles: TileData[][] = [];
  for (let y = 0; y < 10; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < 12; x++) row.push({ ...TILE_CONFIGS[TileType.PLAIN] });
    tiles.push(row);
  }
  // 대칭 맵: 중앙에 숲
  const forests = [[5, 3], [5, 4], [5, 5], [5, 6], [6, 3], [6, 4], [6, 5], [6, 6]];
  for (const [x, y] of forests) tiles[y][x] = { ...TILE_CONFIGS[TileType.FOREST] };
  // 산
  tiles[1][3] = { ...TILE_CONFIGS[TileType.MOUNTAIN] };
  tiles[8][8] = { ...TILE_CONFIGS[TileType.MOUNTAIN] };
  tiles[1][8] = { ...TILE_CONFIGS[TileType.MOUNTAIN] };
  tiles[8][3] = { ...TILE_CONFIGS[TileType.MOUNTAIN] };
  return tiles;
}

export class PvpLobbyScene extends Phaser.Scene {
  private matchData: PvpMatchResult | null = null;
  private campaignManager!: CampaignManager;

  constructor() {
    super('PvpLobbyScene');
  }

  init(data: { campaignManager: CampaignManager }) {
    this.campaignManager = data.campaignManager;
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, GAME_W, GAME_H);

    this.add.text(GAME_W / 2, 22, 'PvP 대전', {
      fontSize: '26px', color: '#ff6644', fontStyle: 'bold',
    }).setOrigin(0.5);

    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('LobbyScene', { campaignManager: this.campaignManager }));

    this.findMatch();
  }

  private async findMatch(): Promise<void> {
    const status = this.add.text(GAME_W / 2, GAME_H * 0.4, '상대를 찾는 중...', {
      fontSize: '18px', color: '#aaaaaa',
    }).setOrigin(0.5);

    try {
      this.matchData = await pvpFindMatch();
      status.destroy();
      this.showMatchInfo();
    } catch (e: unknown) {
      status.setText(e instanceof Error ? e.message : '매칭 실패');
      status.setColor('#ff6666');

      const retryBtn = this.add.text(GAME_W / 2, GAME_H * 0.55, '다시 시도', {
        fontSize: '18px', color: '#ffffff', backgroundColor: '#4a4a6a', padding: { x: 24, y: 12 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      retryBtn.on('pointerdown', () => this.scene.restart());
    }
  }

  private showMatchInfo(): void {
    if (!this.matchData) return;

    this.add.text(GAME_W / 2, 70, '대전 상대', {
      fontSize: '16px', color: '#888888',
    }).setOrigin(0.5);

    // 상대 정보
    this.add.text(GAME_W / 2, 100, this.matchData.opponentName, {
      fontSize: '24px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 132, `ELO: ${this.matchData.opponentElo}`, {
      fontSize: '16px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 상대 유닛 목록
    const units = this.matchData.opponentUnits as UnitData[];
    if (units.length > 0) {
      const unitInfo = units.map(u => `${u.name} Lv.${u.level ?? 1}`).join('  ');
      this.add.text(GAME_W / 2, 165, unitInfo, {
        fontSize: '15px', color: '#cc8888',
      }).setOrigin(0.5);
    }

    // 전투 시작 버튼
    const startBtn = this.add.text(GAME_W / 2, GAME_H * 0.55, '전투 시작!', {
      fontSize: '24px', color: '#ffffff', backgroundColor: '#cc3333', padding: { x: 34, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startBtn.on('pointerover', () => startBtn.setStyle({ backgroundColor: '#ee4444' }));
    startBtn.on('pointerout', () => startBtn.setStyle({ backgroundColor: '#cc3333' }));
    startBtn.on('pointerdown', () => this.startPvpBattle());

    // 다른 상대 찾기
    const rerollBtn = this.add.text(GAME_W / 2, GAME_H * 0.67, '다른 상대 찾기', {
      fontSize: '16px', color: '#6688cc', backgroundColor: '#1a1a3a', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rerollBtn.on('pointerdown', () => this.scene.restart());
  }

  private startPvpBattle(): void {
    if (!this.matchData) return;

    const opponentUnits = (this.matchData.opponentUnits as UnitData[]).map((u, i) => ({
      ...u,
      id: `pvp_e${i}`,
      faction: 'enemy' as const,
      position: { x: 10, y: 2 + i * 2 },
      hasActed: false,
      isAlive: true,
      stats: { ...u.stats, hp: u.stats.maxHp },
    }));

    const startPositions = [{ x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 4 }];
    const playerUnits = this.campaignManager.getProgress().playerUnits.map((u, i) => ({
      ...u,
      position: startPositions[i] ?? { x: 0, y: 0 },
      stats: { ...u.stats, hp: u.stats.maxHp },
      mp: u.maxMp,
      hasActed: false,
      isAlive: true,
    }));

    this.scene.start('BattleScene', {
      pvpMode: true,
      pvpOpponentId: this.matchData.opponentId,
      pvpOpponentName: this.matchData.opponentName,
      battleConfig: {
        mapWidth: 12,
        mapHeight: 10,
        tiles: createPvpMap(),
        enemyUnits: opponentUnits,
        playerStartPositions: startPositions,
      },
      playerUnits,
    });
  }
}
