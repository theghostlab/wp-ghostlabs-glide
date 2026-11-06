import { MARKERS } from './markers.js';
import initChapters from '@shared/modes/sticky-scroll/patterns/chapters.js';

/**
 * The Sticky Scroll layouts this edition ships, keyed by marker class. Each value
 * resolves to the layout's initialiser.
 *
 * One of the four. No module exists in this tree for the other three.
 *
 * ⚠️ A block carrying one of those markers finds no entry here — `initStickyScroll()` then falls through to the plain stacked
 * layout, which CSS renders on its own. The steps and everything in them survive;
 * only the choreography is missing.
 */
export const STICKY_PATTERNS = {
	[ MARKERS.stickyChapters ]: async () => initChapters,
};
