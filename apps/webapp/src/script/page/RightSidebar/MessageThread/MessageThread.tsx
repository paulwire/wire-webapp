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

import {FC, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {THREAD_REPLY_SENT, ThreadReplySentPayload} from 'Components/MessagesList/threading/threadingEvents';
import {EventMapper} from 'Repositories/conversation/EventMapper';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Message} from 'Repositories/entity/message/Message';
import {EventRepository} from 'Repositories/event/EventRepository';
import {isContentMessage} from 'src/script/guards/Message';
import {t} from 'Util/LocalizerUtil';
import {formatTimeShort} from 'Util/TimeUtil';

import {PanelHeader} from '../PanelHeader';

interface MessageThreadProps {
  activeConversation: Conversation;
  rootMessage: Message;
  onClose: () => void;
  messageRepository: MessageRepository;
  eventRepository: EventRepository;
}

const extractMessageText = (message: ContentMessage): string => {
  const firstAsset = message.getFirstAsset();

  if ('text' in firstAsset && typeof firstAsset.text === 'string' && firstAsset.text.length > 0) {
    return firstAsset.text;
  }

  if ('file_name' in firstAsset && typeof firstAsset.file_name === 'string' && firstAsset.file_name.length > 0) {
    return firstAsset.file_name;
  }

  return t('replyBarSingleAttachment');
};

export const MessageThread: FC<MessageThreadProps> = ({
  activeConversation,
  rootMessage,
  onClose,
  messageRepository,
  eventRepository,
}) => {
  const rootContentMessage = isContentMessage(rootMessage) ? rootMessage : null;
  const threadId = rootMessage.threadId ?? rootMessage.id;

  const [threadReplies, setThreadReplies] = useState<ContentMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const eventMapperRef = useRef(new EventMapper());

  const loadThreadReplies = useCallback(async () => {
    if (!threadId || !activeConversation?.id) {
      setThreadReplies([]);
      return;
    }

    const events = await eventRepository.eventService.loadThreadEvents(activeConversation.id, threadId);
    const mappedMessages = eventMapperRef.current.mapJsonEvents(events, activeConversation);

    const contentMessages = mappedMessages.filter(isContentMessage);
    const messagesWithUsers = await Promise.all(
      contentMessages.map(message => messageRepository.ensureMessageSender(message)),
    );

    setThreadReplies(messagesWithUsers);
  }, [activeConversation, eventRepository.eventService, messageRepository, threadId]);

  useEffect(() => {
    void loadThreadReplies();
  }, [loadThreadReplies]);

  useEffect(() => {
    const handleReply = (payload: ThreadReplySentPayload) => {
      if (payload.conversationId === activeConversation.id && payload.threadId === threadId) {
        void loadThreadReplies();
      }
    };

    const handleEventFromBackend = (event: {conversation?: string; thread_id?: string | null}) => {
      if (event?.conversation === activeConversation.id && event.thread_id === threadId) {
        void loadThreadReplies();
      }
    };

    amplify.subscribe(THREAD_REPLY_SENT, handleReply);
    amplify.subscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, handleEventFromBackend);

    return () => {
      amplify.unsubscribe(THREAD_REPLY_SENT, handleReply);
      amplify.unsubscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, handleEventFromBackend);
    };
  }, [activeConversation.id, loadThreadReplies, threadId]);

  useEffect(() => {
    // Delay until panel transition settles.
    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => window.clearTimeout(timeoutId);
  }, [threadId]);

  const handleSend = useCallback(async () => {
    const trimmedMessage = draft.trim();
    if (!trimmedMessage.length || isSending) {
      return;
    }

    setIsSending(true);

    try {
      await messageRepository.sendTextWithLinkPreview({
        conversation: activeConversation,
        textMessage: trimmedMessage,
        mentions: [],
        attachments: [],
        threadId,
      });

      setDraft('');
      inputRef.current?.focus();
      amplify.publish(THREAD_REPLY_SENT, {conversationId: activeConversation.id, threadId});
      void loadThreadReplies();
    } finally {
      setIsSending(false);
    }
  }, [activeConversation, draft, isSending, loadThreadReplies, messageRepository, threadId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const rootMessageTimestamp = useMemo(
    () => (rootContentMessage ? formatTimeShort(rootContentMessage.timestamp()) : ''),
    [rootContentMessage],
  );

  const repliesTitle =
    threadReplies.length === 1
      ? t('conversationsSecondaryLineSummaryReply', {number: 1})
      : t('conversationsSecondaryLineSummaryReplies', {number: threadReplies.length});

  if (!rootContentMessage) {
    return null;
  }

  return (
    <div id="message-thread" className="panel__page panel__message-thread">
      <PanelHeader
        onClose={onClose}
        showBackArrow={false}
        title={t('conversationContextMenuReply')}
        titleDataUieName="message-thread-title"
        shouldFocusFirstButton={false}
      />

      <FadingScrollbar className="panel__content" style={{flexGrow: 1}}>
        <div data-uie-name="message-thread-root" style={{padding: '16px 16px 8px'}}>
          <div style={{fontWeight: 600, marginBottom: 4}}>{rootContentMessage.senderName()}</div>
          <div style={{marginBottom: 4, overflowWrap: 'anywhere'}}>{extractMessageText(rootContentMessage)}</div>
          <div className="text-foreground" style={{fontSize: 12}}>
            {rootMessageTimestamp}
          </div>
        </div>

        <div data-uie-name="message-thread-replies" style={{padding: '8px 16px 16px'}}>
          <div className="text-foreground" style={{fontSize: 12, marginBottom: 8}}>
            {repliesTitle}
          </div>

          {threadReplies.map(reply => (
            <div key={reply.id} data-uie-name="message-thread-reply-item" style={{marginBottom: 12}}>
              <div style={{fontWeight: 600, marginBottom: 2}}>{reply.senderName()}</div>
              <div style={{overflowWrap: 'anywhere'}}>{extractMessageText(reply)}</div>
              <div className="text-foreground" style={{fontSize: 12}}>
                {formatTimeShort(reply.timestamp())}
              </div>
            </div>
          ))}
        </div>
      </FadingScrollbar>

      <div
        className="panel__footer"
        data-uie-name="message-thread-composer"
        style={{display: 'flex', gap: 8, alignItems: 'center'}}
      >
        <input
          ref={inputRef}
          data-uie-name="input-thread-message"
          className="input"
          type="text"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('tooltipConversationInputPlaceholder')}
          disabled={isSending}
          style={{flexGrow: 1}}
        />
        <button
          type="button"
          data-uie-name="do-send-thread-message"
          className="button button--secondary"
          onClick={() => void handleSend()}
          disabled={isSending || !draft.trim().length}
        >
          Send
        </button>
      </div>
    </div>
  );
};
