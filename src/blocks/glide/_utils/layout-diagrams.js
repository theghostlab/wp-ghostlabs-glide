import { Form, Line, ACCENT } from './layout-primitives.js';

/**
 * The diagrams for the layouts every edition ships.
 *
 * 🔴 Separate from `layout-thumbnails.js` to break a cycle, and the cycle was
 * not subtle: that module needs the edition's DIAGRAMS map, and the edition's
 * map needs these two. With both halves in one file the edition module
 * evaluated while the shared one was still mid-evaluation, `DIAGRAMS` came back
 * undefined, and `Object.keys( undefined )` threw at import time — which takes
 * the whole editor bundle down, so every block failed to register and the
 * editor said only "Block type 'ghostlabs/glide' is not registered".
 */

export const ContentSlider = () => (
	<>
		<Form x={ 10 } y={ 10 } w={ 209 } h={ 58 } />
		<Line x={ 102 } y={ 63 } w={ 6 } h={ 4 } fill={ ACCENT } />
		<Line x={ 112 } y={ 63 } w={ 6 } h={ 4 } fill="#ffffff" />
		<Line x={ 122 } y={ 63 } w={ 6 } h={ 4 } fill="#ffffff" />
	</>
);

export const StickyChapters = () => (
	<>
		<Line x={ 10 } y={ 12 } w={ 3 } h={ 54 } />
		<Line x={ 19 } y={ 14 } w={ 22 } h={ 4 } />
		<Line x={ 19 } y={ 27 } w={ 30 } h={ 4 } fill={ ACCENT } />
		<Line x={ 19 } y={ 40 } w={ 22 } h={ 4 } />
		<Line x={ 98 } y={ 13 } w={ 115 } />
		<Line x={ 98 } y={ 24 } w={ 115 } />
		<Line x={ 98 } y={ 35 } w={ 115 } />
		<Line x={ 98 } y={ 46 } w={ 69 } />
	</>
);
