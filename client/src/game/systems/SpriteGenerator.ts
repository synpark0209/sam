import Phaser from 'phaser';
import { UnitClass } from '@shared/types/index.ts';
import { TileType } from '@shared/types/index.ts';
import { TILE_SIZE } from '@shared/constants.ts';

const FRAME_W = TILE_SIZE; // 48 (타일 크기)
const FRAME_H = TILE_SIZE;
const ANIM_COLS = 4;
const ANIM_ROWS = 5;

// 유닛 스프라이트는 96x96으로 그린 후 48x48로 축소
const UNIT_RES = 96;
const TILE_RES = TILE_SIZE; // 타일은 48x48

type Faction = 'player' | 'enemy';

// ═══════════════════════════════════════
// Canvas 유틸
// ═══════════════════════════════════════

function addCanvasAsSpriteSheet(
  scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement,
  frameW: number, frameH: number,
): void {
  const tex = scene.textures.addCanvas(key, canvas)!;
  const cols = Math.floor(canvas.width / frameW);
  const rows = Math.floor(canvas.height / frameH);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tex.add(row * cols + col, 0, col * frameW, row * frameH, frameW, frameH);
    }
  }
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function pixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  rect(ctx, x, y, 1, 1, color);
}

function outlinedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, outline: string) {
  rect(ctx, x, y, w, h, outline);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

// ═══════════════════════════════════════
// 색상 팔레트 (삼국지 조조전 스타일)
// ═══════════════════════════════════════

function pal(faction: Faction) {
  const p = faction === 'player';
  return {
    skin: '#f0c8a0', skinS: '#c89868', skinL: '#ffe4c8', skinD: '#a07048',
    armor: p ? '#3868b8' : '#c03838',
    armorS: p ? '#203870' : '#802020',
    armorL: p ? '#5890e0' : '#e06060',
    armorH: p ? '#78b0f0' : '#f08888',
    armorD: p ? '#182850' : '#601010',
    cloth: p ? '#4878c0' : '#d04848',
    clothS: p ? '#285098' : '#a83030',
    clothL: p ? '#6898d8' : '#e87070',
    gold: '#e8c830', goldS: '#b09020', goldL: '#f8e068', goldD: '#886810',
    steel: '#c0c8d8', steelS: '#808898', steelL: '#e0e8f0', steelD: '#606878',
    boot: '#503820', bootS: '#301810', bootL: '#785838',
    hair: '#302828', hairL: '#484038', hairD: '#181010',
    eye: '#101018', eyeW: '#f0f0f0',
    horse: '#8b5e3c', horseS: '#5c3820', horseL: '#b08060', horseMane: '#302018',
    wood: '#a07838', woodS: '#704820', woodL: '#c89850',
    white: '#f0f0f0', whiteS: '#c0c0c0',
    outline: '#101018',
    shadow: 'rgba(0,0,0,0.25)',
  };
}

// ═══════════════════════════════════════
// 96x96 유닛 그리기 (삼국지 조조전 스타일)
// ═══════════════════════════════════════

type DrawCtxFn = (ctx: CanvasRenderingContext2D, f: Faction, anim: string, frame: number) => void;

// ── 공통 ──
function drawFace96(ctx: CanvasRenderingContext2D, cx: number, y: number, c: ReturnType<typeof pal>) {
  // 얼굴 윤곽
  outlinedRect(ctx, cx - 10, y, 20, 16, c.skin, c.skinD);
  rect(ctx, cx - 9, y + 1, 18, 2, c.skinL);
  // 눈
  rect(ctx, cx - 8, y + 6, 4, 3, c.eyeW);
  rect(ctx, cx + 4, y + 6, 4, 3, c.eyeW);
  rect(ctx, cx - 6, y + 6, 2, 3, c.eye);
  rect(ctx, cx + 6, y + 6, 2, 3, c.eye);
  // 눈썹
  rect(ctx, cx - 8, y + 4, 5, 1, c.hairD);
  rect(ctx, cx + 3, y + 4, 5, 1, c.hairD);
  // 코
  rect(ctx, cx - 1, y + 10, 2, 2, c.skinS);
  // 입
  rect(ctx, cx - 2, y + 13, 4, 1, c.skinD);
}

function drawHelmet96(ctx: CanvasRenderingContext2D, cx: number, y: number, c: ReturnType<typeof pal>) {
  // 투구 본체
  outlinedRect(ctx, cx - 12, y, 24, 8, c.armor, c.armorD);
  rect(ctx, cx - 11, y + 1, 22, 2, c.armorL);
  rect(ctx, cx - 11, y + 3, 22, 1, c.armorH);
  rect(ctx, cx - 12, y + 6, 24, 2, c.armorS);
  // 투구 뿔/장식
  rect(ctx, cx - 2, y - 6, 4, 6, c.gold);
  rect(ctx, cx - 1, y - 7, 2, 1, c.goldL);
  rect(ctx, cx - 3, y - 4, 1, 3, c.goldS);
  rect(ctx, cx + 2, y - 4, 1, 3, c.goldS);
  // 깃털
  rect(ctx, cx + 4, y - 10, 2, 8, c.white);
  rect(ctx, cx + 5, y - 11, 2, 4, c.whiteS);
  pixel(ctx, cx + 3, y - 8, c.whiteS);
  pixel(ctx, cx + 6, y - 10, c.whiteS);
  // 이마 장식
  rect(ctx, cx - 4, y + 4, 8, 2, c.gold);
}

function drawClothCap96(ctx: CanvasRenderingContext2D, cx: number, y: number, c: ReturnType<typeof pal>) {
  outlinedRect(ctx, cx - 11, y, 22, 6, c.cloth, c.clothS);
  rect(ctx, cx - 10, y + 1, 20, 2, c.clothL);
  // 매듭
  rect(ctx, cx - 13, y + 2, 3, 2, c.clothS);
  rect(ctx, cx + 10, y + 2, 3, 2, c.clothS);
  rect(ctx, cx + 11, y + 4, 4, 2, c.cloth);
  rect(ctx, cx + 12, y + 6, 3, 2, c.clothS);
}

function drawScholarCap96(ctx: CanvasRenderingContext2D, cx: number, y: number, c: ReturnType<typeof pal>) {
  // 관모
  outlinedRect(ctx, cx - 6, y - 10, 12, 10, c.gold, c.goldD);
  rect(ctx, cx - 5, y - 9, 10, 3, c.goldL);
  rect(ctx, cx - 6, y - 1, 12, 2, c.goldS);
  // 날개
  rect(ctx, cx - 12, y - 2, 6, 2, c.goldS);
  rect(ctx, cx + 6, y - 2, 6, 2, c.goldS);
  // 머리카락
  rect(ctx, cx - 11, y + 1, 22, 3, c.hair);
  rect(ctx, cx - 10, y + 1, 20, 1, c.hairL);
}

// ── 보병 (96x96) ──
const drawInfantry96: DrawCtxFn = (ctx, faction, anim, frame) => {
  const c = pal(faction);
  const cx = 48;
  const by = anim === 'idle' ? (frame % 2 === 0 ? 16 : 18) : 16;
  const atkOff = anim === 'attack' ? (frame < 2 ? frame * 5 : (3 - frame) * 5) : 0;

  // 그림자
  ctx.fillStyle = c.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, 90, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 투구
  drawHelmet96(ctx, cx, by, c);
  // 얼굴
  drawFace96(ctx, cx, by + 8, c);

  // 갑옷 몸통
  outlinedRect(ctx, cx - 14, by + 24, 28, 8, c.armorL, c.armorD);
  outlinedRect(ctx, cx - 14, by + 32, 28, 10, c.armor, c.armorD);
  rect(ctx, cx - 12, by + 41, 24, 2, c.armorS);
  // 흉갑 디테일
  rect(ctx, cx - 6, by + 26, 12, 4, c.armorH);
  rect(ctx, cx - 4, by + 28, 8, 2, c.armorL);
  // 금장 띠
  rect(ctx, cx - 12, by + 36, 24, 3, c.gold);
  rect(ctx, cx - 11, by + 38, 22, 1, c.goldS);
  // 어깨 갑옷
  outlinedRect(ctx, cx - 20, by + 24, 8, 10, c.armorL, c.armorD);
  outlinedRect(ctx, cx + 12, by + 24, 8, 10, c.armorL, c.armorD);
  rect(ctx, cx - 19, by + 24, 6, 2, c.armorH);
  rect(ctx, cx + 13, by + 24, 6, 2, c.armorH);
  // 어깨 금장
  rect(ctx, cx - 18, by + 26, 4, 2, c.gold);
  rect(ctx, cx + 14, by + 26, 4, 2, c.gold);

  // 팔
  rect(ctx, cx - 20, by + 34, 6, 8, c.cloth);
  rect(ctx, cx + 14, by + 34, 6, 8, c.cloth);
  rect(ctx, cx - 20, by + 34, 6, 2, c.clothL);
  rect(ctx, cx + 14, by + 34, 6, 2, c.clothL);
  // 손
  rect(ctx, cx - 20, by + 42, 5, 4, c.skin);
  rect(ctx, cx + 15, by + 42, 5, 4, c.skin);

  // 다리
  const ls = anim === 'walk' ? (frame % 2) * 3 : 0;
  outlinedRect(ctx, cx - 10 - ls, by + 43, 8, 14, c.clothS, c.armorD);
  outlinedRect(ctx, cx + 2 + ls, by + 43, 8, 14, c.clothS, c.armorD);
  // 무릎 갑옷
  rect(ctx, cx - 9 - ls, by + 43, 6, 5, c.armor);
  rect(ctx, cx + 3 + ls, by + 43, 6, 5, c.armor);
  // 부츠
  outlinedRect(ctx, cx - 12 - ls, by + 57, 10, 6, c.boot, c.bootS);
  outlinedRect(ctx, cx + 2 + ls, by + 57, 10, 6, c.boot, c.bootS);
  rect(ctx, cx - 11 - ls, by + 57, 8, 2, c.bootL);
  rect(ctx, cx + 3 + ls, by + 57, 8, 2, c.bootL);

  // 검
  const sx = cx + 22 + atkOff;
  if (anim === 'attack' && frame === 2) {
    // 횡베기
    for (let i = 0; i < 20; i++) {
      rect(ctx, cx + 10 + i, by + 16 - Math.floor(i / 4), 2, 2, c.steelL);
      rect(ctx, cx + 10 + i, by + 18 - Math.floor(i / 4), 2, 2, c.steel);
    }
    rect(ctx, cx + 8, by + 22, 4, 2, c.gold);
  } else {
    // 검 블레이드
    rect(ctx, sx, by + 4, 3, 22, c.steel);
    rect(ctx, sx, by + 4, 1, 22, c.steelL);
    rect(ctx, sx + 2, by + 4, 1, 22, c.steelS);
    // 검 끝
    rect(ctx, sx, by + 2, 3, 2, c.steelL);
    pixel(ctx, sx + 1, by + 1, c.steelL);
    // 코등이
    rect(ctx, sx - 2, by + 26, 7, 2, c.gold);
    // 손잡이
    rect(ctx, sx, by + 28, 3, 6, c.wood);
    rect(ctx, sx + 1, by + 28, 1, 6, c.woodL);
    // 폼멜
    rect(ctx, sx, by + 34, 3, 2, c.goldS);
  }
};

// ── 기병 (96x96) ──
const drawCavalry96: DrawCtxFn = (ctx, faction, anim, frame) => {
  const c = pal(faction);
  const cx = 48;
  const legOff = anim === 'walk' ? (frame % 2) * 3 : 0;

  ctx.fillStyle = c.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, 92, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 말 몸통
  outlinedRect(ctx, cx - 20, 50, 42, 16, c.horse, c.horseS);
  rect(ctx, cx - 18, 50, 38, 4, c.horseL);
  rect(ctx, cx - 20, 62, 42, 4, c.horseS);
  // 안장
  outlinedRect(ctx, cx - 8, 46, 18, 8, c.armor, c.armorD);
  rect(ctx, cx - 6, 46, 14, 3, c.armorL);
  rect(ctx, cx - 6, 49, 14, 2, c.armorH);
  rect(ctx, cx - 8, 53, 18, 1, c.gold);
  // 등자
  rect(ctx, cx - 10, 58, 2, 4, c.steelS);
  rect(ctx, cx + 10, 58, 2, 4, c.steelS);
  // 말 머리
  outlinedRect(ctx, cx + 18, 38, 12, 20, c.horse, c.horseS);
  rect(ctx, cx + 20, 38, 8, 6, c.horseL);
  rect(ctx, cx + 26, 42, 4, 4, c.eye);
  rect(ctx, cx + 27, 42, 2, 3, c.eyeW);
  // 갈기
  rect(ctx, cx + 14, 34, 6, 18, c.horseMane);
  // 말 귀
  rect(ctx, cx + 22, 34, 3, 5, c.horse);
  rect(ctx, cx + 23, 33, 2, 2, c.horseL);
  // 코
  outlinedRect(ctx, cx + 26, 54, 6, 4, c.horseS, c.horseS);
  // 말 다리
  rect(ctx, cx - 18, 66, 5, 14 - legOff, c.horseS);
  rect(ctx, cx - 8, 66, 5, 14 + legOff, c.horseS);
  rect(ctx, cx + 5, 66, 5, 14 + legOff, c.horseS);
  rect(ctx, cx + 15, 66, 5, 14 - legOff, c.horseS);
  // 발굽
  rect(ctx, cx - 18, 79 - legOff, 5, 3, c.bootS);
  rect(ctx, cx - 8, 79 + legOff, 5, 3, c.bootS);
  rect(ctx, cx + 5, 79 + legOff, 5, 3, c.bootS);
  rect(ctx, cx + 15, 79 - legOff, 5, 3, c.bootS);
  // 꼬리
  rect(ctx, cx - 24, 50, 5, 10, c.horseMane);
  rect(ctx, cx - 26, 56, 3, 6, c.horseMane);

  // 기수 투구
  drawHelmet96(ctx, cx - 2, 2, c);
  // 기수 얼굴
  drawFace96(ctx, cx - 2, 10, c);

  // 기수 갑옷
  outlinedRect(ctx, cx - 14, 26, 26, 18, c.armor, c.armorD);
  rect(ctx, cx - 12, 26, 22, 4, c.armorL);
  rect(ctx, cx - 12, 34, 22, 3, c.gold);
  // 어깨
  outlinedRect(ctx, cx - 18, 26, 6, 8, c.armorL, c.armorD);
  outlinedRect(ctx, cx + 10, 26, 6, 8, c.armorL, c.armorD);

  // 창
  const spx = cx + 26;
  rect(ctx, spx, 0, 3, 46, c.wood);
  rect(ctx, spx, 0, 1, 46, c.woodL);
  // 창날
  rect(ctx, spx - 2, 0, 7, 3, c.steel);
  rect(ctx, spx - 1, 0, 5, 1, c.steelL);
  pixel(ctx, spx + 1, 0, c.steelL);
  // 깃발
  rect(ctx, spx + 3, 6, 8, 6, c.armor);
  rect(ctx, spx + 4, 7, 6, 4, c.armorL);
};

// ── 궁병 (96x96) ──
const drawArcher96: DrawCtxFn = (ctx, faction, anim, frame) => {
  const c = pal(faction);
  const cx = 48;
  const by = anim === 'idle' ? (frame % 2 === 0 ? 12 : 14) : 12;

  ctx.fillStyle = c.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, 90, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  drawClothCap96(ctx, cx, by, c);
  drawFace96(ctx, cx, by + 6, c);

  // 경갑 + 옷
  outlinedRect(ctx, cx - 13, by + 22, 26, 6, c.armor, c.armorD);
  rect(ctx, cx - 12, by + 22, 24, 2, c.armorL);
  outlinedRect(ctx, cx - 12, by + 28, 24, 12, c.cloth, c.clothS);
  rect(ctx, cx - 11, by + 28, 22, 2, c.clothL);
  // 벨트
  rect(ctx, cx - 10, by + 36, 20, 3, c.wood);
  rect(ctx, cx - 9, by + 36, 18, 1, c.woodL);

  // 팔
  rect(ctx, cx - 18, by + 22, 6, 12, c.cloth);
  rect(ctx, cx + 12, by + 22, 6, 12, c.cloth);
  rect(ctx, cx - 18, by + 34, 5, 6, c.skin);
  rect(ctx, cx + 13, by + 34, 5, 6, c.skin);

  // 다리
  const ls = anim === 'walk' ? (frame % 2) * 3 : 0;
  outlinedRect(ctx, cx - 8 - ls, by + 40, 7, 14, c.clothS, c.clothS);
  outlinedRect(ctx, cx + 1 + ls, by + 40, 7, 14, c.clothS, c.clothS);
  outlinedRect(ctx, cx - 10 - ls, by + 54, 9, 6, c.boot, c.bootS);
  outlinedRect(ctx, cx + 1 + ls, by + 54, 9, 6, c.boot, c.bootS);
  rect(ctx, cx - 9 - ls, by + 54, 7, 2, c.bootL);
  rect(ctx, cx + 2 + ls, by + 54, 7, 2, c.bootL);

  // 활
  ctx.strokeStyle = c.woodS;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx - 22, by + 30, 14, -Math.PI * 0.7, Math.PI * 0.7, false);
  ctx.stroke();
  ctx.strokeStyle = c.woodL;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx - 22, by + 30, 13, -Math.PI * 0.6, Math.PI * 0.6, false);
  ctx.stroke();
  // 시위
  ctx.strokeStyle = c.whiteS;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 28, by + 18);
  ctx.lineTo(cx - 28, by + 42);
  ctx.stroke();

  // 화살 (공격 시)
  if (anim === 'attack' && frame >= 2) {
    rect(ctx, cx + 10, by + 28, 24, 2, c.wood);
    rect(ctx, cx + 32, by + 26, 4, 2, c.steelL);
    rect(ctx, cx + 32, by + 28, 4, 2, c.steel);
    rect(ctx, cx + 32, by + 30, 4, 2, c.steelL);
  }

  // 화살통
  outlinedRect(ctx, cx + 10, by + 16, 5, 14, c.wood, c.woodS);
  rect(ctx, cx + 11, by + 16, 3, 14, c.woodL);
  rect(ctx, cx + 10, by + 14, 5, 2, c.white);
  rect(ctx, cx + 11, by + 13, 1, 1, c.steelL);
  rect(ctx, cx + 13, by + 13, 1, 1, c.steelL);
};

