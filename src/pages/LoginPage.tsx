import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoggedIn) { navigate('/videos'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await login(loginId, password);
      navigate('/videos');
    } catch (err: any) {
      setError(err.message || '로그인에 실패했어요.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🎬</span>
            <span className="font-bold text-2xl" style={{ color: 'var(--accent)' }}>SeanLink</span>
          </div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>어드민 로그인</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>관리자 계정으로 로그인하세요</p>
        </div>

        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>아이디</label>
              <input
                type="text"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                required autoFocus
                placeholder="아이디 입력"
                style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                className="w-full px-4 py-2.5 rounded-lg text-sm placeholder-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="비밀번호 입력"
                style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                className="w-full px-4 py-2.5 rounded-lg text-sm placeholder-gray-500 focus:outline-none"
              />
            </div>
            {error && (
              <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#4a1a1a', border: '1px solid #7a2a2a' }}>
                <p className="text-sm" style={{ color: '#ff8a8a' }}>{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: 'var(--accent)', color: '#1a1a1a' }}
              className="w-full py-2.5 font-bold rounded-lg text-sm disabled:opacity-50 hover:opacity-80 transition-opacity mt-2"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
