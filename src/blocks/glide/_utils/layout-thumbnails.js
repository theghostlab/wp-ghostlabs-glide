/**
 * The layout picker's thumbnail frame.
 *
 * Which diagrams exist is the edition's business — free offers two layouts and
 * draws two — so the map comes from `@edition`. The primitives and the two
 * shared diagrams live beside this file, in modules that import nothing from
 * the edition; see layout-diagrams.js for why that separation is load-bearing.
 */

import { DIAGRAMS } from '@edition/layout-thumbnails.js';
import { W, H, FIELD } from './layout-primitives.js';

/**
 * Every layout this edition draws a diagram for.
 *
 * Derived from the edition's map rather than listed, so `layouts.test.js` can
 * assert "a diagram for every choice, and no orphans" in each tier and have it
 * mean something in both.
 */
export const THUMBNAIL_KEYS = Object.keys( DIAGRAMS );

/**
 * One layout's diagram.
 *
 * Decorative: the choice's own label and description carry the meaning, so the
 * SVG is hidden from assistive tech rather than repeating them.
 *
 * @param {Object} props             Component props.
 * @param {string} props.layout      A LAYOUT_CHOICES key.
 * @param {string} [props.className] Extra class on the <svg>.
 * @return {Element} The diagram.
 */
export function LayoutThumbnail( { layout, className } ) {
	const Diagram = DIAGRAMS[ layout ];

	return (
		<svg
			className={ className }
			viewBox={ `0 0 ${ W } ${ H }` }
			width={ W }
			height={ H }
			preserveAspectRatio="xMidYMid meet"
			aria-hidden="true"
			focusable="false"
		>
			<rect x="0" y="0" width={ W } height={ H } rx="4" fill={ FIELD } />
			{ /* Forms that run off the frame — a repeating rail, a panel
			     past the third — are clipped by the SVG viewport itself. No
			     clipPath: it would need an id, and seven of these render at
			     once, so the id would be duplicated across the document. The
			     overflowing forms sit at mid-height and never reach the
			     field's rounded corners, so a square clip is enough. */ }
			{ Diagram ? <Diagram /> : null }
		</svg>
	);
}
