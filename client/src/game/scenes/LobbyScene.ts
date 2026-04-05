import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@shared/constants.ts';
import type { CampaignManager } from '../systems/CampaignManager.ts';
import type { AudioManager } from '../systems/AudioManager.ts';
import type { UnitData } from '@shared/types/index.ts';
import { UnitClass } from '@shared/types/index.ts';
import { logout as doLogout, gachaPull, getGachaStatus, promoteUnit, awakenUnit, enhanceSkill } from '../../api/client.ts';
import type { GachaPullResult } from '../../api/client.ts';
import { getGradeColor, GACHA_HERO_POOL } from '@shared/data/gachaDefs.ts';
import type { HeroGrade } from '@shared/data/gachaDefs.ts';
import { UNIT_CLASS_DEFS } from '@shared/data/unitClassDefs.ts';
import { SKILL_DEFS } from '@shared/data/skillDefs.ts';
import { EQUIPMENT_DEFS, EQUIPMENT_GRADE_COLORS, EQUIPMENT_SELL_PRICE } from '@shared/data/equipmentDefs.ts';
import { DAILY_MISSIONS, ALL_COMPLETE_BONUS, areAllMissionsComplete, LOGIN_BONUS_TABLE } from '@shared/data/dailyMissionDefs.ts';
import { getNextAwakening, AWAKENING_TIERS } from '@shared/data/awakeningDefs.ts';
import { PROMOTION_PATHS } from '@shared/data/promotionDefs.ts';
import { getShopItems, getDailyPurchases } from '@shared/data/shopDefs.ts';
import { getSkillPowerMultiplier, getSkillMpCost, getSkillCooldown, getEnhanceTier, MAX_SKILL_LEVEL } from '@shared/data/skillEnhanceDefs.ts';
import type { ShopItem } from '@shared/data/shopDefs.ts';
import { shopBuy, missionClaim, loginClaim } from '../../api/client.ts';

const GW = GAME_WIDTH;
const GH = GAME_HEIGHT;

export class LobbyScene extends Phaser.Scene {
  private campaignManager!: CampaignManager;
  private shopBuying = false;

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