// ── 책사 (96x96) ──
const drawStrategist96: DrawCtxFn = (ctx, faction, anim, frame) => {
  const c = pal(faction);
  const cx = 48;
  const by = anim === 'idle' ? (frame % 2 === 0 ? 8 : 10) : 8;

  ctx.fillStyle = c.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, 92, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  drawScholarCap96(ctx, cx, by, c);
  drawFace96(ctx, cx, by + 4, c);
  // 수염
  rect(ctx, cx - 4, by + 19, 2, 6, c.hair);
  rect(ctx, cx + 2, by + 19, 2, 6, c.hair);
  rect(ctx, cx - 2, by + 21, 4, 2, c.hairL);

  // 로브
  for (let dy = 0; dy < 36; dy++) {
    const w = 24 + Math.floor(dy * 0.9);
    const lx = cx - Math.floor(w / 2);
    let co: string;
    if (dy < 6) co = c.armorL;
    else if (dy < 10) co = c.armor;
    else if (dy < 24) co = c.cloth;
    else co = c.clothS;
    rect(ctx, lx, by + 24 + dy, w, 1, co);
  }
  // 여밈
  for (let dy = 0; dy < 36; dy++) {
    rect(ctx, cx - 2, by + 24 + dy, 4, 1, c.armorS);
  }
  // 금장 띠
  const bw = 28;
  rect(ctx, cx - Math.floor(bw / 2), by + 38, bw, 4, c.gold);
  rect(ctx, cx - Math.floor(bw / 2) + 1, by + 41, bw - 2, 1, c.goldS);
  // 옥 장식
  rect(ctx, cx - 1, by + 38, 2, 4, c.goldL);

  // 소매
  rect(ctx, cx - 20, by + 26, 8, 16, c.cloth);
  rect(ctx, cx + 12, by + 26, 8, 16, c.cloth);
  rect(ctx, cx - 20, by + 26, 8, 3, c.clothL);
  rect(ctx, cx + 12, by + 26, 8, 3, c.clothL);
  rect(ctx, cx - 20, by + 40, 8, 2, c.clothS);
  rect(ctx, cx + 12, by + 40, 8, 2, c.clothS);
  // 손
  rect(ctx, cx - 22, by + 42, 6, 4, c.skin);
  rect(ctx, cx + 16, by + 42, 6, 4, c.skin);

  // 부채
  const fanX = cx + 20;
  const fanY = by + 28;
  if (anim === 'attack') {
    const sp = 3 + frame * 3;
    rect(ctx, fanX, fanY - sp, 10 + frame * 2, 6 + sp * 2, c.white);
    rect(ctx, fanX + 2, fanY - sp + 2, 6 + frame * 2, 2 + sp * 2, c.whiteS);
    rect(ctx, fanX, fanY, 2, 10, c.woodS);
  } else {
    outlinedRect(ctx, fanX, fanY, 6, 10, c.white, c.whiteS);
    rect(ctx, fanX + 1, fanY + 1, 4, 8, c.whiteS);
    rect(ctx, fanX, fanY + 9, 2, 3, c.woodS);
  }

  // 부츠
  outlinedRect(ctx, cx - 8, by + 58, 7, 4, c.boot, c.bootS);
  outlinedRect(ctx, cx + 1, by + 58, 7, 4, c.boot, c.bootS);
};

