import { CLASSES } from '../../shared/constants.js';
import { STICKY_PATTERNS } from '@edition/sticky-patterns.js';
import { fitSurface } from './_surface.js';

/**
 * Pattern dispatch table, keyed by the marker class the block pattern stamped
 * onto the block's className. Adding a pattern is one entry plus its module.
 */
// ⚠️ Which layouts exist is per-edition data, and it has to be: three of the four
// pattern modules are paid, and a shared file importing them would compile them
// into the free bundle — the sticky-scroll chunk would carry the JavaScript for
// layouts the edition cannot render, which is exactly what the tier-isolation
// gate looks for.
//
// A marker with no entry falls through to the plain stacked layout below, which
// is the same thing that happens to a block that has no marker at all.
const PATTERNS = STICKY_PATTERNS;

/**
 * Sticky Scroll entry point.
 *
 * The mode carries the shared plumbing; the marker class decides the
 * behaviour. A block in this mode with no marker (someone picked the mode from
 * the Mode select rather than inserting a pattern) is a valid, if plain,
 * stacked layout — CSS already renders it, so there is simply nothing for
 * JavaScript to do.
 *
 * @param {HTMLElement} container The Glide block wrapper.
 * @return {Function|undefined} Teardown callback, when a pattern initialised.
 */
export default function initStickyScroll( container ) {
	const marker = Object.keys( PATTERNS ).find( ( name ) =>
		container.classList.contains( name )
	);

	if ( ! marker ) {
		return undefined;
	}

	// Before the pattern starts, so its first paint is already legible. Again on
	// a colour-scheme change, which can swap the ground under the block.
	fitSurface( container );
	const scheme = window.matchMedia?.( '(prefers-color-scheme: dark)' );
	const refit = () => fitSurface( container );
	scheme?.addEventListener?.( 'change', refit );

	// The layout's module may be a chunk of its own, so it arrives later than
	// this call. ⚠️ The teardown has to be returned now — the caller keeps only
	// what this returns — so it cancels a load that has not finished yet.
	let destroy;
	let tornDown = false;

	PATTERNS[ marker ]()
		.then( ( init ) => {
			if ( tornDown ) {
				return;
			}
			destroy = init( container );
			container.classList.add( CLASSES.ready );
		} )
		.catch( () => {} );

	return () => {
		tornDown = true;
		if ( typeof destroy === 'function' ) {
			destroy();
		}
		scheme?.removeEventListener?.( 'change', refit );
		container.style.removeProperty( '--ghostlabs-glide-surface' );
		container.classList.remove( CLASSES.ready );
	};
}
