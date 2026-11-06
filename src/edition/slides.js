/**
 * What the slide block offers for the modes this edition adds: nothing extra.
 *
 * `glide-slide` is shared and sits inside whichever mode its parent is in, so it
 * has two questions it cannot answer alone: what to seed a fresh slide with, and
 * which per-slide settings that mode has. Both differ only for modes this
 * edition does not compile, so both answers here are empty — which is the answer,
 * not a placeholder for one.
 */

/**
 * Per-mode starting content for a fresh slide.
 *
 * Empty. Both modes this edition ships want the shared default — a Cover with a
 * heading and a paragraph — so there is nothing to override. A mode with no entry
 * here gets that default, which is why this map holds overrides rather than a
 * full list.
 */
export const SLIDE_TEMPLATES = {};

/**
 * Per-layout starting content for a fresh slide, keyed by marker class.
 *
 * Empty and still required: `glide-slide/edit.js` consults it before
 * `SLIDE_TEMPLATES` for any slide inside a marked block. Sticky Chapters' steps
 * take the shared default, so this edition has no layout to override.
 */
export const STICKY_SLIDE_TEMPLATES = {};

/**
 * Whether a mode's slides can carry a video background.
 *
 * Always, here: both modes this edition ships have somewhere for a video layer
 * to sit.
 *
 * ⚠️ **Asked positively, and it used to be asked the other way.** The shared
 * editor tested the parent mode against the name of one that has no room for a
 * video layer — this build interrogating a mode it has never heard of, and a
 * test that goes quietly wrong the moment a second mode is in the same position.
 *
 * @return {boolean} Always true.
 */
export function supportsVideoBackground() {
	return true;
}

/**
 * Mode → the per-slide panel that configures it.
 *
 * Empty for the same reason `MODE_PANELS` is: the modes with per-slide settings
 * are the ones this edition does not ship. The shared `edit.js` looks a mode up
 * here and renders nothing when it finds nothing, so there is no branch to write
 * and no panel that could leak.
 */
export const SLIDE_PANELS = {};
