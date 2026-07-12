/**
 * @file youtube-adapter — YouTube Data API v3 read-only wrapper
 * @layer platform
 * @ponytail: simple REST fetch, no googleapis SDK. Add when we need
 *   OAuth2 writes (upload, manage playlists).
 */

const BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeComment {
  id: string;
  author: string;
  text: string;
  publishedAt: string;
  likeCount: number;
}

export interface VideoStats {
  videoId: string;
  title: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
}

export interface ChannelStats {
  channelId: string;
  title: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

async function apiGet<T>(path: string, apiKey: string): Promise<T> {
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getChannelStats(channelId: string, apiKey: string): Promise<ChannelStats> {
  const data: any = await apiGet(`/channels?part=statistics,snippet&id=${channelId}`, apiKey);
  const ch = data.items?.[0];
  if (!ch) throw new Error(`Channel not found: ${channelId}`);
  return {
    channelId,
    title: ch.snippet?.title ?? '',
    subscriberCount: Number(ch.statistics?.subscriberCount ?? 0),
    videoCount: Number(ch.statistics?.videoCount ?? 0),
    viewCount: Number(ch.statistics?.viewCount ?? 0),
  };
}

export async function getVideoStats(videoId: string, apiKey: string): Promise<VideoStats> {
  const data: any = await apiGet(`/videos?part=statistics,snippet&id=${videoId}`, apiKey);
  const v = data.items?.[0];
  if (!v) throw new Error(`Video not found: ${videoId}`);
  return {
    videoId,
    title: v.snippet?.title ?? '',
    viewCount: Number(v.statistics?.viewCount ?? 0),
    likeCount: Number(v.statistics?.likeCount ?? 0),
    commentCount: Number(v.statistics?.commentCount ?? 0),
    publishedAt: v.snippet?.publishedAt ?? '',
  };
}

export async function getVideoComments(
  videoId: string,
  apiKey: string,
  maxResults = 20,
): Promise<YouTubeComment[]> {
  const data: any = await apiGet(
    `/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}&order=relevance`,
    apiKey,
  );
  return (data.items ?? []).map((item: any) => ({
    id: item.id,
    author: item.snippet?.topLevelComment?.snippet?.authorDisplayName ?? '',
    text: item.snippet?.topLevelComment?.snippet?.textDisplay ?? '',
    publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt ?? '',
    likeCount: Number(item.snippet?.topLevelComment?.snippet?.likeCount ?? 0),
  }));
}
