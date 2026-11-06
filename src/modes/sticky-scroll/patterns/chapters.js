import { SELECTORS, CLASSES } from '../../../shared/constants.js';
import { observeActiveStep } from '../_active-step.js';

/**
 * While a chapter link is navigating, this class sits on <html> so the
 * browser's own fragment navigation animates instead of jumping. It comes off
 * as soon as the scroll settles — see the note on the click handler below.
 */
const SMOOTH_CLASS = 'ghostlabs-glide-is-smooth-scrolling';

/**
 * Backstop for taking SMOOTH_CLASS off again.
 *
 * `scrollend` is the accurate signal, but it never fires when the target is
 * already in view — clicking the chapter you are already reading — so a timer
 * is the one that always resolves. Comfortably longer than a smooth scroll of
 * any realistic length.
 */
const SETTLE_MS = 1200;

/**
 * Sticky Chapters.
 *
 * The rail is server-rendered as a real `<nav><ol>` of anchor links, and the
 * steps carry `tabindex="-1"`, so navigation, scrolling and focus all work
 * with JavaScript disabled — the browser handles them, and `scroll-margin-top`
 * in the stylesheet keeps the heading clear of the stuck rail.
 *
 * What is left for JavaScript is reflecting which step is current, and — when
 * the author asks for it — making the jump a smooth scroll.
 *
 * @param {HTMLElement} container The Glide block wrapper.
 * @return {Function|undefined} Teardown callback.
 */
