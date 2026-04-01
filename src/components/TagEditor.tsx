import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ALL_TAGS } from '../lib/queries';

interface Tag { id: string; name: string; }

interface TagEditorProps {
  tags: Tag[];
  onAdd: (tagName: string) => Promise<void>;
  onRemove?: (tagName: string) => Promise<void>;
  compact?: boolean;
}

// ── 터치 디바이스 감지 ──────────────────────────────────────
const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const TagEditor: React.FC<TagEditorProps> = ({
  tags,
  onAdd,
  onRemove,
  compact = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingTag, setRemovingTag] = useState<string | null>(null);
  // 드롭다운을 위로 열지 아래로 열지
  const [dropUp, setDropUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: tagData } = useQuery(GET_ALL_TAGS, {
    variables: { keyword: input.trim() || undefined, limit: 8, page: 1 },
    skip: !input.trim(),
  });

  const suggestions: string[] = (tagData?.getAllTags ?? [])
    .map((t: any) => t.name)
    .filter((name: string) => !tags.some(t => t.name === name));

  // 외부 클릭/터치 시 편집 모드 종료
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setInput('');
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // 편집 모드 진입 시 input focus & 드롭다운 방향 계산
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      // 화면 하단 여백이 좁으면 위로 열기
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropUp(window.innerHeight - rect.bottom < 180);
      }
    }
  }, [isEditing]);

  const handleAdd = async (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed || tags.some(t => t.name === trimmed) || saving) return;
    setSaving(true);
    try {
      await onAdd(trimmed);
      setInput('');
      setShowDropdown(false);
    } catch {
      // 에러는 부모가 처리
    } finally {
      setSaving(false);
      inputRef.current?.focus();
    }
  };

  const handleRemove = async (tagName: string) => {
    if (!onRemove || removingTag) return;
    setRemovingTag(tagName);
    try { await onRemove(tagName); }
    finally { setRemovingTag(null); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(input); }
    if (e.key === 'Escape') { setIsEditing(false); setInput(''); setShowDropdown(false); }
    if (e.key === 'Backspace' && input === '' && onRemove && tags.length > 0) {
      handleRemove(tags[tags.length - 1].name);
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  // compact 모드일 때:
  // - 터치 디바이스 → 항상 표시 (opacity-40)
  // - 마우스 디바이스 → group-hover 시 표시
  const addBtnClass = compact
    ? isTouchDevice()
      ? 'opacity-40 hover:opacity-80'
      : 'opacity-0 group-hover:opacity-60 hover:opacity-100'
    : 'opacity-60 hover:opacity-100';

  return (
    <div ref={wrapperRef} className="flex flex-wrap items-center gap-1 mt-1">
      {/* 기존 태그 */}
      {tags.map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-0.5 text-xs font-medium"
          style={{ color: 'var(--accent)' }}
        >
          #{tag.name}
          {isEditing && onRemove && (
            <button
              type="button"
              onClick={() => handleRemove(tag.name)}
              disabled={removingTag === tag.name}
              title="태그 제거"
              // 모바일에서 터치 타겟 확보
              className="ml-0.5 p-0.5 hover:opacity-100 transition-opacity disabled:opacity-30 touch-manipulation"
              style={{
                color: '#ff8a8a',
                fontSize: '10px',
                lineHeight: 1,
                minWidth: '16px',
                minHeight: '16px',
                opacity: removingTag === tag.name ? 0.3 : 0.7,
              }}
            >
              ✕
            </button>
          )}
        </span>
      ))}

      {/* 편집 입력 */}
      {isEditing ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setShowDropdown(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => input.trim() && setShowDropdown(true)}
            placeholder="태그명..."
            style={inputStyle}
            // 모바일에서 최소 너비 보장
            className="px-2 py-1 rounded text-xs focus:outline-none min-w-[72px]"
            disabled={saving}
            size={Math.max(input.length + 2, 8)}
          />

          {/* 자동완성 드롭다운 — 위/아래 동적 전환 */}
          {showDropdown && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className={`absolute left-0 rounded-lg overflow-hidden z-50 shadow-xl ${
                dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
              }`}
              style={{
                backgroundColor: 'var(--bg-nav)',
                border: '1px solid var(--border)',
                minWidth: '140px',
                // 화면 오른쪽 넘침 방지
                maxWidth: 'min(200px, calc(100vw - 32px))',
              }}
            >
              {suggestions.map(name => (
                <button
                  key={name}
                  type="button"
                  // 모바일: onTouchEnd도 처리
                  onMouseDown={e => { e.preventDefault(); handleAdd(name); }}
                  onTouchEnd={e => { e.preventDefault(); handleAdd(name); }}
                  className="w-full px-3 py-2 text-xs text-left transition-colors touch-manipulation"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ color: 'var(--accent)' }}>#</span> {name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setIsEditing(true); }}
          title="태그 추가"
          // 모바일 터치 타겟 확보
          className={`text-xs px-2 py-1 rounded transition-all touch-manipulation ${addBtnClass}`}
          style={{
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)',
            minHeight: '24px',
          }}
        >
          + 태그
        </button>
      )}

      {/* 편집 모드 안내: 터치면 숨김 (키보드 힌트 불필요) */}
      {isEditing && !isTouchDevice() && (
        <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
          Enter로 추가 · Esc로 닫기
        </span>
      )}
    </div>
  );
};
