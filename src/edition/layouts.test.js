import { LAYOUT_CHOICES } from './layouts.js';
import { THUMBNAIL_KEYS } from '@shared/blocks/glide/_utils/layout-thumbnails.js';
import { MARKERS, PATTERN_NAMES } from './markers.js';

describe( 'LAYOUT_CHOICES', () => {
	it( 'gives every choice a unique key', () => {
		const keys = LAYOUT_CHOICES.map( ( choice ) => choice.key );

		expect( new Set( keys ).size ).toBe( keys.length );
	} );

	it( 'gives every choice a label and a description', () => {
		LAYOUT_CHOICES.forEach( ( choice ) => {
			expect( choice.label ).toBeTruthy();
			expect( choice.description ).toBeTruthy();
		} );
	} );

	// A choice is either a plain mode or a registered pattern. Both would make
	// pickPattern and pickMode fight over the same click; neither leaves the
	// card doing nothing at all.
	it( 'backs every choice with exactly one of a mode or a pattern', () => {
		LAYOUT_CHOICES.forEach( ( choice ) => {
			expect( Boolean( choice.mode ) ).toBe( ! choice.pattern );
		} );
	} );

	it( 'names only registered patterns', () => {
		const registered = Object.values( PATTERN_NAMES );

		LAYOUT_CHOICES.filter( ( choice ) => choice.pattern ).forEach(
			( choice ) => {
				expect( registered ).toContain( choice.pattern );
			}
		);
	} );

	// pickPattern's fallback stamps MARKERS[ choice.key ] when the pattern is
	// not registered. A key with no marker would set the sticky mode and no
	// layout, which renders as a plain stack of steps.
	it( 'keys every pattern-backed choice to a marker class', () => {
		LAYOUT_CHOICES.filter( ( choice ) => choice.pattern ).forEach(
			( choice ) => {
				expect( MARKERS[ choice.key ] ).toBeTruthy();
			}
		);
	} );

	// 🔴 The list is the entitlement now, so an entry carrying a `tier` field is a
	// leftover of the filter that used to fail open — it defaulted to `pro` when
	// the localized global was missing, which meant any failure to enqueue
	// offered every other layout to a free install.
	it( 'declares no tier on any choice', () => {
		LAYOUT_CHOICES.forEach( ( choice ) => {
			expect( choice.tier ).toBeUndefined();
		} );
	} );

	// ⚠️ The picker does not render below two entries — `edit.js` checks
	// `LAYOUT_CHOICES.length > 1` — so an edition that trims this list too far
	// silently loses the picker rather than showing a shorter one.
	it( 'offers enough layouts for the picker to render', () => {
		expect( LAYOUT_CHOICES.length ).toBeGreaterThan( 1 );
	} );

	it( 'always offers the content slider, which every edition ships', () => {
		// It is also what pickPattern and view.js both fall back to.
		expect(
			LAYOUT_CHOICES.some( ( choice ) => choice.mode === 'contentSlider' )
		).toBe( true );
	} );
} );

describe( 'thumbnails', () => {
	it( 'draws a diagram for every choice, and no orphans', () => {
		const keys = LAYOUT_CHOICES.map( ( choice ) => choice.key );

		expect( [ ...THUMBNAIL_KEYS ].sort() ).toEqual( [ ...keys ].sort() );
	} );
} );