    // ── 상점 버튼 (풀폭 3열) ──
    const shopY = gridStartY + 2 * (btnH + gap);
    const shopBtnW = GW - 40;
    const shopBtnH = 52;
    {
      const shopBg = this.add.graphics();
      shopBg.fillStyle(0x3a2a1a, 1);
      shopBg.fillRoundedRect(20, shopY, shopBtnW, shopBtnH, 8);
      shopBg.lineStyle(1.5, 0xcc8844, 0.8);
      shopBg.strokeRoundedRect(20, shopY, shopBtnW, shopBtnH, 8);

      this.add.text(20 + 14, shopY + shopBtnH / 2, '🏪', {
        fontSize: '24px',
      }).setOrigin(0, 0.5);

      this.add.text(20 + 50, shopY + shopBtnH / 2, '상점', {
        fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      const shopHit = this.add.rectangle(20 + shopBtnW / 2, shopY + shopBtnH / 2, shopBtnW, shopBtnH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      shopHit.on('pointerdown', () => this.showShop());
      shopHit.on('pointerover', () => shopBg.setAlpha(0.8));
      shopHit.on('pointerout', () => shopBg.setAlpha(1));
    }

    // ── 하단 메뉴 (소형 버튼 5개) ──
    const subY = gridStartY + 2 * (btnH + gap) + shopBtnH + 16;
    const subBtnW = (GW - 66) / 5;
    const subBtnH = 64;

    const subButtons: { label: string; icon: string; action: () => void }[] = [
      { label: '임무', icon: '📋', action: () => this.showDailyMissions() },
      { label: '장수', icon: '👥', action: () => this.showHeroes() },
      { label: '인벤토리', icon: '🎒', action: () => this.showInventory('equipment') },
      { label: '랭킹', icon: '🏆', action: () => this.scene.start('RankingScene') },
      { label: '설정', icon: '⚙️', action: () => this.showSettings() },
    ];

    for (let i = 0; i < subButtons.length; i++) {
      const btn = subButtons[i];
      const x = 14 + i * (subBtnW + 5);

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

  // ── 일일 임무 ──

  private showDailyMissions(tab: 'missions' | 'login' = 'missions'): void {
    this.children.removeAll();

    // 배경 그라데이션
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    bg.fillRect(0, 0, GW, GH);

    // 상단 장식선
    const topLine = this.add.graphics();
    topLine.fillGradientStyle(0xffd700, 0xffa500, 0xffa500, 0xffd700, 1);
    topLine.fillRect(0, 0, GW, 3);

    // 뒤로 버튼
    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showMainMenu());

    // 타이틀
    this.add.text(GW / 2, 24, '📋 일일 임무', {
      fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // ── 탭 ──
    const tabY = 55;
    const tabW = (GW - 32) / 2;
    const tabH = 40;
    const tabs: { label: string; key: 'missions' | 'login' }[] = [
      { label: '일일 임무', key: 'missions' },
      { label: '출석 보너스', key: 'login' },
    ];
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const tx = 16 + i * tabW;
      const isActive = tab === t.key;

      const tabBg = this.add.graphics();
      tabBg.fillStyle(isActive ? 0x1a1a3a : 0x0e0e1e, 1);
      tabBg.fillRect(tx, tabY, tabW, tabH);
      if (isActive) {
        tabBg.fillStyle(0xffd700, 1);
        tabBg.fillRect(tx, tabY + tabH - 3, tabW, 3);
      }

      this.add.text(tx + tabW / 2, tabY + tabH / 2 - 2, t.label, {
        fontSize: '14px', color: isActive ? '#ffd700' : '#666666', fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);

      const hit = this.add.rectangle(tx + tabW / 2, tabY + tabH / 2, tabW, tabH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.showDailyMissions(t.key));
    }

    // ── 탭 콘텐츠 ──
    if (tab === 'missions') {
      this.renderMissionsTab();
    } else {
      this.renderLoginBonusTab();
    }
  }

  private renderMissionsTab(): void {
    const missionState = this.campaignManager.getDailyMissions();
    const progress = this.campaignManager.getProgress();
    const contentY = 100;
    const cardW = GW - 32;
    const cardH = 72;
    const cardGap = 6;

    for (let i = 0; i < DAILY_MISSIONS.length; i++) {
      const def = DAILY_MISSIONS[i];
      const mp = missionState.missions[def.id];
      const current = mp?.current ?? 0;
      const claimed = mp?.claimed ?? false;
      const completed = current >= def.target;
      const y = contentY + i * (cardH + cardGap);

      // 카드 배경
      const card = this.add.graphics();
      card.fillStyle(claimed ? 0x111122 : 0x141428, 1);
      card.fillRoundedRect(16, y, cardW, cardH, 8);
      card.lineStyle(1, completed && !claimed ? 0x44aa44 : 0x2a2a44, 0.6);
      card.strokeRoundedRect(16, y, cardW, cardH, 8);

      // 아이콘
      this.add.text(30, y + 12, def.icon, { fontSize: '24px' });

      // 이름 + 설명
      this.add.text(62, y + 10, def.name, {
        fontSize: '16px', color: claimed ? '#555555' : '#ffffff', fontStyle: 'bold',
      });
      this.add.text(62, y + 30, def.description, {
        fontSize: '12px', color: claimed ? '#444444' : '#888888',
      });

      // 보상 표시
      this.add.text(62, y + 50, `💰 ${def.reward.gold}`, {
        fontSize: '11px', color: claimed ? '#444444' : '#ffd700',
      });

      // 진행도 텍스트
      const progressText = `${Math.min(current, def.target)}/${def.target}`;
      this.add.text(GW - 100, y + 10, progressText, {
        fontSize: '16px', color: completed ? '#44ff44' : '#aaaaaa',
      });

      // 진행 바
      const barX = GW - 110;
      const barY2 = y + 32;
      const barW = 80;
      const barH2 = 8;
      const barBg = this.add.graphics();
      barBg.fillStyle(0x222233, 1).fillRoundedRect(barX, barY2, barW, barH2, 4);
      const fillW = Math.min(current / def.target, 1) * barW;
      if (fillW > 0) {
        barBg.fillStyle(completed ? 0x44aa44 : 0x4466aa, 1).fillRoundedRect(barX, barY2, fillW, barH2, 4);
      }

      // 수령 버튼 또는 완료 텍스트
      if (completed && !claimed) {
        const claimBg = this.add.graphics();
        claimBg.fillStyle(0x228833, 1).fillRoundedRect(GW - 82, y + 44, 50, 24, 5);
        this.add.text(GW - 57, y + 56, '수령', {
          fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
        const claimHit = this.add.rectangle(GW - 57, y + 56, 50, 24, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        claimHit.on('pointerdown', () => {
          mp.claimed = true;
          progress.gold += def.reward.gold; // optimistic UI update
          missionClaim(def.id).then((res) => {
            progress.gold = res.gold; // 서버 권위적 값으로 동기화
          }).catch(() => {}); // 서버 실패 시 optimistic 유지
          this.campaignManager.save();
          this.showDailyMissions('missions');
        });
      } else if (claimed) {
        this.add.text(GW - 70, y + 52, '완료 ✓', {
          fontSize: '12px', color: '#555555',
        });
      }
    }

    // ── 전체 완료 보너스 ──
    const bonusY = contentY + DAILY_MISSIONS.length * (cardH + cardGap) + 10;
    const allComplete = areAllMissionsComplete(missionState);
    const allClaimed = DAILY_MISSIONS.every(def => missionState.missions[def.id]?.claimed);
    const bonusTaken = missionState.allClaimedBonusTaken;

    const bonusCard = this.add.graphics();
    bonusCard.fillStyle(bonusTaken ? 0x111122 : 0x1a1a3a, 1);
    bonusCard.fillRoundedRect(16, bonusY, cardW, 60, 8);
    bonusCard.lineStyle(1.5, allComplete && allClaimed && !bonusTaken ? 0xffd700 : 0x333355, 0.6);
    bonusCard.strokeRoundedRect(16, bonusY, cardW, 60, 8);

    this.add.text(30, bonusY + 10, '🏆 전체 완료 보너스', {
      fontSize: '16px', color: bonusTaken ? '#555555' : '#ffd700', fontStyle: 'bold',
    });
    this.add.text(30, bonusY + 34, `💰 ${ALL_COMPLETE_BONUS.gold}  +  💎 ${ALL_COMPLETE_BONUS.gems}`, {
      fontSize: '14px', color: bonusTaken ? '#444444' : '#ffffff',
    });

    if (allComplete && allClaimed && !bonusTaken) {
      const bonusClaimBg = this.add.graphics();
      bonusClaimBg.fillStyle(0xaa6600, 1).fillRoundedRect(GW - 130, bonusY + 14, 100, 32, 6);
      this.add.text(GW - 80, bonusY + 30, '전체 보상 수령', {
        fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      const bonusHit = this.add.rectangle(GW - 80, bonusY + 30, 100, 32, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      bonusHit.on('pointerdown', () => {
        missionState.allClaimedBonusTaken = true;
        progress.gold += ALL_COMPLETE_BONUS.gold; // optimistic UI update
        missionClaim(undefined, 'all_bonus').then((res) => {
          progress.gold = res.gold; // 서버 권위적 값으로 동기화
        }).catch(() => {}); // 서버 실패 시 optimistic 유지
        this.campaignManager.save();
        this.showDailyMissions('missions');
      });
    } else if (bonusTaken) {
      this.add.text(GW - 80, bonusY + 30, '수령 완료 ✓', {
        fontSize: '12px', color: '#555555',
      }).setOrigin(0.5);
    }
  }

  private renderLoginBonusTab(): void {
    const loginState = this.campaignManager.getLoginBonus();
    const progress = this.campaignManager.getProgress();
    const contentY = 100;
    const cardW = (GW - 42) / 2;
    const cardH = 90;
    const gap = 10;

    for (let i = 0; i < LOGIN_BONUS_TABLE.length; i++) {
      const def = LOGIN_BONUS_TABLE[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 16 + col * (cardW + gap);
      const y = contentY + row * (cardH + gap);

      const isClaimed = loginState.claimedDays.includes(def.day);
      const isCurrentDay = def.day === loginState.consecutiveDays;
      const canClaim = isCurrentDay && !isClaimed;
      const isFuture = def.day > loginState.consecutiveDays;

      // 카드 배경
      const card = this.add.graphics();
      if (canClaim) {
        card.fillStyle(0x2a3a2a, 1);
        card.fillRoundedRect(x, y, cardW, cardH, 8);
        card.lineStyle(2, 0xffd700, 0.8);
        card.strokeRoundedRect(x, y, cardW, cardH, 8);
      } else if (isClaimed) {
        card.fillStyle(0x111122, 0.8);
        card.fillRoundedRect(x, y, cardW, cardH, 8);
        card.lineStyle(1, 0x333355, 0.4);
        card.strokeRoundedRect(x, y, cardW, cardH, 8);
      } else {
        card.fillStyle(0x141428, 0.6);
        card.fillRoundedRect(x, y, cardW, cardH, 8);
        card.lineStyle(1, 0x222244, 0.4);
        card.strokeRoundedRect(x, y, cardW, cardH, 8);
      }

      // Day 표시
      this.add.text(x + cardW / 2, y + 12, `Day ${def.day}`, {
        fontSize: '14px', color: canClaim ? '#ffd700' : isClaimed ? '#555555' : isFuture ? '#444444' : '#888888',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // 보상 내용
      const rewards: string[] = [];
      if (def.gold > 0) rewards.push(`💰 ${def.gold}`);
      if (def.gems > 0) rewards.push(`💎 ${def.gems}`);
      this.add.text(x + cardW / 2, y + 34, rewards.join('  '), {
        fontSize: '13px', color: isClaimed ? '#444444' : isFuture ? '#555555' : '#ffffff',
      }).setOrigin(0.5);

      // 상태 표시
      if (canClaim) {
        const claimBg = this.add.graphics();
        claimBg.fillStyle(0x228833, 1).fillRoundedRect(x + cardW / 2 - 30, y + 54, 60, 28, 5);
        this.add.text(x + cardW / 2, y + 68, '수령', {
          fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
        const claimHit = this.add.rectangle(x + cardW / 2, y + 68, 60, 28, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        claimHit.on('pointerdown', () => {
          loginState.claimedDays.push(def.day);
          if (def.gold > 0) {
            progress.gold += def.gold; // optimistic UI update
          }
          loginClaim(def.day).then((res) => {
            progress.gold = res.gold; // 서버 권위적 값으로 동기화 (금화+보석 모두 서버 처리)
          }).catch(() => {}); // 서버 실패 시 optimistic 유지
          this.campaignManager.save();
          this.showDailyMissions('login');
        });
      } else if (isClaimed) {
        this.add.text(x + cardW / 2, y + 66, '✓ 수령완료', {
          fontSize: '12px', color: '#555555',
        }).setOrigin(0.5);
      } else if (isFuture) {
        this.add.text(x + cardW / 2, y + 66, '🔒 잠금', {
          fontSize: '12px', color: '#444444',
        }).setOrigin(0.5);
      }
    }

    // 보석 안내 문구
    const noteY = contentY + Math.ceil(LOGIN_BONUS_TABLE.length / 2) * (cardH + gap) + 10;
    this.add.text(GW / 2, noteY, '💎 보석은 서버에서 지급됩니다', {
      fontSize: '11px', color: '#666666',
    }).setOrigin(0.5);
  }

  // ── 장수 관리 ──

  private showHeroes(): void {
    this.children.removeAll();
    this.campaignManager.incrementMission('heroes_1');

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    bg.fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 18, '👥 장수 관리', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // 뒤로 버튼
    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showMainMenu());

    const units = this.campaignManager.getProgress().playerUnits;
    this.add.text(GW / 2, 40, `보유 장수: ${units.length}명`, {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);

    // 아이콘 그리드 레이아웃
    const cols = 3;
    const pad = 14;
    const gap = 10;
    const cellW = (GW - pad * 2 - (cols - 1) * gap) / cols;
    const cellH = cellW + 36;
    const startY = 58;
    const clsIcons: Record<string, string> = {
      cavalry: '🐎', infantry: '🛡️', archer: '🏹',
      strategist: '📜', martial_artist: '👊', bandit: '🗡️',
    };

    // 스크롤 컨테이너
    const container = this.add.container(0, 0);
    const scrollableH = GH - startY - 10;
    const totalH = Math.ceil(units.length / cols) * (cellH + gap);

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cellW + gap);
      const y = startY + row * (cellH + gap);
      const grade = unit.grade ?? 'N';
      const gradeColorHex = getGradeColor(grade as HeroGrade);
      const gradeColorNum = Phaser.Display.Color.HexStringToColor(gradeColorHex).color;

      // 카드 배경 + 등급 테두리
      const card = this.add.graphics();
      card.fillStyle(0x141428, 1).fillRoundedRect(x, y, cellW, cellH, 8);
      card.lineStyle(2, gradeColorNum, 0.8).strokeRoundedRect(x, y, cellW, cellH, 8);
      container.add(card);

      // 병종 아이콘 (중앙 크게)
      const cls = unit.unitClass ?? 'infantry';
      const iconText = this.add.text(x + cellW / 2, y + cellW * 0.30, clsIcons[cls] ?? '⚔️', {
        fontSize: '34px',
      }).setOrigin(0.5);
      container.add(iconText);

      // 등급 배지 (좌상단)
      const gradeBadge = this.add.text(x + 6, y + 4, grade, {
        fontSize: '13px', color: gradeColorHex, fontStyle: 'bold',
      });
      container.add(gradeBadge);

      // Lv (우상단)
      const lvText = this.add.text(x + cellW - 6, y + 4, `Lv.${unit.level ?? 1}`, {
        fontSize: '12px', color: '#88aacc',
      }).setOrigin(1, 0);
      container.add(lvText);

      // 이름 (하단)
      const nameText = this.add.text(x + cellW / 2, y + cellW * 0.62, unit.name, {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(nameText);

      // 병종명 (이름 아래)
      const className = unit.promotionClass ?? UNIT_CLASS_DEFS[unit.unitClass ?? 'infantry']?.name ?? '';
      const classText = this.add.text(x + cellW / 2, y + cellW * 0.62 + 18, className, {
        fontSize: '11px', color: '#666688',
      }).setOrigin(0.5);
      container.add(classText);

      // 터치 영역
      const hit = this.add.rectangle(x + cellW / 2, y + cellH / 2, cellW, cellH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.showHeroDetail(unit));
      container.add(hit);
    }

    // 스크롤 처리
    if (totalH > scrollableH) {
      const mask = this.add.graphics();
      mask.fillRect(0, startY, GW, scrollableH);
      container.setMask(new Phaser.Display.Masks.GeometryMask(this, mask));

      let scrollY = 0;
      const maxScroll = totalH - scrollableH;
      this.input.on('wheel', (_p: unknown, _gx: unknown, _gy: unknown, _gz: unknown, dy: number) => {
        scrollY = Phaser.Math.Clamp(scrollY + dy * 0.5, 0, maxScroll);
        container.y = -scrollY;
      });

      let dragStartY = 0;
      let dragScrollY = 0;
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.y >= startY) { dragStartY = p.y; dragScrollY = scrollY; }
      });
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (p.isDown && p.y >= startY) {
          scrollY = Phaser.Math.Clamp(dragScrollY + (dragStartY - p.y), 0, maxScroll);
          container.y = -scrollY;
        }
      });
    }
  }

  // ── 장수 상세 정보 ──

  private showHeroDetail(unit: UnitData): void {
    this.children.removeAll();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    bg.fillRect(0, 0, GW, GH);

    // 뒤로 버튼
    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
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
    this.add.text(GW - 38, 92, `${exp}/100`, { fontSize: '12px', color: '#8888aa' });

    // 스탯 카드 — 전체 12개 스탯
    const statBg = this.add.graphics();
    statBg.fillStyle(0x141428, 1).fillRoundedRect(15, 108, GW - 30, 100, 6);

    const statData = [
      { label: 'HP', value: unit.stats.maxHp, color: '#44ff44' },
      { label: '공격', value: unit.stats.attack, color: '#ff6644' },
      { label: '방어', value: unit.stats.defense, color: '#4488ff' },
      { label: '정신', value: unit.stats.spirit ?? 0, color: '#cc88ff' },
      { label: '속도', value: unit.stats.speed, color: '#88ccff' },
      { label: '이동', value: unit.stats.moveRange, color: '#88ff88' },
      { label: '사거리', value: unit.stats.attackRange, color: '#ffcc44' },
      { label: '민첩', value: unit.stats.agility ?? 0, color: '#44ccaa' },
      { label: '순발', value: unit.stats.critical ?? 0, color: '#ffaa44' },
      { label: '사기', value: unit.stats.morale ?? 0, color: '#ff8888' },
      { label: '관통', value: `${unit.stats.penetration ?? 0}%`, color: '#ff8844' },
      { label: '저항', value: `${unit.stats.resist ?? 0}%`, color: '#8888ff' },
    ];

    for (let i = 0; i < statData.length; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 28 + col * ((GW - 56) / 4);
      const y = 118 + row * 30;
      this.add.text(x, y, statData[i].label, { fontSize: '12px', color: '#888888' });
      this.add.text(x, y + 12, `${statData[i].value}`, {
        fontSize: '12px', color: statData[i].color, fontStyle: 'bold',
      });
    }

    // 스킬 섹션
    const skillY = 220;
    const skillBg = this.add.graphics();
    skillBg.fillStyle(0x141428, 1).fillRoundedRect(15, skillY, GW - 30, 20, 4);
    this.add.text(25, skillY + 4, '✨ 스킬', {
      fontSize: '11px', color: '#cc88ff', fontStyle: 'bold',
    });

    let skillRow = 0;
    const skillMaterials = this.campaignManager.getProgress().materialBag ?? {};
    const skillGold = this.campaignManager.getProgress().gold ?? 0;

    // 스킬 강화 버튼 헬퍼
    const addEnhanceButton = (skillId: string, yPos: number) => {
      const level = unit.equippedSkillLevels?.[skillId] ?? 1;
      const skillDef = SKILL_DEFS[skillId];
      if (!skillDef) return;

      // 레벨 표시
      const lvColor = level >= MAX_SKILL_LEVEL ? '#ffd700' : '#88ccff';
      this.add.text(GW - 120, yPos, `Lv.${level}`, {
        fontSize: '11px', color: lvColor, fontStyle: 'bold',
      });

      // 강화 효과 미리보기
      const pwr = Math.round((getSkillPowerMultiplier(level) - 1) * 100);
      const mpReduction = skillDef.mpCost - getSkillMpCost(skillDef.mpCost, level);
      const cdReduction = skillDef.cooldown - getSkillCooldown(skillDef.cooldown, level);
      const previewParts: string[] = [];
      if (pwr > 0) previewParts.push(`+${pwr}%`);
      if (mpReduction > 0) previewParts.push(`MP-${mpReduction}`);
      if (cdReduction > 0) previewParts.push(`CD-${cdReduction}`);
      if (previewParts.length > 0) {
        this.add.text(30, yPos + 14, previewParts.join(' '), {
          fontSize: '9px', color: '#66aa88',
        });
      }

      // 강화 버튼
      if (level < MAX_SKILL_LEVEL) {
        const tier = getEnhanceTier(level);
        if (tier) {
          const hasItem = (skillMaterials[tier.requiredItem] ?? 0) >= 1;
          const hasGold = skillGold >= tier.goldCost;
          const canEnhance = hasItem && hasGold;
          const btnColor = canEnhance ? '#44cc88' : '#555555';
          const btnBgColor = canEnhance ? '#1a3a2a' : '#1a1a2a';
          const enhBtn = this.add.text(GW - 70, yPos, '강화', {
            fontSize: '10px', color: btnColor, backgroundColor: btnBgColor,
            padding: { x: 8, y: 3 },
          }).setInteractive({ useHandCursor: canEnhance });

          if (canEnhance) {
            enhBtn.on('pointerdown', async () => {
              try {
                const result = await enhanceSkill(unit.id, skillId);
                if (result.success) {
                  await this.campaignManager.loadFromServer();
                  const updated = this.campaignManager.getProgress().playerUnits?.find(u => u.id === unit.id);
                  if (updated) this.showHeroDetail(updated);
                  else this.showHeroDetail(unit);
                }
              } catch (e: unknown) {
                console.error('스킬 강화 실패:', e);
              }
            });
          }
        }
      }
    };

    // 고유 스킬
    if (unit.uniqueSkill) {
      const skill = SKILL_DEFS[unit.uniqueSkill];
      if (skill) {
        const uniqueLevel = unit.equippedSkillLevels?.[unit.uniqueSkill] ?? 1;
        const uniqueMp = getSkillMpCost(skill.mpCost, uniqueLevel);
        this.add.text(30, skillY + 22 + skillRow * 38, `★ ${skill.name}`, {
          fontSize: '13px', color: '#ffaa44', fontStyle: 'bold',
        });
        this.add.text(30, skillY + 38 + skillRow * 38, `${skill.description}  (MP${uniqueMp})`, {
          fontSize: '10px', color: '#999999', wordWrap: { width: GW - 130 },
        });
        addEnhanceButton(unit.uniqueSkill, skillY + 22 + skillRow * 38);
        skillRow++;
      }
    }

    // 장착 스킬
    const equipped = unit.equippedSkills ?? [];
    for (let si = 0; si < equipped.length; si++) {
      const skill = SKILL_DEFS[equipped[si]];
      if (!skill) continue;
      const eqLevel = unit.equippedSkillLevels?.[equipped[si]] ?? 1;
      const eqMp = getSkillMpCost(skill.mpCost, eqLevel);
      this.add.text(30, skillY + 22 + skillRow * 32, `◆ ${skill.name} (MP${eqMp})`, {
        fontSize: '12px', color: '#88ccff',
      });
      addEnhanceButton(equipped[si], skillY + 22 + skillRow * 32);
      // 해제 버튼 (moved left to make room for enhance)
      const removeSkillBtn = this.add.text(GW - 120, skillY + 34 + skillRow * 32, '해제', {
        fontSize: '9px', color: '#ff6666', backgroundColor: '#2a1a1a', padding: { x: 4, y: 1 },
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
    const baseSlots = (unit.level ?? 1) >= 10 ? 2 : 1;
    const awakeningSlots = (unit.awakeningLevel ?? 0) >= 1 ? 1 : 0;
    const maxSlots = Math.min(4, baseSlots + awakeningSlots);
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
          fontSize: '12px', color: '#88aa88',
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

    // 승급 섹션
    const promoY = equipY + 22 + slots.length * 24 + 15;
    const promoLevel = unit.promotionLevel ?? 0;
    const paths = unit.unitClass ? PROMOTION_PATHS[unit.unitClass] : undefined;
    const maxPromo = paths?.length ?? 0;
    const nextPromoDef = paths && promoLevel < maxPromo ? paths[promoLevel] : null;
    const levelMet = nextPromoDef ? (unit.level ?? 1) >= nextPromoDef.requiredLevel : false;
    const materials = this.campaignManager.getProgress().materialBag ?? {};
    const itemCount = nextPromoDef ? (materials[nextPromoDef.requiredItem] ?? 0) : 0;
    const itemMet = itemCount >= 1;
    const promoReady = nextPromoDef !== null && levelMet && itemMet;

    const promoBgCard = this.add.graphics();
    promoBgCard.fillStyle(0x141428, 1).fillRoundedRect(15, promoY, GW - 30, 20, 4);
    this.add.text(25, promoY + 4, '⬆️ 승급', {
      fontSize: '11px', color: '#ffd700', fontStyle: 'bold',
    });

    const currentClassName = unit.promotionClass ?? (unit.unitClass ? UNIT_CLASS_DEFS[unit.unitClass]?.name : '') ?? '';
    const promoLabel = promoLevel >= maxPromo
      ? `${promoLevel}차 승급 (최대)`
      : `${promoLevel}차 승급`;
    this.add.text(30, promoY + 24, `${currentClassName} — ${promoLabel}`, {
      fontSize: '12px', color: '#cccccc',
    });

    let promoContentH = 44; // base height for header + current class line

    if (nextPromoDef) {
      // 다음 승급 정보
      const bonusStr = Object.entries(nextPromoDef.statBonus)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => {
          const labels: Record<string, string> = { maxHp: 'HP', attack: '공', defense: '방', speed: '속', maxMp: 'MP' };
          return `${labels[k] ?? k}+${v}`;
        }).join(' ');
      this.add.text(30, promoY + 42, `다음: ${nextPromoDef.toClassName}  ${bonusStr}`, {
        fontSize: '11px', color: '#aaaaaa',
      });

      // 필요 레벨
      this.add.text(30, promoY + 58, `필요 레벨: Lv.${nextPromoDef.requiredLevel}`, {
        fontSize: '11px', color: levelMet ? '#44ff44' : '#ff4444',
      });

      // 필요 아이템
      this.add.text(30, promoY + 74, `${nextPromoDef.requiredItemName}: ${itemCount}/1`, {
        fontSize: '11px', color: itemMet ? '#44ff44' : '#ff4444',
      });

      // 승급 버튼
      const promoBtnY = promoY + 92;
      const promoBtnBg = this.add.graphics();
      if (promoReady) {
        promoBtnBg.fillGradientStyle(0xffd700, 0xffa500, 0xcc6600, 0xffd700, 1);
        promoBtnBg.fillRoundedRect(15, promoBtnY, GW - 30, 44, 8);
      } else {
        promoBtnBg.fillStyle(0x333344, 1).fillRoundedRect(15, promoBtnY, GW - 30, 44, 8);
      }
      this.add.text(GW / 2, promoBtnY + 22, '승급', {
        fontSize: '16px', color: promoReady ? '#ffffff' : '#666666', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);

      if (promoReady) {
        promoBtnBg.setInteractive(
          new Phaser.Geom.Rectangle(15, promoBtnY, GW - 30, 44),
          Phaser.Geom.Rectangle.Contains,
        );
        promoBtnBg.on('pointerdown', async () => {
          try {
            const result = await promoteUnit(unit.id);
            if (result.success) {
              // 서버에서 최신 세이브 로드 후 UI 갱신
              await this.campaignManager.loadFromServer();
              const updated = this.campaignManager.getProgress().playerUnits?.find(u => u.id === unit.id);
              if (updated) this.showHeroDetail(updated);
              else this.showHeroDetail(unit);
            }
          } catch (e: unknown) {
            console.error('승급 실패:', e);
          }
        });
      }

      promoContentH = 92 + 44 + 8; // through button
    } else {
      // 최대 승급 달성
      this.add.text(30, promoY + 42, '최대 승급 달성', {
        fontSize: '12px', color: '#ffd700', fontStyle: 'bold',
      });
      promoContentH = 62;
    }

    // 각성(한계돌파) 섹션
    const awakenY = promoY + promoContentH + 10;
    const awakenLevel = unit.awakeningLevel ?? 0;

    const awakenBgCard = this.add.graphics();
    awakenBgCard.fillStyle(0x141428, 1).fillRoundedRect(15, awakenY, GW - 30, 20, 4);
    this.add.text(25, awakenY + 4, '⭐ 한계돌파', {
      fontSize: '11px', color: '#ffd700', fontStyle: 'bold',
    });

    // 각성 별 표시
    const starsStr = '★'.repeat(awakenLevel) + '☆'.repeat(5 - awakenLevel);
    const starChars = starsStr.split('');
    for (let si = 0; si < starChars.length; si++) {
      const isFilled = si < awakenLevel;
      this.add.text(30 + si * 28, awakenY + 24, starChars[si], {
        fontSize: '20px', color: isFilled ? '#ffd700' : '#555555',
      });
    }

    // 조각 정보 및 프로그레스 바
    const fragments = this.campaignManager.getProgress().heroFragments ?? {};
    const awakeningInfo = getNextAwakening(unit, fragments);
    const fragY = awakenY + 50;

    if (awakeningInfo.nextTier) {
      this.add.text(30, fragY, `조각: ${awakeningInfo.currentFragments}/${awakeningInfo.cost}`, {
        fontSize: '12px', color: '#cccccc',
      });

      // 프로그레스 바
      const barW = GW - 80;
      const barX = 30;
      const barY = fragY + 18;
      const fillRatio = Math.min(1, awakeningInfo.currentFragments / awakeningInfo.cost);
      this.add.graphics().fillStyle(0x222233, 1).fillRoundedRect(barX, barY, barW, 8, 4);
      if (fillRatio > 0) {
        this.add.graphics().fillStyle(awakeningInfo.canDo ? 0xffd700 : 0x886600, 1)
          .fillRoundedRect(barX, barY, barW * fillRatio, 8, 4);
      }

      // 현재 보너스 & 다음 티어 설명
      const descY = barY + 14;
      if (awakenLevel > 0) {
        const currentTier = AWAKENING_TIERS[awakenLevel - 1];
        this.add.text(30, descY, `현재: +${currentTier.statBonusPct}% 스탯`, {
          fontSize: '10px', color: '#88cc88',
        });
      }
      this.add.text(30, awakenLevel > 0 ? fragY + 46 : fragY + 32, `다음: ${awakeningInfo.nextTier.description}`, {
        fontSize: '10px', color: '#aaaaaa',
      });

      // 한계돌파 버튼
      const btnY = awakenLevel > 0 ? fragY + 64 : fragY + 50;
      const btnBg = this.add.graphics();
      if (awakeningInfo.canDo) {
        btnBg.fillStyle(0xcc2200, 1).fillRoundedRect(15, btnY, GW - 30, 48, 8);
        btnBg.fillGradientStyle(0xffd700, 0xffa500, 0xcc6600, 0xffd700, 0.3);
        btnBg.fillRoundedRect(15, btnY, GW - 30, 48, 8);
      } else {
        btnBg.fillStyle(0x333344, 1).fillRoundedRect(15, btnY, GW - 30, 48, 8);
      }
      this.add.text(GW / 2, btnY + 24, '한계돌파', {
        fontSize: '16px', color: awakeningInfo.canDo ? '#ffffff' : '#666666', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);

      if (awakeningInfo.canDo) {
        btnBg.setInteractive(
          new Phaser.Geom.Rectangle(15, btnY, GW - 30, 48),
          Phaser.Geom.Rectangle.Contains,
        );
        btnBg.on('pointerdown', async () => {
          try {
            const result = await awakenUnit(unit.id);
            if (result.success) {
              // 서버에서 최신 세이브 로드 후 UI 갱신
              await this.campaignManager.loadFromServer();
              const updated = this.campaignManager.getProgress().playerUnits?.find(u => u.id === unit.id);
              if (updated) this.showHeroDetail(updated);
              else this.showHeroDetail(unit);
            }
          } catch (e: unknown) {
            console.error('각성 실패:', e);
          }
        });
      }
    } else {
      // 최대 각성 상태
      const maxTier = AWAKENING_TIERS[4];
      this.add.text(30, fragY, `최대 각성 달성! +${maxTier.statBonusPct}% 스탯`, {
        fontSize: '12px', color: '#ffd700', fontStyle: 'bold',
      });
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

    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
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
      tabBg.fillRoundedRect(t.x - tabW / 2, 42, tabW, 40, 5);
      if (isActive) {
        tabBg.lineStyle(1.5, 0x4488cc, 0.8);
        tabBg.strokeRoundedRect(t.x - tabW / 2, 42, tabW, 40, 5);
      }
      this.add.text(t.x, 62, `${t.icon} ${t.label}`, {
        fontSize: '13px', color: isActive ? '#ffffff' : '#666666', fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);
      const hit = this.add.rectangle(t.x, 62, tabW, 40, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.showInventory(t.key));
    }

    const progress = this.campaignManager.getProgress();
    const startY = 92;

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
      const gradeColor = EQUIPMENT_GRADE_COLORS[itemDef.grade] ?? '#ffffff';
      this.add.text(25, y + 6, `${slotLabel} ${itemDef.name}`, {
        fontSize: '14px', color: gradeColor, fontStyle: 'bold',
      });
      const bonus = Object.entries(itemDef.statModifiers).map(([k, v]) => `${k}${(v as number) > 0 ? '+' : ''}${v}`).join('  ');
      this.add.text(25, y + 26, bonus, { fontSize: '10px', color: '#88aa88' });

      // 판매 버튼
      const sellPrice = EQUIPMENT_SELL_PRICE[itemDef.grade] ?? 50;
      const sellBtn = this.add.text(GW - 130, y + 12, `${sellPrice}G`, {
        fontSize: '11px', color: '#ffcc44', backgroundColor: '#3a2a1a', padding: { x: 6, y: 5 },
      }).setInteractive({ useHandCursor: true });
      const sellIdx = i;
      sellBtn.on('pointerdown', () => {
        this.campaignManager.getProgress().gold += sellPrice;
        bag.splice(sellIdx, 1);
        this.campaignManager.save();
        this.showInventory('equipment');
      });

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

  private static readonly MATERIAL_NAMES: Record<string, { name: string; icon: string }> = {
    exp_book_s: { name: '소경험서', icon: '📗' },
    exp_book_m: { name: '중경험서', icon: '📘' },
    exp_book_l: { name: '대경험서', icon: '📙' },
    promotion_seal_1: { name: '하급 인수', icon: '🔖' },
    promotion_seal_2: { name: '상급 인수', icon: '📜' },
    skill_book_basic: { name: '초급 스킬서', icon: '📕' },
    skill_book_mid: { name: '중급 스킬서', icon: '📕' },
    skill_book_high: { name: '고급 스킬서', icon: '📕' },
    awakening_frag: { name: '각성 파편', icon: '💎' },
  };

  private renderMaterialBag(bag: Record<string, number>, startY: number): void {
    const entries = Object.entries(bag).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      this.add.text(GW / 2, startY + 40, '보유 소재가 없습니다', {
        fontSize: '14px', color: '#555555',
      }).setOrigin(0.5);
      return;
    }
    for (let i = 0; i < entries.length; i++) {
      const [id, count] = entries[i];
      const mat = LobbyScene.MATERIAL_NAMES[id];
      const label = mat ? `${mat.icon} ${mat.name}` : id;
      const y = startY + i * 44;

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1a2a1a, 1).fillRoundedRect(15, y, GW - 30, 38, 6);

      this.add.text(25, y + 9, `${label}  x${count}`, {
        fontSize: '14px', color: '#ffffff',
      });
    }
  }

  /** 공통 장수 그리드 렌더링 */
  private renderUnitGrid(
    units: UnitData[],
    startY: number,
    subLabel: (u: UnitData) => string,
    onSelect: (u: UnitData) => void,
    isEnabled?: (u: UnitData) => boolean,
  ): void {
    const cols = 3;
    const pad = 14;
    const gap = 10;
    const cellW = (GW - pad * 2 - (cols - 1) * gap) / cols;
    const cellH = cellW + 36;
    const clsIcons: Record<string, string> = {
      cavalry: '\u{1F40E}', infantry: '\u{1F6E1}\uFE0F', archer: '\u{1F3F9}',
      strategist: '\u{1F4DC}', martial_artist: '\u{1F44A}', bandit: '\u{1F5E1}\uFE0F',
    };

    const container = this.add.container(0, 0);
    const scrollableH = GH - startY - 10;
    const totalH = Math.ceil(units.length / cols) * (cellH + gap);

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cellW + gap);
      const y = startY + row * (cellH + gap);
      const grade = unit.grade ?? 'N';
      const gradeColorHex = getGradeColor(grade as HeroGrade);
      const gradeColorNum = Phaser.Display.Color.HexStringToColor(gradeColorHex).color;
      const enabled = isEnabled ? isEnabled(unit) : true;
      const alpha = enabled ? 1 : 0.4;

      const card = this.add.graphics();
      card.fillStyle(0x141428, alpha).fillRoundedRect(x, y, cellW, cellH, 8);
      card.lineStyle(2, gradeColorNum, enabled ? 0.8 : 0.3).strokeRoundedRect(x, y, cellW, cellH, 8);
      container.add(card);

      const cls = unit.unitClass ?? 'infantry';
      container.add(this.add.text(x + cellW / 2, y + cellW * 0.30, clsIcons[cls] ?? '\u2694\uFE0F', {
        fontSize: '34px',
      }).setOrigin(0.5).setAlpha(alpha));

      container.add(this.add.text(x + 6, y + 4, grade, {
        fontSize: '13px', color: gradeColorHex, fontStyle: 'bold',
      }).setAlpha(alpha));

      container.add(this.add.text(x + cellW / 2, y + cellW * 0.62, unit.name, {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(alpha));

      const sub = subLabel(unit);
      container.add(this.add.text(x + cellW / 2, y + cellW * 0.62 + 18, sub, {
        fontSize: '11px', color: enabled ? '#88aa88' : '#555555',
      }).setOrigin(0.5));

      if (enabled) {
        const hit = this.add.rectangle(x + cellW / 2, y + cellH / 2, cellW, cellH, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => onSelect(unit));
        container.add(hit);
      }
    }

    if (totalH > scrollableH) {
      const mask = this.add.graphics();
      mask.fillRect(0, startY, GW, scrollableH);
      container.setMask(new Phaser.Display.Masks.GeometryMask(this, mask));
      let scrollY = 0;
      const maxScroll = totalH - scrollableH;
      this.input.on('wheel', (_p: unknown, _gx: unknown, _gy: unknown, _gz: unknown, dy: number) => {
        scrollY = Phaser.Math.Clamp(scrollY + dy * 0.5, 0, maxScroll);
        container.y = -scrollY;
      });
      let dragStartY = 0, dragScrollY = 0;
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.y >= startY) { dragStartY = p.y; dragScrollY = scrollY; }
      });
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (p.isDown && p.y >= startY) {
          scrollY = Phaser.Math.Clamp(dragScrollY + (dragStartY - p.y), 0, maxScroll);
          container.y = -scrollY;
        }
      });
    }
  }

  /** 장비 장착 대상 장수 선택 */
  private showEquipTarget(bag: string[], bagIdx: number, itemId: string): void {
    this.children.removeAll();
    const eqBg = this.add.graphics();
    eqBg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    eqBg.fillRect(0, 0, GW, GH);

    const itemDef = EQUIPMENT_DEFS[itemId];
    this.add.text(GW / 2, 20, `${itemDef?.name ?? itemId} 장착`, {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showInventory('equipment'));

    this.add.text(GW / 2, 48, '장착할 장수를 선택하세요', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const units = this.campaignManager.getProgress().playerUnits;
    const slotKey = itemDef?.slot === 'weapon' ? 'weapon' : itemDef?.slot === 'armor' ? 'armor' : 'accessory';
    const canEquipItem = (u: UnitData) => !itemDef?.requiredClasses || (!!u.unitClass && itemDef.requiredClasses.includes(u.unitClass));
    this.renderUnitGrid(units, 65, (unit) => {
      if (!canEquipItem(unit)) return '착용불가';
      const cur = unit.equipment?.[slotKey as 'weapon' | 'armor' | 'accessory'];
      return cur ? EQUIPMENT_DEFS[cur]?.name ?? '?' : '-';
    }, (unit) => {
      if (unit.equipment?.[slotKey as 'weapon' | 'armor' | 'accessory']) {
        bag.push(unit.equipment[slotKey as 'weapon' | 'armor' | 'accessory']!);
      }
      if (!unit.equipment) unit.equipment = {};
      (unit.equipment as Record<string, string | undefined>)[slotKey] = itemId;
      bag.splice(bagIdx, 1);
      this.campaignManager.save();
      this.showInventory('equipment');
    }, canEquipItem);
  }

  /** 스킬 장착 대상 장수 선택 */
  private showSkillTarget(bag: string[], bagIdx: number, skillId: string): void {
    this.children.removeAll();
    const skBg = this.add.graphics();
    skBg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    skBg.fillRect(0, 0, GW, GH);

    const skillDef = SKILL_DEFS[skillId];
    this.add.text(GW / 2, 20, `${skillDef?.name ?? skillId} 장착`, {
      fontSize: '20px', color: '#cc88ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showInventory('skill'));

    this.add.text(GW / 2, 48, '장착할 장수를 선택하세요', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const units = this.campaignManager.getProgress().playerUnits;
    this.renderUnitGrid(units, 65, (unit) => {
      const maxSlots = (unit.level ?? 1) >= 10 ? 2 : 1;
      const cur = unit.equippedSkills ?? [];
      return `${cur.length}/${maxSlots}`;
    }, (unit) => {
      if (!unit.equippedSkills) unit.equippedSkills = [];
      unit.equippedSkills.push(skillId);
      bag.splice(bagIdx, 1);
      this.campaignManager.save();
      this.showInventory('skill');
    }, (unit) => {
      const maxSlots = (unit.level ?? 1) >= 10 ? 2 : 1;
      return (unit.equippedSkills ?? []).length < maxSlots;
    });
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
    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
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
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GACHA] getGachaStatus failed:', msg, err);
      loadingText.setText(`연결 실패: ${msg}`);
      loadingText.setColor('#ff6666');
      loadingText.setFontSize(14);
      loadingText.setWordWrapWidth(350);
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
    const poolBgG = this.add.graphics();
    poolBgG.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    poolBgG.fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 15, '📋 장수 뽑기 확률', {
      fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
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

        this.add.text(20, y, `[${grade}]`, { fontSize: '12px', color: gradeColor, fontStyle: 'bold' });
        this.add.text(45, y, hero.name, { fontSize: '12px', color: '#ffffff' });
        this.add.text(110, y, cls, { fontSize: '12px', color: '#888888' });
        if (skillName) {
          this.add.text(160, y, `✨${skillName}`, { fontSize: '12px', color: '#cc88ff' });
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
      // 세이브 리로드 먼저 (서버에서 장수가 추가됨) → 그 후 미션 증가
      this.campaignManager.loadFromServer().then(() => {
        this.campaignManager.incrementMission('gacha_1');
        this.showGachaResults(result);
      });
    }).catch((err: Error) => {
      loadingText.setText(err.message || '뽑기 실패');
      this.time.delayedCall(2000, () => loadingText.destroy());
    });
  }

  private showGachaResults(result: GachaPullResult): void {
    this.children.removeAll();
    const resBg = this.add.graphics();
    resBg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    resBg.fillRect(0, 0, GW, GH);

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

  // ── 상점 ──

  private shopScrollY = 0;

  private showShop(tab: 'general' | 'premium' | 'daily' = 'general', keepScroll = false): void {
    this.input.removeAllListeners();
    this.children.removeAll();
    if (!keepScroll) this.shopScrollY = 0;
    const progress = this.campaignManager.getProgress();

    // 배경 그라데이션
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0c1220, 0x0c1220, 0x1a1a30, 0x1a1a30, 1);
    bg.fillRect(0, 0, GW, GH);

    // 상단 장식선
    const topLine = this.add.graphics();
    topLine.fillGradientStyle(0xffd700, 0xffa500, 0xffa500, 0xffd700, 1);
    topLine.fillRect(0, 0, GW, 3);

    // 뒤로 버튼
    const backBtn = this.add.text(16, 14, '← 뒤로', {
      fontSize: '15px', color: '#88aacc', backgroundColor: '#1a1a3a', padding: { x: 12, y: 8 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.showMainMenu());

    // 타이틀
    this.add.text(GW / 2, 24, '🏪 상점', {
      fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // 재화 표시
    const currY = 50;
    this.add.text(GW / 2 - 60, currY, `💰 ${progress.gold.toLocaleString()}`, {
      fontSize: '14px', color: '#ffd700',
    }).setOrigin(1, 0);
    this.add.text(GW / 2 + 60, currY, `⚡ ${(progress.stamina ?? 120)}`, {
      fontSize: '14px', color: '#44ff44',
    }).setOrigin(0, 0);

    // ── 탭 ──
    const tabY = 72;
    const tabW = (GW - 32) / 3;
    const tabH = 38;
    const tabs: { label: string; key: 'general' | 'premium' | 'daily' }[] = [
      { label: '일반', key: 'general' },
      { label: '프리미엄', key: 'premium' },
      { label: '일일 한정', key: 'daily' },
    ];
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const tx = 16 + i * tabW;
      const isActive = tab === t.key;

      const tabBg = this.add.graphics();
      tabBg.fillStyle(isActive ? 0x1a1a3a : 0x0e0e1e, 1);
      tabBg.fillRect(tx, tabY, tabW, tabH);
      if (isActive) {
        tabBg.fillStyle(0xffd700, 1);
        tabBg.fillRect(tx, tabY + tabH - 3, tabW, 3);
      }

      this.add.text(tx + tabW / 2, tabY + tabH / 2 - 2, t.label, {
        fontSize: '14px', color: isActive ? '#ffd700' : '#666666', fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);

      const hit = this.add.rectangle(tx + tabW / 2, tabY + tabH / 2, tabW, tabH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.showShop(t.key));
    }

    // ── 탭 콘텐츠 ──
    this.renderShopItems(tab);
  }

  private renderShopItems(category: 'general' | 'premium' | 'daily'): void {
    const progress = this.campaignManager.getProgress();
    const items = getShopItems(category);
    const dailyCounts = getDailyPurchases(progress);

    const contentY = 118;
    const cardW = GW - 32;
    const cardH = 72;
    const cardGap = 6;

    // 스크롤 가능한 영역 계산
    const visibleH = GH - contentY - 10;
    const totalH = items.length * (cardH + cardGap);

    // 스크롤이 필요한 경우 컨테이너 사용
    const container = this.add.container(0, 0);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const y = contentY + i * (cardH + cardGap);

      const canAfford = item.currency === 'gold'
        ? progress.gold >= item.price
        : true; // gems checked server-side

      let soldOut = false;
      let remaining = 0;
      if (category === 'daily' && item.dailyLimit) {
        const bought = dailyCounts[item.id] ?? 0;
        remaining = item.dailyLimit - bought;
        soldOut = remaining <= 0;
      }

      // 카드 배경
      const card = this.add.graphics();
      card.fillStyle(soldOut ? 0x111122 : 0x141428, 1);
      card.fillRoundedRect(16, y, cardW, cardH, 8);
      card.lineStyle(1, soldOut ? 0x222233 : 0x2a2a44, 0.6);
      card.strokeRoundedRect(16, y, cardW, cardH, 8);
      container.add(card);

      // 아이콘
      const icon = this.add.text(30, y + 12, item.icon, { fontSize: '24px' });
      container.add(icon);

      // 이름
      const name = this.add.text(62, y + 10, item.name, {
        fontSize: '16px', color: soldOut ? '#555555' : '#ffffff', fontStyle: 'bold',
      });
      container.add(name);

      // 설명
      const desc = this.add.text(62, y + 30, item.description, {
        fontSize: '11px', color: soldOut ? '#444444' : '#888888',
      });
      container.add(desc);

      // 가격
      const currIcon = item.currency === 'gold' ? '💰' : '💎';
      const priceColor = item.currency === 'gold'
        ? (canAfford ? '#ffd700' : '#aa4444')
        : '#88ccff';
      const price = this.add.text(62, y + 50, `${currIcon} ${item.price.toLocaleString()}`, {
        fontSize: '12px', color: soldOut ? '#444444' : priceColor,
      });
      container.add(price);

      // 일일 한정 남은 횟수
      if (category === 'daily' && item.dailyLimit) {
        const limitText = this.add.text(160, y + 50, `${remaining}/${item.dailyLimit}`, {
          fontSize: '12px', color: soldOut ? '#444444' : '#aaaaaa',
        });
        container.add(limitText);
      }

      // 구매 버튼
      if (!soldOut) {
        const buyBtnX = GW - 70;
        const buyBtnY = y + 24;
        const buyBtnW = 56;
        const buyBtnH = 28;

        const buyBg = this.add.graphics();
        buyBg.fillStyle(canAfford ? 0x228833 : 0x444444, 1);
        buyBg.fillRoundedRect(buyBtnX, buyBtnY, buyBtnW, buyBtnH, 5);
        container.add(buyBg);

        const buyText = this.add.text(buyBtnX + buyBtnW / 2, buyBtnY + buyBtnH / 2, '구매', {
          fontSize: '13px', color: canAfford ? '#ffffff' : '#888888', fontStyle: 'bold',
        }).setOrigin(0.5);
        container.add(buyText);

        if (canAfford) {
          const buyHit = this.add.rectangle(buyBtnX + buyBtnW / 2, buyBtnY + buyBtnH / 2, buyBtnW, buyBtnH, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
          buyHit.on('pointerdown', () => this.purchaseShopItem(item, category));
          container.add(buyHit);
        }
      } else {
        const soldText = this.add.text(GW - 50, y + 36, '품절', {
          fontSize: '12px', color: '#555555',
        }).setOrigin(0.5);
        container.add(soldText);
      }
    }

    // 스크롤 지원 (터치 드래그 + 마우스 휠)
    if (totalH > visibleH) {
      const maskShape = this.make.graphics({});
      maskShape.fillRect(0, contentY, GW, visibleH);
      container.setMask(new Phaser.Display.Masks.GeometryMask(this, maskShape));

      const maxScroll = totalH - visibleH;
      this.shopScrollY = Phaser.Math.Clamp(this.shopScrollY, 0, maxScroll);
      container.y = -this.shopScrollY;

      this.input.on('wheel', (_p: unknown, _gx: unknown, _gy: unknown, _gz: unknown, dy: number) => {
        this.shopScrollY = Phaser.Math.Clamp(this.shopScrollY + dy * 0.5, 0, maxScroll);
        container.y = -this.shopScrollY;
      });

      let dragStartY = 0;
      let dragScrollY = 0;
      let isDragging = false;

      // 스크롤 전용 영역 (구매 버튼과 충돌 방지)
      const scrollZone = this.add.rectangle(GW / 2, contentY + visibleH / 2, GW, visibleH, 0x000000, 0)
        .setInteractive().setDepth(-1);

      scrollZone.on('pointerdown', (p: Phaser.Input.Pointer) => {
        dragStartY = p.y; dragScrollY = this.shopScrollY; isDragging = false;
      });
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (p.isDown && p.y >= contentY) {
          const delta = Math.abs(p.y - dragStartY);
          if (delta > 5) isDragging = true;
          if (isDragging) {
            this.shopScrollY = Phaser.Math.Clamp(dragScrollY + (dragStartY - p.y), 0, maxScroll);
            container.y = -this.shopScrollY;
          }
        }
      });
    }
  }

  private purchaseShopItem(item: ShopItem, category: 'general' | 'premium' | 'daily'): void {
    const progress = this.campaignManager.getProgress();

    // Quick client-side pre-check (server is authoritative)
    if (item.currency === 'gold' && progress.gold < item.price) return;

    // 중복 클릭 방지
    if (this.shopBuying) return;
    this.shopBuying = true;

    shopBuy(item.id).then(async () => {
      await this.campaignManager.loadFromServer();
      this.shopBuying = false;
      this.showShop(category, true);
    }).catch((err: Error) => {
      this.shopBuying = false;
      const msg = err.message || '구매에 실패했습니다';
      const errText = this.add.text(GW / 2, GH - 40, msg, {
        fontSize: '14px', color: '#ff4444', backgroundColor: '#1a1a2e',
        padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setDepth(999);
      this.time.delayedCall(1500, () => errText.destroy());
    });
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
