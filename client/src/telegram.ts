/** Telegram WebApp SDK 타입 및 유틸리티 */

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  platform: string;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function isTelegramMiniApp(): boolean {
  const tg = getTelegramWebApp();
  return !!tg && !!tg.initData && tg.initData.length > 0;
}

export function getTelegramInitData(): string | null {
  const tg = getTelegramWebApp();
  if (!tg || !tg.initData || tg.initData.length === 0) return null;
  return tg.initData;
}

export function initTelegramApp(): void {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.ready();
  tg.expand();
}
