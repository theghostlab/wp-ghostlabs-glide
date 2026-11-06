/**
 * Whether a className string carries the given marker class.
 *
 * Split on whitespace rather than substring-matched, so
 * `ghostlabs-glide--sticky-chapters-extra` never reads as a match for
 * `ghostlabs-glide--sticky-chapters`.
 *
 * Kept free of `@wordpress/*` imports on purpose: those are runtime externals
 * rather than installed dependencies, so a module touching them cannot be
 * unit tested under Jest. The hook that wraps this lives in
 * use-glide-pattern.js.
 *
 * @param {string} className   The className attribute value.
 * @param {string} markerClass The marker class to look for.
 * @return {boolean} True when the marker is present.
 */
export function hasMarker( className, markerClass ) {
	return String( className || '' )
		.split( /\s+/ )
		.includes( markerClass );
}

/**
 * Whether a Glide block's own attributes put a sticky layout's marker in force.
 *
 * ⚠️ **The marker counts only while the block is in Sticky Scroll.** A block
 * switched to another mode keeps its className, marker included, so a bare
 * hasMarker() check goes on reporting a layout that is no longer rendered.
 * The Glide block's own sidebar always checked the mode. The slides found the
 * marker by walking their ancestors and did not, so a Sticky Chapters block
 * switched to Content Slider kept offering Step, Anchor, Panel, Card and Step
 * Media panels on every slide.
 *
 * @param {Object} attributes  The Glide block's attributes.
 * @param {string} markerClass The marker class to look for.
 * @return {boolean} True when the block is in Sticky Scroll and carries it.
 */
export function layoutHasMarker( attributes, markerClass ) {
	return (
		attributes?.mode === 'stickyScroll' &&
		hasMarker( attributes?.className, markerClass )
	);
}
