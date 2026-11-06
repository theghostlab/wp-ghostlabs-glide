import { offersAccessibleName } from './accessible-name.js';
import { MARKERS, NAMED_STICKY_LAYOUTS } from '@edition/markers.js';
import { MODE_OPTIONS } from '@edition/modes.js';

describe( 'offersAccessibleName', () => {
	it( 'offers the field in every mode outside Sticky Scroll', () => {
		MODE_OPTIONS.map( ( option ) => option.value )
			.filter( ( mode ) => mode !== 'stickyScroll' )
			.forEach( ( mode ) => {
				expect( offersAccessibleName( mode, '' ) ).toBe( true );
			} );
	} );

	it( 'offers it for Sticky Chapters, which names its contents rail', () => {
		expect(
			offersAccessibleName( 'stickyScroll', MARKERS.stickyChapters )
		).toBe( true );
	} );

	it( 'offers it for each layout this edition names', () => {
		NAMED_STICKY_LAYOUTS.forEach( ( marker ) => {
			expect( offersAccessibleName( 'stickyScroll', marker ) ).toBe(
				true
			);
		} );
	} );

	// The plain stack carries no name, so a field there changed nothing.
	it( 'does not offer it for Sticky Scroll with no layout', () => {
		expect( offersAccessibleName( 'stickyScroll', '' ) ).toBe( false );
	} );

	it( 'does not offer it for a layout this edition does not name', () => {
		Object.values( MARKERS )
			.filter(
				( marker ) =>
					marker !== MARKERS.stickyChapters &&
					! NAMED_STICKY_LAYOUTS.includes( marker )
			)
			.forEach( ( marker ) => {
				expect( offersAccessibleName( 'stickyScroll', marker ) ).toBe(
					false
				);
			} );
	} );
} );
