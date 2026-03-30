import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { GET_ALL_VIDEOS, GET_VIDEO_BY_ID, GET_ALL_TAGS, DELETE_VIDEO, ADD_VIDEO } from '../lib/queries';
import { VideoModel, VideoSortBy, SortOrder } from '../types/models';
import { useAuth } from '../context/AuthContext';

const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatViewCount = (count: number) => {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}천`;
  return count.toString();
};

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
const btnPrimary: React.CSSProperties = { backgroundColor: 'var(--accent)', color: '#1a1a1a' };
const btnSecondary: React.CSSProperties = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' };

// ─── 태그 자동완성 ────────────────────────────────────────────
const TagInput: React.FC<{ value: string; onChange: (val: string) => void; multiple?: boolean }> = ({ value, onChange, multiple = true }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const parts = multiple ? value.split(',') : [value];
  const currentInput = parts[parts.length - 1].trim();

  const { data: tagData } = useQuery(GET_ALL_TAGS, {
    variables: { keyword: currentInput || undefined, limit: 10, page: 1 },
    skip: !currentInput,
  });

  const suggestions: string[] = (tagData?.getAllTags ?? []).map((t: any) => t.name);
  const alreadySelected = value.split(',').map(t => t.trim()).filter(Boolean);
  const filtered = suggestions.filter(s => !alreadySelected.includes(s));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (tag: string) => {
    if (multiple) {
      const prevParts = value.split(',');
      prevParts[prevParts.length - 1] = ` ${tag}`;
      onChange(prevParts.join(',') + ', ');
    } else {
      onChange(tag);
    }
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setShowDropdown(true); }}
        onFocus={() => currentInput && setShowDropdown(true)}
        onKeyDown={e => e.key === 'Escape' && setShowDropdown(false)}
        placeholder="태그 입력..."
        style={inputStyle}
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 shadow-lg"
          style={{ backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)' }}>
          {filtered.map(tag => (
            <button key={tag} type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(tag); }}
              className="w-full px-3 py-2 text-sm text-left hover:opacity-80"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span style={{ color: 'var(--accent)' }}>#</span> {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── 메인 페이지 ──────────────────────────────────────────────
export const VideosPage: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [tagName, setTagName] = useState('');
  const [sortBy, setSortBy] = useState<VideoSortBy>('VIEW_COUNT');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [page, setPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addTags, setAddTags] = useState('');
  const [addError, setAddError] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_ALL_VIDEOS, {
    variables: { keyword: keyword || undefined, tagName: tagName || undefined, sortBy, sortOrder, page, limit: 20 },
  });

  // 조회수 증가용 - 클릭 시 호출
  const [fetchVideoById] = useLazyQuery(GET_VIDEO_BY_ID, {
    fetchPolicy: 'network-only',
  });

  const [deleteVideo] = useMutation(DELETE_VIDEO);
  const [addVideo, { loading: addLoading }] = useMutation(ADD_VIDEO);
  const videos: VideoModel[] = data?.getAllVideos ?? [];

  const handleSearch = (e?: React.FormEvent) => { e?.preventDefault(); setPage(1); refetch(); };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠어요?')) return;
    await deleteVideo({ variables: { id } });
    refetch();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    try {
      const tags = addTags.split(',').map(t => t.trim()).filter(Boolean);
      await addVideo({ variables: { url: addUrl, tags: tags.length ? tags : undefined } });
      setAddUrl(''); setAddTags(''); setShowAddModal(false); refetch();
    } catch (err: any) {
      setAddError(err.message || '오류가 발생했어요.');
    }
  };

  // 영상 클릭 시 조회수 증가 + 새 탭 열기
  const handleVideoClick = (video: VideoModel, e: React.MouseEvent) => {
    // getVideoById 호출로 조회수 증가
    fetchVideoById({ variables: { id: video.id } });
    // 새 탭으로 이동 (기본 동작 유지)
  };

  return (
    <div className="min-h-screen pt-20" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 py-6">

        {/* 검색바 */}
        <div className="mb-6">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="영상 검색..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              style={inputStyle}
              className="flex-1 px-4 py-2 rounded-lg text-sm focus:outline-none"
            />
            <div className="w-36">
              <TagInput value={tagName} onChange={val => { setTagName(val); setPage(1); }} multiple={false} />
            </div>
            <button onClick={() => handleSearch()} style={btnPrimary} className="px-5 py-2 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity">검색</button>
            <button type="button" onClick={() => setShowAddModal(true)} style={btnSecondary} className="px-4 py-2 rounded-lg text-sm hover:opacity-80 transition-opacity">+ 추가</button>
          </div>
          <div className="flex justify-end">
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={e => {
                const val = e.target.value;
                const order = val.endsWith('_DESC') ? 'DESC' : 'ASC';
                const by = val.replace(/_DESC$|_ASC$/, '');
                setSortBy(by as VideoSortBy);
                setSortOrder(order as SortOrder);
              }}
              style={inputStyle}
              className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            >
              <option value="VIEW_COUNT_DESC">인기순</option>
              <option value="CREATED_AT_DESC">최신순</option>
              <option value="CREATED_AT_ASC">등록순</option>
              <option value="TITLE_ASC">제목순</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#4a1a1a', border: '1px solid #7a2a2a', color: '#ff8a8a' }}>
            에러: {error.message}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video rounded-lg mb-2" style={{ backgroundColor: 'var(--bg-card)' }} />
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--bg-card)' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 rounded w-full" style={{ backgroundColor: 'var(--bg-card)' }} />
                    <div className="h-3 rounded w-2/3" style={{ backgroundColor: 'var(--bg-card)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-52">
            <img src="/logo.png" alt="empty" className="w-[300px] sm:w-[400px] lg:w-[500px] h-auto mb-6 opacity-20 grayscale" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {videos.map(video => (
              <div key={video.id} className="group cursor-pointer transition-transform hover:-translate-y-1">
                <div className="relative aspect-video rounded-lg overflow-hidden mb-2" style={{ backgroundColor: 'var(--bg-card)' }}>
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.videoTitle ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: 'var(--text-muted)' }}>🎬</div>
                  )}
                  {video.duration && (
                    <span className="absolute bottom-1 right-1 text-white text-xs px-1 py-0.5 rounded font-mono" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                      {formatDuration(video.duration)}
                    </span>
                  )}
                  {video.platform && (
                    <span className="absolute top-1.5 left-1.5 text-white text-xs px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: video.platform === 'CHZZK' ? '#1a8a4a' : '#cc2200' }}>
                      {video.platform === 'CHZZK' ? 'CHZZK' : 'YT'}
                    </span>
                  )}
                  {/* 클릭 시 조회수 증가 + 새 탭 이동 */}
                  <a
                    href={video.videoUrl ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => handleVideoClick(video, e)}
                    className="absolute inset-0 flex items-center justify-center"
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 duration-200" style={{ backgroundColor: 'var(--accent)' }}>
                      <span className="text-black text-lg ml-0.5">▶</span>
                    </div>
                  </a>
                </div>
                <div className="flex gap-2">
                  {video.channelImageUrl
                    ? <img src={video.channelImageUrl} alt="" className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" />
                    : <div className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--bg-card)' }} />
                  }
                  <div className="flex-1 min-w-0">
                    {/* 제목 클릭도 조회수 증가 */}
                    <a
                      href={video.videoUrl ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => handleVideoClick(video, e)}
                      className="block text-sm font-medium leading-snug line-clamp-2 hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {video.videoTitle ?? '제목 없음'}
                    </a>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{video.channelName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>조회수 {formatViewCount(video.viewCount)}</p>
                    {video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {video.tags.map(tag => <span key={tag.id} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>#{tag.name}</span>)}
                      </div>
                    )}
                    {isLoggedIn && (
                      <button onClick={() => handleDelete(video.id)} className="text-xs mt-0.5 hover:opacity-70 transition-opacity" style={{ color: '#ff8a8a' }}>삭제</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-2 mt-12">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={btnSecondary} className="px-5 py-2 rounded-lg text-sm disabled:opacity-40 hover:opacity-80 transition-opacity">이전</button>
          <span className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>{page} 페이지</span>
          <button disabled={videos.length < 20} onClick={() => setPage(p => p + 1)} style={btnSecondary} className="px-5 py-2 rounded-lg text-sm disabled:opacity-40 hover:opacity-80 transition-opacity">다음</button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)' }}>
            <h2 className="text-lg font-bold mb-4">비디오 추가</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>영상 URL *</label>
                <input
                  type="text"
                  value={addUrl}
                  onChange={e => setAddUrl(e.target.value)}
                  required
                  placeholder="https://chzzk.naver.com/clips/..."
                  style={inputStyle}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  태그
                  <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(쉼표로 구분, 입력하면 기존 태그 추천)</span>
                </label>
                <TagInput value={addTags} onChange={setAddTags} />
                {addTags.split(',').map(t => t.trim()).filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {addTags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent)' }}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              {addError && <p className="text-sm" style={{ color: '#ff8a8a' }}>{addError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setAddUrl(''); setAddTags(''); setAddError(''); }} className="px-4 py-2 text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>취소</button>
                <button type="submit" disabled={addLoading} style={btnPrimary} className="px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:opacity-80 transition-opacity">
                  {addLoading ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