// ── 도적 (96x96) ──
const drawBandit96: DrawCtxFn = (ctx, faction, anim, frame) => {
  const c = pal(faction);
  const cx = 48;
  const by = anim === 'idle' ? (frame % 2 === 0 ? 16 : 18) : 16;
  const atkOff = anim === 'attack' ? (frame < 2 ? frame * 4 : (3 - frame) * 4) : 0;

  ctx.fillStyle = c.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, 90, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 두건
  outlinedRect(ctx, cx - 10, by, 20, 6, c.armorS, c.armorD);
  rect(ctx, cx - 9, by + 1, 18, 2, c.armor);
  rect(ctx, cx + 10, by + 2, 6, 2, c.armorS);
  rect(ctx, cx + 10, by + 4, 5, 3, c.armor);

  // 얼굴 (마스크)
  rect(ctx, cx - 10, by + 6, 20, 8, c.skin);
  rect(ctx, cx - 7, by + 8, 4, 3, c.eyeW);
  rect(ctx, cx + 3, by + 8, 4, 3, c.eyeW);
  rect(ctx, cx - 5, by + 8, 2, 3, c.eye);
  rect(ctx, cx + 5, by + 8, 2, 3, c.eye);
  outlinedRect(ctx, cx - 10, by + 14, 20, 4, c.armorS, c.armorD);

  // 경갑
  outlinedRect(ctx, cx - 14, by + 18, 28, 16, c.cloth, c.clothS);
  rect(ctx, cx - 13, by + 18, 26, 3, c.clothL);
  // 어깨패드
  outlinedRect(ctx, cx - 16, by + 18, 5, 6, c.armor, c.armorD);
  outlinedRect(ctx, cx + 11, by + 18, 5, 6, c.armor, c.armorD);
  // 벨트
  rect(ctx, cx - 10, by + 30, 20, 3, c.wood);
  rect(ctx, cx - 1, by + 30, 2, 3, c.gold);

  // 팔
  rect(ctx, cx - 18, by + 24, 5, 10, c.skin);
  rect(ctx, cx + 13, by + 24, 5, 10, c.skin);

  // 다리
  outlinedRect(ctx, cx - 8, by + 34, 7, 16, c.clothS, c.armorD);
  outlinedRect(ctx, cx + 1, by + 34, 7, 16, c.clothS, c.armorD);
  outlinedRect(ctx, cx - 10, by + 50, 9, 6, c.boot, c.bootS);
  outlinedRect(ctx, cx + 1, by + 50, 9, 6, c.boot, c.bootS);
  rect(ctx, cx - 9, by + 50, 7, 2, c.bootL);
  rect(ctx, cx + 2, by + 50, 7, 2, c.bootL);

  // 쌍단검
  const lx = cx - 24 - atkOff;
  const rx = cx + 20 + atkOff;
  rect(ctx, lx, by + 6, 3, 18, c.steel);
  rect(ctx, lx, by + 6, 1, 18, c.steelL);
  rect(ctx, lx, by + 4, 3, 2, c.steelL);
  rect(ctx, lx - 1, by + 24, 5, 2, c.gold);
  rect(ctx, lx, by + 26, 3, 4, c.wood);

  rect(ctx, rx, by + 6, 3, 18, c.steel);
  rect(ctx, rx + 2, by + 6, 1, 18, c.steelS);
  rect(ctx, rx, by + 4, 3, 2, c.steelL);
  rect(ctx, rx - 1, by + 24, 5, 2, c.gold);
  rect(ctx, rx, by + 26, 3, 4, c.wood);
};

