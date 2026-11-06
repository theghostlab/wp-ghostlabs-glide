/**
 * Lazy initialization utility using IntersectionObserver.
 * Defers module loading and initialization until the element is near the viewport.
 *
 * The init function may return a destroy callback, which is stored on
 * element._glideDestroy for external cleanup.
 *
 * @param {HTMLElement} element  - The element to observe.
 * @param {Function}    loaderFn - A function that returns a dynamic import() promise.
 */
export function lazyInit( element, loaderFn ) {
	let started = false;
	const load = () => {
		if ( started ) {
			return;
		}
		started = true;
		element.removeEventListener( 'focusin', load );
		loaderFn()
			.then( ( module ) => {
				const destroy = module.default( element );
				if ( typeof destroy === 'function' ) {
					element._glideDestroy = destroy;
				}
			} )
			.catch( () => {} );
	};

	if ( ! ( 'IntersectionObserver' in window ) ) {
		load();
		return;
	}

	const observer = new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting ) {
					observer.unobserve( element );
					load();
				}
			} );
		},
		{ rootMargin: '200px' }
	);

	observer.observe( element );

	// Focus can arrive before the element is anywhere near the viewport — a
	// keyboard user tabbing down the page. The block initialises at once then,
	// rather than being used half-built.
	element.addEventListener( 'focusin', load );
}
