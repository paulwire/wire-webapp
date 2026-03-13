/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {useMemo} from 'react';

import * as Icon from 'Components/Icon';
import {getConversationUnreadThreadRepliesCount, useThreadUnreadRepliesStore} from 'Components/MessagesList/threading/threadUnreadRepliesStore';
import {generateCellState} from 'Repositories/conversation/ConversationCellState';
import {ConversationStatusIcon} from 'Repositories/conversation/ConversationStatusIcon';
import type {Conversation} from 'Repositories/entity/Conversation';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

interface Props {
  conversation: Conversation;
}

export const StatusIcon = ({conversation}: Props) => {
  const {unreadState, mutedState, isRequest} = useKoSubscribableChildren(conversation, [
    'unreadState',
    'mutedState',
    'isRequest',
  ]);

  const cellState = useMemo(() => generateCellState(conversation), [unreadState, mutedState, isRequest]);
  const unreadThreadRepliesCount = useThreadUnreadRepliesStore(state => getConversationUnreadThreadRepliesCount(conversation.id, state));

  const isMutedOrPendingIcon =
    cellState.icon === ConversationStatusIcon.MUTED || cellState.icon === ConversationStatusIcon.PENDING_CONNECTION;

  const iconToRender = (() => {
    if (cellState.icon === ConversationStatusIcon.UNREAD_MENTION) {
      return ConversationStatusIcon.UNREAD_MENTION;
    }

    if (unreadThreadRepliesCount > 0 && !isMutedOrPendingIcon) {
      return ConversationStatusIcon.UNREAD_THREAD;
    }

    return cellState.icon;
  })();

  return (
    <>
      {iconToRender === ConversationStatusIcon.PENDING_CONNECTION && (
        <span
          className="conversation-list-cell-badge cell-badge-light"
          data-uie-name="status-pending"
          title={t('accessibility.conversationStatusPending')}
        >
          <Icon.PendingIcon className="svg-icon" />
        </span>
      )}

      {iconToRender === ConversationStatusIcon.UNREAD_MENTION && (
        <span
          className="conversation-list-cell-badge cell-badge-dark"
          data-uie-name="status-mention"
          title={t('accessibility.conversationStatusUnreadMention')}
        >
          <Icon.MentionIcon className="svg-icon" />
        </span>
      )}

      {iconToRender === ConversationStatusIcon.UNREAD_THREAD && (
        <span
          className="conversation-list-cell-badge cell-badge-dark"
          data-uie-name="status-thread-reply"
          title={t('accessibility.conversationStatusUnreadReply')}
          aria-label={t('accessibility.conversationStatusUnreadReply')}
        >
          <Icon.MessageIcon className="svg-icon" />
        </span>
      )}

      {iconToRender === ConversationStatusIcon.UNREAD_REPLY && (
        <span
          className="conversation-list-cell-badge cell-badge-dark"
          data-uie-name="status-reply"
          title={t('accessibility.conversationStatusUnreadReply')}
          aria-label={t('accessibility.conversationStatusUnreadReply')}
        >
          <Icon.ReplyIcon className="svg-icon" />
        </span>
      )}

      {iconToRender === ConversationStatusIcon.UNREAD_PING && (
        <span
          className="conversation-list-cell-badge cell-badge-dark"
          data-uie-name="status-ping"
          title={t('accessibility.conversationStatusUnreadPing')}
        >
          <Icon.PingIcon className="svg-icon" />
        </span>
      )}

      {iconToRender === ConversationStatusIcon.MISSED_CALL && (
        <span
          className="conversation-list-cell-badge cell-badge-dark"
          data-uie-name="status-missed-call"
          title={t('accessibility.callStatusMissed')}
        >
          <Icon.HangupIcon className="svg-icon" />
        </span>
      )}

      {iconToRender === ConversationStatusIcon.MUTED && (
        <span
          className="conversation-list-cell-badge cell-badge-light conversation-muted"
          data-uie-name="status-silence"
          title={t('accessibility.conversationStatusMuted')}
        >
          <Icon.MuteIcon className="svg-icon" />
        </span>
      )}

      {(iconToRender === ConversationStatusIcon.UNREAD_MESSAGES ||
        (iconToRender === ConversationStatusIcon.UNREAD_THREAD && unreadState.allMessages.length > 0)) &&
        unreadState.allMessages.length > 0 && (
        <span
          className="conversation-list-cell-badge cell-badge-dark"
          data-uie-name="status-unread"
          title={t('accessibility.conversationStatusUnread')}
        >
          {unreadState.allMessages.length}
        </span>
      )}
    </>
  );
};
