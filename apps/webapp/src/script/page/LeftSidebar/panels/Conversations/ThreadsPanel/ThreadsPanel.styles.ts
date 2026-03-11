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

import {CSSObject} from '@emotion/react';

export const panelContainer: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  height: '100%',
  minHeight: 0,
  padding: '8px',
};

export const filtersContainer: CSSObject = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  padding: '4px 0 2px',
};

export const filterButton = (isActive: boolean): CSSObject => ({
  border: `1px solid ${isActive ? 'var(--accent-color)' : 'var(--border-color)'}`,
  backgroundColor: isActive ? 'var(--accent-color-50)' : 'transparent',
  color: isActive ? 'var(--accent-color)' : 'var(--foreground)',
  borderRadius: '999px',
  padding: '4px 10px',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-xs)',
  transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
  ':hover': {
    backgroundColor: isActive ? 'var(--accent-color-50)' : 'var(--background-fade-8)',
  },
});

export const resetFiltersButton: CSSObject = {
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--accent-color)',
  padding: '4px 2px',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-xs)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  cursor: 'pointer',
};

export const list: CSSObject = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  overflowY: 'auto',
  minHeight: 0,
};

export const listItem: CSSObject = {
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  backgroundColor: 'var(--app-bg)',
  padding: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

export const openButton: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: '4px',
  width: '100%',
  border: 'none',
  background: 'none',
  padding: 0,
  textAlign: 'left',
  color: 'inherit',
  cursor: 'pointer',
  ':focus-visible': {
    outline: '2px solid var(--accent-color)',
    outlineOffset: '2px',
    borderRadius: '6px',
  },
};

export const itemHeader: CSSObject = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
};

export const conversationLabel: CSSObject = {
  fontSize: 'var(--font-size-small)',
  color: 'var(--text-input-label)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const timestamp: CSSObject = {
  fontSize: 'var(--font-size-small)',
  color: 'var(--text-input-placeholder)',
  whiteSpace: 'nowrap',
};

export const title: CSSObject = {
  fontWeight: 'var(--font-weight-semibold)',
  fontSize: 'var(--font-size-medium)',
  color: 'var(--foreground)',
  lineHeight: 'var(--line-height-md)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const meta: CSSObject = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  fontSize: 'var(--font-size-small)',
  color: 'var(--text-input-label)',
};

export const preview: CSSObject = {
  margin: 0,
  fontSize: 'var(--font-size-small)',
  color: 'var(--foreground)',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  lineHeight: 'var(--line-height-sm)',
};

export const badges: CSSObject = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

export const badge = (kind: 'unread' | 'mention'): CSSObject => ({
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '999px',
  padding: '2px 8px',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-xs)',
  border: `1px solid ${kind === 'unread' ? 'var(--accent-color-500)' : 'var(--amber-500)'}`,
  color: kind === 'unread' ? 'var(--accent-color)' : 'var(--amber-500)',
  backgroundColor: kind === 'unread' ? 'var(--accent-color-50)' : 'var(--amber-50)',
});

export const emptyState: CSSObject = {
  marginTop: '12px',
  border: '1px dashed var(--border-color)',
  borderRadius: '10px',
  padding: '16px 12px',
  textAlign: 'center',
};

export const activeFiltersText: CSSObject = {
  margin: 0,
  padding: '0 2px',
  color: 'var(--text-input-placeholder)',
  fontSize: 'var(--font-size-small)',
};

export const summaryText: CSSObject = {
  margin: 0,
  padding: '0 2px',
  color: 'var(--text-input-label)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
};
