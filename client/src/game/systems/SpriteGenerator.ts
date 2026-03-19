import Phaser from 'phaser';
import { UnitClass } from '@shared/types/index.ts';
import { TileType } from '@shared/types/index.ts';
import { TILE_SIZE } from '@shared/constants.ts';

const FRAME_W = TILE_SIZE;
const FRAME_H = TILE_SIZE;
const ANIM_COLS = 4;
const ANIM_ROWS = 5;
const SCALE = 2; // 24x24 논리 → 48x48 실제
const LW = FRAME_W / SCALE; // 논리 너비 = 24
const LH = FRAME_H / SCALE; // 논리 높이 = 24

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

// 24x24 워킹 버퍼 (1px = 1 논리 픽셀)
// 워킹 버퍼에 1px 찍기
function setPixel(data: Uint32Array, x: number, y: number, color: number) {
  if (x < 0 || x >= LW || y < 0 || y >= LH) return;
  data[y * LW + x] = color;
}

function getPixel(data: Uint32Array, x: number, y: number): number {
  if (x < 0 || x >= LW || y < 0 || y >= LH) return 0;
  return data[y * LW + x];
}

// RGBA → Uint32 (little endian)
function rgba(r: number, g: number, b: number, a = 255): number {
  return (a << 24) | (b << 16) | (g << 8) | r;
}

// 워킹 버퍼 → 자동 아웃라인 추가 → 대상 캔버스에 2x 업스케일 블릿
function blitWithOutline(
  data: Uint32Array,
  target: CanvasRenderingContext2D,
  tx: number, ty: number,
) {
  const OUTLINE = rgba(16, 16, 24, 255);
  const imgData = target.createImageData(FRAME_W, FRAME_H);
  const out = new Uint32Array(imgData.data.buffer);

  for (let sy = 0; sy < LH; sy++) {
    for (let sx = 0; sx < LW; sx++) {
      const c = data[sy * LW + sx];
      if (c !== 0) {
        // 원본 픽셀 → 2x
        for (let dy = 0; dy < SCALE; dy++) {
          for (let dx = 0; dx < SCALE; dx++) {
            out[(sy * SCALE + dy) * FRAME_W + (sx * SCALE + dx)] = c;
          }
        }
      } else {
        // 투명 픽셀이지만 인접에 불투명 있으면 아웃라인
        let hasNeighbor = false;
        for (const [nx, ny] of [[sx-1,sy],[sx+1,sy],[sx,sy-1],[sx,sy+1]]) {
          if (getPixel(data, nx, ny) !== 0) { hasNeighbor = true; break; }
        }
        if (hasNeighbor) {
          for (let dy = 0; dy < SCALE; dy++) {
            for (let dx = 0; dx < SCALE; dx++) {
              out[(sy * SCALE + dy) * FRAME_W + (sx * SCALE + dx)] = OUTLINE;
            }
          }
        }
      }
    }
  }

  target.putImageData(imgData, tx, ty);
}

// ═══════════════════════════════════════
// 컬러 팔레트 (조조전 스타일)
// ═══════════════════════════════════════

function pal(faction: Faction) {
  const p = faction === 'player';
  return {
    skin: rgba(240, 200, 160),     skinS: rgba(200, 152, 104),  skinL: rgba(255, 228, 200),
    armor: p ? rgba(56, 104, 184) : rgba(192, 56, 56),
    armorS: p ? rgba(32, 56, 112) : rgba(128, 32, 32),
    armorL: p ? rgba(88, 144, 224) : rgba(224, 96, 96),
    cloth: p ? rgba(72, 120, 192) : rgba(208, 72, 72),
    clothS: p ? rgba(40, 80, 160) : rgba(168, 40, 40),
    gold: rgba(232, 200, 48),      goldS: rgba(176, 144, 32),
    steel: rgba(192, 200, 216),    steelS: rgba(128, 136, 152), steelL: rgba(224, 232, 240),
    boot: rgba(80, 56, 32),        bootS: rgba(48, 24, 16),
    hair: rgba(48, 40, 40),        hairL: rgba(72, 64, 56),
    eye: rgba(16, 16, 24),         eyeW: rgba(240, 240, 240),
    horse: rgba(139, 94, 60),      horseS: rgba(92, 56, 32),    horseMane: rgba(48, 32, 24),
    wood: rgba(160, 120, 56),      woodS: rgba(112, 72, 32),
    white: rgba(240, 240, 240),    whiteS: rgba(192, 192, 192),
    shadow: rgba(0, 0, 0, 60),
  };
}

