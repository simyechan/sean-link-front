import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  DragDropContext,
  Droppable,
  Draggable,
} from '@hello-pangea/dnd';

import {
  GET_PLAYLIST_BY_ID,
  GET_ALL_VIDEOS,
  ADD_VIDEO_TO_PLAYLIST,
  REORDER_PLAYLIST_VIDEOS,
} from '../lib/queries';

interface VideoModel {
  id: string;
  videoTitle: string;
}

interface Props {
  id: string;
  isLoggedIn: boolean;
}

const PlaylistDetail: React.FC<Props> = ({ id, isLoggedIn }) => {
  const { data, refetch } = useQuery(GET_PLAYLIST_BY_ID, {
    variables: { id },
  });

  const { data: videoData, refetch: searchVideos } = useQuery(GET_ALL_VIDEOS, {
    variables: { keyword: '', page: 1, limit: 20 },
  });

  const [addVideoToPlaylist] = useMutation(ADD_VIDEO_TO_PLAYLIST);
  const [reorderPlaylistVideos] = useMutation(REORDER_PLAYLIST_VIDEOS);

  const [localVideos, setLocalVideos] = useState<VideoModel[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [addMode, setAddMode] = useState(false);

  const playlist = data?.getPlaylist;

  // 플레이리스트 영상 동기화
  useEffect(() => {
    if (playlist?.videos) {
      setLocalVideos(playlist.videos);
    }
  }, [playlist]);

  // 검색 디바운스
  useEffect(() => {
    const delay = setTimeout(() => {
      searchVideos({
        keyword: searchKeyword,
        page: 1,
        limit: 20,
      });
    }, 300);

    return () => clearTimeout(delay);
  }, [searchKeyword]);

  // 드래그 정렬
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(localVideos);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    setLocalVideos(items);

    try {
      await reorderPlaylistVideos({
        variables: {
          playlistId: id,
          videoIds: items.map(v => v.id),
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  // 영상 추가
  const handleAddVideo = async (videoId: string) => {
    try {
      await addVideoToPlaylist({
        variables: {
          playlistId: id,
          videoId,
        },
      });
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  if (!playlist) return <div>로딩 중...</div>;

  return (
    <div className="p-4">
      <h2 className="text-lg mb-3">{playlist.name}</h2>

      {/* 드래그 영역 */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="videos">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {localVideos.map((video, index) => (
                <Draggable
                  key={video.id}
                  draggableId={video.id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="p-2 mb-2 rounded cursor-move"
                      style={{
                        background: 'var(--bg-card)',
                        ...provided.draggableProps.style,
                      }}
                    >
                      {video.videoTitle}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* 영상 추가 버튼 */}
      {isLoggedIn && (
        <button
          onClick={() => setAddMode(prev => !prev)}
          className="text-sm mt-3"
          style={{ color: 'var(--accent)' }}
        >
          + 영상 추가
        </button>
      )}

      {/* 영상 검색 추가 */}
      {addMode && (
        <div className="mt-3">
          <input
            type="text"
            placeholder="영상 검색..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full px-2 py-1 text-sm rounded"
          />

          <div className="max-h-60 overflow-y-auto mt-2 space-y-1">
            {(videoData?.getAllVideos ?? [])
              // 이미 추가된 영상 제외
              .filter(
                (video: VideoModel) =>
                  !localVideos.some(v => v.id === video.id)
              )
              .map((video: VideoModel) => (
                <div
                  key={video.id}
                  onClick={() => handleAddVideo(video.id)}
                  className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-70"
                  style={{ background: 'var(--bg-card)' }}
                >
                  {video.videoTitle}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistDetail;