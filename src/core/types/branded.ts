/**
 * @file branded — Branded types for domain-level identity safety
 * @layer core
 * @depends-on (none — standalone)
 *
 * Prevents accidental cross-domain assignment (e.g. channelId used as sessionId)
 * at compile time. Zero runtime overhead — erased during compilation.
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Conversation session ID — created by SessionManager, resettable via /new */
export type ConversationSessionId = Brand<string, 'ConversationSessionId'>;

/** User or channel identity — permanent, from the platform */
export type UserId = Brand<string, 'UserId'>;

/** Unwrap branded types when crossing into storage boundary */
export function asConversationSessionId(id: string): ConversationSessionId {
  return id as ConversationSessionId;
}
export function asUserId(id: string): UserId {
  return id as UserId;
}

/** Strip brand when passing to storage/serialization layers (6 serialize points) */
export function fromConversationSessionId(id: ConversationSessionId): string {
  return id as string;
}
export function fromUserId(id: UserId): string {
  return id as string;
}
