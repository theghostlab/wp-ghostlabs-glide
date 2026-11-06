/**
 * The Sticky Scroll layouts this edition adds, as the editor sees them: none.
 *
 * Sticky Scroll is one mode with several layouts, chosen by the marker class a
 * block pattern stamped onto the block. This edition ships the mode and Sticky
 * Chapters, and `edit.js` holds that layout's panel itself because every edition
 * has it. There is no second layout here to configure, class, or preview.
 *
 * ⚠️ **Keyed by marker class, never by a boolean per layout.** `edit.js` used to
 * take one prop per layout and branch on each, which meant this build compiling
 * around 320 lines of inspector for layouts it cannot render — a whole editor UI
 * for a feature that would style nothing. A lookup has no name to leak, and an
 * edition with none needs no opt-out.
 *
 * ⚠️ **Empty and still required.** `edit.js` imports all five of these
 * unconditionally; a missing module is a build failure rather than a missing
 * panel.
 *
 * A block pasted from an edition that has these layouts still arrives with its
 * marker, and still renders: it finds no panel, no extra classes and no preview,
 * so the inspector offers the "insert a pattern to choose a layout" notice and
 * the canvas shows the plain stack of steps — which is exactly what the front
 * end renders for it. Every step the author wrote is there.
 */

/**
 * Marker class → the inspector panel that configures that layout.
 *
 * @type {Object}
 */
export const STICKY_LAYOUT_PANELS = {};

/**
 * Extra wrapper classes a sticky layout needs in the canvas.
 *
 * Returned as an empty string rather than null so the caller can concatenate it
 * into its className expression unguarded.
 *
 * @return {string} Always empty.
 */
export function stickyLayoutClassNames() {
	return '';
}

/**
 * Extra custom properties a sticky layout needs on the wrapper.
 *
 * @return {Object} Always empty.
 */
export function stickyLayoutStyleVars() {
	return {};
}

/**
 * Blocks a sticky layout allows as direct children beyond the slides.
 *
 * @return {null} Always none.
 */
export function stickyLayoutAllowedChildren() {
	return null;
}

/**
 * The canvas preview a sticky layout needs beyond its inner blocks.
 *
 * None: the one layout this edition ships is built entirely from inner blocks
 * the author can already see. A layout whose pane has nothing among the inner
 * blocks to look at needs a preview, and that layout is not here.
 *
 * @return {null} Always nothing to render.
 */
export function StickyLayoutPreview() {
	return null;
}
