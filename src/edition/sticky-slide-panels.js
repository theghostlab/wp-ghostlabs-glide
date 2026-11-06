/**
 * The per-slide settings for the Sticky Scroll layouts this edition adds: none.
 *
 * A slide inside a sticky layout offers controls that belong to *that layout* —
 * the width of a pinned panel, whether a card stays in the stack, the image a
 * media step declares. This edition ships one sticky layout, and its step
 * controls are in `glide-slide/edit.js` because every edition has that layout.
 *
 * ⚠️ **Keyed by marker, never by a flag per layout.** `glide-slide/edit.js` took
 * one boolean per layout from `useHasGlideMarker()` and branched on each — names
 * for layouts this build does not ship, and around 150 lines of inspector
 * compiled into it for nothing.
 *
 * ⚠️ **Empty and still required**, like the rest of this directory: the import in
 * `edit.js` is unconditional, so a missing module is a build failure rather than
 * a missing panel.
 *
 * A slide pasted from an edition that has these layouts still carries its
 * attributes and still renders — it simply offers no controls for settings this
 * build cannot act on, which is the honest thing to show.
 */

/**
 * Marker class → the per-slide panel that layout adds.
 *
 * @type {Object}
 */
export const STICKY_SLIDE_PANELS = {};
