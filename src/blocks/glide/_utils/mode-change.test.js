import { attributesForMode } from './mode-change.js';
import { FULL_WIDTH_MODES, MODE_OPTIONS } from '@edition/modes.js';

describe( 'attributesForMode', () => {
	it( 'makes every full-width mode full width as it is chosen', () => {
		expect( FULL_WIDTH_MODES.length ).toBeGreaterThan( 0 );

		FULL_WIDTH_MODES.forEach( ( mode ) => {
			expect( attributesForMode( mode ) ).toEqual( {
				mode,
				align: 'full',
			} );
		} );
	} );

	// A sticky layout keeps whatever alignment it has: a rail pinned to the edge
	// of a full-width section reads as detached from its prose.
	it( 'leaves the alignment of every other mode alone', () => {
		MODE_OPTIONS.map( ( option ) => option.value )
			.filter( ( mode ) => ! FULL_WIDTH_MODES.includes( mode ) )
			.forEach( ( mode ) => {
				expect( attributesForMode( mode ) ).toEqual( { mode } );
			} );
	} );
} );
