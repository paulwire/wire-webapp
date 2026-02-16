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

import {FC, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Giphy} from 'Components/Giphy';
import {InputBar} from 'Components/InputBar';
import {Message as MessageComponent} from 'Components/MessagesList/Message';
import {MarkerComponent} from 'Components/MessagesList/Message/Marker';
import {THREAD_REPLY_SENT, ThreadReplySentPayload} from 'Components/MessagesList/threading/threadingEvents';
import {groupMessagesBySenderAndTime, isMarker} from 'Components/MessagesList/utils/messagesGroup';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {EventMapper} from 'Repositories/conversation/EventMapper';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Message as MessageEntity} from 'Repositories/entity/message/Message';
import {User} from 'Repositories/entity/User';
import {EventRepository} from 'Repositories/event/EventRepository';
import {GiphyRepository} from 'Repositories/extension/GiphyRepository';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {StorageRepository} from 'Repositories/storage';
import {TeamState} from 'Repositories/team/TeamState';
import {isContentMessage} from 'src/script/guards/Message';
import {useRoveFocus} from 'src/script/hooks/useRoveFocus';
import {ActionsViewModel} from 'src/script/view_model/ActionsViewModel';
import {getLogger} from 'Util/Logger';

import {PanelHeader} from '../PanelHeader';

type ThreadBackendEvent = {
  conversation?: string;
  data?: {
    thread_id?: string | null;
    thread_root_message_id?: string | null;
    threadId?: string | null;
  };
  thread_id?: string | null;
  thread_root_message_id?: string | null;
  threadId?: string | null;
};

const logger = getLogger('MessageThread');
const normalizeThreadId = (threadId?: string | null): string | null =>
  typeof threadId === 'string' && threadId.length > 0 ? threadId : null;
const getBackendEventThreadId = (event?: ThreadBackendEvent): string | null =>
  normalizeThreadId(
    event?.thread_id ??
      event?.threadId ??
      event?.thread_root_message_id ??
      event?.data?.thread_id ??
      event?.data?.threadId ??
      event?.data?.thread_root_message_id ??
      null,
  );

interface MessageThreadProps {
  activeConversation: Conversation;
  rootMessage: MessageEntity;
  onClose: () => void;
  conversationRepository: ConversationRepository;
  cellsRepository: CellsRepository;
  messageRepository: MessageRepository;
  eventRepository: EventRepository;
  giphyRepository: GiphyRepository;
  propertiesRepository: PropertiesRepository;
  searchRepository: SearchRepository;
  storageRepository: StorageRepository;
  teamState: TeamState;
  isCellsEnabled: boolean;
  selfUser: User;
  actionsViewModel: ActionsViewModel;
}

