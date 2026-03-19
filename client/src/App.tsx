import { useEffect, useRef, useState } from 'react';
import { PhaserGame } from './game/PhaserGame.tsx';
import type { IRefPhaserGame } from './game/PhaserGame.tsx';
import { EventBus } from './game/EventBus.ts';
import { UnitInfoPanel } from './components/UnitInfoPanel.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { isTelegramMiniApp, getTelegramInitData, initTelegramApp } from './telegram.ts';
import { loginWithTelegram, isLoggedIn } from './api/client.ts';
import type { UnitData } from '@shared/types/index.ts';

function App() {
  const phaserRef = useRef<IRefPhaserGame>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitData | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // 텔레그램 미니앱 자동 로그인
  useEffect(() => {
    if (!isTelegramMiniApp()) return;
    initTelegramApp();

    if (isLoggedIn()) return;

    const initData = getTelegramInitData();
    if (!initData) return;

    loginWithTelegram(initData).catch((err) => {
      console.warn('Telegram auto-login failed:', err);
    });
  }, []);

  useEffect(() => {
    const onUnitSelected = (unit: UnitData | null) => {
      setSelectedUnit(unit ? { ...unit, stats: { ...unit.stats }, position: { ...unit.position } } : null);
    };
    const onShowAuth = () => {
      // 텔레그램 환경에서는 인증 모달 대신 자동 로그인 시도
      if (isTelegramMiniApp()) {
        const initData = getTelegramInitData();
        if (initData) {
          loginWithTelegram(initData).then(() => {
            const game = phaserRef.current?.game;
            if (game) {
              for (const s of game.scene.getScenes(true)) {
                game.scene.stop(s.scene.key);
              }
              game.scene.start('TitleScene');
            }
          }).catch(() => {});
          return;
        }
      }
      setShowAuth(true);
    };

    EventBus.on('unit-selected', onUnitSelected);
    EventBus.on('show-auth', onShowAuth);

    return () => {
      EventBus.off('unit-selected', onUnitSelected);
      EventBus.off('show-auth', onShowAuth);
    };
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <PhaserGame ref={phaserRef} />
      {selectedUnit && <UnitInfoPanel unit={selectedUnit} />}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            // Phaser game의 scene manager로 TitleScene 재시작
            const game = phaserRef.current?.game;
            if (game) {
              // 현재 실행 중인 모든 씬을 중지하고 TitleScene 시작
              for (const s of game.scene.getScenes(true)) {
                game.scene.stop(s.scene.key);
              }
              game.scene.start('TitleScene');
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
