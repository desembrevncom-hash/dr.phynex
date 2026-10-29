import * as migration_20261028_101829_initial from './20261028_101829_initial';

export const migrations = [
  {
    up: migration_20261028_101829_initial.up,
    down: migration_20261028_101829_initial.down,
    name: '20261028_101829_initial'
  },
];