export const MessageThread: FC<MessageThreadProps> = ({
  activeConversation,
  rootMessage,
  onClose,
  conversationRepository,
  cellsRepository,
  messageRepository,
  eventRepository,
  giphyRepository,
  propertiesRepository,
  searchRepository,
  storageRepository,
  teamState,
  isCellsEnabled,
  selfUser,
  actionsViewModel,
}) => {
  const rootContentMessage = isContentMessage(rootMessage) ? rootMessage : null;
  const threadId = rootMessage.threadId ?? rootMessage.id;

  const [threadReplies, setThreadReplies] = useState<ContentMessage[]>([]);
  const [isGiphyModalOpen, setIsGiphyModalOpen] = useState(false);
  const [giphyQuery, setGiphyQuery] = useState('');
  const threadListRef = useRef<HTMLDivElement | null>(null);
  const eventMapperRef = useRef(new EventMapper());
  const latestLoadRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const [isMsgElementsFocusable, setMsgElementsFocusable] = useState(false);

  const loadThreadReplies = useCallback(async () => {
    const requestId = ++latestLoadRequestIdRef.current;

    if (!threadId || !activeConversation?.id) {
      setThreadReplies([]);
      return;
    }

    try {
      const events = await eventRepository.eventService.loadThreadEvents(activeConversation.id, threadId);
      const mappedMessages = eventMapperRef.current.mapJsonEvents(events, activeConversation);

      const contentMessages = mappedMessages.filter(isContentMessage);
      const messagesWithUsers = await Promise.all(
        contentMessages.map(message => messageRepository.ensureMessageSender(message)),
      );

      if (isMountedRef.current && requestId === latestLoadRequestIdRef.current) {
        setThreadReplies(messagesWithUsers);
      }
    } catch (error) {
      logger.warn(
        `Failed to load thread replies for conversation '${activeConversation.id}' and thread '${threadId}'`,
        error,
      );
    }
  }, [activeConversation, eventRepository.eventService, messageRepository, threadId]);

  const threadMessages = useMemo(() => {
    if (!rootContentMessage) {
      return [];
    }

    const sortedReplies = [...threadReplies].sort(
      (firstMessage, secondMessage) =>
        firstMessage.timestamp() - secondMessage.timestamp() || firstMessage.id.localeCompare(secondMessage.id),
    );
    return [rootContentMessage, ...sortedReplies.filter(reply => reply.id !== rootContentMessage.id)];
  }, [rootContentMessage, threadReplies]);

  const {
    focusedId,
    handleKeyDown: handleRoveKeyDown,
    setFocusedId,
  } = useRoveFocus(threadMessages.map(message => message.id));
  const groupedThreadMessages = useMemo(
    () => groupMessagesBySenderAndTime(threadMessages, Number.MAX_SAFE_INTEGER),
    [threadMessages],
  );

  useEffect(() => {
    void loadThreadReplies();
  }, [loadThreadReplies]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      latestLoadRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const handleReply = (payload: ThreadReplySentPayload) => {
      if (payload.conversationId === activeConversation.id && payload.threadId === threadId) {
        void loadThreadReplies();
      }
    };

    const handleEventFromBackend = (event: ThreadBackendEvent) => {
      if (event?.conversation !== activeConversation.id) {
        return;
      }

      if (getBackendEventThreadId(event) === threadId) {
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
    threadListRef.current?.scrollTo({top: threadListRef.current.scrollHeight});
  }, [groupedThreadMessages.length, threadId]);

  const repliesTitle = `${threadReplies.length} ${threadReplies.length === 1 ? 'reply' : 'replies'}`;
  const openGiphy = useCallback((text: string) => {
    setGiphyQuery(text);
    setIsGiphyModalOpen(true);
  }, []);
  const closeGiphy = useCallback(() => setIsGiphyModalOpen(false), []);
  const uploadImages = useCallback(
    (images: File[]) => messageRepository.uploadImages(activeConversation, images, threadId),
    [activeConversation, messageRepository, threadId],
  );
  const uploadFiles = useCallback(
    (files: File[]) => messageRepository.uploadFiles(activeConversation, files, false, threadId),
    [activeConversation, messageRepository, threadId],
  );
  const uploadDroppedFiles = useCallback(
    (droppedFiles: File[]) => {
      const images: File[] = [];
      const files: File[] = [];

      droppedFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          images.push(file);
        } else {
          files.push(file);
        }
      });

      if (images.length) {
        uploadImages(images);
      }
      if (files.length) {
        uploadFiles(files);
      }
    },
    [uploadFiles, uploadImages],
  );
  if (!rootContentMessage) {
    return null;
  }

  return (
    <div id="message-thread" className="panel__page panel__message-thread">
      <PanelHeader
        onClose={onClose}
        showBackArrow={false}
        title={`Thread - ${repliesTitle}`}
        titleDataUieName="message-thread-title"
        shouldFocusFirstButton={false}
      />

      <FadingScrollbar ref={threadListRef} className="message-list panel__content" style={{flexGrow: 1}}>
        <div className="messages" data-uie-name="message-thread-messages">
          {groupedThreadMessages.flatMap(group => {
            if (isMarker(group)) {
              return <MarkerComponent key={`${group.type}-${group.timestamp}`} marker={group} />;
            }

            return group.messages.map(message => (
              <MessageComponent
                key={`${message.id}-${message.timestamp()}`}
                message={message}
                hideHeader={message.timestamp() !== group.firstMessageTimestamp}
                messageActions={actionsViewModel}
                conversation={activeConversation}
                hasReadReceiptsTurnedOn={false}
                isLastDeliveredMessage={false}
                isHighlighted={false}
                isSelfTemporaryGuest={selfUser.isTemporaryGuest()}
                messageRepository={messageRepository}
                onClickAvatar={() => undefined}
                onClickCancelRequest={() => undefined}
                onClickImage={() => undefined}
                onClickInvitePeople={() => undefined}
                onClickReactionDetails={() => undefined}
                onClickMessage={() => true}
                onClickParticipants={() => undefined}
                onClickDetails={() => undefined}
                onClickThread={() => undefined}
                onClickResetSession={() => undefined}
                onClickTimestamp={() => undefined}
                selfId={selfUser.qualifiedId}
                shouldShowInvitePeople={false}
                isFocused={focusedId === message.id}
                handleFocus={setFocusedId}
                handleArrowKeyDown={handleRoveKeyDown}
                isMsgElementsFocusable={isMsgElementsFocusable}
                setMsgElementsFocusable={setMsgElementsFocusable}
                showThreadSummary={false}
              />
            ));
          })}
        </div>
      </FadingScrollbar>

      <div className="panel__footer" data-uie-name="message-thread-composer" style={{padding: '8px 8px 10px'}}>
        <InputBar
          key={`${activeConversation.id}-${threadId}`}
          threadId={threadId}
          disableRightPanelOffset
          conversation={activeConversation}
          conversationRepository={conversationRepository}
          cellsRepository={cellsRepository}
          eventRepository={eventRepository}
          messageRepository={messageRepository}
          openGiphy={openGiphy}
          propertiesRepository={propertiesRepository}
          searchRepository={searchRepository}
          storageRepository={storageRepository}
          teamState={teamState}
          selfUser={selfUser}
          isCellsEnabled={isCellsEnabled}
          onShiftTab={() => setMsgElementsFocusable(false)}
          uploadDroppedFiles={uploadDroppedFiles}
          uploadImages={uploadImages}
          uploadFiles={uploadFiles}
          uploadPastedFiles={file => uploadDroppedFiles([file])}
          onCellImageUpload={() => undefined}
          onCellAssetUpload={() => undefined}
        />
      </div>
      {isGiphyModalOpen && giphyQuery && (
        <Giphy giphyRepository={giphyRepository} inputValue={giphyQuery} onClose={closeGiphy} />
      )}
    </div>
  );
};