// ── 무도가 (96x96) ──
const drawMartialArtist96: DrawCtxFn = (ctx, faction, anim, frame) => {
  const c = pal(faction);
  const cx = 48;
  const by = anim === 'idle' ? (frame % 2 === 0 ? 14 : 16) : 14;
  const atkOff = anim === 'attack' ? (frame < 2 ? frame * 5 : (3 - frame) * 5) : 0;

  ctx.fillStyle = c.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, 90, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 머리
  rect(ctx, cx - 10, by, 20, 5, c.hair);
  rect(ctx, cx - 9, by, 18, 2, c.hairL);
  // 머리띠
  outlinedRect(ctx, cx - 12, by + 5, 24, 3, c.armor, c.armorD);
  rect(ctx, cx - 11, by + 5, 22, 1, c.armorL);
  rect(ctx, cx + 12, by + 6, 5, 2, c.armor);
  rect(ctx, cx + 12, by + 8, 4, 3, c.armorS);

  // 얼굴
  drawFace96(ctx, cx, by + 8, c);

  // 도복
  outlinedRect(ctx, cx - 14, by + 24, 28, 16, c.cloth, c.clothS);
  rect(ctx, cx - 13, by + 24, 26, 3, c.clothL);
  // V자 앞여밈
  for (let dy = 0; dy < 12; dy++) {
    const vw = 4 + dy;
    rect(ctx, cx - Math.floor(vw / 2), by + 24 + dy, Math.floor(vw / 2), 1, c.armor);
    rect(ctx, cx, by + 24 + dy, Math.ceil(vw / 2), 1, c.armorL);
  }
  // 가슴 노출
  rect(ctx, cx - 4, by + 24, 8, 5, c.skin);
  rect(ctx, cx - 3, by + 24, 6, 3, c.skinL);
  // 금띠
  rect(ctx, cx - 14, by + 38, 28, 4, c.gold);
  rect(ctx, cx - 13, by + 41, 26, 1, c.goldS);
  rect(ctx, cx - 1, by + 38, 2, 4, c.goldL);

  // 맨팔 (근육)
  rect(ctx, cx - 20, by + 24, 8, 12, c.skin);
  rect(ctx, cx + 12, by + 24, 8, 12, c.skin);
  rect(ctx, cx - 20, by + 24, 2, 12, c.skinS);
  rect(ctx, cx + 18, by + 24, 2, 12, c.skinS);
  rect(ctx, cx - 18, by + 26, 4, 4, c.skinL); // 근육 하이라이트
  rect(ctx, cx + 14, by + 26, 4, 4, c.skinL);
  // 팔보호대
  rect(ctx, cx - 20, by + 30, 8, 3, c.cloth);
  rect(ctx, cx + 12, by + 30, 8, 3, c.cloth);
  // 주먹
  rect(ctx, cx - 24 - atkOff, by + 36, 8, 5, c.skin);
  rect(ctx, cx + 16 + atkOff, by + 36, 8, 5, c.skin);
  rect(ctx, cx - 23 - atkOff, by + 36, 6, 2, c.skinL);
  rect(ctx, cx + 17 + atkOff, by + 36, 6, 2, c.skinL);

  // 넓은 바지
  outlinedRect(ctx, cx - 12, by + 42, 10, 16, c.clothS, c.armorD);
  outlinedRect(ctx, cx + 2, by + 42, 10, 16, c.clothS, c.armorD);
  rect(ctx, cx - 10, by + 42, 6, 16, c.cloth);
  rect(ctx, cx + 4, by + 42, 6, 16, c.cloth);
  // 부츠
  outlinedRect(ctx, cx - 14, by + 58, 12, 5, c.boot, c.bootS);
  outlinedRect(ctx, cx + 2, by + 58, 12, 5, c.boot, c.bootS);
  rect(ctx, cx - 13, by + 58, 10, 2, c.bootL);
  rect(ctx, cx + 3, by + 58, 10, 2, c.bootL);
};

