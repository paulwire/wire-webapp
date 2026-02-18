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

import {render} from '@testing-library/react';

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
    expect(getByText('Thread list is coming in the next iteration.')).toBeTruthy();
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

    expect(getByText('conversation-a:thread-a')).toBeTruthy();
    expect(getByText(' unread: 2')).toBeTruthy();
  });
});
