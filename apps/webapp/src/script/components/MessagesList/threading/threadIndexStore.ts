/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

export type ThreadIndexEntry = {
  conversationId: string;
  threadId: string;
  lastReplyAt: string;
  lastReplyMessageId?: string;
  lastReplyAuthorId?: string;
  lastReplyPreview?: string;
  replyCount: number;
  unreadCount: number;
  hasUnreadMentionForSelf: boolean;
  hasReplyBySelf: boolean;
  isRootMessageBySelf: boolean;
  // POC dedupe strategy; we may replace this with a bounded/indexed approach later.
  seenMessageIds: string[];
};

type ThreadIndexStore = {
  threadsByKey: Record<string, ThreadIndexEntry>;
  upsertThread: (entry: Partial<ThreadIndexEntry> & Pick<ThreadIndexEntry, 'conversationId' | 'threadId'>) => void;
  recordThreadReplyEvent: (event: {
    conversationId: string;
    threadId: string;
    eventTime?: string;
    messageId?: string;
    authorId?: string;
    preview?: string;
    isSelfReply: boolean;
    hasSelfMention: boolean;
  }) => void;
  markThreadRootMessageBySelf: (conversationId: string, threadId: string) => void;
  markThreadRead: (conversationId: string, threadId: string) => void;
  reconcileHydratedThread: (entry: {
    conversationId: string;
    threadId: string;
    lastReplyAt: string;
    lastReplyMessageId?: string;
    lastReplyAuthorId?: string;
    lastReplyPreview?: string;
    replyCount: number;
    hasReplyBySelf: boolean;
    isRootMessageBySelf: boolean;
  }) => void;
  pruneToMostRecent: (maxEntries: number) => void;
  removeThread: (conversationId: string, threadId: string) => void;
  clearThreads: () => void;
};

export const getThreadIndexKey = (conversationId: string, threadId: string) => `${conversationId}:${threadId}`;

const getDefaultThreadEntry = (conversationId: string, threadId: string): ThreadIndexEntry => ({
  conversationId,
  threadId,
  lastReplyAt: new Date(0).toISOString(),
  replyCount: 0,
  unreadCount: 0,
  hasUnreadMentionForSelf: false,
  hasReplyBySelf: false,
  isRootMessageBySelf: false,
  seenMessageIds: [],
});

