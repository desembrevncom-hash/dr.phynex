import * as migration_20261028_101829_initial from './20261028_101829_initial';
import * as migration_20261029_021524_media_release_and_line_appearance from './20261029_021524_media_release_and_line_appearance';

export const migrations = [
  {
    up: migration_20261028_101829_initial.up,
    down: migration_20261028_101829_initial.down,
    name: '20261028_101829_initial',
  },
  {
    up: migration_20261029_021524_media_release_and_line_appearance.up,
    down: migration_20261029_021524_media_release_and_line_appearance.down,
    name: '20261029_021524_media_release_and_line_appearance'
  },
];
