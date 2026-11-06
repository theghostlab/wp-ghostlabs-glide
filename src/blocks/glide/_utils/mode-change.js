import { FULL_WIDTH_MODES } from '@edition/modes.js';

/**
 * The attributes choosing a mode writes, from the layout picker or the Mode
 * select alike.
 *
 * A full-width mode takes full alignment *when it is chosen*, and only then.
 * ⚠️ Never from an effect: the block declares no default alignment, so the
 * toolbar's "None" clears the attribute, and anything that backfills an empty
 * `align` undoes the author's choice on the next render.
 *
 * @param {string} mode The mode being chosen.
 * @return {Object} The attributes to set.
 */
export function attributesForMode( mode ) {
	return FULL_WIDTH_MODES.includes( mode )
		? { mode, align: 'full' }
		: { mode };
}
