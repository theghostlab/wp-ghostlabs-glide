/**
 * The slider module is lazy, so until it loads, a slider's later slides used to
 * be ordinary content a keyboard user could tab into while nobody could see it.
 * `preInertSlides()` marks them inert at page load; the module recomputes every
 * slide when it initialises.
 */
jest.mock( '@edition/modes.js', () => ( {
	MODE_LOADERS: { contentSlider: () => Promise.resolve( {} ) },
	DEFAULT_MODE: 'contentSlider',
} ) );

describe( 'preInertSlides', () => {
	let preInertSlides;

	function load( narrow ) {
		window.matchMedia = jest.fn( () => ( { matches: narrow } ) );
		jest.isolateModules( () => {
			( { preInertSlides } = require( './view.js' ) );
		} );
	}

	function slider( config, count = 4, mode = 'contentSlider' ) {
		const el = document.createElement( 'div' );
		el.dataset.glideMode = mode;
		el.dataset.glideConfig = JSON.stringify( config );
		el.innerHTML = Array.from(
			{ length: count },
			() => '<div class="ghostlabs-glide-slide"></div>'
		).join( '' );
		return el;
	}

	const inert = ( el ) =>
		[ ...el.children ].map( ( s ) => s.hasAttribute( 'inert' ) );

	it( 'leaves the first view reachable and marks the rest', () => {
		load( false );
		const el = slider( { slidesPerView: 2 } );
		preInertSlides( el );
		expect( inert( el ) ).toEqual( [ false, false, true, true ] );
	} );

	it( 'counts one per view on a narrow screen', () => {
		load( true );
		const el = slider( { slidesPerView: 3 } );
		preInertSlides( el );
		expect( inert( el ) ).toEqual( [ false, true, true, true ] );
	} );

	it( 'counts one per view for fade', () => {
		load( false );
		const el = slider( { slidesPerView: 3, fade: true } );
		preInertSlides( el );
		expect( inert( el ) ).toEqual( [ false, true, true, true ] );
	} );

	it( 'touches no other mode', () => {
		load( false );
		const el = slider( {}, 4, 'stickyScroll' );
		preInertSlides( el );
		expect( inert( el ) ).toEqual( [ false, false, false, false ] );
	} );
} );