// ═══════════════════════════════════════
// 유닛 그리기 (치비 SD 스타일, 24x24 논리 해상도)
// ═══════════════════════════════════════

type DrawFn = (buf: Uint32Array, f: Faction, anim: string, frame: number) => void;

// ── 편의 함수 ──
function fillRect(buf: Uint32Array, x: number, y: number, w: number, h: number, c: number) {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) setPixel(buf, x + dx, y + dy, c);
}

function drawHead(buf: Uint32Array, x: number, y: number, c: ReturnType<typeof pal>, hasHelmet: boolean, helmetType: 'armor' | 'cloth' | 'gold' = 'armor') {
  // 투구/두건
  if (hasHelmet) {
    const hc = helmetType === 'gold' ? c.gold : helmetType === 'cloth' ? c.cloth : c.armor;
    const hcS = helmetType === 'gold' ? c.goldS : helmetType === 'cloth' ? c.clothS : c.armorS;
    const hcL = helmetType === 'gold' ? c.gold : helmetType === 'cloth' ? c.cloth : c.armorL;
    fillRect(buf, x, y, 8, 1, hcL);
    fillRect(buf, x, y + 1, 8, 2, hc);
    fillRect(buf, x + 1, y + 2, 6, 1, hcS);
  }
  // 머리카락 (투구 없을 때)
  if (!hasHelmet) {
    fillRect(buf, x, y, 8, 2, c.hair);
    fillRect(buf, x + 1, y, 6, 1, c.hairL);
  }
  // 얼굴
  const fy = hasHelmet ? y + 3 : y + 2;
  fillRect(buf, x, fy, 8, 5, c.skin);
  fillRect(buf, x + 1, fy, 6, 1, c.skinL);
  // 눈
  setPixel(buf, x + 1, fy + 2, c.eyeW);
  setPixel(buf, x + 2, fy + 2, c.eye);
  setPixel(buf, x + 5, fy + 2, c.eye);
  setPixel(buf, x + 6, fy + 2, c.eyeW);
  // 입
  setPixel(buf, x + 3, fy + 4, c.skinS);
  setPixel(buf, x + 4, fy + 4, c.skinS);
}

const drawInfantry: DrawFn = (buf, faction, anim, frame) => {
  const c = pal(faction);
  const ox = 5, oy = anim === 'idle' ? (frame % 2 === 0 ? 1 : 2) : 1;
  const atkOff = anim === 'attack' ? (frame < 2 ? frame * 2 : (3 - frame) * 2) : 0;

  // 그림자
  for (let dx = -4; dx <= 4; dx++) setPixel(buf, ox + 4 + dx, 22, c.shadow);

  // 머리
  drawHead(buf, ox, oy, c, true);

  // 갑옷 몸통
  fillRect(buf, ox - 1, oy + 8, 10, 2, c.armorL);
  fillRect(buf, ox - 1, oy + 10, 10, 3, c.armor);
  fillRect(buf, ox, oy + 12, 8, 1, c.armorS);
  // 금장 띠
  fillRect(buf, ox, oy + 11, 8, 1, c.gold);
  // 어깨
  fillRect(buf, ox - 2, oy + 8, 2, 3, c.armor);
  fillRect(buf, ox + 8, oy + 8, 2, 3, c.armor);

  // 팔 (피부)
  fillRect(buf, ox - 2, oy + 11, 2, 2, c.skin);
  fillRect(buf, ox + 8, oy + 11, 2, 2, c.skin);

  // 다리
  const legSpread = anim === 'walk' ? (frame % 2) : 0;
  fillRect(buf, ox + 1 - legSpread, oy + 13, 3, 4, c.clothS);
  fillRect(buf, ox + 4 + legSpread, oy + 13, 3, 4, c.clothS);
  // 부츠
  fillRect(buf, ox + 1 - legSpread, oy + 17, 3, 2, c.boot);
  fillRect(buf, ox + 4 + legSpread, oy + 17, 3, 2, c.boot);

  // 검
  const sx = ox + 10 + atkOff;
  if (anim === 'attack' && frame === 2) {
    // 횡베기
    fillRect(buf, ox + 8, oy + 6, 8, 1, c.steelL);
    fillRect(buf, ox + 8, oy + 7, 8, 1, c.steel);
    setPixel(buf, ox + 8, oy + 8, c.gold);
  } else {
    fillRect(buf, sx, oy + 2, 1, 7, c.steel);
    setPixel(buf, sx, oy + 1, c.steelL);
    setPixel(buf, sx - 1, oy + 9, c.gold);
    setPixel(buf, sx + 1, oy + 9, c.gold);
    fillRect(buf, sx, oy + 10, 1, 2, c.wood);
  }
};

