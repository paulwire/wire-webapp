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

import {FC, FormEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {CSSObject} from '@emotion/react';
import {isNonEmptyString} from '@sindresorhus/is';
import {amplify} from 'amplify';
import cx from 'classnames';
import debounceFn from 'debounce-fn';

import {GifImage} from './gifImage';

import {giphySearchReworkFeatureToggleName} from '../../featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from '../../page/rootProvider';
import {Gif, GiphyRepository} from '../../repositories/extension/GiphyRepository';
import {SearchIcon} from '../../uiKit/dataDisplay/icon/searchIcon';
import {Button, ButtonVariant} from '../../uiKit/inputs/button/button';
import {Input} from '../../uiKit/inputs/input/input';
import {InputSubmitCombo} from '../../uiKit/inputs/inputSubmitCombo/inputSubmitCombo';
import {WebAppEvents} from '../../webAppEvents';
import * as Icon from '../icon';

const GIPHY_CLOSE_TIMEOUT = 350;
const GIPHY_SEARCH_DEBOUNCE_MS = 400;

const giphySearchFormStyles: CSSObject = {
  display: 'flex',
  flex: 1,
  margin: '0 8px',
};

const giphySearchComboStyles: CSSObject = {
  height: '36px',
  padding: '0 12px',
  width: '100%',
};

const giphySearchInputWrapperStyles: CSSObject = {
  marginBottom: 0,
  width: '100%',
  '.wireinput': {
    boxShadow: 'none',
    height: '28px',
    margin: 0,
    padding: '0 8px',
    '&:focus, &:focus-visible, &:hover, &:active, &:invalid:not(:focus)': {
      boxShadow: 'none',
    },
  },
};

export enum GiphyState {
  DEFAULT = '',
  ERROR = 'GiphyViewModel.STATE.ERROR',
  LOADING = 'GiphyViewModel.STATE.LOADING',
  NO_SEARCH_RESULT = 'GiphyViewModel.STATE.NO_SEARCH_RESULT',
  RESULT = 'GiphyViewModel.STATE.RESULT',
  RESULTS = 'GiphyViewModel.STATE.RESULTS',
}

interface GiphyProps {
  readonly giphyRepository: GiphyRepository;
  inputValue: string;
  onClose: () => void;
  defaultGiphyState?: GiphyState;
}

const Giphy: FC<GiphyProps> = ({giphyRepository, defaultGiphyState = GiphyState.DEFAULT, inputValue, onClose}) => {
  const {translate, isFeatureToggleEnabled} = useApplicationContext();
  // Behind the `giphy-search-rework` toggle; see useGiphy.ts for why.
  const isSearchReworkEnabled = isFeatureToggleEnabled(giphySearchReworkFeatureToggleName);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [playAnimation, setPlayAnimation] = useState<boolean>(false);
  const [currentQuery, setCurrentQuery] = useState<string>(inputValue);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [selectedGif, setSelectedGif] = useState<Gif | null>(null);
  const [currentGif, setCurrentGif] = useState<Gif | null>(null);

  const [giphyState, setGiphyState] = useState<GiphyState>(defaultGiphyState);

  const isErrorState = giphyState === GiphyState.ERROR;
  const isLoading = giphyState === GiphyState.LOADING;
  const isSingleGif = giphyState === GiphyState.RESULT;
  const isMultipleGifs = giphyState === GiphyState.RESULTS;
  const noSearchResults = giphyState === GiphyState.NO_SEARCH_RESULT;
  const isDefaultState = giphyState === GiphyState.DEFAULT;

  const hasGifs = gifs.length > 0;

  const loadingTxt = isLoading ? translate('accessibility.giphyModal.loading') : '';

  const clearGifs = (): void => {
    setGifs([]);
    setSelectedGif(null);
    setGiphyState(GiphyState.LOADING);
  };

  const getGifs = useCallback(
    async (query: string, displaySingleResult = false): Promise<void> => {
      if (isErrorState) {
        return;
      }

      clearGifs();

      try {
        const fetchedGifs = await giphyRepository.getGifs(query);

        if (fetchedGifs.length === 0) {
          setGiphyState(GiphyState.NO_SEARCH_RESULT);

          return;
        }

        if (fetchedGifs.length === 1 || displaySingleResult) {
          const gif = fetchedGifs[0];

          setCurrentGif(gif);
          setGifs([gif]);
          setSelectedGif(gif);
          setGiphyState(GiphyState.RESULT);
        } else {
          setGifs(fetchedGifs);
          setGiphyState(GiphyState.RESULTS);
        }
      } catch {
        setGiphyState(GiphyState.ERROR);
      }
    },
    [giphyRepository, isErrorState],
  );

  const onGridClick = async (): Promise<void> => {
    return getGifs(currentQuery);
  };

  const onBackClick = (): void => {
    if (currentGif !== null) {
      setGifs([currentGif]);
      setSelectedGif(currentGif);
      setGiphyState(GiphyState.RESULT);
    }
  };

  const onCloseClick = (): void => {
    requestAnimationFrame(() => {
      return setPlayAnimation(false);
    });

    setTimeout(() => {
      onClose();
      giphyRepository.resetOffset();
    }, GIPHY_CLOSE_TIMEOUT);
  };

  const showGiphy = useCallback(
    async (query: string) => {
      setCurrentQuery(query);
      await getGifs(query, true);
    },
    [getGifs],
  );

  const getRandomGif = async (): Promise<void> => {
    if (isErrorState) {
      return;
    }

    clearGifs();

    try {
      const gif = await giphyRepository.getRandomGif({tag: currentQuery});
      setCurrentGif(gif);
      setGifs([gif]);
      setSelectedGif(gif);
      setGiphyState(GiphyState.RESULT);
    } catch {
      setGiphyState(GiphyState.ERROR);
    }
  };

  const onSend = (): void => {
    if (selectedGif !== null) {
      amplify.publish(WebAppEvents.EXTENSIONS.GIPHY.SEND, selectedGif.animated, currentQuery);
      setSelectedGif(null);

      onCloseClick();
    }
  };

  const onSelectGif = (clickedGif: Gif): void => {
    const hasMultipleGifs = gifs.length !== 1;

    if (hasMultipleGifs) {
      if (selectedGif === clickedGif) {
        setSelectedGif(null);
      } else {
        setSelectedGif(clickedGif);
      }
    }
  };

  const runSearch = useCallback(
    (query: string): void => {
      const trimmedQuery = query.trim();
      if (isNonEmptyString(trimmedQuery)) {
        void showGiphy(trimmedQuery);
      }
    },
    [showGiphy],
  );

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    runSearch(currentQuery);
  };

  // Searches automatically a short while after the user stops typing, so finding a GIF
  // doesn't depend on noticing you need to press Enter or click the search icon.
  const debouncedRunSearch = useMemo(() => {
    return debounceFn(
      (query: string) => {
        runSearch(query);
      },
      {wait: GIPHY_SEARCH_DEBOUNCE_MS},
    );
  }, [runSearch]);

  const onSearchChange = (query: string): void => {
    setCurrentQuery(query);
    debouncedRunSearch(query);
  };

  useEffect(() => {
    return () => {
      debouncedRunSearch.cancel();
    };
  }, [debouncedRunSearch]);

  useEffect(() => {
    requestAnimationFrame(() => {
      return setPlayAnimation(true);
    });

    if (isNonEmptyString(inputValue)) {
      void showGiphy(inputValue);
    }
    // only run once, when the modal mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSearchReworkEnabled) {
      searchInputRef.current?.focus();
    }
  }, [isSearchReworkEnabled]);

  return (
    <div id="giphy-modal" className={cx('giphy-modal modal modal-large modal-show', {'modal-fadein': playAnimation})}>
      <div
        role="dialog"
        {...(isSearchReworkEnabled
          ? {'aria-label': translate('extensionsBubbleButtonGif')}
          : {'aria-labelledby': 'giphy-name'})}
      >
        <div className="modal-content">
          <header className="giphy-modal-header modal-header">
            {isSingleGif && (
              <button
                className="button-icon icon-grid"
                onClick={onGridClick}
                aria-label={translate('accessibility.giphyModal.showGifs')}
                data-uie-name="do-open-giphs"
              />
            )}

            {(isMultipleGifs || noSearchResults) && (
              <button
                className="button-icon icon-back"
                onClick={onBackClick}
                data-uie-name="do-close"
                aria-label={translate('accessibility.giphyModal.showSingleGif')}
              />
            )}

            {!(isSingleGif || isMultipleGifs || noSearchResults) && <span className="giphy-modal-header-button" />}

            {isSearchReworkEnabled ? (
              <form className="giphy-modal-search" css={giphySearchFormStyles} onSubmit={onSearchSubmit}>
                <InputSubmitCombo css={giphySearchComboStyles}>
                  <SearchIcon
                    css={{cursor: 'pointer', flexShrink: 0}}
                    aria-label={translate('extensionsGiphySearchPlaceholder')}
                    onClick={() => {
                      runSearch(currentQuery);
                    }}
                  />

                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={currentQuery}
                    wrapperCSS={giphySearchInputWrapperStyles}
                    placeholder={translate('extensionsGiphySearchPlaceholder')}
                    aria-label={translate('extensionsGiphySearchPlaceholder')}
                    onChange={event => {
                      onSearchChange(event.currentTarget.value);
                    }}
                    data-uie-name="giphy-query"
                  />
                </InputSubmitCombo>
              </form>
            ) : (
              <span id="giphy-name" className="label-xs" data-uie-name="giphy-query">
                {currentQuery}
              </span>
            )}

            <button
              type="button"
              className="icon-button"
              aria-label={translate('accessibility.giphyModal.close')}
              onClick={onCloseClick}
              data-uie-name="do-close-giphy-modal"
            >
              <Icon.CloseIcon />
            </button>
          </header>

          <div className="giphy-modal-center modal-center">
            {isSearchReworkEnabled && isDefaultState && (
              <div className="gif-container-error">
                <span className="gif-container-error-message" data-uie-name="giphy-search-prompt">
                  {translate('extensionsGiphySearchPrompt')}
                </span>
              </div>
            )}

            {isLoading && (
              <div className="gif-container-spinner">
                <div className="icon-spinner spin" aria-live="polite" aria-busy={isLoading} aria-label={loadingTxt} />
              </div>
            )}

            {isSingleGif && currentGif !== null && (
              <div className="gif-container">
                <div className="button-reset-default gif-container-item">
                  <GifImage src={currentGif.animated} />
                </div>
              </div>
            )}

            {isMultipleGifs && (
              <div className="gif-container gif-container-grid">
                {gifs.map(gif => {
                  return (
                    <button
                      key={gif.url}
                      className={cx('button-reset-default gif-container-item', {
                        'gif-container-item-unselected': gif.url !== selectedGif?.url,
                      })}
                      onClick={() => {
                        return onSelectGif(gif);
                      }}
                      aria-label={translate('accessibility.giphyModal.selectGif')}
                    >
                      <GifImage src={gif.static} animatedSrc={gif.animated} objectFit="cover" title={gif.title} />
                    </button>
                  );
                })}
              </div>
            )}

            {(isErrorState || noSearchResults) && (
              <div className="gif-container-error">
                <span className="gif-container-error-message" data-uie-name="giphy-error-message">
                  {translate('extensionsGiphyNoGifs')}
                </span>
              </div>
            )}
          </div>

          <footer className="giphy-modal-footer modal-footer">
            <Button
              type="button"
              variant={ButtonVariant.SECONDARY}
              aria-disabled={!hasGifs}
              disabled={!hasGifs}
              onClick={getRandomGif}
              data-uie-name="do-try-another"
              aria-label={translate('accessibility.giphyModal.tryAnother')}
            >
              {translate('extensionsGiphyButtonMore')}
            </Button>

            <Button
              type="button"
              aria-disabled={selectedGif === null}
              disabled={selectedGif === null}
              onClick={onSend}
              data-uie-name="do-send-gif"
              aria-label={translate('accessibility.giphyModal.sendGif')}
            >
              {translate('extensionsGiphyButtonOk')}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export {Giphy};
