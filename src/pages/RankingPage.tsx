import React from 'react';
import { useQuery } from '@apollo/client';
import { useLazyQuery } from '@apollo/client';
import { GET_WEEKLY_RANKING, GET_VIDEO_BY_ID, GET_LATEST_YOUTUBE_VIDEO } from '../lib/queries';
import { VideoModel } from '../types/models';
import { VideoPlayerModal } from '../components/VideoPlayerModal';

export const RankingPage: React.FC = () => {
  const { data, loading, error } = useQuery(GET_WEEKLY_RANKING);
  const [fetchVideoById] = useLazyQuery(GET_VIDEO_BY_ID, { fetchPolicy: 'network-only' });
  const [playingVideo, setPlayingVideo] = React.useState<VideoModel | null>(null);
  const { data: ytData } = useQuery(GET_LATEST_YOUTUBE_VIDEO);
  const latestYoutubeVideo = ytData?.getLatestYoutubeVideo;

  const rankingVideos: VideoModel[] = data?.getWeeklyRankingVideos ?? [];

  const handleVideoClick = (video: VideoModel, e: React.MouseEvent) => {
    e.preventDefault();
    fetchVideoById({ variables: { id: video.id } });

    if (!video.thumbnail) {
      window.open(video.videoUrl ?? '#', '_blank');
      return;
    }
    setPlayingVideo(video);
  };

  return (
    <div className="min-h-screen pt-20" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 py-6">

        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🔥</span>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            이번 주 인기 클립
          </h1>
        </div>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          매주 일요일 자정에 갱신돼요 (1주일간 조회수 증가량 기준)
        </p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video rounded-lg mb-2" style={{ backgroundColor: 'var(--bg-card)' }} />
                <div className="h-3.5 rounded w-full mb-1.5" style={{ backgroundColor: 'var(--bg-card)' }} />
                <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-card)' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            className="px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#4a1a1a', border: '1px solid #7a2a2a', color: '#ff8a8a' }}
          >
            에러: {error.message}
          </div>
        ) : rankingVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-52">
            <img src="/logo.png" alt="empty" className="w-[200px] sm:w-[400px] lg:w-[500px] h-auto mb-6 opacity-20 grayscale" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              아직 집계된 랭킹이 없어요. 매주 갱신돼요!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {rankingVideos.map((video, idx) => (
              <div key={video.id} className="group cursor-pointer relative">
                <span
                  className="absolute -top-1 -left-1 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                  style={{
                    backgroundColor: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--bg-card)',
                    color: idx <= 2 ? '#1a1a1a' : 'var(--text-secondary)',
                    border: idx > 2 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {idx + 1}
                </span>
                <div
                  className="relative aspect-video rounded-lg overflow-hidden mb-2"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.videoTitle ?? ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: 'var(--text-muted)' }}>
                      🎬
                    </div>
                  )}
                  <a
                    href={video.videoUrl ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => handleVideoClick(video, e)}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 duration-200"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      <span className="text-black text-lg ml-0.5">▶</span>
                    </div>
                  </a>
                </div>
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
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {video.channelName}
                </p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--accent)' }}>
                  📈 조회수 +{(video.weeklyReadIncrease ?? 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {latestYoutubeVideo && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📺</span>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                최신 유튜브 영상
              </h2>
            </div>
            <a
              href={latestYoutubeVideo.url}
              target="_blank"
              rel="noreferrer"
              className="group block max-w-md mx-auto"
            >
              <div
                className="relative aspect-video rounded-lg overflow-hidden mb-2"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                <img
                  src={latestYoutubeVideo.thumbnail}
                  alt={latestYoutubeVideo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = `https://i.ytimg.com/vi/${latestYoutubeVideo.videoId}/hqdefault.jpg`;
                  }}
                />
                <span
                  className="absolute top-2 left-2 text-white text-xs px-1.5 py-0.5 rounded font-bold"
                  style={{ backgroundColor: '#cc2200' }}
                >
                  YouTube
                </span>
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 duration-200"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <span className="text-black text-lg ml-0.5">▶</span>
                  </div>
                </div>
              </div>
              <p
                className="text-sm font-medium leading-snug line-clamp-2 group-hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-primary)' }}
              >
                {latestYoutubeVideo.title}
              </p>
            </a>
          </div>
        )}

      </div>{/* max-w-screen-2xl 닫힘 */}

      {playingVideo && (
        <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}
    </div>
  );
};