const CLASS_DRAWERS_96: Record<string, DrawCtxFn> = {
  infantry: drawInfantry96,
  cavalry: drawCavalry96,
  archer: drawArcher96,
  strategist: drawStrategist96,
  bandit: drawBandit96,
  martial_artist: drawMartialArtist96,
};

// ═══════════════════════════════════════
// 메인 생성 함수 (96x96 → 48x48 축소)
// ═══════════════════════════════════════

export function generateUnitSpritesheet(scene: Phaser.Scene, unitClass: UnitClass, faction: Faction): string {
  const key = `unit_${unitClass}_${faction}`;
  if (scene.textures.exists(key)) return key;

  // 96x96으로 그린 후 48x48로 축소
  const hiResCanvas = document.createElement('canvas');
  hiResCanvas.width = UNIT_RES * ANIM_COLS;
  hiResCanvas.height = UNIT_RES * ANIM_ROWS;
  const hiCtx = hiResCanvas.getContext('2d')!;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = FRAME_W * ANIM_COLS;
  outCanvas.height = FRAME_H * ANIM_ROWS;
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.imageSmoothingEnabled = false;

  const drawFn = CLASS_DRAWERS_96[unitClass] ?? CLASS_DRAWERS_96.infantry;
  const anims = ['idle', 'walk', 'attack', 'hit', 'die'];

  for (let row = 0; row < ANIM_ROWS; row++) {
    for (let col = 0; col < ANIM_COLS; col++) {
      hiCtx.save();
      hiCtx.translate(col * UNIT_RES, row * UNIT_RES);
      hiCtx.clearRect(0, 0, UNIT_RES, UNIT_RES);

      if (anims[row] === 'hit' && col % 2 === 0) {
        hiCtx.globalAlpha = 0.4;
      }
      if (anims[row] === 'die') {
        hiCtx.globalAlpha = 1 - col * 0.3;
      }

      drawFn(hiCtx, faction, anims[row], col);
      hiCtx.restore();

      // 96→48 축소
      outCtx.drawImage(
        hiResCanvas,
        col * UNIT_RES, row * UNIT_RES, UNIT_RES, UNIT_RES,
        col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H,
      );
    }
  }

  addCanvasAsSpriteSheet(scene, key, outCanvas, FRAME_W, FRAME_H);
  return key;
}

