import React, { useState } from 'react';
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
  const [sortBy, setSortBy] = useState<TagSortBy>('NAME');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');
  const [page, setPage] = useState(1);
  const [newTagName, setNewTagName] = useState('');
  const [addError, setAddError] = useState('');

  const { data, loading, refetch } = useQuery(GET_ALL_TAGS, {
    variables: { keyword: keyword || undefined, sortBy, sortOrder, page, limit: 50 },
  });
  const [addTag, { loading: adding }] = useMutation(ADD_TAG);
  const [deleteTag] = useMutation(DELETE_TAG);
  const tags: TagModel[] = data?.getAllTags ?? [];

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); refetch(); };
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setAddError('');
    if (!newTagName.trim()) return;
    try {
      await addTag({ variables: { tagInput: { name: newTagName.trim() } } });
      setNewTagName(''); refetch();
    } catch (err: any) { setAddError(err.message || '태그 추가에 실패했어요.'); }
  };
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" 태그를 삭제하시겠어요?`)) return;
    await deleteTag({ variables: { id } });
    refetch();
  };

  return (
    <div className="min-h-screen pt-16" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-screen-md mx-auto px-4 pt-10 pb-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>태그 관리</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>영상과 플레이리스트에 연결된 태그</p>
        </div>

        {/* 태그 추가 - 누구나 사용 가능 */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder="새 태그 이름"
              style={inputStyle}
              className="flex-1 px-3 py-2 rounded-lg text-sm placeholder-gray-500 focus:outline-none"
            />
            <button type="submit" disabled={adding} style={btnPrimary} className="px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:opacity-80 transition-opacity">
              {adding ? '추가 중...' : '+ 추가'}
            </button>
          </form>
          {addError && <p className="text-sm mt-2" style={{ color: '#ff8a8a' }}>{addError}</p>}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input type="text" placeholder="태그 검색..." value={keyword} onChange={e => setKeyword(e.target.value)} style={inputStyle} className="flex-1 px-4 py-2 rounded-lg text-sm placeholder-gray-500 focus:outline-none" />
          <select value={`${sortBy}_${sortOrder}`} onChange={e => { const [by, order] = e.target.value.split('_'); setSortBy(by as TagSortBy); setSortOrder(order as SortOrder); }} style={inputStyle} className="px-3 py-2 rounded-lg text-sm focus:outline-none">
            <option value="NAME_ASC">이름 오름차순</option>
            <option value="NAME_DESC">이름 내림차순</option>
            <option value="CREATED_AT_DESC">최신순</option>
            <option value="CREATED_AT_ASC">오래된순</option>
          </select>
          <button type="submit" style={btnPrimary} className="px-5 py-2 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity">검색</button>
        </form>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center py-24" style={{ color: 'var(--text-muted)' }}>
            <img
              src="/logo.png"
              alt="태그 없음"
              className="w-[300px] sm:w-[400px] lg:w-[500px] h-auto mb-4 opacity-20 grayscale"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors group"
                style={{ backgroundColor: 'var(--bg-card)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-input)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>#</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tag.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(tag.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                  {/* 삭제는 어드민만 */}
                  {isLoggedIn && (
                    <button onClick={() => handleDelete(tag.id, tag.name)} className="text-xs opacity-0 group-hover:opacity-100 hover:opacity-70 transition-all" style={{ color: '#ff8a8a' }}>
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-2 mt-8">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={btnSecondary} className="px-5 py-2 rounded-lg text-sm disabled:opacity-40 hover:opacity-80 transition-opacity">이전</button>
          <span className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>{page} 페이지</span>
          <button disabled={tags.length < 50} onClick={() => setPage(p => p + 1)} style={btnSecondary} className="px-5 py-2 rounded-lg text-sm disabled:opacity-40 hover:opacity-80 transition-opacity">다음</button>
        </div>
      </div>
    </div>
  );
};
