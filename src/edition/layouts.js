import { __ } from '@wordpress/i18n';

import { PATTERN_NAMES } from './markers.js';

/**
 * What the layout picker offers a freshly inserted block.
 *
 * The three plain modes seed a single slide and set the mode. The four sticky
 * layouts name a registered pattern instead: the picker seeds whatever PHP
 * registered under that name, so the pattern content stays the single source of
 * truth and the marker class arrives already stamped by `content()`.
 *
 * 🔴 **The list is the entitlement.** There used to be a `tier` field on each
 * entry and a `currentTier()` reading a localized global to filter on it — a
 * runtime branch that defaulted to `pro` when the global was missing, so any
 * failure to enqueue offered every other layout to a free install. And
 * `wp_localize_script()` casts every scalar to a string, so a boolean added
 * beside it would have silently inverted.
 *
 * Now each edition ships its own copy of this file, reached through the
 * `@edition` alias. This one has two entries; the others are not here at all — so there is nothing to filter and nothing to fail open.
 *
 * ⚠️ The picker needs more than one entry to render (`edit.js` checks
 * `LAYOUT_CHOICES.length > 1`), which free satisfies with the content slider and
 * sticky chapters.
 *
 * `key` doubles as the thumbnail lookup in _utils/layout-thumbnails.js and, for
 * the pattern-backed entries, as the MARKERS lookup in the fallback path.
 */
export const LAYOUT_CHOICES = [
	{
		key: 'contentSlider',
		mode: 'contentSlider',
		label: __( 'Content Slider', 'ghostlabs-glide' ),
		description: __(
			'Slides one at a time, with arrows and dots.',
			'ghostlabs-glide'
		),
	},
	{
		key: 'stickyChapters',
		pattern: PATTERN_NAMES.stickyChapters,
		label: __( 'Sticky Chapters', 'ghostlabs-glide' ),
		description: __(
			'A contents rail that stays in view beside the steps.',
			'ghostlabs-glide'
		),
	},
];