export function createUnitAnimations(scene: Phaser.Scene, textureKey: string): void {
  const anims = [
    { key: `${textureKey}_idle`, start: 0, end: 3, frameRate: 3, repeat: -1 },
    { key: `${textureKey}_walk`, start: 4, end: 7, frameRate: 6, repeat: -1 },
    { key: `${textureKey}_attack`, start: 8, end: 11, frameRate: 8, repeat: 0 },
    { key: `${textureKey}_hit`, start: 12, end: 13, frameRate: 6, repeat: 0 },
    { key: `${textureKey}_die`, start: 16, end: 18, frameRate: 3, repeat: 0 },
  ];
  for (const anim of anims) {
    if (scene.anims.exists(anim.key)) continue;
    scene.anims.create({
      key: anim.key,
      frames: scene.anims.generateFrameNumbers(textureKey, { start: anim.start, end: anim.end }),
      frameRate: anim.frameRate,
      repeat: anim.repeat,
    });
  }
}

// ═══════════════════════════════════════
// 타일셋
// ═══════════════════════════════════════

type TileDrawCtxFn = (ctx: CanvasRenderingContext2D) => void;

const drawPlainTile: TileDrawCtxFn = (ctx) => {
  const S = TILE_RES;
  rect(ctx, 0, 0, S, S, '#6a9e4c');
  for (let i = 0; i < 20; i++) {
    const gx = (i * 7 + 3) % (S - 2);
    const gy = (i * 11 + 5) % (S - 2);
    pixel(ctx, gx, gy, '#5a8e3c');
    pixel(ctx, gx + 1, gy, '#7aae5c');
  }
  for (let i = 0; i < 6; i++) {
    pixel(ctx, (i * 13 + 7) % S, (i * 9 + 3) % S, '#8a9864');
  }
};