const drawCavalry: DrawFn = (buf, faction, anim, frame) => {
  const c = pal(faction);
  const ox = 3, oy = 0;
  const legOff = anim === 'walk' ? (frame % 2) : 0;

  // 그림자
  for (let dx = -6; dx <= 6; dx++) setPixel(buf, 12 + dx, 23, c.shadow);

  // 말 몸통
  fillRect(buf, ox, oy + 13, 16, 4, c.horse);
  fillRect(buf, ox + 1, oy + 13, 14, 1, c.horseS);
  // 안장
  fillRect(buf, ox + 5, oy + 12, 6, 2, c.armor);
  fillRect(buf, ox + 6, oy + 12, 4, 1, c.armorL);
  // 말 머리
  fillRect(buf, ox + 14, oy + 10, 4, 5, c.horse);
  fillRect(buf, ox + 15, oy + 10, 2, 2, c.horseS);
  setPixel(buf, ox + 16, oy + 11, c.eye);
  // 갈기
  fillRect(buf, ox + 13, oy + 9, 2, 5, c.horseMane);
  // 말 귀
  setPixel(buf, ox + 15, oy + 9, c.horse);
  // 말 다리
  fillRect(buf, ox + 1, oy + 17, 2, 4 - legOff, c.horseS);
  fillRect(buf, ox + 5, oy + 17, 2, 4 + legOff, c.horseS);
  fillRect(buf, ox + 10, oy + 17, 2, 4 + legOff, c.horseS);
  fillRect(buf, ox + 14, oy + 17, 2, 4 - legOff, c.horseS);
  // 말 꼬리
  fillRect(buf, ox - 1, oy + 13, 2, 3, c.horseMane);

  // 기수 머리
  drawHead(buf, ox + 4, oy, c, true);

  // 기수 갑옷
  fillRect(buf, ox + 3, oy + 8, 10, 4, c.armor);
  fillRect(buf, ox + 4, oy + 8, 8, 1, c.armorL);
  fillRect(buf, ox + 4, oy + 10, 8, 1, c.gold);

  // 창
  const spx = ox + 16;
  fillRect(buf, spx, oy, 1, 12, c.wood);
  setPixel(buf, spx - 1, oy, c.steel);
  setPixel(buf, spx, oy - 1 < 0 ? 0 : oy - 1, c.steelL);
  setPixel(buf, spx + 1, oy, c.steel);
};

const drawArcher: DrawFn = (buf, faction, anim, frame) => {
  const c = pal(faction);
  const ox = 6, oy = anim === 'idle' ? (frame % 2 === 0 ? 1 : 2) : 1;

  for (let dx = -4; dx <= 4; dx++) setPixel(buf, ox + 3 + dx, 22, c.shadow);

  // 머리 (두건)
  drawHead(buf, ox - 1, oy, c, true, 'cloth');

  // 경갑
  fillRect(buf, ox - 2, oy + 8, 10, 5, c.cloth);
  fillRect(buf, ox - 1, oy + 8, 8, 2, c.armor);
  fillRect(buf, ox, oy + 11, 6, 1, c.wood); // 벨트

  // 팔
  fillRect(buf, ox - 3, oy + 8, 2, 4, c.skin);
  fillRect(buf, ox + 7, oy + 8, 2, 4, c.skin);

  // 다리
  const legSpread = anim === 'walk' ? (frame % 2) : 0;
  fillRect(buf, ox - 1 - legSpread, oy + 13, 3, 4, c.clothS);
  fillRect(buf, ox + 3 + legSpread, oy + 13, 3, 4, c.clothS);
  fillRect(buf, ox - 1 - legSpread, oy + 17, 3, 2, c.boot);
  fillRect(buf, ox + 3 + legSpread, oy + 17, 3, 2, c.boot);

  // 활
  const bowX = ox - 5;
  fillRect(buf, bowX, oy + 6, 1, 8, c.wood);
  setPixel(buf, bowX - 1, oy + 5, c.wood);
  setPixel(buf, bowX - 1, oy + 14, c.wood);
  // 시위
  fillRect(buf, bowX + 1, oy + 5, 1, 10, c.whiteS);
  // 화살 (공격 시)
  if (anim === 'attack' && frame >= 2) {
    fillRect(buf, ox + 8, oy + 9, 8, 1, c.wood);
    setPixel(buf, ox + 16 > 23 ? 23 : ox + 16, oy + 9, c.steelL);
  }
  // 화살통
  fillRect(buf, ox + 7, oy + 7, 2, 5, c.wood);
  setPixel(buf, ox + 7, oy + 6, c.white);
  setPixel(buf, ox + 8, oy + 6, c.white);
};

