/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {
  HTMLProps,
  MouseEvent,
  FocusEvent,
  ReactNode,
  ReactPortal,
  useEffect,
  useRef,
  useState,
  type FunctionComponent,
} from 'react';

import {CSSObject} from '@emotion/react';
import {isNullOrUndefined} from '@sindresorhus/is';
import {createPortal} from 'react-dom';

import {Theme} from '../../identity';
import {filterProps} from '../../utils';

const centeredWidthDivisor = 2;
const paddingSideCount = 2;

const paddingDistance = 8;

const tooltipStyle: (theme: Theme) => CSSObject = theme => {
  return {
    position: 'fixed',
    zIndex: 'var(--z-index-level-8)',
    maxWidth: '300px',
    filter: 'drop-shadow(1px 2px 6px rgba(0, 0, 0, 0.3))',
    borderRadius: '4px',

    "&[data-position='top']": {
      paddingBottom: `${paddingDistance}px`,

      '.tooltip-arrow': {
        borderTop: `10px solid ${theme.Tooltip.backgroundColor}`,
        bottom: 0,
      },
    },
    "&[data-position='bottom']": {
      paddingTop: `${paddingDistance}px`,

      '.tooltip-arrow': {
        borderBottom: `10px solid ${theme.Tooltip.backgroundColor}`,
        top: 0,
      },
    },

    '.tooltip-content': {
      color: theme.Tooltip.color,
      backgroundColor: theme.Tooltip.backgroundColor,
      borderRadius: '4px',
      fontSize: '12px',
      lineHeight: '14px',
      fontWeight: 400,
      padding: `${paddingDistance}px 8px`,
      textAlign: 'center',
      overflowWrap: 'break-word',
    },

    '.tooltip-arrow': {
      width: 0,
      height: 0,
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      position: 'absolute',
    },
  };
};

