import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/videos', label: '비디오' },
  { path: '/playlists', label: '플레이리스트' },
  { path: '/tags', label: '태그 관리' },
  { path: '/report', label: '신고/문의' },
];

export const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const { isLoggedIn, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        style={{ backgroundColor: 'var(--bg-nav)', borderBottom: '1px solid var(--border)' }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* 로고 + 브랜드명 */}
          <Link to="/videos" className="flex items-center gap-1.5 flex-shrink-0">
            <img
              src="/logo.png"
              alt="SeanLink Logo"
              className="w-10 h-10 object-contain transition-transform duration-200 hover:scale-110"
            />
            <span className="font-bold text-base tracking-tight" style={{ color: 'var(--accent)' }}>
              SeanLink
            </span>
          </Link>

          {/* ── 데스크탑 네브 링크 (md 이상) ── */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                style={
                  pathname.startsWith(path)
                    ? { color: 'var(--accent)', backgroundColor: 'var(--bg-card)' }
                    : { color: 'var(--text-secondary)' }
                }
                className="px-3 py-1.5 rounded text-sm font-medium transition-colors hover:opacity-80 whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* 데스크탑 로그아웃 */}
          {isLoggedIn && (
            <button
              onClick={logout}
              style={{ color: 'var(--text-muted)' }}
              className="hidden md:block ml-auto px-3 py-1.5 rounded text-sm font-medium hover:opacity-80 transition-opacity whitespace-nowrap flex-shrink-0"
            >
              로그아웃
            </button>
          )}

          {/* ── 모바일 햄버거 버튼 (md 미만) ── */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden ml-auto flex-shrink-0 flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="메뉴"
          >
            <span
              className="block w-5 h-0.5 transition-all duration-200"
              style={{
                backgroundColor: 'currentColor',
                transform: menuOpen ? 'translateY(8px) rotate(45deg)' : 'none',
              }}
            />
            <span
              className="block w-5 h-0.5 transition-all duration-200"
              style={{
                backgroundColor: 'currentColor',
                opacity: menuOpen ? 0 : 1,
              }}
            />
            <span
              className="block w-5 h-0.5 transition-all duration-200"
              style={{
                backgroundColor: 'currentColor',
                transform: menuOpen ? 'translateY(-8px) rotate(-45deg)' : 'none',
              }}
            />
          </button>
        </div>

        {/* ── 모바일 드롭다운 메뉴 ── */}
        {menuOpen && (
          <div
            className="md:hidden px-4 pb-3 space-y-1"
            style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-nav)' }}
          >
            {NAV_ITEMS.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMenuOpen(false)}
                style={
                  pathname.startsWith(path)
                    ? { color: 'var(--accent)', backgroundColor: 'var(--bg-card)' }
                    : { color: 'var(--text-secondary)' }
                }
                className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
              >
                {label}
              </Link>
            ))}
            {isLoggedIn && (
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                style={{ color: 'var(--text-muted)' }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
              >
                로그아웃
              </button>
            )}
          </div>
        )}
      </nav>

      {/* 메뉴 열렸을 때 배경 오버레이 (터치로 닫기) */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
};