const drawStrategist: DrawFn = (buf, faction, anim, frame) => {
  const c = pal(faction);
  const ox = 5, oy = anim === 'idle' ? (frame % 2 === 0 ? 0 : 1) : 0;

  for (let dx = -4; dx <= 4; dx++) setPixel(buf, ox + 4 + dx, 22, c.shadow);

  // 관모 (높은 모자)
  fillRect(buf, ox + 2, oy, 4, 2, c.gold);
  fillRect(buf, ox + 3, oy - 1 < 0 ? 0 : oy - 1, 2, 1, c.goldS);

  // 머리카락
  fillRect(buf, ox, oy + 2, 8, 1, c.hair);

  // 얼굴
  fillRect(buf, ox, oy + 3, 8, 5, c.skin);
  fillRect(buf, ox + 1, oy + 3, 6, 1, c.skinL);
  setPixel(buf, ox + 1, oy + 5, c.eyeW);
  setPixel(buf, ox + 2, oy + 5, c.eye);
  setPixel(buf, ox + 5, oy + 5, c.eye);
  setPixel(buf, ox + 6, oy + 5, c.eyeW);
  // 수염
  setPixel(buf, ox + 2, oy + 7, c.hair);
  setPixel(buf, ox + 3, oy + 7, c.hair);
  setPixel(buf, ox + 4, oy + 7, c.hair);
  setPixel(buf, ox + 5, oy + 7, c.hair);

  // 로브 (넓어지는 삼각형)
  for (let dy = 0; dy < 10; dy++) {
    const w = 8 + dy;
    const lx = ox + 4 - Math.floor(w / 2);
    const co = dy < 3 ? c.armor : dy < 7 ? c.cloth : c.clothS;
    fillRect(buf, lx, oy + 8 + dy, w, 1, co);
  }
  // 중앙 세로줄
  for (let dy = 0; dy < 10; dy++) fillRect(buf, ox + 3, oy + 8 + dy, 2, 1, c.armorS);
  // 금장 띠
  for (let dy = 0; dy < 1; dy++) {
    const w = 10;
    fillRect(buf, ox + 4 - Math.floor(w / 2), oy + 11, w, 1, c.gold);
  }

  // 부채 (오른손)
  const fanX = ox + 9;
  const fanY = oy + 5;
  if (anim === 'attack') {
    // 부채 펼치기
    fillRect(buf, fanX, fanY - frame, 4 + frame, 3 + frame, c.white);
    fillRect(buf, fanX + 1, fanY - frame + 1, 2 + frame, 1 + frame, c.whiteS);
  } else {
    fillRect(buf, fanX, fanY, 3, 4, c.white);
    fillRect(buf, fanX + 1, fanY + 1, 1, 2, c.whiteS);
  }

  // 부츠
  fillRect(buf, ox + 1, oy + 18, 3, 2, c.boot);
  fillRect(buf, ox + 5, oy + 18, 3, 2, c.boot);
};

