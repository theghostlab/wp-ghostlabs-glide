/**
 * Keep the patterns' card surface legible on whatever ground the block sits on.
 *
 * `--ghostlabs-glide-surface` is the theme's base colour, and that is right on
 * the page itself. It is wrong inside a dark section: a Group with a dark
 * background and light text keeps the cards white while their text — inherited
 * from the section — turns white too, so every panel, card and numeral goes
 * white on white (found 2026-10-29 shooting the sales page). CSS cannot read an
 * ancestor's background, so this measures it.
 *
 * Only a surface that fails is replaced, so a theme that sets the token itself,
 * or a section whose base colour happens to work, is left exactly as it is. The
 * replacement is the nearest opaque background behind the block — the colour
 * the author already chose that text to sit on.
 */

/**
 * Below this, text on the surface is treated as unreadable. 4.5:1, WCAG 1.4.3's
 * floor for normal text: card and panel copy is body text, not large text, so
 * the 3:1 large-text floor this used to apply let a 3.0–4.49 surface through.
 */
const MIN_CONTRAST = 4.5;

/**
 * Parse a computed `rgb()`/`rgba()` colour. Anything else (a `color()` from a
 * colour-mix, a keyword) is not something getComputedStyle hands back for the
 * properties read here, and is treated as unknown.
 *
 * @param {string} value Computed colour.
 * @return {number[]|null} [r, g, b, a], or null.
 */
export function parseRgb( value ) {
	const match = /^rgba?\(([^)]+)\)$/.exec( ( value || '' ).trim() );
	if ( ! match ) {
		return null;
	}
	const parts = match[ 1 ]
		.split( /[\s,/]+/ )
		.filter( Boolean )
		.map( Number );
	if ( parts.length < 3 || parts.some( Number.isNaN ) ) {
		return null;
	}
	return [ parts[ 0 ], parts[ 1 ], parts[ 2 ], parts[ 3 ] ?? 1 ];
}

/**
 * WCAG relative luminance.
 *
 * @param {number[]} rgb [r, g, b, …].
 * @return {number} 0–1.
 */
function luminance( [ r, g, b ] ) {
	const [ R, G, B ] = [ r, g, b ].map( ( channel ) => {
		const c = channel / 255;
		return c <= 0.03928 ? c / 12.92 : ( ( c + 0.055 ) / 1.055 ) ** 2.4;
	} );
	return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * WCAG contrast ratio between two colours.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @return {number} 1–21.
 */
export function contrast( a, b ) {
	const [ hi, lo ] = [ luminance( a ), luminance( b ) ].sort(
		( x, y ) => y - x
	);
	return ( hi + 0.05 ) / ( lo + 0.05 );
}

/**
 * The colour the token currently resolves to, measured by painting it.
 *
 * A custom property's computed value is its token string, not a colour, so a
 * throwaway element is given the token as its background and read back.
 *
 * @param {HTMLElement} container
 * @return {number[]|null} The colour as [r, g, b, a], or null when it cannot be read.
 */
function resolvedSurface( container ) {
	const probe = container.ownerDocument.createElement( 'span' );
	probe.style.cssText =
		'position:absolute;width:0;height:0;overflow:hidden;background-color:var(--ghostlabs-glide-surface)';
	container.appendChild( probe );
	const value = getComputedStyle( probe ).backgroundColor;
	probe.remove();
	return parseRgb( value );
}

/**
 * The nearest opaque background at or above the block.
 *
 * @param {HTMLElement} container
 * @return {string|null} A computed colour string, or null when nothing opaque is found.
 */
function groundBehind( container ) {
	for ( let node = container; node; node = node.parentElement ) {
		const value = getComputedStyle( node ).backgroundColor;
		const rgb = parseRgb( value );
		if ( rgb && rgb[ 3 ] >= 1 ) {
			return value;
		}
	}
	return null;
}

/**
 * Replace a surface that cannot carry the block's text with the ground it sits on.
 *
 * @param {HTMLElement} container The Glide block wrapper.
 * @return {boolean} Whether the surface was replaced.
 */
export function fitSurface( container ) {
	// Measure from scratch: a previous pass's inline value would otherwise be
	// what gets measured.
	container.style.removeProperty( '--ghostlabs-glide-surface' );

	const text = parseRgb( getComputedStyle( container ).color );
	const surface = resolvedSurface( container );
	if ( ! text || ! surface || surface[ 3 ] < 1 ) {
		return false;
	}
	if ( contrast( text, surface ) >= MIN_CONTRAST ) {
		return false;
	}

	const ground = groundBehind( container );
	const groundRgb = parseRgb( ground );
	if ( ! groundRgb || contrast( text, groundRgb ) < MIN_CONTRAST ) {
		// Nothing behind the block does any better; leave the theme's value.
		return false;
	}

	container.style.setProperty( '--ghostlabs-glide-surface', ground );
	return true;
}
