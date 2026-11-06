/**
 * Frontend dispatcher for Glide block.
 *
 * Finds all Glide containers, lazy-loads the appropriate mode module
 * via IntersectionObserver + dynamic import (webpack code splitting).
 *
 * ⚠️ **Which modes exist is per-edition data, not a switch here.** This file is
 * shared and each edition compiles a different set of mode modules, so naming
 * one would leave any build without it holding an unresolvable import — and an
 * unresolvable import is not a missing mode, it is no bundle at all.
 * `@edition/modes.js` answers for the build it is compiled into, so a mode an
 * edition does not ship is simply absent from the map. The same gate-by-absence
 * the PHP renderer uses.
 */
import { lazyInit } from '../../shared/lazy-loader.js';
import { SELECTORS } from '../../shared/constants.js';
import { holdAutoplay } from '../../shared/embed-controls.js';
import { MODE_LOADERS, DEFAULT_MODE } from '@edition/modes.js';

// Matches the content slider's own single-slide breakpoint (style.scss).
const SINGLE_SLIDE_QUERY = '(max-width: 37.5rem)';

/**
 * Marks a content slider's off-screen slides inert before the slider module
 * has loaded.
 *
 * The module is lazy, so until a slider nears the viewport its later slides
 * were ordinary content: a keyboard user tabbing down the page could land in a
 * slide nobody could see. The module recomputes every slide's state when it
 * initialises, so this only has to be right about which slides start hidden.
 * Done here rather than server-side so that with JavaScript off nothing is
 * made unreachable.
 *
 * @param {HTMLElement} el The Glide container.
 */
export function preInertSlides( el ) {
	if ( el.dataset.glideMode !== 'contentSlider' ) {
		return;
	}
	let config = {};
	try {
		config = JSON.parse( el.dataset.glideConfig || '{}' );
	} catch {
		return;
	}
	const perView =
		config.fade || window.matchMedia( SINGLE_SLIDE_QUERY ).matches
			? 1
			: Math.max( 1, Math.floor( Number( config.slidesPerView ) || 1 ) );
	el.querySelectorAll( SELECTORS.slide ).forEach( ( slide, i ) => {
		if ( i >= perView ) {
			slide.setAttribute( 'inert', '' );
		}
	} );
}

document.querySelectorAll( SELECTORS.container ).forEach( ( el ) => {
	const mode = el.dataset.glideMode;

	// An unknown mode, or one this edition does not ship, falls back rather than
	// failing — a block pasted from an edition that has it still renders as a
	// content slider instead of rendering nothing. Every slide survives.
	// `Object.hasOwn`, so an attribute naming an Object.prototype member
	// cannot reach it.
	const load = Object.hasOwn( MODE_LOADERS, mode )
		? MODE_LOADERS[ mode ]
		: MODE_LOADERS[ DEFAULT_MODE ];

	preInertSlides( el );

	// Here, at page load, rather than when the mode module arrives: the
	// players are lazy iframes that may start before it does, and a message
	// sent to one that is not listening yet is lost (`holdAutoplay()`).
	if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		holdAutoplay( el );
	}

	lazyInit( el, load );
} );
