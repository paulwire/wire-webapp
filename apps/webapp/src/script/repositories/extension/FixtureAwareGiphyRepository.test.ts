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

import {container} from 'tsyringe';

import {FixtureAwareGiphyRepository} from './FixtureAwareGiphyRepository';
import {GiphyService} from './GiphyService';
import {getFixtureGifCount, setFixtureGifsFromFiles} from './giphyFixtureStore';

import {APIClient} from '../../service/apiClientSingleton';

const disabledFeatureToggles = {
  isFeatureToggleEnabled: () => {
    return false;
  },
  enabledFeatureToggleNames: [],
};

const enabledFeatureToggles = {
  isFeatureToggleEnabled: () => {
    return true;
  },
  enabledFeatureToggleNames: [],
};

describe('FixtureAwareGiphyRepository', () => {
  afterEach(() => {
    setFixtureGifsFromFiles([]);
  });

  it('delegates to the real Giphy service when the toggle is disabled', async () => {
    const giphyService = new GiphyService(container.resolve(APIClient));
    const repository = new FixtureAwareGiphyRepository(giphyService, disabledFeatureToggles);
    const getSearchSpy = jest.spyOn(giphyService, 'getSearch').mockResolvedValue({
      data: [],
      pagination: {total_count: 0, count: 0, offset: 0},
    } as unknown as Awaited<ReturnType<typeof giphyService.getSearch>>);

    await repository.getGifs('cats');

    expect(getSearchSpy).toHaveBeenCalled();
  });

  it('serves local fixture GIFs matching the query when the toggle is enabled', async () => {
    const giphyService = new GiphyService(container.resolve(APIClient));
    const repository = new FixtureAwareGiphyRepository(giphyService, enabledFeatureToggles);
    const getSearchSpy = jest.spyOn(giphyService, 'getSearch');

    const file = new File(['gif-bytes'], 'cats-dancing.gif', {type: 'image/gif'});
    setFixtureGifsFromFiles([file]);

    const gifs = await repository.getGifs('dancing');

    expect(getSearchSpy).not.toHaveBeenCalled();
    expect(gifs).toHaveLength(1);
    expect(gifs[0].title).toBe('cats-dancing.gif');
  });

  it('throws from the fixture path when no local fixtures have been picked', async () => {
    const giphyService = new GiphyService(container.resolve(APIClient));
    const repository = new FixtureAwareGiphyRepository(giphyService, enabledFeatureToggles);

    expect(getFixtureGifCount()).toBe(0);
    await expect(repository.getGifs('cats')).rejects.toThrow();
    await expect(repository.getRandomGif({tag: 'cats'})).rejects.toThrow();
  });

  it('returns a local fixture GIF for getRandomGif when the toggle is enabled', async () => {
    const giphyService = new GiphyService(container.resolve(APIClient));
    const repository = new FixtureAwareGiphyRepository(giphyService, enabledFeatureToggles);
    const getRandomSpy = jest.spyOn(giphyService, 'getRandom');

    const file = new File(['gif-bytes'], 'single.gif', {type: 'image/gif'});
    setFixtureGifsFromFiles([file]);

    const gif = await repository.getRandomGif({tag: 'anything'});

    expect(getRandomSpy).not.toHaveBeenCalled();
    expect(gif.title).toBe('single.gif');
  });
});
