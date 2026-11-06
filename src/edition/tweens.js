/**
 * The content slider's tween effects, as this edition ships them: none.
 *
 * The tween modules are not in this tree. `shared/src/modes/content-slider/index.js` calls whichever of these the
 * attributes ask for, so they have to be callable — the effect is simply that
 * the slider transitions plainly, which is what a slider with no tween does.
 *
 * ⚠️ **No-ops rather than a missing key.** The shared module reads
 * `TWEENS.parallax` at import time and calls it later; `undefined` there is a
 * TypeError at the first slide change, which takes the whole slider down rather
 * than dropping one effect.
 */
const noop = () => {};

export const TWEENS = {
	parallax: noop,
	scale: noop,
	barnDoors: noop,
};

/**
 * What an effect needs from the slider before Embla starts: none here.
 *
 * The shared slider used to read one paid effect's attribute itself, so a block
 * saved in the paid edition with that effect on still centred its slides in this
 * build — part of a paid effect running in a build that does not ship it.
 */
export const TWEEN_PRELUDES = {};
