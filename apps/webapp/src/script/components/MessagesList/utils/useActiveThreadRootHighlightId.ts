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

import {useEffect, useState} from 'react';

import {Message as MessageEntity} from 'Repositories/entity/message/Message';
import {PanelState} from 'src/script/page/RightSidebar';
import {useAppMainState} from 'src/script/page/state';

export const useActiveThreadRootHighlightId = () => {
  const activeThreadRootMessageId = useAppMainState(state => {
    const {history, entity} = state.rightSidebar;
    const currentPanel = history[history.length - 1];

    if (currentPanel !== PanelState.MESSAGE_THREAD || !(entity instanceof MessageEntity)) {
      return null;
    }

    return entity.id;
  });

  const [isMainConversationHighlightActive, setMainConversationHighlightActive] = useState(false);

  useEffect(() => {
    if (!activeThreadRootMessageId) {
      setMainConversationHighlightActive(false);
      return;
    }

    setMainConversationHighlightActive(true);

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!target) {
        return;
      }

      if (target.closest('#message-thread')) {
        setMainConversationHighlightActive(true);
        return;
      }

      if (target.closest('#conversation-input-bar')) {
        setMainConversationHighlightActive(false);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('#message-thread')) {
        setMainConversationHighlightActive(true);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [activeThreadRootMessageId]);

  return isMainConversationHighlightActive ? activeThreadRootMessageId : null;
};

