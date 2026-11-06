export const SELECTORS = {
	container: '.ghostlabs-glide',
	viewport: '.ghostlabs-glide__viewport',
	track: '.ghostlabs-glide__track',
	slide: '.ghostlabs-glide-slide',
	arrowPrev: '.ghostlabs-glide__arrow--prev',
	arrowNext: '.ghostlabs-glide__arrow--next',
	dots: '.ghostlabs-glide__dots',
	progress: '.ghostlabs-glide__progress',
	marqueeTrack: '.ghostlabs-glide__marquee-track',
	pauseToggle: '.ghostlabs-glide__pause',
	thumbs: '.ghostlabs-glide__thumbs',
	thumbsViewport: '.ghostlabs-glide__thumbs__viewport',
	thumbSlide: '.ghostlabs-glide__thumbs__slide',
	rail: '.ghostlabs-glide__rail',
	railList: '.ghostlabs-glide__rail-list',
	railItem: '.ghostlabs-glide__rail-item',
	railLink: '.ghostlabs-glide__rail-link',
	railCounter: '.ghostlabs-glide__rail-counter-current',
	step: '.ghostlabs-glide__step',
	pane: '.ghostlabs-glide__pane',
	paneMedia: '.ghostlabs-glide__pane-media',
	paneDot: '.ghostlabs-glide__pane-dot',
	pinTrack: '.ghostlabs-glide__pin-track',
	pinViewport: '.ghostlabs-glide__pin-viewport',
	pinRail: '.ghostlabs-glide__pin-rail',
	pinProgress: '.ghostlabs-glide__pin-progress-bar',
};

export const CLASSES = {
	active: 'is-active',
	dragging: 'is-dragging',
	ready: 'is-ready',
	paused: 'is-paused',
	thumbSelected: 'is-thumb-selected',
};

export const DATA = {
	mode: 'glideMode',
	config: 'glideConfig',
};

/**
 * Block-pattern marker classes every edition ships — the layout contract
 * stamped onto the Glide block's `className` by each pattern's PHP `content()`.
 *
 * Mirrors GHOSTLABS\GLIDE\Enum\GlidePattern::markerClass(). These are the
 * signal the sticky-scroll dispatcher branches on, and they are deliberately
 * kept disjoint from the mode modifier classes that Glide.php and edit.js
 * generate into the block wrapper.
 *
 * ⚠️ **Not the whole vocabulary, so most code should not import it from here.**
 * An edition that ships more layouts extends it in `@edition/markers.js`, which
 * is what code asking "which marker is this block?" has to read — resolved from
 * this list alone, a block with one of that edition's layouts would resolve to
 * no marker at all.
 */
export const MARKERS = {
	stickyChapters: 'ghostlabs-glide--sticky-chapters',
};

/**
 * Registered block-pattern names every edition ships, for the sticky layouts.
 *
 * Mirrors the *values* of GHOSTLABS\GLIDE\Enum\GlidePattern, the same way
 * MARKERS mirrors its markerClass(), and is extended the same way, in
 * `@edition/markers.js`. The layout picker looks patterns up by name and seeds
 * whatever PHP registered, so the pattern content itself stays a single source
 * of truth — but a rename has to be made on both sides.
 */
export const PATTERN_NAMES = {
	stickyChapters: 'ghostlabs-glide/sticky-chapters',
};
