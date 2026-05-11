import { gql } from '@apollo/client';

// ─── Tag Fragments ────────────────────────────────────────────
export const TAG_FIELDS = gql`
  fragment TagFields on TagModel {
    id
    name
    createdAt
  }
`;

// ─── Video Fragments ──────────────────────────────────────────
export const VIDEO_FIELDS = gql`
  fragment VideoFields on VideoModel {
    id
    videoId
    videoUrl
    videoTitle
    thumbnail
    duration
    channelId
    channelName
    channelImageUrl
    viewCount
    platform
    tags {
      id
      name
    }
  }
`;

// ─── Playlist Fragments ───────────────────────────────────────
export const PLAYLIST_FIELDS = gql`
  fragment PlaylistFields on PlaylistModel {
    id
    name
    viewCount
    tags {
      id
      name
    }
    videos {
      ...VideoFields
    }
  }
  ${VIDEO_FIELDS}
`;

// ─── Tag Queries ──────────────────────────────────────────────
export const GET_ALL_TAGS = gql`
  query GetAllTags($keyword: String, $sortBy: TagSortBy, $sortOrder: SortOrder, $page: Int, $limit: Int) {
    getAllTags(keyword: $keyword, sortBy: $sortBy, sortOrder: $sortOrder, page: $page, limit: $limit) {
      ...TagFields
    }
  }
  ${TAG_FIELDS}
`;

export const GET_TAG_BY_ID = gql`
  query GetTagById($id: String!) {
    getTagById(id: $id) {
      ...TagFields
      videos { ...VideoFields }
      playlists { id name viewCount }
    }
  }
  ${TAG_FIELDS}
  ${VIDEO_FIELDS}
`;

// ─── Video Queries ────────────────────────────────────────────
export const GET_ALL_VIDEOS = gql`
  query GetAllVideos($keyword: String, $tagName: String, $sortBy: VideoSortBy, $sortOrder: SortOrder, $page: Int, $limit: Int) {
    getAllVideos(keyword: $keyword, tagName: $tagName, sortBy: $sortBy, sortOrder: $sortOrder, page: $page, limit: $limit) {
      ...VideoFields
    }
  }
  ${VIDEO_FIELDS}
`;

export const GET_VIDEO_BY_ID = gql`
  query GetVideoById($id: String!) {
    getVideoById(id: $id) {
      ...VideoFields
    }
  }
  ${VIDEO_FIELDS}
`;

// ─── Playlist Queries ─────────────────────────────────────────
export const GET_ALL_PLAYLISTS = gql`
  query GetAllPlaylists($keyword: String, $tagName: String, $sortBy: PlaylistSortBy, $sortOrder: SortOrder, $page: Int, $limit: Int) {
    getAllPlaylists(keyword: $keyword, tagName: $tagName, sortBy: $sortBy, sortOrder: $sortOrder, page: $page, limit: $limit) {
      id
      name
      viewCount
      tags { id name }
      videos { id thumbnail videoTitle }
    }
  }
`;

export const GET_PLAYLIST_BY_ID = gql`
  query GetPlaylistById($id: String!) {
    getPlaylistById(id: $id) {
      ...PlaylistFields
    }
  }
  ${PLAYLIST_FIELDS}
`;

// ─── Tag Mutations ────────────────────────────────────────────
export const ADD_TAG = gql`
  mutation AddTag($tagInput: TagCreateInput!) {
    addTag(tagInput: $tagInput) {
      ...TagFields
    }
  }
  ${TAG_FIELDS}
`;

export const DELETE_TAG = gql`
  mutation DeleteTag($id: String!) {
    deleteTag(id: $id)
  }
`;

// ─── Video Mutations ──────────────────────────────────────────
export const ADD_VIDEO = gql`
  mutation AddVideo($url: String!, $tags: [String!]) {
    addVideo(url: $url, tags: $tags) {
      ...VideoFields
    }
  }
  ${VIDEO_FIELDS}
`;

export const DELETE_VIDEO = gql`
  mutation DeleteVideo($id: String!) {
    deleteVideo(id: $id)
  }
`;

// ─── Playlist Mutations ───────────────────────────────────────
export const CREATE_PLAYLIST = gql`
  mutation CreatePlaylist($data: PlaylistInput!, $videoIds: [String!], $tagNames: [String!]) {
    createPlaylist(data: $data, videoIds: $videoIds, tagNames: $tagNames) {
      ...PlaylistFields
    }
  }
  ${PLAYLIST_FIELDS}
`;

export const ADD_VIDEO_TO_PLAYLIST = gql`
  mutation AddVideoToPlaylist($playlistId: String!, $videoId: String!) {
    addVideoToPlaylist(playlistId: $playlistId, videoId: $videoId) {
      id
      name
    }
  }
`;

