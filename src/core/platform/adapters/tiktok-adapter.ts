/**
 * @file tiktok-adapter — TikTok public data (read-only)
 * @layer platform
 * @ponytail: TikTok has no stable public read-only API.
 *   The web API changes frequently and undocumented.
 *   Revisit when an official TikTok API for public data becomes available.
 *   For now: use YouTube for video platform monitoring.
 */

export async function getTrendingVideos(): Promise<never> {
  throw new Error(
    'TikTok adapter not implemented — no stable public API available. ' +
    'Use YouTube adapter for video platform features.',
  );
}

export async function getVideoComments(_videoId: string): Promise<never> {
  throw new Error('TikTok adapter not implemented — see getTrendingVideos.');
}
