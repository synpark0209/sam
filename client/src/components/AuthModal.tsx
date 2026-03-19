import { useState } from 'react';
import { login, register } from '../api/client.ts';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) { setError('아이디와 비밀번호를 입력하세요'); return; }
    setLoading(true);
    setError('');
    try {
      const res = mode === 'login' ? await login(username, password) : await register(username, password);
      localStorage.setItem('jojo_auth_username', res.username);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #4a4a6a', borderRadius: 12,
        padding: '24px 32px', minWidth: 280, color: '#fff',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#ffd700', textAlign: 'center' }}>
          {mode === 'login' ? '로그인' : '회원가입'}
        </h3>

        <input
          placeholder="아이디" value={username}
          onChange={e => setUsername(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="비밀번호 (4자 이상)" type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={inputStyle}
        />

        {error && <div style={{ color: '#ff6666', fontSize: 13, marginBottom: 8 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading} style={btnStyle}>
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13 }}>
          <span style={{ color: '#888' }}>
            {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
          </span>
          <span
            style={{ color: '#6688cc', cursor: 'pointer' }}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? '회원가입' : '로그인'}
          </span>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <span style={{ color: '#666', fontSize: 12, cursor: 'pointer' }} onClick={onClose}>
            닫기
          </span>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 12px', marginBottom: 10,
  background: '#0e0e1e', border: '1px solid #4a4a6a', borderRadius: 6,
  color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none',
};

const btnStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '10px', marginTop: 4,
  background: '#3366aa', border: 'none', borderRadius: 6,
  color: '#fff', fontSize: 16, cursor: 'pointer',
};
