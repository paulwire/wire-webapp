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

import {useMemo, useState} from 'react';

import {
  ThreadIndexEntry,
  getFilteredThreadsSorted,
  useThreadIndexStore,
} from 'Components/MessagesList/threading/threadIndexStore';

type ThreadFilterKey = 'allThreads' | 'myThreads' | 'contributed' | 'inactive';

const FILTER_LABELS: Record<ThreadFilterKey, string> = {
  allThreads: 'All threads',
  myThreads: 'My threads',
  contributed: 'Contributed',
  inactive: 'Inactive',
};

type ThreadsPanelProps = {
  onOpenThread?: (thread: ThreadIndexEntry) => void;
};

export const ThreadsPanel = ({onOpenThread}: ThreadsPanelProps) => {
  const [filters, setFilters] = useState({
    allThreads: true,
    myThreads: false,
    contributed: false,
    inactive: false,
  });
  const allThreads = useThreadIndexStore(state => getFilteredThreadsSorted(state, filters));

  const activeFilters = useMemo(
    () => (Object.keys(filters) as ThreadFilterKey[]).filter(filterKey => filters[filterKey]),
    [filters],
  );

  const toggleFilter = (filterKey: ThreadFilterKey) => {
    setFilters(current => {
      if (filterKey === 'inactive') {
        return {
          ...current,
          inactive: !current.inactive,
        };
      }

      if (filterKey === 'allThreads') {
        return {
          ...current,
          allThreads: !current.allThreads,
        };
      }

      const next = {
        ...current,
        [filterKey]: !current[filterKey],
      };

      if (next[filterKey]) {
        next.allThreads = false;
      } else if (!next.myThreads && !next.contributed) {
        next.allThreads = true;
      }

      return next;
    });
  };

  return (
    <div data-uie-name="threads-panel">
      <div data-uie-name="threads-filters">
        {(Object.keys(filters) as ThreadFilterKey[]).map(filterKey => (
          <button
            key={filterKey}
            type="button"
            data-uie-name={`threads-filter-${filterKey}`}
            aria-pressed={filters[filterKey]}
            onClick={() => toggleFilter(filterKey)}
          >
            {FILTER_LABELS[filterKey]}
          </button>
        ))}
      </div>
      {!allThreads.length ? (
        <div className="left-list-no-conversations" data-uie-name="threads-placeholder-panel">
          <h2>All threads</h2>
          <p>No threads for the current filters.</p>
        </div>
      ) : (
        <ul data-uie-name="threads-list">
          {allThreads.map(thread => (
            <li key={`${thread.conversationId}:${thread.threadId}`} data-uie-name="threads-list-item">
              <button
                type="button"
                data-uie-name="threads-list-open-button"
                onClick={() => onOpenThread?.(thread)}
              >{`${thread.conversationId}:${thread.threadId}`}</button>
              {thread.unreadCount > 0 && <span>{` unread: ${thread.unreadCount}`}</span>}
            </li>
          ))}
        </ul>
      )}
      <p data-uie-name="threads-active-filters">
        {activeFilters.map(filterKey => FILTER_LABELS[filterKey]).join(', ')}
      </p>
    </div>
  );
};
