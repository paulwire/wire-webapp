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

type ThreadUnreadRepliesState = {
  unreadByThread: Record<string, number>;
  incrementUnreadForThread: (conversationId: string, threadId: string) => void;
  markThreadAsRead: (conversationId: string, threadId: string) => void;
};

const getThreadKey = (conversationId: string, threadId: string) => `${conversationId}:${threadId}`;

const useThreadUnreadRepliesStore = create<ThreadUnreadRepliesState>(set => ({
  unreadByThread: {},
  incrementUnreadForThread: (conversationId, threadId) =>
    set(state => {
      const key = getThreadKey(conversationId, threadId);
      const currentValue = state.unreadByThread[key] ?? 0;

      return {
        unreadByThread: {
          ...state.unreadByThread,
          [key]: currentValue + 1,
        },
      };
    }),
  markThreadAsRead: (conversationId, threadId) =>
    set(state => {
      const key = getThreadKey(conversationId, threadId);
      if (!state.unreadByThread[key]) {
        return state;
      }

      return {
        unreadByThread: {
          ...state.unreadByThread,
          [key]: 0,
        },
      };
    }),
}));

export const getThreadUnreadReplies = (conversationId: string, threadId: string, state: ThreadUnreadRepliesState) => {
  return state.unreadByThread[getThreadKey(conversationId, threadId)] ?? 0;
};

export const hasConversationUnreadThreadReplies = (conversationId: string, state: ThreadUnreadRepliesState): boolean => {
  const prefix = `${conversationId}:`;
  return Object.entries(state.unreadByThread).some(([key, value]) => key.startsWith(prefix) && value > 0);
};

export {useThreadUnreadRepliesStore};
