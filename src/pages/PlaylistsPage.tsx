import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_ALL_PLAYLISTS, GET_PLAYLIST_BY_ID, GET_ALL_TAGS, GET_ALL_VIDEOS,
  CREATE_PLAYLIST, DELETE_PLAYLIST, REMOVE_VIDEO_FROM_PLAYLIST, ADD_VIDEO_TO_PLAYLIST,
  ADD_TAG_TO_PLAYLIST, REMOVE_TAG_FROM_PLAYLIST,
} from '../lib/queries';
import { PlaylistModel, VideoModel, PlaylistSortBy, SortOrder } from '../types/models';
import { useAuth } from '../context/AuthContext';
import { TagEditor } from '../components/TagEditor';

const formatViewCount = (count: number) => {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}천`;
  return count.toString();
};

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};
const btnPrimary: React.CSSProperties = { backgroundColor: 'var(--accent)', color: '#1a1a1a' };
const btnSecondary: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
};

// ─── 태그 자동완성 ────────────────────────────────────────────
const TagInput: React.FC<{ value: string; onChange: (val: string) => void }> = ({
  value,
  onChange,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const parts = value.split(',');
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
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (tag: string) => {
    const prevParts = value.split(',');
    prevParts[prevParts.length - 1] = ` ${tag}`;
    onChange(prevParts.join(',') + ', ');
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
        placeholder="태그1, 태그2..."
        style={inputStyle}
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
      />
      {showDropdown && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 shadow-lg"
          style={{ backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)' }}
        >
          {filtered.map(tag => (
            <button
              key={tag}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(tag); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span style={{ color: 'var(--accent)' }}>#</span>{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── 비디오 선택기 ────────────────────────────────────────────
const VideoSelector: React.FC<{
  selectedVideos: VideoModel[];
  onSelect: (video: VideoModel) => void;
  onRemove: (id: string) => void;
}> = ({ selectedVideos, onSelect, onRemove }) => {
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const { data } = useQuery(GET_ALL_VIDEOS, {
    variables: {
      keyword: search || undefined,
      tagName: tagFilter || undefined,
      sortBy: 'VIEW_COUNT',
      sortOrder: 'DESC',
      page: 1,
      limit: 20,
    },
  });
  const videos: VideoModel[] = data?.getAllVideos ?? [];
  const selectedIds = selectedVideos.map(v => v.id);

  return (
    <div>
      {selectedVideos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selectedVideos.map((v, idx) => (
            <div
              key={v.id}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
            >
              <span style={{ color: 'var(--accent)' }}>{idx + 1}.</span>
              <span className="max-w-[120px] truncate">{v.videoTitle ?? '제목 없음'}</span>
              <button
                type="button"
                onClick={() => onRemove(v.id)}
                className="ml-1 hover:opacity-70"
                style={{ color: '#ff8a8a' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="영상 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
          className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none"
        />
        <input
          type="text"
          placeholder="태그 필터"
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          style={inputStyle}
          className="w-24 px-3 py-1.5 rounded-lg text-sm focus:outline-none"
        />
      </div>
      <div
        className="rounded-xl overflow-hidden overflow-y-auto max-h-52"
        style={{ border: '1px solid var(--border)' }}
      >
        {videos.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            영상이 없어요.
          </div>
        ) : (
          videos.map(video => {
            const isSelected = selectedIds.includes(video.id);
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => !isSelected && onSelect(video)}
                disabled={isSelected}
                className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                style={{
                  backgroundColor: isSelected ? 'var(--bg-card)' : 'transparent',
                  opacity: isSelected ? 0.5 : 1,
                  cursor: isSelected ? 'default' : 'pointer',
                }}
                onMouseEnter={e =>
                  !isSelected && (e.currentTarget.style.backgroundColor = 'var(--bg-card)')
                }
                onMouseLeave={e =>
                  !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt=""
                    className="w-16 aspect-video object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-16 aspect-video rounded flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-input)' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium line-clamp-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {video.videoTitle ?? '제목 없음'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {video.channelName}
                  </p>
                </div>
                {isSelected && (
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--accent)' }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── 플레이리스트 상세 ────────────────────────────────────────
const PlaylistDetail: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const { isLoggedIn } = useAuth();
  const { data, loading, refetch } = useQuery(GET_PLAYLIST_BY_ID, {
    variables: { id },
    fetchPolicy: 'network-only',
  });
  const [removeVideo] = useMutation(REMOVE_VIDEO_FROM_PLAYLIST);
  const [addVideoMutation] = useMutation(ADD_VIDEO_TO_PLAYLIST);
  const [addTagToPlaylist] = useMutation(ADD_TAG_TO_PLAYLIST);
  const [removeTagFromPlaylist] = useMutation(REMOVE_TAG_FROM_PLAYLIST);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoModel | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const playlist: PlaylistModel | undefined = data?.getPlaylistById;

  const { data: videoData } = useQuery(GET_ALL_VIDEOS, {
    variables: {
      keyword: searchKeyword || undefined,
      sortBy: 'VIEW_COUNT',
      sortOrder: 'DESC',
      page: 1,
      limit: 20,
    },
    skip: !showAddVideo,
  });
  const searchVideos: VideoModel[] = videoData?.getAllVideos ?? [];

  const handleAddVideo = async () => {
    if (!selectedVideo) return;
    try {
      await addVideoMutation({ variables: { playlistId: id, videoId: selectedVideo.id } });
      setSelectedVideo(null);
      setShowAddVideo(false);
      refetch();
    } catch {
      alert('추가 실패');
    }
  };

  const handleRemove = async (videoId: string) => {
    if (!window.confirm('이 영상을 플레이리스트에서 제거하시겠어요?')) return;
    await removeVideo({ variables: { playlistId: id, videoId } });
    refetch();
  };

  // 태그 추가/제거 핸들러
  const handleAddTag = async (tagName: string) => {
    await addTagToPlaylist({ variables: { playlistId: id, tagName } });
    refetch();
  };

  const handleRemoveTag = async (tagName: string) => {
    await removeTagFromPlaylist({ variables: { playlistId: id, tagName } });
    refetch();
  };

  if (loading)
    return (
      <div
        className="min-h-screen pt-14 flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-muted)' }}
      >
        불러오는 중...
      </div>
    );
  if (!playlist)
    return (
      <div
        className="min-h-screen pt-14 flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-muted)' }}
      >
        플레이리스트를 찾을 수 없어요.
      </div>
    );

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-screen-lg mx-auto px-4 py-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm mb-6 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← 목록으로
        </button>
        <div className="mb-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {playlist.name}
          </h1>
          <div
            className="flex items-center gap-3 mt-2 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>영상 {playlist.videos.length}개</span>
            <span>·</span>
            <span>조회수 {formatViewCount(playlist.viewCount)}</span>
          </div>

          {/* ✅ 상세 페이지 태그 편집 (인라인, compact 아님) */}
          <TagEditor
            tags={playlist.tags}
            onAdd={handleAddTag}
            onRemove={isLoggedIn ? handleRemoveTag : undefined}
            compact={false}
          />
        </div>

        {/* 영상 추가 */}
        <div className="mb-4">
          {!showAddVideo ? (
            <button
              onClick={() => setShowAddVideo(true)}
              style={btnSecondary}
              className="px-4 py-2 rounded-lg text-sm hover:opacity-80 transition-opacity"
            >
              + 영상 추가
            </button>
          ) : (
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p
                className="text-sm font-medium mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                추가할 영상 선택
              </p>
              <input
                type="text"
                placeholder="영상 검색..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={inputStyle}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none mb-2"
              />
              <div
                className="rounded-xl overflow-y-auto max-h-48"
                style={{ border: '1px solid var(--border)' }}
              >
                {searchVideos.map(video => {
                  const isInPlaylist = playlist.videos.some(v => v.id === video.id);
                  const isSelected = selectedVideo?.id === video.id;
                  return (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => !isInPlaylist && setSelectedVideo(video)}
                      disabled={isInPlaylist}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                      style={{
                        backgroundColor: isSelected ? 'var(--bg-input)' : 'transparent',
                        opacity: isInPlaylist ? 0.4 : 1,
                      }}
                      onMouseEnter={e =>
                        !isInPlaylist && (e.currentTarget.style.backgroundColor = 'var(--bg-input)')
                      }
                      onMouseLeave={e =>
                        !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt=""
                          className="w-16 aspect-video object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-16 aspect-video rounded flex-shrink-0"
                          style={{ backgroundColor: 'var(--bg-input)' }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium line-clamp-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {video.videoTitle ?? '제목 없음'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {video.channelName}
                        </p>
                      </div>
                      {isInPlaylist && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          이미 추가됨
                        </span>
                      )}
                      {isSelected && !isInPlaylist && (
                        <span className="text-xs" style={{ color: 'var(--accent)' }}>
                          ✓ 선택됨
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => { setShowAddVideo(false); setSelectedVideo(null); }}
                  className="px-4 py-2 text-sm hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleAddVideo}
                  disabled={!selectedVideo}
                  style={btnPrimary}
                  className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40 hover:opacity-80 transition-opacity"
                >
                  추가
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 영상 목록 */}
        <div className="space-y-1.5">
          {playlist.videos.map((video, idx) => (
            <div
              key={video.id}
              className="flex items-center gap-3 p-3 rounded-xl transition-colors group"
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              style={{ backgroundColor: 'transparent' }}
            >
              <span
                className="text-sm w-6 text-center flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
              >
                {idx + 1}
              </span>
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt=""
                  className="w-32 aspect-video object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div
                  className="w-32 aspect-video rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  <img src="/logo.png" alt="" className="w-12 h-12 object-contain opacity-70" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <a
                  href={video.videoUrl ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm font-medium line-clamp-2 hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {video.videoTitle ?? '제목 없음'}
                </a>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {video.channelName}
                </p>
              </div>
              {isLoggedIn && (
                <button
                  onClick={() => handleRemove(video.id)}
                  className="text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#ff8a8a' }}
                >
                  제거
                </button>
              )}
            </div>
          ))}
          {playlist.videos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40">
              <img
                src="/logo.png"
                alt=""
                className="w-[300px] sm:w-[400px] lg:w-[500px] h-auto mb-4 opacity-20 grayscale"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── 플레이리스트 카드 (태그 편집 포함) ─────────────────────
const PlaylistCard: React.FC<{
  playlist: PlaylistModel;
  onClick: () => void;
  onDelete: (id: string) => void;
  onTagUpdate: () => void;
  isLoggedIn: boolean;
}> = ({ playlist, onClick, onDelete, onTagUpdate, isLoggedIn }) => {
  const [addTagToPlaylist] = useMutation(ADD_TAG_TO_PLAYLIST);
  const [removeTagFromPlaylist] = useMutation(REMOVE_TAG_FROM_PLAYLIST);

  const handleAddTag = async (tagName: string) => {
    await addTagToPlaylist({ variables: { playlistId: playlist.id, tagName } });
    onTagUpdate();
  };

  const handleRemoveTag = async (tagName: string) => {
    await removeTagFromPlaylist({ variables: { playlistId: playlist.id, tagName } });
    onTagUpdate();
  };

  return (
    <div className="group cursor-pointer" onClick={onClick}>
      {/* 썸네일 */}
      <div
        className="relative aspect-video rounded-lg overflow-hidden mb-2"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {playlist.videos.length > 0 ? (
          <div className="grid grid-cols-2 gap-0.5 h-full">
            {playlist.videos.slice(0, 4).map(v =>
              v.thumbnail ? (
                <img key={v.id} src={v.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div key={v.id} style={{ backgroundColor: 'var(--bg-input)' }} />
              )
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img src="/logo.png" alt="" className="w-16 h-16 object-contain opacity-70" />
          </div>
        )}
        <div
          className="absolute bottom-1 right-1 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
        >
          <span>▶</span>
          <span>{playlist.videos.length}</span>
        </div>
        <div className="absolute inset-0 transition-colors group-hover:bg-black/20" />
      </div>

      <p
        className="text-sm font-medium line-clamp-2 group-hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-primary)' }}
      >
        {playlist.name}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
        조회수 {formatViewCount(playlist.viewCount)}
      </p>

      {/* ✅ 태그 편집 컴포넌트 */}
      <TagEditor
        tags={playlist.tags}
        onAdd={handleAddTag}
        onRemove={isLoggedIn ? handleRemoveTag : undefined}
        compact
      />

      {isLoggedIn && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(playlist.id); }}
          className="text-xs mt-0.5 hover:opacity-70 transition-opacity"
          style={{ color: '#ff8a8a' }}
        >
          삭제
        </button>
      )}
    </div>
  );
};

// ─── 메인 페이지 ──────────────────────────────────────────────
export const PlaylistsPage: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [tagName, setTagName] = useState('');
  const [sortBy, setSortBy] = useState<PlaylistSortBy>('VIEW_COUNT');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTags, setNewTags] = useState('');
  const [selectedVideos, setSelectedVideos] = useState<VideoModel[]>([]);
  const [createError, setCreateError] = useState('');

  const { data, loading, refetch } = useQuery(GET_ALL_PLAYLISTS, {
    variables: {
      keyword: keyword || undefined,
      tagName: tagName || undefined,
      sortBy,
      sortOrder,
      page,
      limit: 20,
    },
  });
  const [createPlaylist, { loading: creating }] = useMutation(CREATE_PLAYLIST);
  const [deletePlaylist] = useMutation(DELETE_PLAYLIST);
  const playlists: PlaylistModel[] = data?.getAllPlaylists ?? [];

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); refetch(); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    try {
      const tagNames = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const videoIds = selectedVideos.map(v => v.id);
      await createPlaylist({
        variables: {
          data: { name: newName },
          tagNames: tagNames.length ? tagNames : undefined,
          videoIds: videoIds.length ? videoIds : undefined,
        },
      });
      setNewName('');
      setNewTags('');
      setSelectedVideos([]);
      setShowCreateModal(false);
      refetch();
    } catch (err: any) {
      setCreateError(err.message || '오류가 발생했어요.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('플레이리스트를 삭제하시겠어요?')) return;
    await deletePlaylist({ variables: { playlistId: id } });
    refetch();
  };

  if (selectedId) return <PlaylistDetail id={selectedId} onBack={() => setSelectedId(null)} />;

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 pt-12 pb-6">

        {/* 검색바 */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="플레이리스트 이름 검색..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              style={inputStyle}
              className="flex-1 px-4 py-2 rounded-lg text-sm placeholder-gray-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="태그 필터"
              value={tagName}
              onChange={e => setTagName(e.target.value)}
              style={inputStyle}
              className="w-36 px-4 py-2 rounded-lg text-sm placeholder-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              style={btnPrimary}
              className="px-5 py-2 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity"
            >
              검색
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={btnSecondary}
              className="px-5 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
            >
              + 생성
            </button>
          </div>
          <div className="flex justify-end">
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={e => {
                const val = e.target.value;
                const order = val.endsWith('_DESC') ? 'DESC' : 'ASC';
                const by = val.replace(/_DESC$|_ASC$/, '');
                setSortBy(by as PlaylistSortBy);
                setSortOrder(order as SortOrder);
              }}
              style={inputStyle}
              className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            >
              <option value="VIEW_COUNT_DESC">인기순</option>
              <option value="CREATED_AT_DESC">최신순</option>
              <option value="NAME_ASC">이름순</option>
            </select>
          </div>
        </form>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div
                  className="aspect-video rounded-lg mb-2"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                />
                <div
                  className="h-4 rounded w-3/4 mb-1"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                />
                <div
                  className="h-3 rounded w-1/2"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                />
              </div>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40">
            <img
              src="/logo.png"
              alt=""
              className="w-[300px] sm:w-[400px] lg:w-[500px] h-auto mb-4 opacity-20 grayscale"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlists.map(playlist => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onClick={() => setSelectedId(playlist.id)}
                onDelete={handleDelete}
                onTagUpdate={refetch}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        )}

        <div className="flex justify-center gap-2 mt-12">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={btnSecondary}
            className="px-5 py-2 rounded-lg text-sm disabled:opacity-40 hover:opacity-80 transition-opacity"
          >
            이전
          </button>
          <span className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            {page} 페이지
          </span>
          <button
            disabled={playlists.length < 20}
            onClick={() => setPage(p => p + 1)}
            style={btnSecondary}
            className="px-5 py-2 rounded-lg text-sm disabled:opacity-40 hover:opacity-80 transition-opacity"
          >
            다음
          </button>
        </div>
      </div>

      {/* 생성 모달 */}
      {showCreateModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)' }}
          >
            <h2 className="text-lg font-bold mb-4">플레이리스트 생성</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  이름 *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  placeholder="플레이리스트 이름"
                  style={inputStyle}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  태그
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                    (입력하면 기존 태그 추천)
                  </span>
                </label>
                <TagInput value={newTags} onChange={setNewTags} />
                {newTags.split(',').map(t => t.trim()).filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newTags
                      .split(',')
                      .map(t => t.trim())
                      .filter(Boolean)
                      .map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent)' }}
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  영상 추가
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                    (선택사항)
                  </span>
                </label>
                <VideoSelector
                  selectedVideos={selectedVideos}
                  onSelect={v => setSelectedVideos(prev => [...prev, v])}
                  onRemove={id => setSelectedVideos(prev => prev.filter(v => v.id !== id))}
                />
              </div>
              {createError && (
                <p className="text-sm" style={{ color: '#ff8a8a' }}>
                  {createError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewName('');
                    setNewTags('');
                    setSelectedVideos([]);
                  }}
                  className="px-4 py-2 text-sm hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={btnPrimary}
                  className="px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:opacity-80 transition-opacity"
                >
                  {creating ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
