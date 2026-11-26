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

import {getFixtureGifsMatching, pickRandomFixtureGif} from './giphyFixtureStore';
import {GiphyRepository} from './GiphyRepository';
import type {GiphyService} from './GiphyService';

import {giphyLocalFixturesFeatureToggleName} from '../../featureToggles/startupFeatureToggleNames';
import {
  createStartupFeatureTogglesFromLocationSearch,
  StartupFeatureToggles,
} from '../../featureToggles/startupFeatureToggles';

/**
 * Drop-in replacement for GiphyRepository that serves locally picked GIF files instead of
 * calling the real Giphy API when the `giphy-local-fixtures` developer toggle is enabled.
 * Useful on environments (e.g. staging) where the Giphy token isn't configured.
 */
export class FixtureAwareGiphyRepository extends GiphyRepository {
  constructor(
    giphyService: GiphyService,
    private readonly featureToggles: StartupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      globalThis.location.search,
    ),
  ) {
    super(giphyService);
  }

  override async getGifs(...args: Parameters<GiphyRepository['getGifs']>): ReturnType<GiphyRepository['getGifs']> {
    if (this.featureToggles.isFeatureToggleEnabled(giphyLocalFixturesFeatureToggleName)) {
      return getFixtureGifsMatching(args[0]);
    }

    return super.getGifs(...args);
  }

  override async getRandomGif(
    ...args: Parameters<GiphyRepository['getRandomGif']>
  ): ReturnType<GiphyRepository['getRandomGif']> {
    if (this.featureToggles.isFeatureToggleEnabled(giphyLocalFixturesFeatureToggleName)) {
      return pickRandomFixtureGif();
    }

    return super.getRandomGif(...args);
  }
}
