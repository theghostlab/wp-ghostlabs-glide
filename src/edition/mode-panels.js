/**
 * The inspector panels for the slider modes this edition adds: none.
 *
 * This edition ships the content slider and sticky scroll, and `edit.js` holds
 * the panels for both — one because it is the mode everything falls back to, the
 * other because its four layouts share a single panel. There is no third mode
 * here to configure.
 *
 * ⚠️ **Empty and still required.** `edit.js` imports this map unconditionally; a
 * missing module is a build failure, not a missing panel. Same reason the SCSS
 * partials in this directory exist while holding nothing.
 *
 * The map is what the shared editor reads, rather than a list of modes it knows
 * about — so an edition with no extra modes needs no branch anywhere, and the
 * editor cannot offer a panel for something it did not compile.
 */
import { __ } from '@wordpress/i18n';

export const MODE_PANELS = {};

/**
 * The content slider tween effects this edition offers in the inspector.
 *
 * Fade alone. It is a CSS transition on the slider itself and needs no module;
 * the other three flags are driven by `@edition/tweens.js`, which answers with
 * no-ops here, and a toggle for an effect that does nothing is worse than no
 * toggle.
 *
 * ⚠️ **Not the same list as `TWEEN_KEYS` in the shared `edit.js`, deliberately.**
 * That one is every flag a `contentSlider` object can carry — this edition's
 * schema defaults only Fade, but a parse keeps the object whole, so a block
 * saved elsewhere arrives with the rest — and it is what the "None" toggle and
 * the one-at-a-time logic clear. A block arriving with another effect set is
 * still turned off correctly by a control that never offered it.
 */
export const TWEEN_OPTIONS = [
	{ key: 'fade', label: __( 'Fade Transition', 'ghostlabs-glide' ) },
];