const drawBandit: DrawFn = (buf, faction, anim, frame) => {
  const c = pal(faction);
  const ox = 5, oy = anim === 'idle' ? (frame % 2 === 0 ? 1 : 2) : 1;
  const atkOff = anim === 'attack' ? (frame < 2 ? frame : 3 - frame) : 0;

  for (let dx = -4; dx <= 4; dx++) setPixel(buf, ox + 4 + dx, 22, c.shadow);

  // 두건 (검정)
  fillRect(buf, ox, oy, 8, 2, c.armorS);
  fillRect(buf, ox + 1, oy, 6, 1, c.armor);
  // 얼굴 (마스크)
  fillRect(buf, ox, oy + 2, 8, 3, c.skin);
  setPixel(buf, ox + 1, oy + 3, c.eye);
  setPixel(buf, ox + 6, oy + 3, c.eye);
  fillRect(buf, ox, oy + 5, 8, 2, c.armorS); // 마스크

  // 경갑
  fillRect(buf, ox - 1, oy + 7, 10, 5, c.cloth);
  fillRect(buf, ox, oy + 7, 3, 2, c.armor); // 어깨패드
  fillRect(buf, ox + 5, oy + 7, 3, 2, c.armor);
  fillRect(buf, ox, oy + 10, 8, 1, c.wood); // 벨트

  // 팔
  fillRect(buf, ox - 2, oy + 7, 2, 4, c.skin);
  fillRect(buf, ox + 8, oy + 7, 2, 4, c.skin);

  // 다리
  fillRect(buf, ox + 1, oy + 12, 3, 5, c.clothS);
  fillRect(buf, ox + 4, oy + 12, 3, 5, c.clothS);
  fillRect(buf, ox + 1, oy + 17, 3, 2, c.boot);
  fillRect(buf, ox + 4, oy + 17, 3, 2, c.boot);

  // 쌍단검
  fillRect(buf, ox - 3 - atkOff, oy + 3, 1, 6, c.steel);
  setPixel(buf, ox - 3 - atkOff, oy + 2, c.steelL);
  fillRect(buf, ox + 10 + atkOff, oy + 3, 1, 6, c.steel);
  setPixel(buf, ox + 10 + atkOff, oy + 2, c.steelL);
};

const drawMartialArtist: DrawFn = (buf, faction, anim, frame) => {
  const c = pal(faction);
  const ox = 5, oy = anim === 'idle' ? (frame % 2 === 0 ? 1 : 2) : 1;
  const atkOff = anim === 'attack' ? (frame < 2 ? frame * 2 : (3 - frame) * 2) : 0;

  for (let dx = -4; dx <= 4; dx++) setPixel(buf, ox + 4 + dx, 22, c.shadow);

  // 머리 (짧은 머리 + 머리띠)
  fillRect(buf, ox, oy, 8, 2, c.hair);
  fillRect(buf, ox + 1, oy, 6, 1, c.hairL);
  fillRect(buf, ox - 1, oy + 2, 10, 1, c.armor); // 머리띠

  // 얼굴
  fillRect(buf, ox, oy + 3, 8, 4, c.skin);
  fillRect(buf, ox + 1, oy + 3, 6, 1, c.skinL);
  setPixel(buf, ox + 1, oy + 4, c.eyeW);
  setPixel(buf, ox + 2, oy + 4, c.eye);
  setPixel(buf, ox + 5, oy + 4, c.eye);
  setPixel(buf, ox + 6, oy + 4, c.eyeW);
  setPixel(buf, ox + 3, oy + 6, c.skinS);
  setPixel(buf, ox + 4, oy + 6, c.skinS);

  // 도복
  fillRect(buf, ox - 1, oy + 7, 10, 5, c.cloth);
  fillRect(buf, ox, oy + 7, 4, 5, c.armor); // 앞여밈
  fillRect(buf, ox - 1, oy + 10, 10, 1, c.gold); // 금띠
  fillRect(buf, ox - 1, oy + 11, 10, 1, c.goldS);

  // 맨팔
  fillRect(buf, ox - 2, oy + 7, 2, 4, c.skin);
  fillRect(buf, ox + 8, oy + 7, 2, 4, c.skin);
  // 주먹
  fillRect(buf, ox - 3 - atkOff, oy + 10, 2, 2, c.skin);
  fillRect(buf, ox + 9 + atkOff, oy + 10, 2, 2, c.skin);

  // 넓은 바지
  fillRect(buf, ox, oy + 12, 4, 5, c.clothS);
  fillRect(buf, ox + 4, oy + 12, 4, 5, c.clothS);
  fillRect(buf, ox + 1, oy + 17, 3, 2, c.boot);
  fillRect(buf, ox + 5, oy + 17, 3, 2, c.boot);
};

const CLASS_DRAWERS: Record<string, DrawFn> = {
  infantry: drawInfantry,
  cavalry: drawCavalry,
  archer: drawArcher,
  strategist: drawStrategist,
  bandit: drawBandit,
  martial_artist: drawMartialArtist,
};

// ═══════════════════════════════════════
// 메인 생성 함수
// ═══════════════════════════════════════

