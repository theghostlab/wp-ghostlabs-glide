import { observeActiveStep } from './_active-step';

/**
 * The activation line: where an anchor jump parks a step, which is the
 * scroller's scroll-padding-top plus the step's scroll-margin-top.
 *
 * What is asserted is that the line is re-read, not cached. A rail stuck above
 * the steps adds its own height to the margin, and chapters.js publishes that
 * height after the observer starts and whenever the rail resizes, with no
 * window resize to prompt a re-measure. A cached line sat a whole rail-height
 * above where a jumped-to step lands, so the previous chapter stayed lit.
 */

let gates = [];

class FakeIntersectionObserver {
	constructor( callback ) {
		this.callback = callback;
		gates.push( this );
	}

	observe() {}

	disconnect() {}
}

/** Reports the section on screen, which runs a pass as the browser would. */
const onScreen = () =>
	gates.forEach( ( gate ) => gate.callback( [ { isIntersecting: true } ] ) );

describe( 'observeActiveStep — the activation line', () => {
	let margin;
	let realGetComputedStyle;

	beforeAll( () => {
		global.IntersectionObserver = FakeIntersectionObserver;
		realGetComputedStyle = window.getComputedStyle;
	} );

	beforeEach( () => {
		margin = '56px';
		window.getComputedStyle = () => ( {
			scrollPaddingTop: '46px',
			scrollMarginTop: margin,
			getPropertyValue: () => '',
		} );
	} );

	afterEach( () => {
		window.getComputedStyle = realGetComputedStyle;
		gates = [];
		document.body.innerHTML = '';
	} );

	/**
	 * Two steps, the second parked where a jump with a 147px margin lands it:
	 * 46 + 147 = 193px from the top.
	 *
	 * @return {{container: HTMLElement, steps: Array<HTMLElement>}} The section.
	 */
	function mount() {
		const container = document.createElement( 'div' );
		const steps = [ -400, 193 ].map( ( top ) => {
			const step = document.createElement( 'section' );
			step.getBoundingClientRect = () => ( { top } );
			container.appendChild( step );
			return step;
		} );
		document.body.appendChild( container );
		return { container, steps };
	}

	test( 'a margin that grows after start moves the line with it', () => {
		const { container, steps } = mount();
		const onChange = jest.fn();
		const stop = observeActiveStep( container, steps, onChange );

		// At start the rail's height is not in the margin yet: the line is at
		// 102px, and the second step, at 193px, has not crossed it.
		expect( onChange ).toHaveBeenLastCalledWith( 0 );

		// The rail's height lands in the margin. Nothing resizes the window.
		margin = '147px';
		onScreen();

		expect( onChange ).toHaveBeenLastCalledWith( 1 );
		stop();
	} );
} );