const drawForestTile: TileDrawCtxFn = (ctx) => {
  const S = TILE_RES;
  rect(ctx, 0, 0, S, S, '#4a7a30');
  const trees: [number, number][] = [[10, 6], [28, 10], [18, 26], [36, 20]];
  for (const [tx, ty] of trees) {
    rect(ctx, tx, ty + 10, 3, 8, '#5a3a1a');
    rect(ctx, tx + 1, ty + 10, 1, 8, '#7a5a2a');
    rect(ctx, tx - 5, ty + 2, 12, 8, '#2a5a14');
    rect(ctx, tx - 4, ty, 10, 3, '#3a6a24');
    rect(ctx, tx - 2, ty + 1, 4, 2, '#4a8a34');
  }
};

const drawMountainTile: TileDrawCtxFn = (ctx) => {
  const S = TILE_RES;
  rect(ctx, 0, 0, S, S, '#7a7060');
  for (let dy = 0; dy < 30; dy++) {
    const w = 4 + dy * 1.2;
    rect(ctx, S / 2 - Math.floor(w / 2), 6 + dy, Math.ceil(w), 1, dy < 5 ? '#a0a098' : '#6a6450');
  }
  rect(ctx, S / 2 - 4, 6, 8, 4, '#e0e0e0');
  rect(ctx, S / 2 - 3, 10, 6, 2, '#d0d0d0');
};

