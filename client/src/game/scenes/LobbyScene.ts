import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@shared/constants.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { AudioManager } from '../systems/AudioManager.ts';
import type { UnitData } from '@shared/types/index.ts';
import { UnitClass } from '@shared/types/index.ts';
import { logout as doLogout, gachaPull, getGachaStatus } from '../../api/client.ts';
import type { GachaPullResult } from '../../api/client.ts';
import { getGradeColor, GACHA_HERO_POOL } from '@shared/data/gachaDefs.ts';
import type { HeroGrade } from '@shared/data/gachaDefs.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import { SKILL_DEFS } from '@shared/data/skillDefs.ts';
import { EQUIPMENT_DEFS } from '@shared/data/equipmentDefs.ts';

const GW = GAME_WIDTH;
const GH = GAME_HEIGHT;

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
    const progress = this.campaignManager.getProgress();

    // 배경 그라데이션
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, GW, GH);

    // 상단 장식선
    const topLine = this.add.graphics();
    topLine.fillGradientStyle(0xffd700, 0xffa500, 0xffa500, 0xffd700, 1);
    topLine.fillRect(0, 0, GW, 3);

    // 음소거 버튼
    const audio = this.registry.get('audioManager') as AudioManager;
    const muteBtn = this.add.text(GW - 40, 16, audio?.isMuted() ? '🔇' : '🔊', {
      fontSize: '24px',
    }).setInteractive({ useHandCursor: true }).setDepth(100);
    muteBtn.on('pointerdown', () => {
      if (!audio) return;
      audio.setMuted(!audio.isMuted());
      muteBtn.setText(audio.isMuted() ? '🔇' : '🔊');
      if (!audio.isMuted()) audio.playBgm('title');
    });

    // 타이틀
    this.add.text(GW / 2, 40, '방구석 여포뎐', {
      fontSize: '32px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    // 유저 정보 카드
    const cardY = 80;
    const card = this.add.graphics();
    card.fillStyle(0x1a1a3a, 0.8);
    card.fillRoundedRect(16, cardY, GW - 32, 56, 10);
    card.lineStyle(1, 0x4466aa, 0.5);
    card.strokeRoundedRect(16, cardY, GW - 32, 56, 10);

    this.add.text(30, cardY + 10, `💰 ${progress.gold}`, {
      fontSize: '16px', color: '#ffd700',
    });
    this.add.text(GW / 2, cardY + 10, `👥 ${progress.playerUnits.length}명`, {
      fontSize: '16px', color: '#88ccff',
    }).setOrigin(0.5, 0);
    this.add.text(GW - 30, cardY + 10, `⚡ ${progress.stamina ?? 120}`, {
      fontSize: '16px', color: '#44ff44',
    }).setOrigin(1, 0);

    // 대표 장수 표시
    const mainUnit = progress.playerUnits[0];
    if (mainUnit) {
      const cls = mainUnit.unitClass ? UNIT_CLASS_DEFS[mainUnit.unitClass]?.name ?? '' : '';
      this.add.text(GW / 2, cardY + 36, `${mainUnit.name} (${cls} Lv.${mainUnit.level ?? 1})`, {
        fontSize: '13px', color: '#888888',
      }).setOrigin(0.5);
    }

    // ── 메인 버튼 (2열 그리드) ──
    const gridStartY = 155;
    const btnW = (GW - 42) / 2;
    const btnH = 72;
    const gap = 10;

    const mainButtons: { label: string; icon: string; color: number; borderColor: number; action: () => void }[] = [
      { label: '시나리오', icon: '📜', color: 0x2a3a5a, borderColor: 0x4488cc, action: () => this.startCampaign() },
      { label: 'PvP 아레나', icon: '⚔️', color: 0x5a2a2a, borderColor: 0xcc4444, action: () => this.startPvPArena() },
      { label: '일일 던전', icon: '🏰', color: 0x2a4a2a, borderColor: 0x44aa44, action: () => this.startDailyDungeon() },
      { label: '장수 뽑기', icon: '🎰', color: 0x4a2a5a, borderColor: 0xaa44cc, action: () => this.showGacha() },
    ];

    for (let i = 0; i < mainButtons.length; i++) {
      const btn = mainButtons[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 20 + col * (btnW + gap);
      const y = gridStartY + row * (btnH + gap);

      const btnBg = this.add.graphics();
      btnBg.fillStyle(btn.color, 1);
      btnBg.fillRoundedRect(x, y, btnW, btnH, 8);
      btnBg.lineStyle(1.5, btn.borderColor, 0.8);
      btnBg.strokeRoundedRect(x, y, btnW, btnH, 8);

      this.add.text(x + 14, y + btnH / 2, btn.icon, {
        fontSize: '28px',
      }).setOrigin(0, 0.5);

      this.add.text(x + 50, y + btnH / 2, btn.label, {
        fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      // 클릭 영역
      const hitArea = this.add.rectangle(x + btnW / 2, y + btnH / 2, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', btn.action);
      hitArea.on('pointerover', () => btnBg.setAlpha(0.8));
      hitArea.on('pointerout', () => btnBg.setAlpha(1));
    }

    // ── 하단 메뉴 (소형 버튼 4개) ──
    const subY = gridStartY + 2 * (btnH + gap) + 20;
    const subBtnW = (GW - 54) / 4;
    const subBtnH = 64;

    const subButtons: { label: string; icon: string; action: () => void }[] = [
      { label: '장수', icon: '👥', action: () => this.showHeroes() },
      { label: '인벤토리', icon: '🎒', action: () => this.showInventory('equipment') },
      { label: '랭킹', icon: '🏆', action: () => this.scene.start('RankingScene') },
      { label: '설정', icon: '⚙️', action: () => this.showSettings() },
    ];

    for (let i = 0; i < subButtons.length; i++) {
      const btn = subButtons[i];
      const x = 16 + i * (subBtnW + 6);

      const subBg = this.add.graphics();
      subBg.fillStyle(0x1a1a2e, 1);
      subBg.fillRoundedRect(x, subY, subBtnW, subBtnH, 6);
      subBg.lineStyle(1, 0x333355, 0.6);
      subBg.strokeRoundedRect(x, subY, subBtnW, subBtnH, 6);

      this.add.text(x + subBtnW / 2, subY + 20, btn.icon, {
        fontSize: '24px',
      }).setOrigin(0.5);

      this.add.text(x + subBtnW / 2, subY + 46, btn.label, {
        fontSize: '12px', color: '#aaaaaa',
      }).setOrigin(0.5);

      const hit = this.add.rectangle(x + subBtnW / 2, subY + subBtnH / 2, subBtnW, subBtnH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', btn.action);
    }

    // 하단 장식선
    const bottomLine = this.add.graphics();
    bottomLine.fillGradientStyle(0x4466aa, 0x6644aa, 0x6644aa, 0x4466aa, 0.3);
    bottomLine.fillRect(0, GH - 2, GW, 2);
  }

  // ── 장수 관리 ──

  private showHeroes(): void {
    this.children.removeAll();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    bg.fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 18, '👥 장수 관리', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // 뒤로 버튼
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1a1a3a, 1).fillRoundedRect(10, 8, 55, 24, 6);
    const backBtn = this.add.text(37, 20, '← 홈', {
      fontSize: '11px', color: '#88aacc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showMainMenu());

    const units = this.campaignManager.getProgress().playerUnits;
    this.add.text(GW / 2, 40, `보유 장수: ${units.length}명`, {
      fontSize: '10px', color: '#888888',
    }).setOrigin(0.5);

    const startY = 55;
    const cardH = 58;

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const y = startY + i * cardH;
      const grade = unit.grade ?? 'N';
      const gradeColor = Phaser.Display.Color.HexStringToColor(getGradeColor(grade as HeroGrade)).color;

      // 카드 + 등급 색상 왼쪽 바
      const card = this.add.graphics();
      card.fillStyle(0x141428, 1).fillRoundedRect(15, y, GW - 30, cardH - 4, 6);
      card.fillStyle(gradeColor, 1).fillRect(15, y + 6, 4, cardH - 16);
      card.lineStyle(1, 0x2a2a44, 0.6).strokeRoundedRect(15, y, GW - 30, cardH - 4, 6);

      // 병종 아이콘
      const clsIcons: Record<string, string> = {
        cavalry: '🐎', infantry: '🛡️', archer: '🏹',
        strategist: '📜', martial_artist: '👊', bandit: '🗡️',
      };
      const cls = unit.unitClass ?? 'infantry';
      this.add.text(28, y + (cardH - 4) / 2, clsIcons[cls] ?? '⚔️', {
        fontSize: '18px',
      }).setOrigin(0, 0.5);

      // 등급 + 이름
      this.add.text(50, y + 10, `[${grade}] ${unit.name}`, {
        fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      });

      // 병종 + 레벨
      const className = unit.promotionClass ?? UNIT_CLASS_DEFS[unit.unitClass ?? 'infantry']?.name ?? '';
      this.add.text(50, y + 28, `${className}  Lv.${unit.level ?? 1}`, {
        fontSize: '9px', color: '#88aacc',
      });

      // 간략 스탯
      this.add.text(50, y + 42, `ATK:${unit.stats.attack}  DEF:${unit.stats.defense}  HP:${unit.stats.maxHp}`, {
        fontSize: '8px', color: '#666688',
      });

      // 상세 버튼
      const detBg = this.add.graphics();
      detBg.fillStyle(0x2a3a5a, 1).fillRoundedRect(GW - 72, y + 14, 48, 26, 5);
      this.add.text(GW - 48, y + 27, '상세', {
        fontSize: '11px', color: '#88ccff', fontStyle: 'bold',
      }).setOrigin(0.5);
      const hit = this.add.rectangle(GW - 48, y + 27, 48, 26, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.showHeroDetail(unit));
    }
  }

  // ── 장수 상세 정보 ──

  private showHeroDetail(unit: UnitData): void {
    this.children.removeAll();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    bg.fillRect(0, 0, GW, GH);

    // 뒤로 버튼
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1a1a3a, 1).fillRoundedRect(10, 8, 55, 24, 6);
    const backBtn = this.add.text(37, 20, '← 목록', {
      fontSize: '11px', color: '#88aacc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showHeroes());

    // 장수 헤더 카드
    const cls = unit.unitClass ? UNIT_CLASS_DEFS[unit.unitClass] : null;
    const className = unit.promotionClass ?? cls?.name ?? '';
    const detailGrade = unit.grade ?? 'N';
    const detailGradeColor = getGradeColor(detailGrade as HeroGrade);
    const gradeNum = Phaser.Display.Color.HexStringToColor(detailGradeColor).color;

    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x141428, 1).fillRoundedRect(15, 40, GW - 30, 55, 8);
    headerBg.fillStyle(gradeNum, 1).fillRect(15, 46, 4, 42);
    headerBg.lineStyle(1, gradeNum, 0.4).strokeRoundedRect(15, 40, GW - 30, 55, 8);

    this.add.text(GW / 2, 54, `[${detailGrade}] ${unit.name}`, {
      fontSize: '20px', color: detailGradeColor, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(GW / 2, 76, `${className}  Lv.${unit.level ?? 1}`, {
      fontSize: '12px', color: '#88aacc',
    }).setOrigin(0.5);

    // EXP 바
    const exp = unit.exp ?? 0;
    const expBarW = GW - 80;
    const expBarX = 40;
    this.add.graphics().fillStyle(0x222233, 1).fillRoundedRect(expBarX, 95, expBarW, 6, 3);
    this.add.graphics().fillStyle(0x6666cc, 1).fillRoundedRect(expBarX, 95, expBarW * (exp / 100), 6, 3);
    this.add.text(GW - 38, 92, `${exp}/100`, { fontSize: '8px', color: '#8888aa' });

    // 스탯 카드
    const statBg = this.add.graphics();
    statBg.fillStyle(0x141428, 1).fillRoundedRect(15, 108, GW - 30, 70, 6);

    const statData = [
      { label: 'HP', value: unit.stats.maxHp, color: '#44ff44' },
      { label: '공격', value: unit.stats.attack, color: '#ff6644' },
      { label: '방어', value: unit.stats.defense, color: '#4488ff' },
      { label: '정신', value: unit.stats.spirit ?? 0, color: '#cc88ff' },
      { label: '민첩', value: unit.stats.agility ?? 0, color: '#44ccaa' },
      { label: '순발', value: unit.stats.critical ?? 0, color: '#ffaa44' },
      { label: '속도', value: unit.stats.speed, color: '#88ccff' },
      { label: '관통', value: unit.stats.penetration ?? 0, color: '#ff8844' },
    ];

    for (let i = 0; i < statData.length; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 28 + col * ((GW - 56) / 4);
      const y = 118 + row * 30;
      this.add.text(x, y, statData[i].label, { fontSize: '9px', color: '#888888' });
      this.add.text(x, y + 12, `${statData[i].value}`, {
        fontSize: '12px', color: statData[i].color, fontStyle: 'bold',
      });
    }

    // 스킬 섹션
    const skillY = 190;
    const skillBg = this.add.graphics();
    skillBg.fillStyle(0x141428, 1).fillRoundedRect(15, skillY, GW - 30, 20, 4);
    this.add.text(25, skillY + 4, '✨ 스킬', {
      fontSize: '11px', color: '#cc88ff', fontStyle: 'bold',
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
    const equipped = unit.equippedSkills ?? [];
    for (let si = 0; si < equipped.length; si++) {
      const skill = SKILL_DEFS[equipped[si]];
      if (!skill) continue;
      this.add.text(30, skillY + 22 + skillRow * 32, `◆ ${skill.name} (MP${skill.mpCost})`, {
        fontSize: '12px', color: '#88ccff',
      });
      // 해제 버튼
      const removeSkillBtn = this.add.text(GW - 60, skillY + 22 + skillRow * 32, '해제', {
        fontSize: '10px', color: '#ff6666', backgroundColor: '#2a1a1a', padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true });
      const skillIdx = si;
      removeSkillBtn.on('pointerdown', () => {
        const removed = unit.equippedSkills?.[skillIdx];
        unit.equippedSkills?.splice(skillIdx, 1);
        if (removed) {
          const prog = this.campaignManager.getProgress();
          if (!prog.skillBag) prog.skillBag = [];
          prog.skillBag.push(removed);
        }
        this.campaignManager.save();
        this.showHeroDetail(unit);
      });
      skillRow++;
    }

    // 빈 장착 슬롯 표시
    const maxSlots = (unit.level ?? 1) >= 10 ? 2 : 1;
    for (let s = equipped.length; s < maxSlots; s++) {
      this.add.text(30, skillY + 22 + skillRow * 32, `◇ 빈 슬롯 ${s === 1 ? '(Lv.10)' : ''}`, {
        fontSize: '12px', color: '#444444',
      });
      skillRow++;
    }

    // 장비 섹션
    const equipY = skillY + 22 + skillRow * 32 + 15;
    const equipBgCard = this.add.graphics();
    equipBgCard.fillStyle(0x141428, 1).fillRoundedRect(15, equipY, GW - 30, 20, 4);
    this.add.text(25, equipY + 4, '⚔️ 장비', {
      fontSize: '11px', color: '#44cc88', fontStyle: 'bold',
    });
    const eq = unit.equipment;
    const slots: [string, string | undefined, 'weapon' | 'armor' | 'accessory'][] = [
      ['무기', eq?.weapon, 'weapon'], ['방어구', eq?.armor, 'armor'], ['보조', eq?.accessory, 'accessory'],
    ];
    for (let i = 0; i < slots.length; i++) {
      const [slotName, itemId, slotKey] = slots[i];
      const itemDef = itemId ? EQUIPMENT_DEFS[itemId] : null;
      const itemName = itemDef?.name ?? '없음';
      const bonus = itemDef ? Object.entries(itemDef.statModifiers).map(([k, v]) => `${k}+${v}`).join(' ') : '';
      this.add.text(30, equipY + 22 + i * 24, `${slotName}: ${itemName}`, {
        fontSize: '12px', color: itemDef ? '#ffffff' : '#555555',
      });
      if (bonus) {
        this.add.text(200, equipY + 22 + i * 24, bonus, {
          fontSize: '10px', color: '#88aa88',
        });
      }
      // 해제 버튼
      if (itemDef && unit.equipment) {
        const unequipBtn = this.add.text(GW - 60, equipY + 22 + i * 24, '해제', {
          fontSize: '10px', color: '#ff6666', backgroundColor: '#2a1a1a', padding: { x: 6, y: 2 },
        }).setInteractive({ useHandCursor: true });
        unequipBtn.on('pointerdown', () => {
          if (unit.equipment && unit.equipment[slotKey]) {
            const removedItem = unit.equipment[slotKey]!;
            unit.equipment[slotKey] = undefined;
            const prog = this.campaignManager.getProgress();
            if (!prog.equipmentBag) prog.equipmentBag = [];
            prog.equipmentBag.push(removedItem);
            this.campaignManager.save();
            this.showHeroDetail(unit);
          }
        });
      }
    }
  }

  // ── 액션 ──

  // ── 인벤토리 ──

  private showInventory(tab: 'equipment' | 'skill' | 'material'): void {
    this.children.removeAll();
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    bg.fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 18, '🎒 인벤토리', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const backBg = this.add.graphics();
    backBg.fillStyle(0x1a1a3a, 1).fillRoundedRect(10, 8, 55, 24, 6);
    const backBtn = this.add.text(37, 20, '← 홈', {
      fontSize: '11px', color: '#88aacc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showMainMenu());

    // 탭 버튼 (카드 스타일)
    const tabs: { label: string; icon: string; key: 'equipment' | 'skill' | 'material'; x: number }[] = [
      { label: '장비', icon: '⚔️', key: 'equipment', x: GW * 0.17 },
      { label: '스킬', icon: '✨', key: 'skill', x: GW * 0.5 },
      { label: '소재', icon: '📦', key: 'material', x: GW * 0.83 },
    ];
    for (const t of tabs) {
      const isActive = tab === t.key;
      const tabW = (GW - 50) / 3;
      const tabBg = this.add.graphics();
      tabBg.fillStyle(isActive ? 0x2a3a5a : 0x141428, 1);
      tabBg.fillRoundedRect(t.x - tabW / 2, 42, tabW, 28, 5);
      if (isActive) {
        tabBg.lineStyle(1.5, 0x4488cc, 0.8);
        tabBg.strokeRoundedRect(t.x - tabW / 2, 42, tabW, 28, 5);
      }
      this.add.text(t.x, 56, `${t.icon} ${t.label}`, {
        fontSize: '11px', color: isActive ? '#ffffff' : '#666666', fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);
      const hit = this.add.rectangle(t.x, 56, tabW, 28, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.showInventory(t.key));
    }

    const progress = this.campaignManager.getProgress();
    const startY = 80;

    if (tab === 'equipment') {
      this.renderEquipmentBag(progress.equipmentBag ?? [], startY);
    } else if (tab === 'skill') {
      this.renderSkillBag(progress.skillBag ?? [], startY);
    } else {
      this.renderMaterialBag(progress.materialBag ?? {}, startY);
    }
  }

  private renderEquipmentBag(bag: string[], startY: number): void {
    if (bag.length === 0) {
      this.add.text(GW / 2, startY + 40, '보유 장비가 없습니다', {
        fontSize: '14px', color: '#555555',
      }).setOrigin(0.5);
      return;
    }

    for (let i = 0; i < bag.length; i++) {
      const itemDef = EQUIPMENT_DEFS[bag[i]];
      if (!itemDef) continue;
      const y = startY + i * 50;

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1a2a3a, 1).fillRoundedRect(15, y, GW - 30, 45, 6);

      const slotLabel = itemDef.slot === 'weapon' ? '⚔️' : itemDef.slot === 'armor' ? '🛡️' : '💍';
      this.add.text(25, y + 6, `${slotLabel} ${itemDef.name}`, {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      });
      const bonus = Object.entries(itemDef.statModifiers).map(([k, v]) => `${k}${(v as number) > 0 ? '+' : ''}${v}`).join('  ');
      this.add.text(25, y + 26, bonus, { fontSize: '10px', color: '#88aa88' });

      const equipBtn = this.add.text(GW - 70, y + 12, '장착', {
        fontSize: '12px', color: '#ffffff', backgroundColor: '#3366aa', padding: { x: 10, y: 5 },
      }).setInteractive({ useHandCursor: true });
      const itemIdx = i;
      equipBtn.on('pointerdown', () => this.showEquipTarget(bag, itemIdx, bag[itemIdx]));
    }
  }

  private renderSkillBag(bag: string[], startY: number): void {
    if (bag.length === 0) {
      this.add.text(GW / 2, startY + 40, '보유 스킬이 없습니다', {
        fontSize: '14px', color: '#555555',
      }).setOrigin(0.5);
      return;
    }

    for (let i = 0; i < bag.length; i++) {
      const skillDef = SKILL_DEFS[bag[i]];
      if (!skillDef) continue;
      const y = startY + i * 50;

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1a1a3a, 1).fillRoundedRect(15, y, GW - 30, 45, 6);

      this.add.text(25, y + 6, `✨ ${skillDef.name} (MP${skillDef.mpCost})`, {
        fontSize: '14px', color: '#cc88ff', fontStyle: 'bold',
      });
      this.add.text(25, y + 26, skillDef.description, {
        fontSize: '10px', color: '#888888', wordWrap: { width: GW - 120 },
      });

      const equipBtn = this.add.text(GW - 70, y + 12, '장착', {
        fontSize: '12px', color: '#ffffff', backgroundColor: '#6644aa', padding: { x: 10, y: 5 },
      }).setInteractive({ useHandCursor: true });
      const skillIdx = i;
      equipBtn.on('pointerdown', () => this.showSkillTarget(bag, skillIdx, bag[skillIdx]));
    }
  }

  private renderMaterialBag(bag: Record<string, number>, startY: number): void {
    const entries = Object.entries(bag);
    if (entries.length === 0) {
      this.add.text(GW / 2, startY + 40, '보유 소재가 없습니다', {
        fontSize: '14px', color: '#555555',
      }).setOrigin(0.5);
      return;
    }
    for (let i = 0; i < entries.length; i++) {
      const [id, count] = entries[i];
      this.add.text(30, startY + i * 28, `${id}: ${count}개`, {
        fontSize: '13px', color: '#ffffff',
      });
    }
  }

  /** 장비 장착 대상 장수 선택 */
  private showEquipTarget(bag: string[], bagIdx: number, itemId: string): void {
    this.children.removeAll();
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    const itemDef = EQUIPMENT_DEFS[itemId];
    this.add.text(GW / 2, 20, `${itemDef?.name ?? itemId} 장착`, {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    const backBtn = this.add.text(20, 15, '← 뒤로', {
      fontSize: '14px', color: '#aaaaaa', backgroundColor: '#1a1a3a', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showInventory('equipment'));

    this.add.text(GW / 2, 50, '장착할 장수를 선택하세요', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const units = this.campaignManager.getProgress().playerUnits;
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const y = 75 + i * 50;

      const slotKey = itemDef?.slot === 'weapon' ? 'weapon' : itemDef?.slot === 'armor' ? 'armor' : 'accessory';
      const currentItem = unit.equipment?.[slotKey as 'weapon' | 'armor' | 'accessory'];
      const currentName = currentItem ? EQUIPMENT_DEFS[currentItem]?.name ?? '?' : '없음';

      this.add.text(25, y + 6, `${unit.name} (${slotKey}: ${currentName})`, {
        fontSize: '13px', color: '#ffffff',
      });

      const selectBtn = this.add.text(GW - 70, y + 6, '선택', {
        fontSize: '12px', color: '#ffffff', backgroundColor: '#3366aa', padding: { x: 10, y: 4 },
      }).setInteractive({ useHandCursor: true });
      selectBtn.on('pointerdown', () => {
        // 기존 장비��� 있으면 인벤토리로
        if (unit.equipment?.[slotKey as 'weapon' | 'armor' | 'accessory']) {
          bag.push(unit.equipment[slotKey as 'weapon' | 'armor' | 'accessory']!);
        }
        // 장착
        if (!unit.equipment) unit.equipment = {};
        (unit.equipment as Record<string, string | undefined>)[slotKey] = itemId;
        // 인벤토리에서 제거
        bag.splice(bagIdx, 1);
        this.campaignManager.save();
        this.showInventory('equipment');
      });
    }
  }

  /** 스킬 장착 대상 장수 선택 */
  private showSkillTarget(bag: string[], bagIdx: number, skillId: string): void {
    this.children.removeAll();
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    const skillDef = SKILL_DEFS[skillId];
    this.add.text(GW / 2, 20, `${skillDef?.name ?? skillId} 장착`, {
      fontSize: '20px', color: '#cc88ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const backBtn = this.add.text(20, 15, '← 뒤로', {
      fontSize: '14px', color: '#aaaaaa', backgroundColor: '#1a1a3a', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showInventory('skill'));

    this.add.text(GW / 2, 50, '장착할 장수를 선택하세요', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const units = this.campaignManager.getProgress().playerUnits;
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const y = 75 + i * 50;
      const maxSlots = (unit.level ?? 1) >= 10 ? 2 : 1;
      const currentSkills = unit.equippedSkills ?? [];
      const hasRoom = currentSkills.length < maxSlots;

      const skillNames = currentSkills.map(s => SKILL_DEFS[s]?.name ?? s).join(', ') || '없음';
      this.add.text(25, y + 6, `${unit.name} (${skillNames}) [${currentSkills.length}/${maxSlots}]`, {
        fontSize: '12px', color: hasRoom ? '#ffffff' : '#555555',
      });

      if (hasRoom) {
        const selectBtn = this.add.text(GW - 70, y + 6, '선택', {
          fontSize: '12px', color: '#ffffff', backgroundColor: '#6644aa', padding: { x: 10, y: 4 },
        }).setInteractive({ useHandCursor: true });
        selectBtn.on('pointerdown', () => {
          if (!unit.equippedSkills) unit.equippedSkills = [];
          unit.equippedSkills.push(skillId);
          bag.splice(bagIdx, 1);
          this.campaignManager.save();
          this.showInventory('skill');
        });
      } else {
        this.add.text(GW - 70, y + 6, '가득', {
          fontSize: '12px', color: '#555555',
        });
      }
    }
  }

  // ── 가챠 ──

  private showGacha(): void {
    this.children.removeAll();

    // Dark purple gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x0c1220, 0x0c1220, 1);
    bg.fillRect(0, 0, GW, GH);

    // Gold particle effects
    for (let i = 0; i < 25; i++) {
      const s = this.add.graphics();
      const size = Math.random() * 3 + 1;
      s.fillStyle(0xffd700, Math.random() * 0.4 + 0.1);
      s.fillCircle(Math.random() * GW, Math.random() * GH * 0.5, size);
      this.tweens.add({
        targets: s,
        alpha: { from: 0.4, to: 0.05 },
        y: `-=${30 + Math.random() * 30}`,
        duration: 2000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
      });
    }

    // Top gold accent line
    const topLine = this.add.graphics();
    topLine.fillGradientStyle(0xffd700, 0xffa500, 0xffa500, 0xffd700, 1);
    topLine.fillRect(0, 0, GW, 3);

    // Back button - touch-friendly
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1a1a3a, 0.9).fillRoundedRect(12, 12, 72, 36, 8);
    backBg.lineStyle(1, 0x444466, 0.6).strokeRoundedRect(12, 12, 72, 36, 8);
    const backBtn = this.add.text(48, 30, '← 홈', {
      fontSize: '15px', color: '#99bbdd', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showMainMenu());

    // Title
    this.add.text(GW / 2, 30, '장수 뽑기', {
      fontSize: '28px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Decorative divider under title
    const divider = this.add.graphics();
    divider.fillGradientStyle(0x1a0a2e, 0xffd700, 0xffd700, 0x1a0a2e, 1);
    divider.fillRect(40, 52, GW - 80, 2);

    // Loading state
    const loadingText = this.add.text(GW / 2, GH * 0.45, '로딩 중...', {
      fontSize: '18px', color: '#888888',
    }).setOrigin(0.5);

    getGachaStatus().then(status => {
      loadingText.destroy();
      this.renderGachaUI(status.gems, status.gold, status.pity);
    }).catch(() => {
      loadingText.setText('서버 연결 실패');
      loadingText.setColor('#ff6666');
    });
  }

  private renderGachaUI(gems: number, gold: number, pity: number): void {
    const pad = 16;
    const cardW = GW - pad * 2;

    // ── Currency bar ──
    const currY = 66;
    const currH = 60;
    const currBg = this.add.graphics();
    currBg.fillStyle(0x0e0e22, 0.95).fillRoundedRect(pad, currY, cardW, currH, 10);
    currBg.lineStyle(1, 0x333355, 0.8).strokeRoundedRect(pad, currY, cardW, currH, 10);

    // Gems
    this.add.text(pad + 16, currY + 12, '💎 보석', { fontSize: '12px', color: '#6699cc' });
    this.add.text(pad + 16, currY + 32, gems.toLocaleString(), {
      fontSize: '18px', color: '#88ccff', fontStyle: 'bold',
    });

    // Gold
    this.add.text(GW / 2 - 20, currY + 12, '💰 금화', { fontSize: '12px', color: '#cc9944' });
    this.add.text(GW / 2 - 20, currY + 32, gold.toLocaleString(), {
      fontSize: '18px', color: '#ffd700', fontStyle: 'bold',
    });

    // Pity counter
    const pityLeft = 90 - pity;
    this.add.text(GW - pad - 16, currY + 12, '천장까지', { fontSize: '12px', color: '#777777' }).setOrigin(1, 0);
    this.add.text(GW - pad - 16, currY + 32, `${pityLeft}회`, {
      fontSize: '18px', color: pityLeft <= 20 ? '#ff8844' : '#aaaaaa', fontStyle: 'bold',
    }).setOrigin(1, 0);

    // ── Premium Gacha Section ──
    const premY = 148;

    // Section header
    const premHeaderBg = this.add.graphics();
    premHeaderBg.fillGradientStyle(0x4a2a6a, 0x4a2a6a, 0x1a0a2e, 0x1a0a2e, 0.6);
    premHeaderBg.fillRoundedRect(pad, premY, cardW, 32, { tl: 10, tr: 10, bl: 0, br: 0 });
    this.add.text(pad + 14, premY + 8, '✦ 프리미엄 뽑기', {
      fontSize: '16px', color: '#cc88ff', fontStyle: 'bold',
    });
    this.add.text(GW - pad - 14, premY + 10, 'UR 5% · SSR 20% · SR 75%', {
      fontSize: '12px', color: '#8866aa',
    }).setOrigin(1, 0);

    // Premium pull buttons container
    const premBtnY = premY + 36;
    const btnH = 90;
    const btnGap = 12;
    const btnW = (cardW - btnGap) / 2;

    // Premium 1-pull button
    const prem1Bg = this.add.graphics();
    prem1Bg.fillStyle(0x3d1f5c, 1).fillRoundedRect(pad, premBtnY, btnW, btnH, 10);
    prem1Bg.lineStyle(2, 0x7744aa, 0.8).strokeRoundedRect(pad, premBtnY, btnW, btnH, 10);
    const prem1Zone = this.add.zone(pad + btnW / 2, premBtnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true });
    this.add.text(pad + btnW / 2, premBtnY + 24, '1회 뽑기', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(pad + btnW / 2, premBtnY + 54, '💎 300', {
      fontSize: '20px', color: '#88ccff', fontStyle: 'bold',
    }).setOrigin(0.5);
    prem1Zone.on('pointerdown', () => this.doServerGachaPull('premium', 1));
    prem1Zone.on('pointerover', () => prem1Bg.clear()
      .fillStyle(0x5a2f7c, 1).fillRoundedRect(pad, premBtnY, btnW, btnH, 10)
      .lineStyle(2, 0x9966cc, 1).strokeRoundedRect(pad, premBtnY, btnW, btnH, 10));
    prem1Zone.on('pointerout', () => prem1Bg.clear()
      .fillStyle(0x3d1f5c, 1).fillRoundedRect(pad, premBtnY, btnW, btnH, 10)
      .lineStyle(2, 0x7744aa, 0.8).strokeRoundedRect(pad, premBtnY, btnW, btnH, 10));

    // Premium 10-pull button (highlighted)
    const prem10X = pad + btnW + btnGap;
    const prem10Bg = this.add.graphics();
    prem10Bg.fillStyle(0x6a2a5a, 1).fillRoundedRect(prem10X, premBtnY, btnW, btnH, 10);
    prem10Bg.lineStyle(2, 0xffd700, 0.8).strokeRoundedRect(prem10X, premBtnY, btnW, btnH, 10);
    const prem10Zone = this.add.zone(prem10X + btnW / 2, premBtnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true });

    // "추천!" badge
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0xffaa00, 1).fillRoundedRect(prem10X + btnW - 52, premBtnY - 6, 48, 20, 6);
    this.add.text(prem10X + btnW - 28, premBtnY + 4, '추천!', {
      fontSize: '11px', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(prem10X + btnW / 2, premBtnY + 24, '10연차', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(prem10X + btnW / 2, premBtnY + 54, '💎 2,700', {
      fontSize: '20px', color: '#ffcc44', fontStyle: 'bold',
    }).setOrigin(0.5);
    prem10Zone.on('pointerdown', () => this.doServerGachaPull('premium', 10));
    prem10Zone.on('pointerover', () => prem10Bg.clear()
      .fillStyle(0x8a3a7a, 1).fillRoundedRect(prem10X, premBtnY, btnW, btnH, 10)
      .lineStyle(2, 0xffee44, 1).strokeRoundedRect(prem10X, premBtnY, btnW, btnH, 10));
    prem10Zone.on('pointerout', () => prem10Bg.clear()
      .fillStyle(0x6a2a5a, 1).fillRoundedRect(prem10X, premBtnY, btnW, btnH, 10)
      .lineStyle(2, 0xffd700, 0.8).strokeRoundedRect(prem10X, premBtnY, btnW, btnH, 10));

    // ── Normal Gacha Section ──
    const normY = premBtnY + btnH + 20;

    // Section header
    const normHeaderBg = this.add.graphics();
    normHeaderBg.fillGradientStyle(0x2a4a2a, 0x2a4a2a, 0x0c1220, 0x0c1220, 0.6);
    normHeaderBg.fillRoundedRect(pad, normY, cardW, 32, { tl: 10, tr: 10, bl: 0, br: 0 });
    this.add.text(pad + 14, normY + 8, '일반 뽑기', {
      fontSize: '16px', color: '#66cc66', fontStyle: 'bold',
    });
    this.add.text(GW - pad - 14, normY + 10, 'R 60% · SR 30% · SSR 10%', {
      fontSize: '12px', color: '#558855',
    }).setOrigin(1, 0);

    // Normal pull buttons
    const normBtnY = normY + 36;
    const normBtnH = 80;

    // Normal 1-pull
    const norm1Bg = this.add.graphics();
    norm1Bg.fillStyle(0x1e3a1e, 1).fillRoundedRect(pad, normBtnY, btnW, normBtnH, 10);
    norm1Bg.lineStyle(2, 0x44884a, 0.8).strokeRoundedRect(pad, normBtnY, btnW, normBtnH, 10);
    const norm1Zone = this.add.zone(pad + btnW / 2, normBtnY + normBtnH / 2, btnW, normBtnH)
      .setInteractive({ useHandCursor: true });
    this.add.text(pad + btnW / 2, normBtnY + 20, '1회 뽑기', {
      fontSize: '16px', color: '#ccddcc', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(pad + btnW / 2, normBtnY + 48, '💰 10,000', {
      fontSize: '17px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    norm1Zone.on('pointerdown', () => this.doServerGachaPull('normal', 1));
    norm1Zone.on('pointerover', () => norm1Bg.clear()
      .fillStyle(0x2e5a2e, 1).fillRoundedRect(pad, normBtnY, btnW, normBtnH, 10)
      .lineStyle(2, 0x66aa6a, 1).strokeRoundedRect(pad, normBtnY, btnW, normBtnH, 10));
    norm1Zone.on('pointerout', () => norm1Bg.clear()
      .fillStyle(0x1e3a1e, 1).fillRoundedRect(pad, normBtnY, btnW, normBtnH, 10)
      .lineStyle(2, 0x44884a, 0.8).strokeRoundedRect(pad, normBtnY, btnW, normBtnH, 10));

    // Normal 10-pull
    const norm10X = pad + btnW + btnGap;
    const norm10Bg = this.add.graphics();
    norm10Bg.fillStyle(0x1e3a1e, 1).fillRoundedRect(norm10X, normBtnY, btnW, normBtnH, 10);
    norm10Bg.lineStyle(2, 0x44884a, 0.8).strokeRoundedRect(norm10X, normBtnY, btnW, normBtnH, 10);
    const norm10Zone = this.add.zone(norm10X + btnW / 2, normBtnY + normBtnH / 2, btnW, normBtnH)
      .setInteractive({ useHandCursor: true });
    this.add.text(norm10X + btnW / 2, normBtnY + 20, '10연차', {
      fontSize: '16px', color: '#ccddcc', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(norm10X + btnW / 2, normBtnY + 48, '💰 100,000', {
      fontSize: '17px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    norm10Zone.on('pointerdown', () => this.doServerGachaPull('normal', 10));
    norm10Zone.on('pointerover', () => norm10Bg.clear()
      .fillStyle(0x2e5a2e, 1).fillRoundedRect(norm10X, normBtnY, btnW, normBtnH, 10)
      .lineStyle(2, 0x66aa6a, 1).strokeRoundedRect(norm10X, normBtnY, btnW, normBtnH, 10));
    norm10Zone.on('pointerout', () => norm10Bg.clear()
      .fillStyle(0x1e3a1e, 1).fillRoundedRect(norm10X, normBtnY, btnW, normBtnH, 10)
      .lineStyle(2, 0x44884a, 0.8).strokeRoundedRect(norm10X, normBtnY, btnW, normBtnH, 10));

    // ── Pool info button (full width) ──
    const poolBtnY = normBtnY + normBtnH + 20;
    const poolBtnH = 44;
    const poolBtnBg = this.add.graphics();
    poolBtnBg.fillStyle(0x1a1a3a, 1).fillRoundedRect(pad, poolBtnY, cardW, poolBtnH, 10);
    poolBtnBg.lineStyle(1, 0x444466, 0.6).strokeRoundedRect(pad, poolBtnY, cardW, poolBtnH, 10);
    const poolBtnZone = this.add.zone(GW / 2, poolBtnY + poolBtnH / 2, cardW, poolBtnH)
      .setInteractive({ useHandCursor: true });
    this.add.text(GW / 2, poolBtnY + poolBtnH / 2, '확률 / 장수 목록 보기', {
      fontSize: '16px', color: '#aaaacc',
    }).setOrigin(0.5);
    poolBtnZone.on('pointerdown', () => this.showGachaPool());
    poolBtnZone.on('pointerover', () => poolBtnBg.clear()
      .fillStyle(0x2a2a5a, 1).fillRoundedRect(pad, poolBtnY, cardW, poolBtnH, 10)
      .lineStyle(1, 0x6666aa, 0.8).strokeRoundedRect(pad, poolBtnY, cardW, poolBtnH, 10));
    poolBtnZone.on('pointerout', () => poolBtnBg.clear()
      .fillStyle(0x1a1a3a, 1).fillRoundedRect(pad, poolBtnY, cardW, poolBtnH, 10)
      .lineStyle(1, 0x444466, 0.6).strokeRoundedRect(pad, poolBtnY, cardW, poolBtnH, 10));
  }

  private showGachaPool(): void {
    this.children.removeAll();
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 15, '📋 장수 뽑기 확률', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    const backBtn = this.add.text(20, 10, '← 뒤로', {
      fontSize: '12px', color: '#aaaaaa', backgroundColor: '#1a1a3a', padding: { x: 6, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showGacha());

    // 확률 표
    this.add.text(GW / 2, 42, '── 프리미엄 뽑기 (보석) ──', {
      fontSize: '11px', color: '#cc88ff',
    }).setOrigin(0.5);
    this.add.text(GW / 2, 58, 'UR: 5%  |  SSR: 20%  |  SR: 75%  |  천장: 90회', {
      fontSize: '10px', color: '#888888',
    }).setOrigin(0.5);
    this.add.text(GW / 2, 74, '── 일반 뽑기 (금화) ──', {
      fontSize: '11px', color: '#44aa44',
    }).setOrigin(0.5);
    this.add.text(GW / 2, 90, 'R: 60%  |  SR: 30%  |  SSR: 10%  (UR 불가)', {
      fontSize: '10px', color: '#888888',
    }).setOrigin(0.5);

    // 장수 목록
    const pool = GACHA_HERO_POOL;

    const grades = ['UR', 'SSR', 'SR', 'R'];
    let y = 110;

    for (const grade of grades) {
      const heroes = pool.filter(h => h.grade === grade);
      if (heroes.length === 0) continue;

      const gradeColor = getGradeColor(grade as HeroGrade);
      this.add.text(15, y, `── ${grade} (${heroes.length}종) ──`, {
        fontSize: '12px', color: gradeColor, fontStyle: 'bold',
      });
      y += 18;

      for (const hero of heroes) {
        const cls = hero.unitClass ? (UNIT_CLASS_DEFS[hero.unitClass as UnitClass]?.name ?? '') : '';
        const skillName = hero.uniqueSkill ? (SKILL_DEFS[hero.uniqueSkill]?.name ?? '') : '';

        this.add.text(20, y, `[${grade}]`, { fontSize: '9px', color: gradeColor, fontStyle: 'bold' });
        this.add.text(45, y, hero.name, { fontSize: '11px', color: '#ffffff' });
        this.add.text(110, y, cls, { fontSize: '9px', color: '#888888' });
        if (skillName) {
          this.add.text(160, y, `✨${skillName}`, { fontSize: '9px', color: '#cc88ff' });
        }
        y += 16;
      }
      y += 5;
    }
  }

  private doServerGachaPull(type: 'normal' | 'premium', count: 1 | 10): void {
    const loadingText = this.add.text(GW / 2, GH * 0.65, '뽑기 중...', {
      fontSize: '14px', color: '#ffaa00',
    }).setOrigin(0.5);

    gachaPull(type, count).then(result => {
      loadingText.destroy();
      // 세이브 리로드 (서버에서 장수가 추가됨)
      this.campaignManager.loadFromServer().then(() => {
        this.showGachaResults(result);
      });
    }).catch((err: Error) => {
      loadingText.setText(err.message || '뽑기 실패');
      this.time.delayedCall(2000, () => loadingText.destroy());
    });
  }

  private showGachaResults(result: GachaPullResult): void {
    this.children.removeAll();
    this.add.graphics().fillStyle(0x0a0a1a, 1).fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 20, '🎊 뽑기 결과', {
      fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    const results = result.results;
    const startY = 55;
    const cardH = results.length > 5 ? 40 : 55;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const y = startY + i * cardH;
      const gradeColor = getGradeColor(r.grade as HeroGrade);

      const bg = this.add.graphics();
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(gradeColor).color, 0.15);
      bg.fillRoundedRect(20, y, GW - 40, cardH - 4, 4);
      bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(gradeColor).color, 0.5);
      bg.strokeRoundedRect(20, y, GW - 40, cardH - 4, 4);

      this.add.text(30, y + 6, `[${r.grade}]`, {
        fontSize: '14px', color: gradeColor, fontStyle: 'bold',
      });
      this.add.text(75, y + 6, r.name, {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      });

      if (r.isNew) {
        this.add.text(GW - 70, y + 10, 'NEW!', {
          fontSize: '14px', color: '#ffaa00', fontStyle: 'bold',
        });
      } else {
        this.add.text(GW - 100, y + 10, `조각 +${r.fragments}`, {
          fontSize: '12px', color: '#888888',
        });
      }
    }

    // UR 연출
    if (results.some(r => r.grade === 'UR')) {
      this.add.text(GW / 2, GH * 0.82, '⭐ UR 장수 획득! ⭐', {
        fontSize: '18px', color: '#ffaa00', fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    // 남은 재화
    this.add.text(GW / 2, GH * 0.88, `💎 ${result.remainingGems}    💰 ${result.remainingGold}    천장: ${90 - result.pity}`, {
      fontSize: '11px', color: '#888888',
    }).setOrigin(0.5);

    const contBtn = this.add.text(GW / 2 - 70, GH - 40, '계속 뽑기', {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#4a2a6a', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    contBtn.on('pointerdown', () => this.showGacha());

    const doneBtn = this.add.text(GW / 2 + 70, GH - 40, '돌아가기', {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#2a2a4a', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    doneBtn.on('pointerdown', () => this.showMainMenu());
  }

  // ── 액션 ──

  private startCampaign(): void {
    this.scene.start('WorldMapScene', { campaignManager: this.campaignManager });
  }

  private startDailyDungeon(): void {
    this.scene.start('DailyDungeonScene', { campaignManager: this.campaignManager });
  }

  private startPvPArena(): void {
    this.scene.start('PvPArenaScene', { campaignManager: this.campaignManager });
  }

  private showSettings(): void {
    const GW = GAME_WIDTH;
    const GH = GAME_HEIGHT;

    // 배경 오버레이
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GW, GH);
    overlay.setDepth(300).setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GW, GH),
      Phaser.Geom.Rectangle.Contains,
    );

    const settingsObjects: Phaser.GameObjects.GameObject[] = [overlay];

    // 패널
    const panelW = 280;
    const panelH = 220;
    const px = (GW - panelW) / 2;
    const py = (GH - panelH) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 1);
    panel.fillRoundedRect(px, py, panelW, panelH, 12);
    panel.lineStyle(2, 0x4444aa, 1);
    panel.strokeRoundedRect(px, py, panelW, panelH, 12);
    panel.setDepth(301);
    settingsObjects.push(panel);

    const title = this.add.text(GW / 2, py + 20, '설정', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(302);
    settingsObjects.push(title);

    const cleanup = () => settingsObjects.forEach(o => o.destroy());

    // 진행도 초기화 버튼
    const resetBtn = this.add.text(GW / 2, py + 70, '🔄 진행도 초기화', {
      fontSize: '15px', color: '#ffffff', backgroundColor: '#aa4444',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }).setDepth(302);
    resetBtn.on('pointerdown', () => {
      this.campaignManager.resetProgress();
      cleanup();
      this.scene.restart({ campaignManager: this.campaignManager });
    });
    settingsObjects.push(resetBtn);

    // 로그아웃 버튼
    const logoutBtn = this.add.text(GW / 2, py + 115, '🚪 로그아웃', {
      fontSize: '15px', color: '#ffffff', backgroundColor: '#4a4a6a',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }).setDepth(302);
    logoutBtn.on('pointerdown', () => {
      cleanup();
      doLogout();
      this.scene.start('TitleScene');
    });
    settingsObjects.push(logoutBtn);

    // 닫기 버튼
    const closeBtn = this.add.text(GW / 2, py + 165, '닫기', {
      fontSize: '14px', color: '#aaaaaa',
      padding: { x: 20, y: 6 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }).setDepth(302);
    closeBtn.on('pointerdown', cleanup);
    settingsObjects.push(closeBtn);
  }
}
