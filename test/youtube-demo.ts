/**
 * Verify YouTube adapter types and function signatures.
 * Needs YOUTUBE_API_KEY env var for live test.
 * ponytail: type-level check only — no API call without key.
 */
import { getChannelStats, getVideoStats, getVideoComments } from '../src/core/platform/adapters/youtube-adapter.js';

// Verify functions exist and return correct types
async function main() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) { console.log('SKIP: YOUTUBE_API_KEY not set — type check only'); return; }

  const channel = await getChannelStats('UCXuqSBlHAE6XgYeDn1w3CwQ', key);
  console.log('  PASS: getChannelStats —', channel.title, channel.subscriberCount);

  const video = await getVideoStats('jNQXAC9IVRw', key);
  console.log('  PASS: getVideoStats —', video.title, video.viewCount);

  const comments = await getVideoComments('jNQXAC9IVRw', key, 3);
  console.log('  PASS: getVideoComments —', comments.length, 'comments');

  console.log('\n  ALL PASS');
}
main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