const useThreadIndexStore = create<ThreadIndexStore>()(
  persist(
    set => ({
      threadsByKey: {},
      upsertThread: ({conversationId, threadId, ...entry}) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const current = state.threadsByKey[key] ?? getDefaultThreadEntry(conversationId, threadId);

          return {
            threadsByKey: {
              ...state.threadsByKey,
              [key]: {
                ...current,
                ...entry,
                conversationId,
                threadId,
              },
            },
          };
        }),
      recordThreadReplyEvent: ({
        conversationId,
        threadId,
        eventTime,
        messageId,
        authorId,
        preview,
        isSelfReply,
        hasSelfMention,
      }) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const current = state.threadsByKey[key] ?? getDefaultThreadEntry(conversationId, threadId);
          if (messageId && current.seenMessageIds.includes(messageId)) {
            return state;
          }

          const effectiveTime = eventTime ?? new Date().toISOString();
          const currentTime = new Date(current.lastReplyAt).getTime();
          const nextTime = new Date(effectiveTime).getTime();
          const shouldUpdateLatestMetadata = nextTime >= currentTime;

          return {
            threadsByKey: {
              ...state.threadsByKey,
              [key]: {
                ...current,
                lastReplyAt: shouldUpdateLatestMetadata ? effectiveTime : current.lastReplyAt,
                lastReplyMessageId:
                  shouldUpdateLatestMetadata && messageId ? messageId : current.lastReplyMessageId,
                lastReplyAuthorId:
                  shouldUpdateLatestMetadata && authorId ? authorId : current.lastReplyAuthorId,
                lastReplyPreview:
                  shouldUpdateLatestMetadata && preview ? preview : current.lastReplyPreview,
                replyCount: current.replyCount + 1,
                unreadCount: isSelfReply ? current.unreadCount : current.unreadCount + 1,
                hasUnreadMentionForSelf: current.hasUnreadMentionForSelf || hasSelfMention,
                hasReplyBySelf: current.hasReplyBySelf || isSelfReply,
                seenMessageIds: messageId ? [...current.seenMessageIds, messageId] : current.seenMessageIds,
              },
            },
          };
        }),
      markThreadRootMessageBySelf: (conversationId, threadId) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const current = state.threadsByKey[key] ?? getDefaultThreadEntry(conversationId, threadId);

          return {
            threadsByKey: {
              ...state.threadsByKey,
              [key]: {
                ...current,
                isRootMessageBySelf: true,
              },
            },
          };
        }),
      markThreadRead: (conversationId, threadId) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const current = state.threadsByKey[key];

          if (!current) {
            return state;
          }

          return {
            threadsByKey: {
              ...state.threadsByKey,
              [key]: {
                ...current,
                unreadCount: 0,
                hasUnreadMentionForSelf: false,
              },
            },
          };
        }),
      reconcileHydratedThread: ({
        conversationId,
        threadId,
        lastReplyAt,
        lastReplyMessageId,
        lastReplyAuthorId,
        lastReplyPreview,
        replyCount,
        hasReplyBySelf,
        isRootMessageBySelf,
      }) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const current = state.threadsByKey[key] ?? getDefaultThreadEntry(conversationId, threadId);
          const currentTime = new Date(current.lastReplyAt).getTime();
          const hydratedTime = new Date(lastReplyAt).getTime();
          const shouldUpdateLatestMetadata = hydratedTime >= currentTime;

          return {
            threadsByKey: {
              ...state.threadsByKey,
              [key]: {
                ...current,
                lastReplyAt: shouldUpdateLatestMetadata ? lastReplyAt : current.lastReplyAt,
                lastReplyMessageId:
                  shouldUpdateLatestMetadata && lastReplyMessageId ? lastReplyMessageId : current.lastReplyMessageId,
                lastReplyAuthorId:
                  shouldUpdateLatestMetadata && lastReplyAuthorId ? lastReplyAuthorId : current.lastReplyAuthorId,
                lastReplyPreview:
                  shouldUpdateLatestMetadata && lastReplyPreview ? lastReplyPreview : current.lastReplyPreview,
                replyCount: Math.max(current.replyCount, replyCount),
                hasReplyBySelf: current.hasReplyBySelf || hasReplyBySelf,
                isRootMessageBySelf: current.isRootMessageBySelf || isRootMessageBySelf,
              },
            },
          };
        }),
      pruneToMostRecent: maxEntries =>
        set(state => {
          if (maxEntries < 1) {
            return {threadsByKey: {}};
          }

          const sorted = getAllThreadsSorted(state);
          if (sorted.length <= maxEntries) {
            return state;
          }

          const pruned = sorted.slice(0, maxEntries).reduce<Record<string, ThreadIndexEntry>>((accumulator, thread) => {
            accumulator[getThreadIndexKey(thread.conversationId, thread.threadId)] = thread;
            return accumulator;
          }, {});

          return {threadsByKey: pruned};
        }),
      removeThread: (conversationId, threadId) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const {[key]: removed, ...rest} = state.threadsByKey;

          if (!removed) {
            return state;
          }

          return {threadsByKey: rest};
        }),
      clearThreads: () => set({threadsByKey: {}}),
    }),
    {
      name: 'thread-index-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({threadsByKey: state.threadsByKey}),
    },
  ),
);

export const getAllThreadsSorted = (state: ThreadIndexStore): ThreadIndexEntry[] => {
  return Object.values(state.threadsByKey).sort((a, b) => {
    const timeDelta = new Date(b.lastReplyAt).getTime() - new Date(a.lastReplyAt).getTime();
    if (timeDelta !== 0) {
      return timeDelta;
    }

    return getThreadIndexKey(a.conversationId, a.threadId).localeCompare(getThreadIndexKey(b.conversationId, b.threadId));
  });
};

const DAYS_30_IN_MS = 30 * 24 * 60 * 60 * 1000;

export const isThreadInactive = (thread: ThreadIndexEntry, now = Date.now()) =>
  now - new Date(thread.lastReplyAt).getTime() > DAYS_30_IN_MS;

export type ThreadListFilters = {
  allThreads: boolean;
  myThreads: boolean;
  contributed: boolean;
  inactive: boolean;
};

export const getFilteredThreadsSorted = (
  state: ThreadIndexStore,
  filters: ThreadListFilters,
  now = Date.now(),
): ThreadIndexEntry[] => {
  return getAllThreadsSorted(state).filter(thread => {
    if (!filters.inactive && isThreadInactive(thread, now)) {
      return false;
    }

    if (filters.allThreads) {
      return true;
    }

    return (filters.myThreads && thread.isRootMessageBySelf) || (filters.contributed && thread.hasReplyBySelf);
  });
};

export {useThreadIndexStore};
