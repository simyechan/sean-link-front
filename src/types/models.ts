export type Platform = 'YOUTUBE' | 'CHZZK';
export type SortOrder = 'ASC' | 'DESC';
export type TagSortBy = 'NAME' | 'CREATED_AT';
export type VideoSortBy = 'CREATED_AT' | 'VIEW_COUNT' | 'TITLE';
export type PlaylistSortBy = 'CREATED_AT' | 'VIEW_COUNT' | 'NAME';

export interface TagModel {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  name: string;
  videos: VideoModel[];
  playlists: PlaylistModel[];
}

export interface VideoModel {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  videoId: string;
  videoUrl?: string;
  videoTitle?: string;
  thumbnail?: string;
  duration?: number;
  channelId?: string;
  channelName?: string;
  channelImageUrl?: string;
  viewCount: number;
  platform?: Platform;
  tags: TagModel[];
}

export interface PlaylistModel {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  name: string;
  viewCount: number;
  videos: VideoModel[];
  tags: TagModel[];
}

export interface AdminModel {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  loginId: string;
}

export interface ReportModel {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  title: string;
  content: string;
  isResolved: boolean;
  adminComment?: string;
}