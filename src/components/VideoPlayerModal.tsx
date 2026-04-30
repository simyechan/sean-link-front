// components/VideoPlayerModal.tsx
import React, { useEffect } from 'react';
import { VideoModel } from '../types/models';

const getEmbedUrl = (video: VideoModel): string | null => {
  const url = video.videoUrl ?? '';

  const ytMatch =
    url.match(/[?&]v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?&]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;

  const chzzkMatch = url.match(/chzzk\.naver\.com\/clips\/([^?/]+)/);
  if (chzzkMatch) return `https://chzzk.naver.com/embed/clip/${chzzkMatch[1]}`;

  return null;
};

export const VideoPlayerModal: React.FC<{
  video: VideoModel;
  onClose: () => void;
}> = ({ video, onClose }) => {
  const embedUrl = getEmbedUrl(video);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-2xl hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-secondary)' }}
      >
        ✕
      </button>

      <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        {embedUrl ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-4 py-20 rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            {video.thumbnail && (
              <img src={video.thumbnail} alt="" className="w-64 rounded-lg opacity-60" />
            )}
            <p style={{ color: 'var(--text-secondary)' }}>이 영상은 임베드를 지원하지 않아요.</p>
            <a
              href={video.videoUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity"
              style={{ backgroundColor: 'var(--accent)', color: '#1a1a1a' }}
            >
              외부에서 보기 →
            </a>
          </div>
        )}

        <div className="mt-3 px-1">
          <p className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
            {video.videoTitle ?? '제목 없음'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {video.channelName}
          </p>
        </div>
      </div>
    </div>
  );
};