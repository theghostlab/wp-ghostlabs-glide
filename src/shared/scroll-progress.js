/**
 * Publishes an element's scroll progress as a CSS custom property.
 *
 * IntersectionObserver reports visibility, not position, so patterns that need
 * to know *how far* through a section the reader is — the horizontal pin's
 * track offset, the card stack's transform falloff — cannot use it. This is
 * the alternative: a requestAnimationFrame loop that IO switches on only while
 * the element is on screen, writing `--ghostlabs-glide-progress` (0→1) so CSS
 * owns the transform.
 *
 * The idea is lifted from `prop-for-that` (see _plans/research); the library
 * itself was not, since two custom properties do not justify a third runtime
 * animation system alongside Embla and GSAP.
 *
 * Progress is 0 when the element's top reaches the top of the viewport and 1
 * when its bottom does — i.e. across the distance it can scroll while pinned.
 *
 * @param {HTMLElement} element  The element whose scroll position is tracked.
 * @param {HTMLElement} [target] Element the property is written to; defaults to
 *                               `element`.
 * @return {Function} Teardown callback.
 */
export function trackScrollProgress( element, target = element ) {
	let frame = null;
	let running = false;
	let last = -1;

	const write = () => {
		const rect = element.getBoundingClientRect();

		// The scrollable distance is the element's own height less one
		// viewport — the part that passes under a pinned viewport. A section
		// shorter than the viewport has nothing to scrub, so it reads as 0.
		const distance = rect.height - window.innerHeight;
		const progress =
			distance > 0
				? Math.min( 1, Math.max( 0, -rect.top / distance ) )
				: 0;

		// Two decimal places is finer than a pixel at any realistic size, and
		// skipping identical writes keeps this off the style-recalc path while
		// the reader is stationary.
		const rounded = Math.round( progress * 100 ) / 100;
		if ( rounded !== last ) {
			last = rounded;
			target.style.setProperty(
				'--ghostlabs-glide-progress',
				String( rounded )
			);
		}
	};

	const tick = () => {
		if ( ! running ) {
			return;
		}
		write();
		frame = window.requestAnimationFrame( tick );
	};

	const start = () => {
		if ( running ) {
			return;
		}
		running = true;
		tick();
	};

	const stop = () => {
		running = false;
		if ( frame !== null ) {
			window.cancelAnimationFrame( frame );
			frame = null;
		}
	};

	// The gate: nothing ticks while the section is off screen.
	const observer = new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) =>
				entry.isIntersecting ? start() : stop()
			);
		},
		{ threshold: 0 }
	);

	observer.observe( element );

	return () => {
		stop();
		observer.disconnect();
		target.style.removeProperty( '--ghostlabs-glide-progress' );
	};
}