interface PositionRect {
  x: number;
  y: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

interface TooltipArrowProps {
  wrapperRect: PositionRect;
}

const TooltipArrow: FunctionComponent<TooltipArrowProps> = ({wrapperRect}) => {
  const tooltipArrowRef = (element: HTMLDivElement | null): void => {
    if (isNullOrUndefined(element)) {
      return;
    }

    const {parentElement} = element;

    if (isNullOrUndefined(parentElement)) {
      return;
    }

    const tooltipRect = parentElement.getBoundingClientRect();

    const isTouchingLeftEdge =
      wrapperRect.x <= tooltipRect.width / centeredWidthDivisor + paddingDistance * paddingSideCount;
    const isTouchingRightEdge =
      wrapperRect.left + tooltipRect.width / centeredWidthDivisor + paddingDistance * paddingSideCount >=
      window.innerWidth;

    if (isTouchingLeftEdge) {
      element.style.left = `${wrapperRect.left - paddingDistance}px`;
    } else if (isTouchingRightEdge) {
      const calculateX = window.innerWidth - wrapperRect.right - paddingDistance;
      element.style.right = `${calculateX}px`;
    } else {
      element.style.left = `50%`;
      element.style.transform = `translateX(-50%)`;
    }
  };

  return <div ref={tooltipArrowRef} className="tooltip-arrow" />;
};

interface PortalProps {
  children: ReactNode;
  wrapperRect?: PositionRect;
  selector?: string;
}

const PortalComponent = ({children, wrapperRect, selector = '#wire-app'}: PortalProps): ReactPortal | null => {
  const [isTouchingTop, setIsTouchingTop] = useState(false);
  const targetElement = document.querySelector(selector);

  if (isNullOrUndefined(targetElement) || isNullOrUndefined(wrapperRect)) {
    return null;
  }

  const tooltipRef = (element: HTMLDivElement | null): void => {
    if (isNullOrUndefined(element)) {
      return;
    }

    const tooltipRect = element.getBoundingClientRect();
    const isTouchingTopEdge = wrapperRect.y <= tooltipRect.height + paddingDistance * paddingSideCount;
    setIsTouchingTop(isTouchingTopEdge);

    const isTouchingLeftEdge =
      wrapperRect.x <= tooltipRect.width / centeredWidthDivisor + paddingDistance * paddingSideCount;
    const isTouchingRightEdge =
      wrapperRect.left + tooltipRect.width / centeredWidthDivisor + paddingDistance * paddingSideCount >=
      window.innerWidth;

    if (isTouchingLeftEdge) {
      element.style.left = `${paddingDistance}px`;
    } else if (isTouchingRightEdge) {
      element.style.right = `${paddingDistance}px`;
    } else {
      const elementWidth = (element.scrollWidth - wrapperRect.width) / centeredWidthDivisor;
      element.style.left = `${wrapperRect.x - elementWidth}px`;
    }

    if (isTouchingTopEdge) {
      element.style.top = `${wrapperRect.y + wrapperRect.height}px`;
    } else {
      element.style.top = `${wrapperRect.y - element.clientHeight}px`;
    }
  };

  return createPortal(
    <div
      ref={tooltipRef}
      className="tooltip"
      css={(theme: Theme) => {
        return tooltipStyle(theme);
      }}
      data-position={isTouchingTop ? 'bottom' : 'top'}
      role="tooltip"
    >
      <TooltipArrow wrapperRect={wrapperRect} />

      <div className="tooltip-content" data-testid="tooltip-content">
        {children}
      </div>
    </div>,
    targetElement,
  );
};

export interface TooltipProps<T = HTMLDivElement> extends HTMLProps<T> {
  body: ReactNode;
  selector?: string;
  /** Delay in milliseconds before the tooltip appears after hover/focus starts. Defaults to 0 (immediate). */
  delay?: number;
  /** Anchor the tooltip to the trigger element's bounding box ('element', default) or to the mouse cursor ('pointer'). */
  anchor?: 'element' | 'pointer';
}

const filterTooltipProps = (props: TooltipProps): Object => {
  return filterProps(props, ['body', 'selector', 'delay', 'anchor']);
};

const pointToRect = (pointerX: number, pointerY: number): PositionRect => {
  return {
    x: pointerX,
    y: pointerY,
    top: pointerY,
    bottom: pointerY,
    left: pointerX,
    right: pointerX,
    width: 0,
    height: 0,
  };
};

export const Tooltip: FunctionComponent<TooltipProps> = ({children, ...props}) => {
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRectRef = useRef<PositionRect | undefined>(undefined);
  const pointerPositionRef = useRef<{x: number; y: number} | undefined>(undefined);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const filteredProps = filterTooltipProps(props);
  const {body, selector = '#wire-app', delay = 0, anchor = 'element'} = props;

  const clearShowTimeout = (): void => {
    if (showTimeoutRef.current !== undefined) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = undefined;
    }
  };

  const captureWrapperRect = (currentTarget: Element): void => {
    wrapperRectRef.current =
      anchor === 'pointer' && pointerPositionRef.current !== undefined
        ? pointToRect(pointerPositionRef.current.x, pointerPositionRef.current.y)
        : currentTarget.getBoundingClientRect();
  };

  const onElementEnter = (event: MouseEvent | FocusEvent): void => {
    const target = event.currentTarget;

    if ('clientX' in event) {
      pointerPositionRef.current = {x: event.clientX, y: event.clientY};
    }

    captureWrapperRect(target);
    clearShowTimeout();

    if (delay > 0) {
      showTimeoutRef.current = setTimeout(() => {
        captureWrapperRect(target);
        setIsHovered(true);
      }, delay);
    } else {
      setIsHovered(true);
    }
  };

  const onElementMove = ({clientX, clientY}: MouseEvent): void => {
    pointerPositionRef.current = {x: clientX, y: clientY};
  };

  const onElementLeave = (): void => {
    clearShowTimeout();
    setIsHovered(false);
  };

  useEffect(() => {
    if (!isHovered) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsHovered(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isHovered]);

  useEffect(() => {
    return clearShowTimeout;
  }, []);

  return (
    <div
      role="presentation"
      data-testid="tooltip-wrapper"
      onMouseEnter={onElementEnter}
      onMouseMove={onElementMove}
      onMouseLeave={onElementLeave}
      onFocus={onElementEnter}
      onBlur={onElementLeave}
      style={{width: 'max-content'}}
      {...filteredProps}
    >
      {children}

      {isHovered && (
        <PortalComponent wrapperRect={wrapperRectRef.current} selector={selector}>
          {body}
        </PortalComponent>
      )}
    </div>
  );
};
