import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The stars carry the rating, so they are a graphic WCAG 1.4.11 holds to 3:1. The gold they
 * were drawn in was 1.85:1 on white (accessibility audit 2026-11-05, F2), and the block had no
 * colour support, so no author could fix it. The default now has to hold on a light page and a
 * dark one, because a testimonial lands on whichever the theme has.
 */
/**
 * WCAG 2.x relative luminance.
 *
 * @param {string} hex Six hex digits, no `#`.
 * @return {number} 0 (black) to 1 (white).
 */
const luminance = ( hex ) => {
	const [ r, g, b ] = [ 0, 2, 4 ].map( ( i ) => {
		const c = parseInt( hex.slice( i, i + 2 ), 16 ) / 255;
		return c <= 0.04045 ? c / 12.92 : ( ( c + 0.055 ) / 1.055 ) ** 2.4;
	} );
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * WCAG 2.x contrast ratio between two colours.
 *
 * @param {string} a Six hex digits.
 * @param {string} b Six hex digits.
 * @return {number} 1 to 21.
 */
const contrast = ( a, b ) => {
	const [ hi, lo ] = [ luminance( a ), luminance( b ) ].sort(
		( x, y ) => y - x
	);
	return ( hi + 0.05 ) / ( lo + 0.05 );
};

describe( 'the testimonial rating stars', () => {
	const scss = readFileSync( join( __dirname, 'style.scss' ), 'utf8' );
	const [ , star ] = scss.match(
		/\.ghostlabs-glide-testimonial__rating \{[^}]*?color: #([0-9a-f]{6});/i
	);

	it.each( [
		[ 'white', 'ffffff' ],
		[ 'black', '000000' ],
	] )( 'hold 3:1 on %s', ( name, background ) => {
		expect( contrast( star, background ) ).toBeGreaterThanOrEqual( 3 );
	} );

	it( 'take the author’s colour through the block’s text colour support', () => {
		const metadata = JSON.parse(
			readFileSync( join( __dirname, 'block.json' ), 'utf8' )
		);

		expect( metadata.supports.color.text ).toBe( true );
	} );
} );
