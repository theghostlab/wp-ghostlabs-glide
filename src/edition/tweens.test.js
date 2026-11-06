import { TWEENS, TWEEN_PRELUDES } from './tweens.js';

describe( 'the free edition’s tweens', () => {
	it( 'answers every effect key with a no-op', () => {
		expect( Object.keys( TWEENS ) ).toHaveLength( 3 );
		Object.values( TWEENS ).forEach( ( setup ) =>
			expect( setup() ).toBeUndefined()
		);
	} );

	// A block saved in the paid edition with a centring effect on used to centre
	// its slides here, because the shared slider read the attribute itself. The
	// effect belongs to the module that ships it, and this edition ships none.
	it( 'contributes nothing to the slider before it starts', () => {
		expect( TWEEN_PRELUDES ).toEqual( {} );
	} );
} );