const drawWaterTile: TileDrawCtxFn = (ctx) => {
  const S = TILE_RES;
  rect(ctx, 0, 0, S, S, '#2a5a90');
  for (let wy = 3; wy < S; wy += 6) {
    for (let wx = 0; wx < S; wx += 3) {
      const shade = ((wx + wy) % 6 < 3) ? '#3a6aa0' : '#1a4a80';
      pixel(ctx, wx, wy + (wx % 6 < 3 ? 0 : 1), shade);
    }
  }
  pixel(ctx, 12, 10, '#6aaad0');
  pixel(ctx, 30, 22, '#6aaad0');
};

const drawBridgeTile: TileDrawCtxFn = (ctx) => {
  const S = TILE_RES;
  rect(ctx, 0, 0, S, S, '#2a5a90');
  rect(ctx, 4, 6, S - 8, S - 12, '#a07a2a');
  rect(ctx, 6, 8, S - 12, S - 16, '#c09a3a');
  for (let i = 0; i < 6; i++) rect(ctx, 6, 10 + i * 6, S - 12, 1, '#7a5a10');
  rect(ctx, 4, 4, S - 8, 2, '#6a4a10');
  rect(ctx, 4, S - 6, S - 8, 2, '#6a4a10');
};

const TILE_DRAWERS_CTX: Record<string, TileDrawCtxFn> = {
  [TileType.PLAIN]: drawPlainTile,
  [TileType.FOREST]: drawForestTile,
  [TileType.MOUNTAIN]: drawMountainTile,
  [TileType.WATER]: drawWaterTile,
  [TileType.BRIDGE]: drawBridgeTile,
};

export function generateTileset(scene: Phaser.Scene): string {
  const key = 'tileset_placeholder';
  if (scene.textures.exists(key)) return key;

  const tileTypes = [TileType.PLAIN, TileType.FOREST, TileType.MOUNTAIN, TileType.WATER, TileType.BRIDGE];
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W * tileTypes.length;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d')!;

  for (let i = 0; i < tileTypes.length; i++) {
    ctx.save();
    ctx.translate(i * FRAME_W, 0);
    ctx.clearRect(0, 0, FRAME_W, FRAME_H);
    TILE_DRAWERS_CTX[tileTypes[i]]?.(ctx);
    ctx.restore();
  }

  addCanvasAsSpriteSheet(scene, key, canvas, FRAME_W, FRAME_H);
  return key;
}

export function getTileFrame(tileType: string): number {
  const order = [TileType.PLAIN, TileType.FOREST, TileType.MOUNTAIN, TileType.WATER, TileType.BRIDGE];
  const idx = order.indexOf(tileType as TileType);
  return idx >= 0 ? idx : 0;
}

// ═══════════════════════════════════════
// 이펙트 스프라이트
// ═══════════════════════════════════════

export function generateEffectSprites(scene: Phaser.Scene): void {
  if (!scene.textures.exists('fx_fire')) {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_W * 4;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext('2d')!;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(i * FRAME_W, 0);
      const flames: [number, number, number][] = [[12, 35, 8 + i * 3], [24, 30, 12 + i * 4], [36, 25, 6 + i * 3]];
      for (const [fx, startY, h] of flames) {
        for (let dy = 0; dy < h; dy++) {
          const w = Math.max(2, Math.floor((h - dy) / 3) + 2);
          const ratio = dy / h;
          const color = ratio < 0.3 ? '#ffee44' : ratio < 0.6 ? '#ffaa00' : 'rgba(255,68,0,0.8)';
          rect(ctx, fx - Math.floor(w / 2), startY - dy, w, 1, color);
        }
      }
      ctx.restore();
    }
    addCanvasAsSpriteSheet(scene, 'fx_fire', canvas, FRAME_W, FRAME_H);
    scene.anims.create({ key: 'fx_fire_play', frames: scene.anims.generateFrameNumbers('fx_fire', { start: 0, end: 3 }), frameRate: 8, repeat: 0 });
  }

  if (!scene.textures.exists('fx_heal')) {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_W * 4;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext('2d')!;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(i * FRAME_W, 0);
      const ctr = FRAME_W / 2;
      const n = 4 + i * 2;
      for (let p = 0; p < n; p++) {
        const angle = (p / n) * Math.PI * 2 + i * 0.5;
        const dist = 6 + i * 3;
        rect(ctx, ctr + Math.round(Math.cos(angle) * dist), ctr + Math.round(Math.sin(angle) * dist) - i * 2, 2, 2, '#88ffaa');
      }
      const cs = 3 + i;
      rect(ctx, ctr - 1, ctr - cs, 2, cs * 2, '#ffffff');
      rect(ctx, ctr - cs, ctr - 1, cs * 2, 2, '#ffffff');
      ctx.restore();
    }
    addCanvasAsSpriteSheet(scene, 'fx_heal', canvas, FRAME_W, FRAME_H);
    scene.anims.create({ key: 'fx_heal_play', frames: scene.anims.generateFrameNumbers('fx_heal', { start: 0, end: 3 }), frameRate: 6, repeat: 0 });
  }
}
