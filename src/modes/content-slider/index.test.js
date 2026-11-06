import { readFileSync } from 'fs';
import { join } from 'path';
import { TWEENS } from '@edition/tweens.js';

/**
 * The shared slider names no effect. Which tweens exist, and what each needs
 * before Embla starts, is per-edition data from `@edition/tweens.js` — a shared
 * branch on a paid effect's attribute is that effect running, partly, in a
 * build that does not ship it.
 *
 * ⚠️ The keys come from the edition rather than a list here: this file ships in
 * the free source distribution, which may not name the paid effects.
 */
describe( 'the shared content slider', () => {
	const source = readFileSync( join( __dirname, 'index.js' ), 'utf8' );

	it.each( Object.keys( TWEENS ) )(
		'reads no %s attribute by name',
		( key ) => {
			expect( source ).not.toMatch(
				new RegExp( `config\\.${ key }\\b` )
			);
		}
	);

	it( 'asks the edition for its preludes', () => {
		expect( source ).toMatch(
			/import \{ TWEENS, TWEEN_PRELUDES \} from '@edition\/tweens\.js';/
		);
	} );
} );

/**
 * Below 37.5rem the stylesheet shows one slide whatever Slides Per View says.
 * The inert window has to agree, or the slides after the current one stay
 * reachable by keyboard while off screen.
 */
describe( 'inert slides', () => {
	// A bare package does not resolve from shared/ (Node walks up from the
	// file, and shared/ has no node_modules), and none of it runs here anyway.
	jest.mock( 'embla-carousel', () => jest.fn(), { virtual: true } );

	const source = readFileSync( join( __dirname, 'index.js' ), 'utf8' );
	const styles = readFileSync( join( __dirname, 'style.scss' ), 'utf8' );

	it( 'counts at the breakpoint where the stylesheet forces one per view', () => {
		const [ , width ] = styles.match(
			/@media \(max-width: ([\d.]+rem)\) \{\s*\.ghostlabs-glide--content-slider \{\s*--ghostlabs-glide-slides-per-view: 1 !important;/
		);

		expect( source ).toContain(
			`window.matchMedia( '(max-width: ${ width })' )`
		);
	} );

	function load( narrow ) {
		const listeners = [];
		window.matchMedia = jest.fn( ( query ) => ( {
			matches: query === '(max-width: 37.5rem)' ? narrow : false,
			addEventListener: ( type, fn ) => listeners.push( fn ),
			removeEventListener: jest.fn(),
		} ) );

		let setupInertSlides;
		jest.isolateModules( () => {
			( { setupInertSlides } = require( './index.js' ) );
		} );

		const container = document.createElement( 'div' );
		container.innerHTML = Array.from(
			{ length: 5 },
			() => '<div class="ghostlabs-glide-slide"></div>'
		).join( '' );
		const embla = { selectedScrollSnap: () => 1, on: jest.fn() };

		setupInertSlides( embla, container, false, 3, false );

		return [ ...container.children ].map( ( slide ) =>
			slide.hasAttribute( 'inert' )
		);
	}

	it( 'leaves the configured window reachable on a wide screen', () => {
		expect( load( false ) ).toEqual( [ true, false, false, false, true ] );
	} );

	it( 'leaves only the one slide on screen reachable on a narrow one', () => {
		expect( load( true ) ).toEqual( [ true, false, true, true, true ] );
	} );
} );

/**
 * The names a screen reader hears come from server-translated templates
 * (Glide.php's `data-label-*`), filled here. They used to be English literals.
 */
describe( 'formatLabel', () => {
	jest.mock( 'embla-carousel', () => jest.fn(), { virtual: true } );

	let formatLabel;
	beforeAll( () => {
		window.matchMedia = jest.fn( () => ( {
			matches: false,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		} ) );
		jest.isolateModules( () => {
			( { formatLabel } = require( './index.js' ) );
		} );
	} );

	it( 'fills a bare %d', () => {
		expect( formatLabel( 'Go to slide %d', 3 ) ).toBe( 'Go to slide 3' );
	} );

	it( 'fills numbered placeholders in their own order', () => {
		expect( formatLabel( 'Slide %1$d of %2$d', 2, 5 ) ).toBe(
			'Slide 2 of 5'
		);
		// A translation may reorder them.
		expect( formatLabel( '%2$d中的第%1$d张', 2, 5 ) ).toBe( '5中的第2张' );
	} );
} );

/**
 * The gap is the space between slides as they move. At one slide per view it
 * used to be left unset, so slides touched mid-swipe whatever Gap said.
 */
describe( 'slides per view and the gap', () => {
	jest.mock( 'embla-carousel', () => jest.fn(), { virtual: true } );

	function setup( config ) {
		window.matchMedia = jest.fn( () => ( {
			matches: false,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		} ) );

		let setupSlidesPerView;
		jest.isolateModules( () => {
			( { setupSlidesPerView } = require( './index.js' ) );
		} );

		const el = document.createElement( 'div' );
		setupSlidesPerView( el, config );
		return el.style;
	}

	it( 'applies the gap at one slide per view', () => {
		expect(
			setup( { slidesPerView: 1, gap: 24 } ).getPropertyValue(
				'--ghostlabs-glide-gap'
			)
		).toBe( '24px' );
	} );

	it( 'applies the gap and the count above one per view', () => {
		const style = setup( { slidesPerView: 3, gap: 16 } );

		expect( style.getPropertyValue( '--ghostlabs-glide-gap' ) ).toBe(
			'16px'
		);
		expect(
			style.getPropertyValue( '--ghostlabs-glide-slides-per-view' )
		).toBe( '3' );
	} );

	it( 'leaves both to the stylesheet when there is nothing to set', () => {
		const style = setup( { slidesPerView: 1, gap: 0 } );

		expect( style.getPropertyValue( '--ghostlabs-glide-gap' ) ).toBe( '' );
		expect(
			style.getPropertyValue( '--ghostlabs-glide-slides-per-view' )
		).toBe( '' );
	} );
} );
