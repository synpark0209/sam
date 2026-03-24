import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { AudioManager } from '../systems/AudioManager.ts';
import type { UnitData } from '@shared/types/index.ts';
import { logout as doLogout } from '../../api/client.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import { SKILL_DEFS } from '@shared/data/skillDefs.ts';
import { EQUIPMENT_DEFS } from '@shared/data/equipmentDefs.ts';

const GW = TILE_SIZE * MAP_WIDTH;
const GH = TILE_SIZE * MAP_HEIGHT + 60;

export class LobbyScene extends Phaser.Scene {
  private campaignManager!: CampaignManager;

  constructor() {
    super('LobbyScene');
  }

  init(data: { campaignManager: CampaignManager }) {
    this.campaignManager = data.campaignManager;
  }

  create(): void {
    (this.registry.get('audioManager') as AudioManager)?.playBgm('title');
    this.showMainMenu();
  }

  // ── 메인 메뉴 ──

  private showMainMenu(): void {
    this.children.removeAll();

    // 배경
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    // 타이틀
    this.add.text(GW / 2, 30, '방구석 여포뎐', {
      fontSize: '28px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 유저 정보
    const progress = this.campaignManager.getProgress();
    this.add.text(GW / 2, 60, `금: ${progress.gold}  |  장수: ${progress.playerUnits.length}명`, {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 음소거 버튼
    const audio = this.registry.get('audioManager') as AudioManager;
    const muteBtn = this.add.text(10, 10, audio?.isMuted() ? '🔇' : '🔊', {
      fontSize: '20px',
    }).setInteractive({ useHandCursor: true }).setDepth(100);
    muteBtn.on('pointerdown', () => {
      if (!audio) return;
      audio.setMuted(!audio.isMuted());
      muteBtn.setText(audio.isMuted() ? '🔇' : '🔊');
      if (!audio.isMuted()) audio.playBgm('title');
    });

    // 메인 메뉴 버튼들
    const btnStyle = {
      fontSize: '18px', color: '#ffffff', backgroundColor: '#2a2a4a',
      padding: { x: 30, y: 12 },
    };
    const btnHover = '#3a3a5a';
    const btnNormal = '#2a2a4a';

    const buttons: { label: string; y: number; color?: string; action: () => void }[] = [
      { label: '📜 시나리오', y: GH * 0.28, action: () => this.startCampaign() },
      { label: '⚔️ 자유 전투', y: GH * 0.40, action: () => this.startFreeBattle() },
      { label: '👥 장수 관리', y: GH * 0.52, action: () => this.showHeroes() },
      { label: '🏆 랭킹', y: GH * 0.64, action: () => this.scene.start('RankingScene') },
      { label: '🚪 로그아웃', y: GH * 0.78, color: '#4a2a2a', action: () => this.logout() },
    ];

    for (const btn of buttons) {
      const style = { ...btnStyle, backgroundColor: btn.color ?? btnNormal };
      const text = this.add.text(GW / 2, btn.y, btn.label, style)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      text.on('pointerover', () => text.setStyle({ backgroundColor: btnHover }));
      text.on('pointerout', () => text.setStyle({ backgroundColor: btn.color ?? btnNormal }));
      text.on('pointerdown', btn.action);
    }

    // 하단 장수 요약
    const unitSummary = progress.playerUnits
      .map(u => {
        const cls = u.unitClass ? UNIT_CLASS_DEFS[u.unitClass]?.name ?? '' : '';
        const promo = u.promotionClass ?? cls;
        return `${u.name}(${promo} Lv.${u.level ?? 1})`;
      })
      .join('  ');
    this.add.text(GW / 2, GH - 20, unitSummary, {
      fontSize: '10px', color: '#666666',
    }).setOrigin(0.5);
  }

  // ── 장수 관리 ──

  private showHeroes(): void {
    this.children.removeAll();

    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 20, '장수 관리', {
      fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 뒤로 버튼
    const backBtn = this.add.text(20, 15, '← 뒤로', {
      fontSize: '14px', color: '#aaaaaa', backgroundColor: '#1a1a3a', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showMainMenu());

    const units = this.campaignManager.getProgress().playerUnits;
    const startY = 55;
    const cardH = 65;

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const y = startY + i * cardH;

      // 카드 배경
      const cardBg = this.add.graphics();
      const isPlayer = unit.faction === 'player';
      cardBg.fillStyle(isPlayer ? 0x1a2a3a : 0x3a1a1a, 1);
      cardBg.fillRoundedRect(15, y, GW - 30, cardH - 5, 6);
      cardBg.lineStyle(1, isPlayer ? 0x3366aa : 0x663333, 1);
      cardBg.strokeRoundedRect(15, y, GW - 30, cardH - 5, 6);

      // 이름 + 병종
      const cls = unit.unitClass ? UNIT_CLASS_DEFS[unit.unitClass] : null;
      const className = unit.promotionClass ?? cls?.name ?? '';
      this.add.text(25, y + 8, `${unit.name}`, {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      });
      this.add.text(25, y + 28, `${className} Lv.${unit.level ?? 1}`, {
        fontSize: '11px', color: '#88aacc',
      });

      // HP/MP
      this.add.text(160, y + 8, `HP:${unit.stats.maxHp}  ATK:${unit.stats.attack}`, {
        fontSize: '10px', color: '#aaaaaa',
      });
      this.add.text(160, y + 22, `DEF:${unit.stats.defense}  SPD:${unit.stats.speed}`, {
        fontSize: '10px', color: '#aaaaaa',
      });
      this.add.text(160, y + 36, `MP:${unit.maxMp ?? 0}`, {
        fontSize: '10px', color: '#8888cc',
      });

      // 상세 보기 버튼
      const detailBtn = this.add.text(GW - 80, y + 18, '상세', {
        fontSize: '12px', color: '#ffffff', backgroundColor: '#3366aa', padding: { x: 10, y: 6 },
      }).setInteractive({ useHandCursor: true });
      detailBtn.on('pointerdown', () => this.showHeroDetail(unit));
    }
  }

  // ── 장수 상세 정보 ──

  private showHeroDetail(unit: UnitData): void {
    this.children.removeAll();

    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    // 뒤로 버튼
    const backBtn = this.add.text(20, 15, '← 뒤로', {
      fontSize: '14px', color: '#aaaaaa', backgroundColor: '#1a1a3a', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showHeroes());

    // 이름 + 병종
    const cls = unit.unitClass ? UNIT_CLASS_DEFS[unit.unitClass] : null;
    const className = unit.promotionClass ?? cls?.name ?? '';
    this.add.text(GW / 2, 20, unit.name, {
      fontSize: '28px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GW / 2, 50, `${className}  Lv.${unit.level ?? 1}`, {
      fontSize: '14px', color: '#88aacc',
    }).setOrigin(0.5);

    // 경험치 바
    const exp = unit.exp ?? 0;
    this.add.text(GW / 2, 70, `EXP: ${exp} / 100`, {
      fontSize: '11px', color: '#aaaaff',
    }).setOrigin(0.5);
    const barX = GW / 2 - 80;
    const bg = this.add.graphics();
    bg.fillStyle(0x333344, 1).fillRoundedRect(barX, 85, 160, 8, 4);
    const fg = this.add.graphics();
    fg.fillStyle(0x6666cc, 1).fillRoundedRect(barX, 85, 160 * (exp / 100), 8, 4);

    // 스탯
    const sy = 105;
    const statStyle = { fontSize: '13px', color: '#ffffff' };
    const valStyle = { fontSize: '13px', color: '#ffdd88' };
    const stats = [
      ['HP', unit.stats.maxHp], ['공격', unit.stats.attack],
      ['방어', unit.stats.defense], ['속도', unit.stats.speed],
      ['이동', unit.stats.moveRange], ['사거리', unit.stats.attackRange],
      ['MP', unit.maxMp ?? 0],
    ];
    for (let i = 0; i < stats.length; i++) {
      const col = i < 4 ? 0 : 1;
      const row = i < 4 ? i : i - 4;
      const x = 40 + col * (GW / 2 - 20);
      const y = sy + row * 22;
      this.add.text(x, y, `${stats[i][0]}:`, statStyle);
      this.add.text(x + 60, y, `${stats[i][1]}`, valStyle);
    }

    // 스킬 섹션
    const skillY = sy + 100;
    this.add.text(30, skillY, '── 스킬 ──', {
      fontSize: '14px', color: '#cc88ff', fontStyle: 'bold',
    });

    let skillRow = 0;
    // 고유 스킬
    if (unit.uniqueSkill) {
      const skill = SKILL_DEFS[unit.uniqueSkill];
      if (skill) {
        this.add.text(30, skillY + 22 + skillRow * 38, `★ ${skill.name}`, {
          fontSize: '13px', color: '#ffaa44', fontStyle: 'bold',
        });
        this.add.text(30, skillY + 38 + skillRow * 38, `${skill.description}  (MP${skill.mpCost})`, {
          fontSize: '10px', color: '#999999', wordWrap: { width: GW - 60 },
        });
        skillRow++;
      }
    }

    // 장착 스킬
    const equipped = unit.equippedSkills ?? unit.skills ?? [];
    for (const skillId of equipped) {
      const skill = SKILL_DEFS[skillId];
      if (!skill) continue;
      this.add.text(30, skillY + 22 + skillRow * 38, `◆ ${skill.name}`, {
        fontSize: '13px', color: '#88ccff',
      });
      this.add.text(30, skillY + 38 + skillRow * 38, `${skill.description}  (MP${skill.mpCost})`, {
        fontSize: '10px', color: '#999999', wordWrap: { width: GW - 60 },
      });
      skillRow++;
    }

    // 장비 섹션
    const equipY = skillY + 22 + skillRow * 38 + 15;
    this.add.text(30, equipY, '── 장비 ──', {
      fontSize: '14px', color: '#44cc88', fontStyle: 'bold',
    });
    const eq = unit.equipment;
    const slots = [
      ['무기', eq?.weapon], ['방어구', eq?.armor], ['보조', eq?.accessory],
    ];
    for (let i = 0; i < slots.length; i++) {
      const [slotName, itemId] = slots[i];
      const itemDef = itemId ? EQUIPMENT_DEFS[itemId as string] : null;
      const itemName = itemDef?.name ?? '없음';
      this.add.text(30, equipY + 22 + i * 20, `${slotName}: ${itemName}`, {
        fontSize: '12px', color: itemDef ? '#ffffff' : '#555555',
      });
    }
  }

  // ── 액션 ──

  private startCampaign(): void {
    this.scene.start('WorldMapScene', { campaignManager: this.campaignManager });
  }

  private startFreeBattle(): void {
    this.scene.start('BattleScene');
  }

  private logout(): void {
    doLogout();
    this.scene.start('TitleScene');
  }
}
