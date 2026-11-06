import initChapters from './chapters';

/**
 * Sticky Chapters — smooth scroll.
 *
 * The rail stays a set of real anchors, so what is asserted here is the one
 * thing the module actually contributes: putting a class on <html> for the
 * duration of the navigation and, just as importantly, taking it off again.
 * A class left behind makes every later scroll on the page smooth, and nothing
 * would point back at this module as the cause.
 */

const SMOOTH_CLASS = 'ghostlabs-glide-is-smooth-scrolling';

/**
 * Mirrors what Glide::renderRail() and renderStepList() emit.
 *
 * @param {Object|null} config Value for data-glide-config, or null to omit it.
 * @return {HTMLElement} The block wrapper, attached to the document.
 */
function mountChapters( config = {} ) {
	const container = document.createElement( 'div' );
	container.className = 'ghostlabs-glide ghostlabs-glide--sticky-chapters';

	if ( config !== null ) {
		container.dataset.glideConfig = JSON.stringify( config );
	}

	container.innerHTML = `
		<nav class="ghostlabs-glide__rail" aria-labelledby="rail-title">
			<p class="ghostlabs-glide__rail-title" id="rail-title">Contents</p>
			<ol class="ghostlabs-glide__rail-list">
				<li class="ghostlabs-glide__rail-item">
					<a class="ghostlabs-glide__rail-link" href="#step-1">
						<span class="ghostlabs-glide__rail-marker"></span>
						<span class="ghostlabs-glide__rail-text">One</span>
					</a>
				</li>
				<li class="ghostlabs-glide__rail-item">
					<a class="ghostlabs-glide__rail-link" href="#step-2">
						<span class="ghostlabs-glide__rail-marker"></span>
						<span class="ghostlabs-glide__rail-text">Two</span>
					</a>
				</li>
			</ol>
		</nav>
		<div class="ghostlabs-glide__steps">
			<section class="ghostlabs-glide__step" id="step-1" tabindex="-1"></section>
			<section class="ghostlabs-glide__step" id="step-2" tabindex="-1"></section>
		</div>
	`;

	document.body.appendChild( container );
	return container;
}

const railLink = ( container, index = 0 ) =>
	container.querySelectorAll( '.ghostlabs-glide__rail-link' )[ index ];

const isSmooth = () =>
	document.documentElement.classList.contains( SMOOTH_CLASS );

describe( 'initChapters — smooth scroll', () => {
	let teardown;

	beforeAll( () => {
		// The module gates its scroll listener behind IntersectionObserver,
		// which jsdom does not implement. Nothing here depends on it firing.
		global.IntersectionObserver = class {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
	} );

	beforeEach( () => {
		jest.useFakeTimers();
	} );

	afterEach( () => {
		if ( typeof teardown === 'function' ) {
			teardown();
			teardown = undefined;
		}
		jest.useRealTimers();
		document.body.innerHTML = '';
		document.documentElement.classList.remove( SMOOTH_CLASS );
	} );

	test( 'clicking a chapter marks the document as smooth scrolling', () => {
		const container = mountChapters( { smoothScroll: true } );
		teardown = initChapters( container );

		expect( isSmooth() ).toBe( false );
		railLink( container ).click();
		expect( isSmooth() ).toBe( true );
	} );

	test( 'the mark is released once the scroll settles', () => {
		const container = mountChapters( { smoothScroll: true } );
		teardown = initChapters( container );

		railLink( container ).click();
		expect( isSmooth() ).toBe( true );

		jest.runOnlyPendingTimers();
		expect( isSmooth() ).toBe( false );
	} );

	test( 'scrollend releases the mark ahead of the backstop timer', () => {
		const container = mountChapters( { smoothScroll: true } );
		teardown = initChapters( container );

		railLink( container ).click();
		window.dispatchEvent( new Event( 'scrollend' ) );

		expect( isSmooth() ).toBe( false );
		// The timer must have been cleared, not merely outrun.
		expect( jest.getTimerCount() ).toBe( 0 );
	} );

	test( 'clicking somewhere else in the rail marks nothing', () => {
		const container = mountChapters( { smoothScroll: true } );
		teardown = initChapters( container );

		container
			.querySelector( '.ghostlabs-glide__rail-title' )
			.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );

		expect( isSmooth() ).toBe( false );
	} );

	test( 'the option can be switched off', () => {
		const container = mountChapters( { smoothScroll: false } );
		teardown = initChapters( container );

		railLink( container ).click();
		expect( isSmooth() ).toBe( false );
	} );

	test( 'a block saved before the option existed still scrolls smoothly', () => {
		// No smoothScroll key at all: absent means on, matching the block
		// default and the editor toggle.
		const container = mountChapters( { railPosition: 'left' } );
		teardown = initChapters( container );

		railLink( container ).click();
		expect( isSmooth() ).toBe( true );
	} );

	test( 'teardown releases the mark and stops listening', () => {
		const container = mountChapters( { smoothScroll: true } );
		const destroy = initChapters( container );

		railLink( container ).click();
		expect( isSmooth() ).toBe( true );

		destroy();
		expect( isSmooth() ).toBe( false );

		railLink( container ).click();
		expect( isSmooth() ).toBe( false );
	} );
} );