export function generateUnitSpritesheet(scene: Phaser.Scene, unitClass: UnitClass, faction: Faction): string {
  const key = `unit_${unitClass}_${faction}`;
  if (scene.textures.exists(key)) return key;

  const width = FRAME_W * ANIM_COLS;
  const height = FRAME_H * ANIM_ROWS;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const drawFn = CLASS_DRAWERS[unitClass] ?? CLASS_DRAWERS.infantry;
  const anims = ['idle', 'walk', 'attack', 'hit', 'die'];
  const buf = new Uint32Array(LW * LH);

  for (let row = 0; row < ANIM_ROWS; row++) {
    for (let col = 0; col < ANIM_COLS; col++) {
      buf.fill(0);
      drawFn(buf, faction, anims[row], col);

      // hit: 깜빡임
      if (anims[row] === 'hit' && col % 2 === 0) {
        for (let i = 0; i < buf.length; i++) {
          if (buf[i] !== 0) {
            const a = (buf[i] >> 24) & 0xff;
            buf[i] = (buf[i] & 0x00ffffff) | (Math.floor(a * 0.4) << 24);
          }
        }
      }
      // die: 점점 투명
      if (anims[row] === 'die') {
        const alpha = 1 - col * 0.3;
        for (let i = 0; i < buf.length; i++) {
          if (buf[i] !== 0) {
            const a = (buf[i] >> 24) & 0xff;
            buf[i] = (buf[i] & 0x00ffffff) | (Math.floor(a * alpha) << 24);
          }
        }
      }

      blitWithOutline(buf, ctx, col * FRAME_W, row * FRAME_H);
    }
  }

  addCanvasAsSpriteSheet(scene, key, canvas, FRAME_W, FRAME_H);
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
// 타일셋 (자동 아웃라인 적용)
// ═══════════════════════════════════════

type TileDrawFn = (buf: Uint32Array) => void;

const drawPlainTile: TileDrawFn = (buf) => {
  const base = rgba(106, 158, 76);
  const grass1 = rgba(90, 142, 60);
  const grass2 = rgba(122, 174, 92);
  const dirt = rgba(138, 152, 100);
  fillRect(buf, 0, 0, LW, LH, base);
  for (let i = 0; i < 12; i++) {
    const gx = (i * 7 + 3) % (LW - 1);
    const gy = (i * 11 + 5) % (LH - 1);
    setPixel(buf, gx, gy, grass1);
    setPixel(buf, gx, gy > 0 ? gy - 1 : 0, grass2);
  }
  for (let i = 0; i < 4; i++) {
    setPixel(buf, (i * 13 + 7) % LW, (i * 9 + 3) % LH, dirt);
  }
};

const drawForestTile: TileDrawFn = (buf) => {
  fillRect(buf, 0, 0, LW, LH, rgba(74, 122, 48));
  const trees: [number, number][] = [[5, 3], [14, 5], [9, 13], [18, 10]];
  for (const [tx, ty] of trees) {
    // 줄기
    fillRect(buf, tx, ty + 5, 2, 4, rgba(90, 58, 26));
    // 잎
    fillRect(buf, tx - 3, ty, 8, 4, rgba(42, 90, 20));
    fillRect(buf, tx - 2, ty - 1 < 0 ? 0 : ty - 1, 6, 2, rgba(58, 106, 36));
    fillRect(buf, tx - 1, ty + 3, 4, 2, rgba(42, 90, 20));
    setPixel(buf, tx - 1, ty, rgba(74, 138, 52)); // 하이라이트
  }
};

const drawMountainTile: TileDrawFn = (buf) => {
  fillRect(buf, 0, 0, LW, LH, rgba(122, 112, 96));
  for (let dy = 0; dy < 16; dy++) {
    const w = 2 + dy;
    const x0 = 12 - Math.floor(w / 2);
    fillRect(buf, x0, 3 + dy, w, 1, rgba(90, 84, 72));
  }
  fillRect(buf, 10, 3, 4, 2, rgba(224, 224, 224));
  fillRect(buf, 11, 5, 2, 1, rgba(208, 208, 208));
};

const drawWaterTile: TileDrawFn = (buf) => {
  fillRect(buf, 0, 0, LW, LH, rgba(42, 90, 144));
  for (let wy = 2; wy < LH; wy += 4) {
    for (let wx = 0; wx < LW; wx += 2) {
      const shade = ((wx + wy) % 4 === 0) ? rgba(58, 106, 160) : rgba(26, 74, 128);
      setPixel(buf, wx, wy + (wx % 4 < 2 ? 0 : 1), shade);
    }
  }
  setPixel(buf, 8, 6, rgba(106, 170, 208));
  setPixel(buf, 16, 14, rgba(106, 170, 208));
};

const drawBridgeTile: TileDrawFn = (buf) => {
  fillRect(buf, 0, 0, LW, LH, rgba(42, 90, 144));
  fillRect(buf, 2, 3, 20, 18, rgba(138, 106, 42));
  fillRect(buf, 3, 4, 18, 16, rgba(160, 122, 58));
  for (let i = 0; i < 5; i++) fillRect(buf, 3, 5 + i * 4, 18, 1, rgba(122, 90, 26));
  fillRect(buf, 2, 2, 20, 1, rgba(106, 74, 16));
  fillRect(buf, 2, 21, 20, 1, rgba(106, 74, 16));
};

const TILE_DRAWERS: Record<string, TileDrawFn> = {
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
  const buf = new Uint32Array(LW * LH);

  for (let i = 0; i < tileTypes.length; i++) {
    buf.fill(0);
    TILE_DRAWERS[tileTypes[i]]?.(buf);
    // 타일은 아웃라인 없이 직접 2x 스케일
    const imgData = ctx.createImageData(FRAME_W, FRAME_H);
    const out = new Uint32Array(imgData.data.buffer);
    for (let sy = 0; sy < LH; sy++) {
      for (let sx = 0; sx < LW; sx++) {
        const c = buf[sy * LW + sx];
        for (let dy = 0; dy < SCALE; dy++) {
          for (let dx = 0; dx < SCALE; dx++) {
            out[(sy * SCALE + dy) * FRAME_W + (sx * SCALE + dx)] = c;
          }
        }
      }
    }
    ctx.putImageData(imgData, i * FRAME_W, 0);
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
    const buf = new Uint32Array(LW * LH);

    for (let i = 0; i < 4; i++) {
      buf.fill(0);
      // 불꽃 3줄기
      const flames: [number, number][] = [[6, 18 + i * 2], [12, 15 + i * 3], [17, 12 + i * 2]];
      for (const [fx, fh] of flames) {
        for (let dy = 0; dy < fh; dy++) {
          const w = Math.max(1, Math.floor((fh - dy) / 4) + 1);
          const co = dy < fh * 0.3 ? rgba(255, 238, 68) : dy < fh * 0.6 ? rgba(255, 170, 0) : rgba(255, 68, 0, 200);
          fillRect(buf, fx - Math.floor(w / 2), LH - 2 - dy, w, 1, co);
        }
      }
      blitWithOutline(buf, ctx, i * FRAME_W, 0);
    }
    addCanvasAsSpriteSheet(scene, 'fx_fire', canvas, FRAME_W, FRAME_H);
    scene.anims.create({
      key: 'fx_fire_play',
      frames: scene.anims.generateFrameNumbers('fx_fire', { start: 0, end: 3 }),
      frameRate: 8, repeat: 0,
    });
  }

  if (!scene.textures.exists('fx_heal')) {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_W * 4;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext('2d')!;
    const buf = new Uint32Array(LW * LH);

    for (let i = 0; i < 4; i++) {
      buf.fill(0);
      const cx = 12, cy = 12;
      // 빛 입자
      const n = 4 + i * 2;
      for (let p = 0; p < n; p++) {
        const angle = (p / n) * Math.PI * 2 + i * 0.5;
        const dist = 4 + i * 2;
        const px2 = cx + Math.round(Math.cos(angle) * dist);
        const py2 = cy + Math.round(Math.sin(angle) * dist) - i;
        setPixel(buf, px2, py2, rgba(136, 255, 170));
      }
      // 십자
      fillRect(buf, cx, cy - 4 - i, 1, 8 + i * 2, rgba(255, 255, 255));
      fillRect(buf, cx - 4 - i, cy, 8 + i * 2, 1, rgba(255, 255, 255));
      blitWithOutline(buf, ctx, i * FRAME_W, 0);
    }
    addCanvasAsSpriteSheet(scene, 'fx_heal', canvas, FRAME_W, FRAME_H);
    scene.anims.create({
      key: 'fx_heal_play',
      frames: scene.anims.generateFrameNumbers('fx_heal', { start: 0, end: 3 }),
      frameRate: 6, repeat: 0,
    });
  }
}
