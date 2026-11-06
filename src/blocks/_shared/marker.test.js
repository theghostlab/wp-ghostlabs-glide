import { hasMarker, layoutHasMarker } from './marker';

describe( 'hasMarker', () => {
	const MARKER = 'ghostlabs-glide--sticky-chapters';

	test( 'finds the marker on its own', () => {
		expect( hasMarker( MARKER, MARKER ) ).toBe( true );
	} );

	test( 'finds the marker among other classes', () => {
		expect(
			hasMarker( `has-shadow ${ MARKER } is-style-outline`, MARKER )
		).toBe( true );
	} );

	test( 'does not match a longer class that merely starts with it', () => {
		expect( hasMarker( `${ MARKER }-wide`, MARKER ) ).toBe( false );
	} );

	test( 'handles missing, empty and undefined classNames', () => {
		expect( hasMarker( undefined, MARKER ) ).toBe( false );
		expect( hasMarker( '', MARKER ) ).toBe( false );
		expect( hasMarker( null, MARKER ) ).toBe( false );
	} );

	test( 'tolerates irregular whitespace', () => {
		expect( hasMarker( `  a\n\t${ MARKER }   b `, MARKER ) ).toBe( true );
	} );
} );

describe( 'layoutHasMarker', () => {
	const MARKER = 'ghostlabs-glide--sticky-chapters';

	test( 'counts the marker on a block in Sticky Scroll', () => {
		expect(
			layoutHasMarker(
				{ mode: 'stickyScroll', className: MARKER },
				MARKER
			)
		).toBe( true );
	} );

	test( 'ignores the marker once the block is switched to another mode', () => {
		[ 'contentSlider', 'marquee', 'parallax', undefined ].forEach(
			( mode ) => {
				expect(
					layoutHasMarker( { mode, className: MARKER }, MARKER )
				).toBe( false );
			}
		);
	} );

	test( 'needs the marker as well as the mode', () => {
		expect(
			layoutHasMarker( { mode: 'stickyScroll', className: '' }, MARKER )
		).toBe( false );
	} );

	test( 'tolerates missing attributes', () => {
		expect( layoutHasMarker( undefined, MARKER ) ).toBe( false );
		expect( layoutHasMarker( {}, MARKER ) ).toBe( false );
	} );
} );
