import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ALL_TAGS } from '../lib/queries';

interface Tag { id: string; name: string; }

interface TagEditorProps {
  tags: Tag[];
  onAdd: (tagName: string) => Promise<void>;
  onRemove?: (tagName: string) => Promise<void>;
  /** 카드 위 호버 시에만 편집 버튼 노출할 경우 true */
  compact?: boolean;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: tagData } = useQuery(GET_ALL_TAGS, {
    variables: { keyword: input.trim() || undefined, limit: 8, page: 1 },
    skip: !input.trim(),
  });

  const suggestions: string[] = (tagData?.getAllTags ?? [])
    .map((t: any) => t.name)
    .filter((name: string) => !tags.some(t => t.name === name));

  // 외부 클릭 시 편집 모드 종료
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setInput('');
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 편집 모드 진입 시 input focus
  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleAdd = async (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed || tags.some(t => t.name === trimmed) || saving) return;
    setSaving(true);
    try {
      await onAdd(trimmed);
      setInput('');
      setShowDropdown(false);
      // 편집 모드 유지 (연속 추가 편의)
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
    // 입력이 비어있을 때 Backspace → 마지막 태그 제거
    if (e.key === 'Backspace' && input === '' && onRemove && tags.length > 0) {
      handleRemove(tags[tags.length - 1].name);
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div ref={wrapperRef} className="flex flex-wrap items-center gap-1 mt-1">
      {/* 기존 태그 */}
      {tags.map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-0.5 text-xs font-medium transition-all"
          style={{ color: 'var(--accent)' }}
        >
          #{tag.name}
          {isEditing && onRemove && (
            <button
              type="button"
              onClick={() => handleRemove(tag.name)}
              disabled={removingTag === tag.name}
              title="태그 제거"
              className="ml-0.5 hover:opacity-100 transition-opacity disabled:opacity-30"
              style={{
                color: '#ff8a8a',
                fontSize: '9px',
                lineHeight: 1,
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
            className="px-2 py-0.5 rounded text-xs focus:outline-none"
            disabled={saving}
            // 입력 길이에 따라 너비 동적 조정
            size={Math.max(input.length + 2, 8)}
          />
          {/* 자동완성 드롭다운 */}
          {showDropdown && suggestions.length > 0 && (
            <div
              className="absolute left-0 top-full mt-1 rounded-lg overflow-hidden z-50 shadow-xl"
              style={{
                backgroundColor: 'var(--bg-nav)',
                border: '1px solid var(--border)',
                minWidth: '120px',
              }}
            >
              {suggestions.map(name => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); handleAdd(name); }}
                  className="w-full px-3 py-1.5 text-xs text-left transition-colors"
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
        /* + 태그 버튼: compact 모드면 부모 group-hover로 제어 */
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setIsEditing(true); }}
          title="태그 추가"
          className={`text-xs px-1.5 py-0.5 rounded transition-all hover:opacity-100 ${
            compact ? 'opacity-0 group-hover:opacity-60' : 'opacity-60'
          }`}
          style={{
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)',
          }}
        >
          + 태그
        </button>
      )}

      {/* 편집 모드 안내 */}
      {isEditing && (
        <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
          Enter로 추가 · Esc로 닫기
        </span>
      )}
    </div>
  );
};
