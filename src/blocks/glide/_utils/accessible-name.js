import { MARKERS, NAMED_STICKY_LAYOUTS } from '@edition/markers.js';

/**
 * Whether the block renders the Accessible name field's value anywhere, and so
 * whether the field is offered.
 *
 * ⚠️ **Offered only where it does something.** Every mode outside Sticky Scroll
 * is a labelled region, and so is Sticky Chapters' contents rail ("Contents:
 * …"). The rest of Sticky Scroll — a layout that is ordinary content, or no
 * layout at all — carries no name, and the field used to show there anyway with
 * help text promising a generic one. Which other layouts are named is the
 * edition's answer, since only some editions ship them.
 *
 * @param {string} mode   The block's mode.
 * @param {string} marker The block's resolved marker class, or ''.
 * @return {boolean} True when the field should show.
 */
export function offersAccessibleName( mode, marker ) {
	if ( mode !== 'stickyScroll' ) {
		return true;
	}

	return (
		marker === MARKERS.stickyChapters ||
		NAMED_STICKY_LAYOUTS.includes( marker )
	);
}
