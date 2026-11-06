/**
 * Drawing primitives for the layout picker's diagrams.
 *
 * One diagram per entry in LAYOUT_CHOICES, drawn as inline SVG on a shared
 * 229x78 grid. They are miniatures of the layout, not icons of it: the shapes
 * sit where the real thing puts them, so "sticky media" shows a pane holding
 * beside text and "horizontal pin" shows panels running off the right edge.
 *
 * Inline rather than an icon font or sprite because they are seven diagrams
 * used in exactly one place, and inlining lets them inherit the picker's
 * colours — including --wp-admin-theme-color, so the accent follows whatever
 * admin colour scheme the author has chosen.
 *
 * ⚠️ Every LAYOUT_CHOICES key needs an entry here. A missing one renders an
 * empty field rather than throwing, which is survivable but looks broken;
 * layout-thumbnails.test.js asserts the two lists stay in step.
 */

/** Diagram viewport. All geometry below is in these units. */
export const W = 229;
export const H = 78;

/**
 * Fills, as custom properties so the stylesheet keeps one place to retheme
 * them. The fallbacks are the values the design was drawn with.
 */
export const FIELD = 'var(--ghostlabs-glide-thumb-field, #f6f7f8)';
export const SOLID = 'var(--ghostlabs-glide-thumb-solid, #d7dce3)';
export const SOFT = 'var(--ghostlabs-glide-thumb-soft, #eaedf1)';
export const ACCENT = 'var(--ghostlabs-glide-thumb-accent, #3858e9)';

/**
 * A rounded form. Every diagram is built from these.
 *
 * @param {Object} props        Component props.
 * @param {number} props.x      Left edge, in viewBox units.
 * @param {number} props.y      Top edge, in viewBox units.
 * @param {number} props.w      Width.
 * @param {number} props.h      Height.
 * @param {number} [props.r]    Corner radius.
 * @param {string} [props.fill] Fill, usually one of the tokens above.
 * @return {Element} The form.
 */
export const Form = ( { x, y, w, h, r = 3, fill = SOLID, ...rest } ) => (
	<rect
		x={ x }
		y={ y }
		width={ w }
		height={ h }
		rx={ r }
		fill={ fill }
		{ ...rest }
	/>
);

/**
 * A text line. Thinner and rounder than a form, and always secondary.
 *
 * @param {Object} props        Component props.
 * @param {number} props.x      Left edge, in viewBox units.
 * @param {number} props.y      Top edge, in viewBox units.
 * @param {number} props.w      Width.
 * @param {number} [props.h]    Height.
 * @param {string} [props.fill] Fill, usually one of the tokens above.
 * @return {Element} The line.
 */
export const Line = ( { x, y, w, h = 5, fill = SOLID } ) => (
	<Form x={ x } y={ y } w={ w } h={ h } r={ 2 } fill={ fill } />
);

/** One slide filling the frame, with the dots that navigate it. */
