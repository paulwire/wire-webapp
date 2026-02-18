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
};

type ThreadIndexStore = {
  threadsByKey: Record<string, ThreadIndexEntry>;
  upsertThread: (entry: Partial<ThreadIndexEntry> & Pick<ThreadIndexEntry, 'conversationId' | 'threadId'>) => void;
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

export {useThreadIndexStore};
