import * as migration_20261028_101829_initial from './20261028_101829_initial';
import * as migration_20261029_021524_media_release_and_line_appearance from './20261029_021524_media_release_and_line_appearance';
import * as migration_20261029_035541_product_editorial_note from './20261029_035541_product_editorial_note';
import * as migration_20261029_080000_form_rate_limits from './20261029_080000_form_rate_limits';
import * as migration_20261029_100000_storage_fields from './20261029_100000_storage_fields';
import * as migration_20261105_085002_home_banners from './20261105_085002_home_banners';
import * as migration_20261107_050810_landing_blocks from './20261107_050810_landing_blocks';
import * as migration_20261109_024237_landing_approvals from './20261109_024237_landing_approvals';

export const migrations = [
  {
    up: migration_20261028_101829_initial.up,
    down: migration_20261028_101829_initial.down,
    name: '20261028_101829_initial',
  },
  {
    up: migration_20261029_021524_media_release_and_line_appearance.up,
    down: migration_20261029_021524_media_release_and_line_appearance.down,
    name: '20261029_021524_media_release_and_line_appearance',
  },
  {
    up: migration_20261029_035541_product_editorial_note.up,
    down: migration_20261029_035541_product_editorial_note.down,
    name: '20261029_035541_product_editorial_note',
  },
  {
    up: migration_20261029_080000_form_rate_limits.up,
    down: migration_20261029_080000_form_rate_limits.down,
    name: '20261029_080000_form_rate_limits',
  },
  {
    up: migration_20261029_100000_storage_fields.up,
    down: migration_20261029_100000_storage_fields.down,
    name: '20261029_100000_storage_fields',
  },
  {
    up: migration_20261105_085002_home_banners.up,
    down: migration_20261105_085002_home_banners.down,
    name: '20261105_085002_home_banners',
  },
  {
    up: migration_20261107_050810_landing_blocks.up,
    down: migration_20261107_050810_landing_blocks.down,
    name: '20261107_050810_landing_blocks',
  },
  {
    up: migration_20261109_024237_landing_approvals.up,
    down: migration_20261109_024237_landing_approvals.down,
    name: '20261109_024237_landing_approvals'
  },
];
