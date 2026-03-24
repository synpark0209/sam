import { useEffect, useRef, useState } from 'react';
import { PhaserGame } from './game/PhaserGame.tsx';
import type { IRefPhaserGame } from './game/PhaserGame.tsx';
import { EventBus } from './game/EventBus.ts';
import { AuthModal } from './components/AuthModal.tsx';
import { isTelegramMiniApp, getTelegramInitData, initTelegramApp } from './telegram.ts';
import { loginWithTelegram, isLoggedIn } from './api/client.ts';

function App() {
  const phaserRef = useRef<IRefPhaserGame>(null);
  const [showAuth, setShowAuth] = useState(false);

  // 텔레그램 미니앱 자동 로그인
  useEffect(() => {
    if (!isTelegramMiniApp()) return;
    initTelegramApp();

    if (isLoggedIn()) return;

    const initData = getTelegramInitData();
    if (!initData) return;

    loginWithTelegram(initData).then(() => {
      const game = phaserRef.current?.game;
      if (game) {
        for (const s of game.scene.getScenes(true)) {
          game.scene.stop(s.scene.key);
        }
        game.scene.start('TitleScene');
      }
    }).catch((err) => {
      console.warn('Telegram auto-login failed:', err);
    });
  }, []);

  useEffect(() => {
    const restartTitleScene = () => {
      const game = phaserRef.current?.game;
      if (game) {
        for (const s of game.scene.getScenes(true)) {
          game.scene.stop(s.scene.key);
        }
        game.scene.start('TitleScene');
      }
    };

    const onShowAuth = () => {
      // 텔레그램 환경에서는 자동 로그인 시도, 실패 시 일반 모달
      if (isTelegramMiniApp()) {
        const initData = getTelegramInitData();
        if (initData) {
          loginWithTelegram(initData).then(() => {
            restartTitleScene();
          }).catch(() => {
            setShowAuth(true);
          });
          return;
        }
      }
      setShowAuth(true);
    };

    EventBus.on('show-auth', onShowAuth);

    return () => {
      EventBus.off('show-auth', onShowAuth);
    };
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <PhaserGame ref={phaserRef} />
      {/* UnitInfoPanel은 BattleScene 내 Phaser UI로 대체됨 */}
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