/**
 * On a phone the rail is a one-row strip that scrolls sideways, so the active
 * entry can sit past its edge, highlighted where nobody can see it.
 *
 * jsdom has no layout: every step measures at the top, so the module seeds the
 * *last* step as current on init, and the entries are given the boxes a strip
 * would have.
 */
describe( 'initChapters — the phone strip', () => {
	let teardown;
	let list;

	beforeAll( () => {
		global.IntersectionObserver = class {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
	} );

	afterEach( () => {
		teardown?.();
		teardown = undefined;
		delete window.matchMedia;
		document.body.innerHTML = '';
	} );

	const box = ( left, right ) => () => ( {
		left,
		right,
		top: 0,
		bottom: 40,
		width: right - left,
		height: 40,
	} );

	/**
	 * @param {number} lastLeft  Where the last entry starts in the viewport.
	 * @param {number} lastRight Where it ends. The strip runs from 0 to 300.
	 * @return {HTMLElement} The block wrapper.
	 */
	function mountStrip( lastLeft, lastRight ) {
		const container = mountChapters();
		list = container.querySelector( '.ghostlabs-glide__rail-list' );
		list.getBoundingClientRect = box( 0, 300 );
		list.scrollBy = jest.fn();
		const [ first, last ] = container.querySelectorAll(
			'.ghostlabs-glide__rail-item'
		);
		first.getBoundingClientRect = box( 0, 120 );
		last.getBoundingClientRect = box( lastLeft, lastRight );
		return container;
	}

	test( 'scrolls the strip until the active title is in full view', () => {
		const container = mountStrip( 280, 400 );
		teardown = initChapters( container );

		expect( list.scrollBy ).toHaveBeenCalledWith( {
			left: 100,
			behavior: 'smooth',
		} );
	} );

	test( 'leaves the strip alone when the active title already fits', () => {
		const container = mountStrip( 140, 260 );
		teardown = initChapters( container );

		expect( list.scrollBy ).not.toHaveBeenCalled();
	} );

	test( 'with reduced motion the strip jumps rather than glides', () => {
		window.matchMedia = ( query ) => ( {
			matches: query === '(prefers-reduced-motion: reduce)',
		} );
		const container = mountStrip( 280, 400 );
		teardown = initChapters( container );

		expect( list.scrollBy ).toHaveBeenCalledWith( {
			left: 100,
			behavior: 'auto',
		} );
	} );

	test( 'never scrolls the page to do it', () => {
		const pageScroll = jest
			.spyOn( window, 'scrollBy' )
			.mockImplementation( () => {} );
		const container = mountStrip( 280, 400 );
		const scrollIntoView = jest.fn();
		container
			.querySelectorAll(
				'.ghostlabs-glide__rail-item, .ghostlabs-glide__rail-link'
			)
			.forEach( ( el ) => ( el.scrollIntoView = scrollIntoView ) );
		teardown = initChapters( container );

		expect( scrollIntoView ).not.toHaveBeenCalled();
		expect( pageScroll ).not.toHaveBeenCalled();
		pageScroll.mockRestore();
	} );
} );
