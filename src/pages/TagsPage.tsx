import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALL_TAGS, ADD_TAG, DELETE_TAG } from '../lib/queries';
import { TagModel, TagSortBy, SortOrder } from '../types/models';
import { useAuth } from '../context/AuthContext';

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
const btnPrimary: React.CSSProperties = { backgroundColor: 'var(--accent)', color: '#1a1a1a' };
const btnSecondary: React.CSSProperties = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' };

export const TagsPage: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [sortBy, setSortBy] = useState<TagSortBy>('NAME');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');
  const [page, setPage] = useState(1);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const { data, loading, refetch } = useQuery(GET_ALL_TAGS, {
    variables: { keyword: debouncedKeyword || undefined, sortBy, sortOrder, page, limit: 50 },
  });

  const [addTag] = useMutation(ADD_TAG);
  const [deleteTag] = useMutation(DELETE_TAG);
  const tags: TagModel[] = data?.getAllTags ?? [];

  useEffect(() => { refetch(); }, [debouncedKeyword, sortBy, sortOrder, page]);

  const handleAdd = async () => {
    if (!keyword.trim()) return;
    setAddError('');
    try {
      await addTag({ variables: { tagInput: { name: keyword.trim() } } });
      setKeyword('');
      refetch();
    } catch (err: any) {
      setAddError(err.message || '태그 추가 실패');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" 태그를 삭제하시겠어요?`)) return;
    await deleteTag({ variables: { id } });
    refetch();
  };

  const isExactMatch = tags.some(t => t.name === keyword.trim());

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 pt-12 pb-6">

        {/* 검색 + 추가 - 플레이리스트와 동일한 레이아웃 */}
        <div className="mb-4">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="태그 검색 또는 추가..."
              style={inputStyle}
              className="flex-1 px-4 py-2 rounded-lg text-sm placeholder-gray-500 focus:outline-none"
            />

            {/* 🔥 정렬을 여기로 이동 */}
            <div className="relative">
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={e => {
                  const [by, order] = e.target.value.split('_');
                  setSortBy(by as TagSortBy);
                  setSortOrder(order as SortOrder);
                }}
                style={inputStyle}
                className="appearance-none px-4 pr-10 py-2 rounded-lg text-sm focus:outline-none cursor-pointer"
              >
                <option value="NAME_ASC">이름↑</option>
                <option value="NAME_DESC">이름↓</option>
                <option value="CREATED_AT_DESC">최신</option>
                <option value="CREATED_AT_ASC">오래된</option>
              </select>

              {/* 🔥 화살표 */}
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <path d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>

            {keyword.trim() && !isExactMatch && (
              <button
                onClick={handleAdd}
                style={btnPrimary}
                className="px-4 py-2 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity"
              >
                + 생성
              </button>
            )}
          </div>

          {addError && (
            <p className="text-sm mt-1" style={{ color: '#ff8a8a' }}>
              {addError}
            </p>
          )}
        </div>

        {/* 리스트 */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40">
            <img
              src="/logo.png"
              alt="태그 없음"
              className="w-[300px] sm:w-[400px] lg:w-[500px] h-auto opacity-20 grayscale"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            {tags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors group"
                style={{ backgroundColor: 'var(--bg-card)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-input)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>#</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tag.name}</span>
                </div>
                {isLoggedIn && (
                  <button
                    onClick={() => handleDelete(tag.id, tag.name)}
                    className="text-xs opacity-0 group-hover:opacity-100 hover:opacity-70 transition-all"
                    style={{ color: '#ff8a8a' }}
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        <div className="flex justify-center gap-2 mt-8">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={btnSecondary} className="px-5 py-2 rounded-lg text-sm disabled:opacity-40 hover:opacity-80 transition-opacity">이전</button>
          <span className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>{page} 페이지</span>
          <button disabled={tags.length < 50} onClick={() => setPage(p => p + 1)} style={btnSecondary} className="px-5 py-2 rounded-lg text-sm disabled:opacity-40 hover:opacity-80 transition-opacity">다음</button>
        </div>
      </div>
    </div>
  );
};