export const ADD_VIDEOS_TO_PLAYLIST = gql`
  mutation AddVideosToPlaylist($playlistId: String!, $videoIds: [String!]!) {
    addVideosToPlaylist(playlistId: $playlistId, videoIds: $videoIds) {
      id
      name
    }
  }
`;

export const REORDER_PLAYLIST_VIDEOS = gql`
  mutation ReorderPlaylistVideos($playlistId: String!, $videoIds: [String!]!) {
    reorderPlaylistVideos(playlistId: $playlistId, videoIds: $videoIds) {
      ...PlaylistFields
    }
  }
  ${PLAYLIST_FIELDS}
`;

export const REMOVE_VIDEO_FROM_PLAYLIST = gql`
  mutation RemoveVideoFromPlaylist($playlistId: String!, $videoId: String!) {
    removeVideoFromPlaylist(playlistId: $playlistId, videoId: $videoId)
  }
`;

export const DELETE_PLAYLIST = gql`
  mutation DeletePlaylist($playlistId: String!) {
    deletePlaylist(playlistId: $playlistId)
  }
`;

// ─── Report Queries & Mutations ──────────────────────────────
export const GET_ALL_REPORTS = gql`
  query GetAllReports($isResolved: Boolean) {
    getAllReports(isResolved: $isResolved) {
      id
      createdAt
      title
      content
      isResolved
      adminComment
    }
  }
`;

export const CREATE_REPORT = gql`
  mutation CreateReport($input: CreateReportInput!) {
    createReport(input: $input) {
      id
      title
      content
      isResolved
    }
  }
`;

export const RESOLVE_REPORT = gql`
  mutation ResolveReport($input: ResolveReportInput!) {
    resolveReport(input: $input) {
      id
      isResolved
      adminComment
    }
  }
`;

// ─── Admin Mutations ──────────────────────────────────────────
export const ADMIN_LOGIN = gql`
  mutation AdminLogin($loginInput: AdminLoginInput!) {
    adminLogin(loginInput: $loginInput) {
      accessToken
    }
  }
`;

export const ADMIN_LOGOUT = gql`
  mutation AdminLogout {
    adminLogout
  }
`;

export const ADMIN_REFRESH = gql`
  mutation AdminRefresh {
    adminRefresh
  }
`;

// ── 비디오 태그 추가 / 제거 ────────────────────────────────────
export const ADD_TAG_TO_VIDEO = gql`
  mutation AddTagToVideo($videoId: String!, $tagName: String!) {
    addTagToVideo(videoId: $videoId, tagName: $tagName) {
      id
      tags {
        id
        name
      }
    }
  }
`;

export const REMOVE_TAG_FROM_VIDEO = gql`
  mutation RemoveTagFromVideo($videoId: String!, $tagName: String!) {
    removeTagFromVideo(videoId: $videoId, tagName: $tagName) {
      id
      tags {
        id
        name
      }
    }
  }
`;

// ── 플레이리스트 태그 추가 / 제거 ─────────────────────────────
export const ADD_TAG_TO_PLAYLIST = gql`
  mutation AddTagToPlaylist($playlistId: String!, $tagName: String!) {
    addTagToPlaylist(playlistId: $playlistId, tagName: $tagName) {
      id
      tags {
        id
        name
      }
    }
  }
`;

export const REMOVE_TAG_FROM_PLAYLIST = gql`
  mutation RemoveTagFromPlaylist($playlistId: String!, $tagName: String!) {
    removeTagFromPlaylist(playlistId: $playlistId, tagName: $tagName) {
      id
      tags {
        id
        name
      }
    }
  }
`;

export const GET_VOTE = gql`
  query GetVote($voteId: String!) {
    getVote(voteId: $voteId) {
      voteId
      title
      options {
        id
        text
        count
      }
    }
  }
`;

export const ADD_OPTION = gql`
  mutation AddOption($voteId: String!, $text: String!) {
    addOption(voteId: $voteId, text: $text)
  }
`;

export const VOTE = gql`
  mutation Vote($voteId: String!, $optionId: String!) {
    vote(voteId: $voteId, optionId: $optionId) {
      id
      voteId
      createdAt
    }
  }
`;

export const DELETE_OPTION = gql`
  mutation DeleteOption($voteId: String!, $optionId: String!) {
    deleteOption(voteId: $voteId, optionId: $optionId)
  }
`;

export const GET_SCHEDULES = gql`
  query GetSchedules {
    getSchedules {
      id
      date
      time
      content
    }
  }
`;

export const SAVE_SCHEDULES = gql`
  mutation SaveSchedules(
    $entries: [ScheduleEntryInput!]!
    $deleteIds: [String!]
  ) {
    saveSchedules(
      entries: $entries
      deleteIds: $deleteIds
    ) {
      id
      date
      time
      content
    }
  }
`;