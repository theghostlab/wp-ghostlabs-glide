/**
 * Watches a list of steps and reports which one is currently in view.
 *
 * Shared by every sticky-scroll pattern that has a notion of a "current step" —
 * the contents rail highlights it, the media pane crossfades to it.
 *
 * The current step is the *last* one whose top has crossed the activation line,
 * which is the line an anchor jump parks a step's top on.
 *
 * Position is sampled from a scroll listener rather than driven by
 * IntersectionObserver, which is not suited to this despite looking like it
 * should be. IO reports enter and leave of a root, and with tall contiguous
 * steps every step intersects the root at once across most of the scroll range
 * — so no event fires at the moment the active step actually changes. Clicking
 * a rail link would scroll the page and leave the previous entry highlighted,
 * because nothing had told the rail to look again. Narrowing the root to a
 * one-pixel band would fix the timing but makes correctness depend on the band
 * never being skipped between frames, which is exactly the sort of thing that
 * breaks under fast scrolling.
 *
 * IO is still used, for the one thing it is good at: gating. The listener is
 * attached only while the block is on screen, so an off-screen section costs
 * nothing.
 *
 * @param {HTMLElement}    container The Glide block wrapper.
 * @param {Array<Element>} steps     The step elements, in document order.
 * @param {Function}       onChange  Called with the new active index.
 * @return {Function} Teardown callback.
 */
export function observeActiveStep( container, steps, onChange ) {
	if ( steps.length === 0 ) {
		return () => {};
	}

	/**
	 * Where the browser parks a step when its anchor is followed.
	 *
	 * That is the scroller's scroll-padding-top plus the step's own
	 * scroll-margin-top, and both halves matter. WordPress sets
	 * `scroll-padding-top: 32px` on <html> whenever the admin bar is showing,
	 * and themes with a sticky header commonly set it too — so measuring only
	 * the step's margin puts the line above where the step actually lands, and
	 * a clicked entry never registers as current. It is measured rather than
	 * assumed for exactly that reason.
	 */
	const measureLine = () => {
		const scroller = document.scrollingElement || document.documentElement;
		// scroll-padding-top computes to "auto" when unset, which is NaN here.
		const padding =
			parseFloat( getComputedStyle( scroller ).scrollPaddingTop ) || 0;
		const margin =
			parseFloat( getComputedStyle( steps[ 0 ] ).scrollMarginTop ) || 0;

		return (
			padding + margin ||
			parseInt(
				getComputedStyle( container ).getPropertyValue(
					'--ghostlabs-glide-sticky-offset'
				),
				10
			) ||
			0
		);
	};

	let activeIndex = -1;
	let frame = null;
	let listening = false;

	const compute = () => {
		// ⚠️ **Measured on every pass, never cached.** The line moves without
		// the window resizing: a rail stuck above the steps (the phone strip,
		// the top bar) adds its own height to the steps' margin, and
		// chapters.js publishes that height after this observer starts, and
		// again whenever the rail resizes. A line measured once at init sat
		// a whole rail-height above where a jumped-to step lands, so tapping a
		// chapter left the previous one highlighted (2026-10-31).
		const line = measureLine();
		let index = 0;

		steps.forEach( ( step, i ) => {
			// The extra pixel absorbs subpixel rounding, which otherwise makes
			// a step jumped to by anchor miss its own line by a fraction.
			if ( step.getBoundingClientRect().top <= line + 1 ) {
				index = i;
			}
		} );

		if ( index !== activeIndex ) {
			activeIndex = index;
			onChange( index );
		}
	};

	const tick = () => {
		frame = null;
		compute();
	};

	const onScroll = () => {
		if ( frame === null ) {
			frame = window.requestAnimationFrame( tick );
		}
	};

	// The admin bar changes height at WordPress's mobile breakpoint, so a
	// resize can move the line with no scroll at all.
	const onResize = () => onScroll();

	const stopListening = () => {
		if ( ! listening ) {
			return;
		}
		listening = false;
		window.removeEventListener( 'scroll', onScroll );
		window.removeEventListener( 'resize', onResize );
		if ( frame !== null ) {
			window.cancelAnimationFrame( frame );
			frame = null;
		}
	};

	const gate = new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting ) {
					if ( ! listening ) {
						listening = true;
						window.addEventListener( 'scroll', onScroll, {
							passive: true,
						} );
						window.addEventListener( 'resize', onResize );
					}
					compute();
				} else {
					stopListening();
				}
			} );
		},
		{ threshold: 0 }
	);

	gate.observe( container );

	// Seed before the gate's first callback so nothing renders blank.
	compute();

	return () => {
		gate.disconnect();
		stopListening();
	};
}