export default function initChapters( container ) {
	const rail = container.querySelector( SELECTORS.rail );
	const steps = Array.from( container.querySelectorAll( SELECTORS.step ) );

	if ( ! rail || steps.length === 0 ) {
		return undefined;
	}

	// Rail items exist only for steps opted into the contents, so they are
	// matched back to their step by href rather than by position.
	const itemsByStepId = new Map();
	rail.querySelectorAll( SELECTORS.railItem ).forEach( ( item ) => {
		const link = item.querySelector( SELECTORS.railLink );
		const href = link && link.getAttribute( 'href' );
		if ( href && href.startsWith( '#' ) ) {
			itemsByStepId.set( href.slice( 1 ), item );
		}
	} );

	if ( itemsByStepId.size === 0 ) {
		return undefined;
	}

	const listedStepIds = steps
		.map( ( step ) => step.id )
		.filter( ( id ) => itemsByStepId.has( id ) );

	const counter = rail.querySelector( SELECTORS.railCounter );
	const list = rail.querySelector( SELECTORS.railList );

	/**
	 * On a phone the rail is a one-row strip that scrolls sideways, and the
	 * highlight is only worth anything if the active entry is on screen. A
	 * no-op wherever the entry already fits, which on the vertical rail is
	 * always.
	 *
	 * ⚠️ The strip is scrolled, never the element: `scrollIntoView()` moves
	 * every scrollable ancestor, and when the rail is entering or leaving its
	 * stuck position that includes the page — the reader's scroll would be
	 * yanked by a highlight changing under it.
	 *
	 * @param {HTMLElement} item The rail item just made current.
	 */
	const revealInStrip = ( item ) => {
		if ( ! list ) {
			return;
		}
		const bounds = list.getBoundingClientRect();
		const entry = item.getBoundingClientRect();
		let delta = 0;
		if ( entry.left < bounds.left ) {
			delta = entry.left - bounds.left;
		} else if ( entry.right > bounds.right ) {
			delta = Math.min(
				entry.right - bounds.right,
				entry.left - bounds.left
			);
		}
		if ( Math.abs( delta ) < 1 ) {
			return;
		}
		list.scrollBy( {
			left: delta,
			behavior: window.matchMedia?.( '(prefers-reduced-motion: reduce)' )
				?.matches
				? 'auto'
				: 'smooth',
		} );
	};

	const setActive = ( index ) => {
		const step = steps[ index ];

		// A step can be excluded from the contents while still being on the
		// page. Scrolling through one leaves the rail showing the last listed
		// step rather than highlighting nothing.
		if ( ! step || ! itemsByStepId.has( step.id ) ) {
			return;
		}

		itemsByStepId.forEach( ( item, id ) => {
			const isActive = id === step.id;
			item.classList.toggle( CLASSES.active, isActive );
			const link = item.querySelector( SELECTORS.railLink );
			if ( ! link ) {
				return;
			}
			if ( isActive ) {
				link.setAttribute( 'aria-current', 'true' );
			} else {
				link.removeAttribute( 'aria-current' );
			}
		} );

		revealInStrip( itemsByStepId.get( step.id ) );

		const position = listedStepIds.indexOf( step.id ) + 1;

		container.style.setProperty(
			'--ghostlabs-glide-progress',
			listedStepIds.length
				? String( position / listedStepIds.length )
				: '0'
		);

		if ( counter ) {
			counter.textContent = String( Math.max( 1, position ) );
		}
	};

	// Smooth scrolling is handed to the document rather than done by hand with
	// scrollIntoView, so the anchor keeps doing the navigating: the browser
	// still moves focus to the step's tabindex="-1" and still updates the URL
	// hash, neither of which a preventDefault()ed handler would get for free.
	// With JavaScript off the jump is simply instant, exactly as before.
	//
	// Reduced motion is not checked here on purpose — the stylesheet resets
	// scroll-behavior for this class under the query, so the guarantee holds
	// even if the class is added.
	//
	// ⚠️ The class has to come back off. Left on, every later scroll on the
	// page — a back-to-top link, another plugin's scrollTo — is smooth too, and
	// nothing would point at this module as the cause.
	const config = JSON.parse( container.dataset.glideConfig || '{}' );

	// Absent means on: blocks saved before this option existed have no key, and
	// the block's own default is true.
	const smoothScroll = config.smoothScroll !== false;

	let settleTimer;

	const releaseSmooth = () => {
		window.clearTimeout( settleTimer );
		window.removeEventListener( 'scrollend', releaseSmooth );
		document.documentElement.classList.remove( SMOOTH_CLASS );
	};

	const onRailClick = ( event ) => {
		if ( ! event.target?.closest?.( SELECTORS.railLink ) ) {
			return;
		}

		document.documentElement.classList.add( SMOOTH_CLASS );
		window.addEventListener( 'scrollend', releaseSmooth, { once: true } );
		settleTimer = window.setTimeout( releaseSmooth, SETTLE_MS );
	};

	if ( smoothScroll ) {
		rail.addEventListener( 'click', onRailClick );
	}

	// The rail's own height, for the layouts where it is stuck *above* the
	// steps (the top bar, the phone scroller): the stylesheet adds it to each
	// step's scroll margin, so an anchor jump does not park the heading — or a
	// focused link — underneath the rail. Harmless where the rail sits beside
	// the steps; the stylesheet only reads it in the stacked layouts.
	const publishRailHeight = () =>
		container.style.setProperty(
			'--ghostlabs-glide-rail-height',
			`${ Math.round( rail.getBoundingClientRect().height ) }px`
		);
	const railObserver =
		typeof window.ResizeObserver === 'function'
			? new window.ResizeObserver( publishRailHeight )
			: null;
	railObserver?.observe( rail );
	publishRailHeight();

	// After the height is published, not before: the observer's activation
	// line includes it, and its first pass decides the highlight at load.
	const disconnect = observeActiveStep( container, steps, setActive );

	return () => {
		disconnect();
		railObserver?.disconnect();
		container.style.removeProperty( '--ghostlabs-glide-rail-height' );
		rail.removeEventListener( 'click', onRailClick );
		releaseSmooth();
		itemsByStepId.forEach( ( item ) => {
			item.classList.remove( CLASSES.active );
			item.querySelector( SELECTORS.railLink )?.removeAttribute(
				'aria-current'
			);
		} );
		container.style.removeProperty( '--ghostlabs-glide-progress' );
	};
}
