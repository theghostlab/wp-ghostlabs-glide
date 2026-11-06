import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

import { hasMarker, layoutHasMarker } from './marker.js';

export { hasMarker };

/**
 * Whether the block sits inside a Glide layout carrying the given marker
 * class, detected by walking ancestors' `className` attributes — the layout
 * contract, with no per-block attribute or context behind it. An ancestor
 * counts only while it is in Sticky Scroll; see `layoutHasMarker()`.
 *
 * Lets a child block adapt its own inspector controls to the pattern that
 * seeded it. Mirrors pch-boatlistings' `use-hero-showcase.js`.
 *
 * @param {string} clientId    Block client ID.
 * @param {string} markerClass The pattern marker class to look for.
 * @return {boolean} True when an ancestor carries the marker class.
 */
export function useHasGlideMarker( clientId, markerClass ) {
	return useSelect(
		( select ) => {
			const { getBlockParents, getBlockAttributes } =
				select( blockEditorStore );

			return getBlockParents( clientId ).some( ( id ) =>
				layoutHasMarker( getBlockAttributes( id ) || {}, markerClass )
			);
		},
		[ clientId, markerClass ]
	);
}

/**
 * Which of several marker classes an ancestor Glide layout carries.
 *
 * ⚠️ **One hook for the whole vocabulary, because the alternative is a bug.**
 * The obvious shape — `Object.values( MARKERS ).find( ( m ) =>
 * useHasGlideMarker( clientId, m ) )` — calls a hook inside a short-circuiting
 * loop, so the number of hooks called varies between renders and React's state
 * ordering comes apart. That is not a lint preference; it is the rule the hook
 * ordering depends on.
 *
 * Resolving the whole list inside a single `useSelect` also means one walk of
 * the ancestor chain instead of one per marker.
 *
 * A block may only sit inside one layout, so the first match is the answer. The
 * order of `markerClasses` decides ties, and there are none in practice — the
 * patterns stamp exactly one marker each.
 *
 * @param {string}        clientId      Block client ID.
 * @param {Array<string>} markerClasses Marker classes to look for, in order.
 * @return {string} The marker an ancestor carries, or an empty string.
 */
export function useGlideMarker( clientId, markerClasses ) {
	return useSelect(
		( select ) => {
			const { getBlockParents, getBlockAttributes } =
				select( blockEditorStore );

			const ancestors = getBlockParents( clientId ).map(
				( id ) => getBlockAttributes( id ) || {}
			);

			return (
				markerClasses.find( ( marker ) =>
					ancestors.some( ( attributes ) =>
						layoutHasMarker( attributes, marker )
					)
				) ?? ''
			);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ clientId, markerClasses.join( ' ' ) ]
	);
}
