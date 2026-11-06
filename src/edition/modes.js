import { __ } from '@wordpress/i18n';

/**
 * Which slider modes this edition ships, and how to load each one.
 *
 * Two of the four the block's `mode` attribute allows. No module for the other
 * two is compiled into this tree, so there is nothing here to gate and nothing to
 * accidentally leave in.
 *
 * A block carrying a mode this build does not ship finds no entry and falls back
 * to the content slider in `view.js`, which is what `Glide` does on the server
 * for the same block. Every slide the author wrote survives.
 */
export const MODE_LOADERS = {
	contentSlider: () =>
		import(
			/* webpackChunkName: "glide-content-slider" */ '@shared/modes/content-slider/index.js'
		),
	stickyScroll: () =>
		import(
			/* webpackChunkName: "glide-sticky-scroll" */ '@shared/modes/sticky-scroll/index.js'
		),
};

export const DEFAULT_MODE = 'contentSlider';

/**
 * The modes the block's Mode select may offer, in display order.
 *
 * 🔴 The options used to be listed inline in the shared `edit.js`, so every
 * edition offered all four — including modes it cannot render. Picking one gave a
 * block that fell back to a content slider on the front end, which reads as a
 * broken block rather than as a feature this build does not have.
 *
 * Labels live here rather than beside MODE_LOADERS because a loader is a build
 * concern and a label is a translated string; keeping them in one exported list
 * is what stops an edition shipping a loader with no label or the reverse.
 */
export const MODE_OPTIONS = [
	{
		value: 'contentSlider',
		label: __( 'Content Slider', 'ghostlabs-glide' ),
	},
	{ value: 'stickyScroll', label: __( 'Sticky Scroll', 'ghostlabs-glide' ) },
];

/**
 * Mode attribute value → the modifier class its stylesheet selects on.
 *
 * Two entries, because two stylesheets. Per edition rather than derived from the
 * mode key: the class is a contract with a stylesheet, and deriving it would let
 * this build name a plausible class for a layout it never compiled.
 */
export const MODE_MODIFIERS = {
	contentSlider: 'ghostlabs-glide--content-slider',
	stickyScroll: 'ghostlabs-glide--sticky-scroll',
};

/**
 * Modes that take the full-bleed alignment when selected.
 *
 * Sticky layouts are deliberately absent: a contents rail pinned to the edge of
 * a full-width section reads as detached from the prose it belongs to. Which
 * leaves the content slider alone here.
 */
export const FULL_WIDTH_MODES = [ 'contentSlider' ];

/**
 * The inline custom properties a mode needs on the block wrapper in the canvas.
 *
 * None. Both modes this edition ships have their vars written in `edit.js`
 * itself, because every edition has both — there is nothing here that only some
 * builds can answer.
 *
 * @return {Object} Always empty.
 */
export function modeStyleVars() {
	return {};
}

/**
 * Extra wrapper classes a mode needs in the canvas beyond its modifier.
 *
 * None, for the same reason. Returned as an empty string rather than null so the
 * caller can concatenate it unguarded.
 *
 * @return {string} Always empty.
 */
export function modeClassNames() {
	return '';
}

/**
 * Swap each slide's placeholder block for the one the new mode wants.
 *
 * A no-op here, and not by omission. Both modes this edition ships seed the same
 * placeholder — a Cover with a heading and a paragraph — so switching between
 * them never leaves an author with the wrong starting block. There is nothing to
 * swap because there is only one template.
 *
 * ⚠️ **Not deleted at the call site, though.** `edit.js` calls this on every mode
 * change regardless of edition, which is what stops the shared editor asking
 * which modes exist. A build that later adds a mode with its own placeholder
 * changes this function and nothing else.
 */
export function applyModeTemplateSwap() {}
