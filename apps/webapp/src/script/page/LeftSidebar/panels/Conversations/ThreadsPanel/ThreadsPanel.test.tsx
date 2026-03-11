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

import {fireEvent, render} from '@testing-library/react';

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {useThreadIndexStore} from 'Components/MessagesList/threading/threadIndexStore';

import {ThreadsPanel} from './ThreadsPanel';

describe('ThreadsPanel', () => {
  beforeEach(() => {
    useThreadIndexStore.getState().clearThreads();
    localStorage.removeItem('thread-index-store');
  });

  it('renders empty state when there are no indexed threads', () => {
    const {getByText} = render(withTheme(<ThreadsPanel />));

    expect(getByText('All threads')).toBeTruthy();
    expect(getByText('No threads for the current filters.')).toBeTruthy();
  });

  it('renders indexed threads from store', () => {
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      unreadCount: 2,
      replyCount: 3,
    });

    const {getByText} = render(withTheme(<ThreadsPanel />));

    expect(getByText('Thread in conversation-a')).toBeTruthy();
    expect(getByText('conversation-a')).toBeTruthy();
    expect(getByText('Last reply by Unknown author')).toBeTruthy();
    expect(getByText('No preview available.')).toBeTruthy();
    expect(getByText('· 3 replies')).toBeTruthy();
    expect(getByText(' unread: 2')).toBeTruthy();
  });

  it('hides inactive threads by default and shows them when inactive filter is selected', () => {
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-inactive',
      lastReplyAt: '2020-01-01T00:00:00.000Z',
      unreadCount: 0,
      replyCount: 1,
    });

    const {queryByText, getByRole} = render(withTheme(<ThreadsPanel />));

    expect(queryByText('conversation-a')).toBeNull();

    fireEvent.click(getByRole('button', {name: 'Inactive'}));

    expect(queryByText('conversation-a')).toBeTruthy();
  });

  it('calls onOpenThread when clicking a thread row', () => {
    const onOpenThread = jest.fn();
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      unreadCount: 0,
      replyCount: 1,
    });

    const {getByRole} = render(withTheme(<ThreadsPanel onOpenThread={onOpenThread} />));

    fireEvent.click(getByRole('button', {name: /conversation-a/}));

    expect(onOpenThread).toHaveBeenCalledTimes(1);
    expect(onOpenThread).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-a',
        threadId: 'thread-a',
      }),
    );
  });

  it('renders provided conversation labels', () => {
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      unreadCount: 0,
      replyCount: 1,
    });

    const {getByText} = render(
      withTheme(<ThreadsPanel conversationLabelsById={{'conversation-a': 'Project Alpha'}} />),
    );

    expect(getByText('Thread in Project Alpha')).toBeTruthy();
    expect(getByText('Project Alpha')).toBeTruthy();
  });

  it('renders provided author labels', () => {
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      unreadCount: 0,
      replyCount: 1,
      lastReplyAuthorId: 'user-a',
    });

    const {getByText} = render(withTheme(<ThreadsPanel authorLabelsById={{'user-a': 'Ada Lovelace'}} />));

    expect(getByText('Last reply by Ada Lovelace')).toBeTruthy();
  });

  it('renders thread preview when available', () => {
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      unreadCount: 0,
      replyCount: 1,
      lastReplyPreview: 'Latest update',
    });

    const {getByText} = render(withTheme(<ThreadsPanel />));

    expect(getByText('Latest update')).toBeTruthy();
  });
});
