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

import {Gif} from './GiphyRepository';

import {getLogger} from '../../util/logger';

/**
 * Lets the `giphy-local-fixtures` developer toggle stand in local GIF files (picked from disk
 * in the developer menu) for the real Giphy API, for environments where the Giphy token isn't
 * configured (e.g. staging). See FixtureAwareGiphyRepository.
 */

const logger = getLogger('giphyFixtureStore');

const IMAGE_FILE_EXTENSIONS = ['.gif', '.png', '.jpg', '.jpeg', '.webp', '.bmp'];

function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) {
    return true;
  }

  // Some browsers/OSes report an empty `type` for picked files (e.g. via a directory picker),
  // so fall back to the file extension rather than silently dropping the file.
  const lowerCaseName = file.name.toLowerCase();
  return IMAGE_FILE_EXTENSIONS.some(extension => {
    return lowerCaseName.endsWith(extension);
  });
}

let fixtureGifs: Gif[] = [];

export function getFixtureGifCount(): number {
  return fixtureGifs.length;
}

export function getFixtureGifs(): readonly Gif[] {
  return fixtureGifs;
}

export function setFixtureGifsFromFiles(files: readonly File[]): void {
  fixtureGifs.forEach(gif => {
    URL.revokeObjectURL(gif.animated);
  });

  const imageFiles = files.filter(isLikelyImageFile);

  fixtureGifs = imageFiles.map(file => {
    const objectUrl = URL.createObjectURL(file);
    return {animated: objectUrl, static: objectUrl, title: file.name, url: objectUrl};
  });

  logger.info(
    `Loaded ${fixtureGifs.length} local GIF fixture(s) out of ${files.length} picked file(s): ${fixtureGifs
      .map(gif => {
        return gif.title;
      })
      .join(', ')}`,
  );
}

export function pickRandomFixtureGif(): Gif {
  if (fixtureGifs.length === 0) {
    const error = new Error(
      'No local GIF fixtures selected. Pick file(s) under "Giphy Local Fixtures" in the developer menu.',
    );
    logger.warn(error.message);
    throw error;
  }

  const randomIndex = Math.floor(Math.random() * fixtureGifs.length);
  const gif = fixtureGifs[randomIndex];
  logger.info(`Serving local GIF fixture "${gif.title}" for getRandomGif`);
  return gif;
}

export function getFixtureGifsMatching(query: string): Gif[] {
  if (fixtureGifs.length === 0) {
    const error = new Error(
      'No local GIF fixtures selected. Pick file(s) under "Giphy Local Fixtures" in the developer menu.',
    );
    logger.warn(error.message);
    throw error;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matches =
    normalizedQuery.length === 0
      ? [...fixtureGifs]
      : fixtureGifs.filter(gif => {
          return (gif.title ?? '').toLowerCase().includes(normalizedQuery);
        });

  const result = matches.length > 0 ? matches : [...fixtureGifs];
  logger.info(`Serving ${result.length} local GIF fixture(s) for getGifs(${JSON.stringify(query)})`);
  return result;
}
