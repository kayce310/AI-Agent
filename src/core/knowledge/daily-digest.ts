/**
 * @file daily-digest — Extract knowledge from today's conversations and save to Obsidian.
 * Registered as a CronScheduler job.
 * @ponytail: fixed channel ID from env, add multi-channel when needed.
 */
import { extractKnowledge, saveToObsidian } from './memory-extractor.js';
import { MemoryFacade } from '../memory/memory-facade.js';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'DailyDigest' });

export async function dailyDigest(
  facade: MemoryFacade,
  vaultPath: string,
  channelId: string,
): Promise<string | null> {
  const messages = await facade.getChannelHistory(channelId);
  if (!messages.length) return null;

  const entries = extractKnowledge(messages, 'daily-digest');
  if (!entries.length) {
    log.info('No entries extracted today');
    return null;
  }

  const files = await saveToObsidian(entries, vaultPath);
  log.info(`Saved ${files.length} knowledge entries to Obsidian`);
  return `📝 Daily digest: ${files.length} entries extracted → ${vaultPath}/coral/`;
}
