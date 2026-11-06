/**
 * The marker vocabulary this edition ships: the shared one, and nothing more.
 *
 * Shared code asks here rather than reading `@shared/shared/constants.js`,
 * because an edition with more layouts extends the list in its own copy of
 * this file. A block carrying a marker this edition does not know resolves to
 * none, and renders — in the canvas and on the page — as the plain stack of
 * steps.
 */
export { MARKERS, PATTERN_NAMES } from '@shared/shared/constants.js';

/**
 * The sticky layouts beyond Sticky Chapters that render the block's accessible
 * name: none here, since this edition has no other layout.
 *
 * @type {Array<string>}
 */
export const NAMED_STICKY_LAYOUTS = [];
