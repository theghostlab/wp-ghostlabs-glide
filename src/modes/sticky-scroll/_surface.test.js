import { contrast, parseRgb } from './_surface.js';

describe( 'parseRgb', () => {
	it( 'reads rgb() and rgba(), commas or spaces', () => {
		expect( parseRgb( 'rgb(17, 17, 17)' ) ).toEqual( [ 17, 17, 17, 1 ] );
		expect( parseRgb( 'rgba(0, 0, 0, 0)' ) ).toEqual( [ 0, 0, 0, 0 ] );
		expect( parseRgb( 'rgb(255 255 255 / 0.5)' ) ).toEqual( [
			255, 255, 255, 0.5,
		] );
	} );

	it( 'treats anything else as unknown', () => {
		expect( parseRgb( 'color(srgb 1 1 1)' ) ).toBeNull();
		expect( parseRgb( 'canvas' ) ).toBeNull();
		expect( parseRgb( '' ) ).toBeNull();
		expect( parseRgb( undefined ) ).toBeNull();
	} );
} );

describe( 'contrast', () => {
	it( 'is 21 for black on white, either way round', () => {
		expect( contrast( [ 0, 0, 0 ], [ 255, 255, 255 ] ) ).toBeCloseTo(
			21,
			5
		);
		expect( contrast( [ 255, 255, 255 ], [ 0, 0, 0 ] ) ).toBeCloseTo(
			21,
			5
		);
	} );

	it( 'is 1 for white on white — the bug this module exists for', () => {
		expect( contrast( [ 255, 255, 255 ], [ 255, 255, 255 ] ) ).toBe( 1 );
	} );
} );
