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

import {getAllThreadsSorted, useThreadIndexStore} from './threadIndexStore';

describe('threadIndexStore', () => {
  beforeEach(() => {
    useThreadIndexStore.getState().clearThreads();
    localStorage.removeItem('thread-index-store');
  });

  it('sorts thread entries by last reply timestamp (desc)', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-01T00:00:00.000Z',
      replyCount: 1,
      unreadCount: 0,
    });

    store.upsertThread({
      conversationId: 'conversation-b',
      threadId: 'thread-b',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      replyCount: 1,
      unreadCount: 1,
    });

    const sorted = getAllThreadsSorted(useThreadIndexStore.getState());

    expect(sorted.map(entry => entry.threadId)).toEqual(['thread-b', 'thread-a']);
  });

  it('merges updates for existing thread entry', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-01T00:00:00.000Z',
      replyCount: 1,
      unreadCount: 0,
      hasUnreadMentionForSelf: false,
    });

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      unreadCount: 2,
      hasUnreadMentionForSelf: true,
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());

    expect(thread.replyCount).toBe(1);
    expect(thread.unreadCount).toBe(2);
    expect(thread.hasUnreadMentionForSelf).toBe(true);
  });

  it('records thread reply events and updates unread counters for non-self replies', () => {
    const store = useThreadIndexStore.getState();

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-02T00:00:00.000Z',
      messageId: 'message-a',
      authorId: 'other-user',
      isSelfReply: false,
      hasSelfMention: true,
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());

    expect(thread.lastReplyAt).toBe('2026-01-02T00:00:00.000Z');
    expect(thread.lastReplyMessageId).toBe('message-a');
    expect(thread.lastReplyAuthorId).toBe('other-user');
    expect(thread.replyCount).toBe(1);
    expect(thread.unreadCount).toBe(1);
    expect(thread.hasUnreadMentionForSelf).toBe(true);
  });

  it('records self replies without increasing unread counter', () => {
    const store = useThreadIndexStore.getState();

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-02T00:00:00.000Z',
      authorId: 'self-user',
      isSelfReply: true,
      hasSelfMention: false,
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());

    expect(thread.replyCount).toBe(1);
    expect(thread.unreadCount).toBe(0);
  });
});
