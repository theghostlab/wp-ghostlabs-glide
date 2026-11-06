import {
	ContentSlider,
	StickyChapters,
} from '@shared/blocks/glide/_utils/layout-diagrams.js';

/**
 * A diagram per layout this edition offers, keyed by LAYOUT_CHOICES key.
 *
 * Two, matching the two layouts free ships. ⚠️ The five other diagrams are not
 * imported here and their module is not in this tree — the shared map used to be
 * keyed by all seven, so nothing was tree-shaken and this bundle carried the SVG
 * for five layouts it does not offer, named after them.
 */
export const DIAGRAMS = {
	contentSlider: ContentSlider,
	stickyChapters: StickyChapters,
};
