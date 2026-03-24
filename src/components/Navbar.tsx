import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/videos', label: '비디오' },
  { path: '/playlists', label: '플레이리스트' },
  { path: '/tags', label: '태그 관리' },
];

export const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const { isLoggedIn, logout } = useAuth();

  return (
    <nav style={{ backgroundColor: 'var(--bg-nav)', borderBottom: '1px solid var(--border)' }}
      className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-6 h-20 flex items-center justify-between">
      <Link to="/videos" className="flex items-center gap-3 mr-10">
        <img
          src="/logo.png"
          alt="SeanLink Logo"
          className="w-16 h-16 object-contain transition-transform duration-200 hover:scale-110"
        />
        <span className="font-bold text-xl tracking-tight text-[var(--accent)]">
          SeanLink
        </span>
      </Link>
        {/* Nav Links */}
        <div className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              style={
                pathname.startsWith(path)
                  ? { color: 'var(--accent)', backgroundColor: 'var(--bg-card)' }
                  : { color: 'var(--text-secondary)' }
              }
              className="px-4 py-1.5 rounded text-sm font-medium transition-colors hover:opacity-80"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        {isLoggedIn ? (
          <button
            onClick={logout}
            style={{ color: 'var(--text-muted)' }}
            className="px-4 py-1.5 rounded text-sm font-medium hover:opacity-80 transition-opacity"
          >
            로그아웃
          </button>
        ) : (
          <Link
            to="/login"
            style={{ backgroundColor: 'var(--accent)', color: '#1a1a1a' }}
            className="px-4 py-1.5 rounded text-sm font-bold transition-opacity hover:opacity-80"
          >
            어드민 로그인
          </Link>
        )}
      </div>
    </nav>
  );
};
