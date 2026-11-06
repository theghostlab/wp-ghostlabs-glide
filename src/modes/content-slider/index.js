import EmblaCarousel from 'embla-carousel';
import { SELECTORS, CLASSES } from '../../shared/constants.js';
import {
	setupEmbedControls,
	pauseEmbed,
	resumeEmbed,
} from '../../shared/embed-controls.js';
// ⚠️ **Which tween effects exist is per-edition data, not a list here.** This
// module is shared and some effects are only in some builds, so it asks
// `@edition/tweens.js` and gets back whatever this one compiled — real setups,
// or no-ops under the same keys.
//
// No-ops rather than missing keys, and that is the trap the map exists to avoid:
// this file reads the effects at import time and calls one at the first slide
// change, so an absent key is a TypeError that takes the whole slider down
// rather than dropping one effect.
import { TWEENS, TWEEN_PRELUDES } from '@edition/tweens.js';

// Read at the moment it matters, not once at import: a visitor who switches
// the setting mid-visit is honoured from the next slide change on.
const MOTION_QUERY = window.matchMedia( '(prefers-reduced-motion: reduce)' );
const reducedMotion = () => MOTION_QUERY.matches;

/**
 * Fills a server-translated template: `%1$d`/`%2$d`, then any bare `%d`, in
 * order. The templates come from Glide.php's `data-label-*` attributes, so the
 * strings a screen reader hears are in the site's language.
 *
 * @param {string}    template The translated template.
 * @param {...number} values   The numbers to substitute.
 * @return {string} The filled string.
 */
export function formatLabel( template, ...values ) {
	let next = 0;
	return String( template )
		.replace( /%(\d+)\$d/g, ( _, n ) =>
			String( values[ Number( n ) - 1 ] )
		)
		.replace( /%d/g, () => String( values[ next++ ] ) );
}

// Matches @wordpress/base-styles $break-medium (782px): the idiomatic
// touch-first cutoff (phones + tablets in portrait) where Embla's drag
// breaks down in fade mode because CSS pins transforms on the track/slides.
const MOBILE_QUERY = window.matchMedia( '(max-width: 781px)' );

// ⚠️ Must match the `@media (max-width: 37.5rem)` in `style.scss`, which shows
// one slide per view below it whatever Slides Per View says. Anything in this
// file that counts visible slides has to ask this, not the configured number.
const SINGLE_SLIDE_QUERY = window.matchMedia( '(max-width: 37.5rem)' );

export default function initContentSlider( container ) {
	const viewport = container.querySelector( SELECTORS.viewport );

	if ( ! viewport ) {
		return;
	}

	const config = JSON.parse( container.dataset.glideConfig || '{}' );
	const cleanups = [];

	// Must run before EmblaCarousel() — Embla measures slide positions at
	// init and only watches the container/viewport for size changes. A
	// later gap update widens only the inner track, which Embla never
	// re-observes, leaving slides 1+ offset by `gap` on their left edge.
	setupSlidesPerView( container, config );

	// Whatever an effect this edition ships needs before Embla measures —
	// Barn Doors centres the slides. Asked of the edition, never read here by
	// name, so a block saved elsewhere with an effect this build lacks gets
	// none of it.
	const tweenOptions = {};
	for ( const [ effect, prelude ] of Object.entries( TWEEN_PRELUDES ) ) {
		if ( config[ effect ] ) {
			Object.assign( tweenOptions, prelude( container, config ) );
		}
	}

	const isFadeMobile = !! config.fade && MOBILE_QUERY.matches;

	const embla = EmblaCarousel( viewport, {
		loop: config.loop ?? true,
		slidesToScroll: 1,
		containScroll: 'trimSnaps',
		dragFree: config.dragFree ?? false,
		// Embla core uses `duration` (default 25) for transition timing;
		// `speed` only exists on the auto-scroll plugin. Map our 1–20
		// "Speed" inspector value to duration inversely so higher = faster.
		duration: 30 - ( config.speed ?? 6 ),
		skipSnaps: false,
		align: 'start',
		watchDrag: ! isFadeMobile,
		...( config.slidesPerView > 1
			? {
					slidesToScroll: 1,
					containScroll: 'keepSnaps',
			  }
			: {} ),
		...tweenOptions,
	} );

	if ( config.slidesPerView <= 1 ) {
		if ( config.fade ) {
			setupFade( embla, container );
			cleanups.push( setupMobileSwipe( embla, container ) );
		}

		// Iterated rather than called by name. One effect may be on at a
		// time — the inspector enforces it — but a block saved in another
		// edition can arrive with one this build has no setup for, and a
		// lookup simply finds a no-op where a named call would have to be
		// guarded.
		// Under reduced motion the effects are not set up at all: each one
		// moves layers as the slide moves, which is the motion asked against.
		for ( const [ effect, setup ] of Object.entries( TWEENS ) ) {
			if ( config[ effect ] && ! reducedMotion() ) {
				setup( embla, container );
			}
		}
	}

	// Wired whenever the server rendered them, which includes the
	// focus-only arrows it adds when no other navigation is configured.
	cleanups.push( setupArrows( embla, container ) );

	if ( config.showArrows ) {
		if ( config.showThumbnails ) {
			const pos = config.thumbnailPosition ?? 'bottom';
			if ( pos === 'top' || pos === 'bottom' ) {
				cleanups.push( setupArrowAlignment( container ) );
			}
		}
	}

	if ( config.navigation === 'dots' ) {
		setupDots( embla, container );
	} else if ( config.navigation === 'progress' ) {
		setupProgressBar( embla, container );
	}

	let thumbEmbla = null;
	if ( config.showThumbnails ) {
		thumbEmbla = setupThumbnails( embla, container );
	}

	let autoAdvancing = false;
	let autoplayControl = null;

	// ⚠️ The reduced-motion check belongs INSIDE setupAutoplay, not here.
	//
	// Glide.php emits the pause button whenever autoplay is enabled — it renders
	// server-side and cannot know the visitor's motion preference. Skipping setup
	// here therefore left a reduced-motion visitor with a focusable button
	// labelled "Pause" and no click handler on it at all: a control that
	// announces itself to a screen reader and does nothing.
	//
	// So autoplay is always wired, and starts *paused* under reduced motion.
	// Nothing moves unless the visitor asks it to, and the button that offers
	// that is real. Every mode with a pause control follows the same rule.
	if ( config.autoplay ) {
		autoplayControl = setupAutoplay(
			embla,
			container,
			config.autoplayInterval ?? 5000,
			() => {
				autoAdvancing = true;
			}
		);
	}

	cleanups.push( setupVideoPlayback( embla, container, autoplayControl ) );
	setupEmbedControls( container );

	setupLiveRegion(
		embla,
		container,
		() => autoAdvancing,
		() => {
			autoAdvancing = false;
		}
	);

	cleanups.push(
		setupInertSlides(
			embla,
			container,
			!! config.fade,
			config.slidesPerView ?? 1,
			config.loop ?? true
		)
	);
	cleanups.push( setupKeyboardNav( embla, container ) );

	container.classList.add( CLASSES.ready );

	embla.on( 'pointerDown', () =>
		container.classList.add( CLASSES.dragging )
	);
	embla.on( 'pointerUp', () =>
		container.classList.remove( CLASSES.dragging )
	);

	return () => {
		cleanups.forEach( ( fn ) => fn?.() );
		if ( autoplayControl ) {
			autoplayControl.stop();
		}
		if ( thumbEmbla ) {
			thumbEmbla.destroy();
		}
		embla.destroy();
		container.classList.remove( CLASSES.ready );
	};
}

function setupArrows( embla, container ) {
	const prevBtn = container.querySelector( SELECTORS.arrowPrev );
	const nextBtn = container.querySelector( SELECTORS.arrowNext );

	if ( ! prevBtn || ! nextBtn ) {
		return;
	}

	// ⚠️ aria-disabled, not disabled: a natively disabled button drops focus to
	// the document, so pressing Next onto the last slide left a keyboard user
	// nowhere. The button keeps focus and simply does nothing.
	const onPrev = () => {
		if ( prevBtn.getAttribute( 'aria-disabled' ) !== 'true' ) {
			embla.scrollPrev( reducedMotion() );
		}
	};
	const onNext = () => {
		if ( nextBtn.getAttribute( 'aria-disabled' ) !== 'true' ) {
			embla.scrollNext( reducedMotion() );
		}
	};

	prevBtn.addEventListener( 'click', onPrev );
	nextBtn.addEventListener( 'click', onNext );

	const updateButtons = () => {
		prevBtn.setAttribute(
			'aria-disabled',
			embla.canScrollPrev() ? 'false' : 'true'
		);
		nextBtn.setAttribute(
			'aria-disabled',
			embla.canScrollNext() ? 'false' : 'true'
		);
	};

	embla.on( 'select', updateButtons );
	embla.on( 'init', updateButtons );

	return () => {
		prevBtn.removeEventListener( 'click', onPrev );
		nextBtn.removeEventListener( 'click', onNext );
	};
}

function setupArrowAlignment( container ) {
	const viewport = container.querySelector( SELECTORS.viewport );
	const arrows = container.querySelectorAll(
		SELECTORS.arrowPrev + ',' + SELECTORS.arrowNext
	);

	if ( ! viewport || arrows.length === 0 ) {
		return;
	}

	const update = () => {
		const top = viewport.offsetTop + viewport.offsetHeight / 2;
		arrows.forEach( ( arrow ) => {
			arrow.style.top = `${ top }px`;
		} );
	};

	const observer = new ResizeObserver( update );
	observer.observe( container );
	update();

	return () => observer.disconnect();
}

function setupDots( embla, container ) {
	const dotsContainer = container.querySelector( SELECTORS.dots );
	if ( ! dotsContainer ) {
		return;
	}

	const dotTemplate = container.dataset.labelDot || 'Go to slide %d';

	const buildDots = () => {
		const scrollSnaps = embla.scrollSnapList();
		dotsContainer.innerHTML = '';

		scrollSnaps.forEach( ( _, index ) => {
			const dot = document.createElement( 'button' );
			dot.className = 'ghostlabs-glide__dot';
			dot.setAttribute( 'type', 'button' );
			dot.setAttribute(
				'aria-label',
				formatLabel( dotTemplate, index + 1 )
			);
			dot.addEventListener( 'click', () =>
				embla.scrollTo( index, reducedMotion() )
			);
			dotsContainer.appendChild( dot );
		} );

		updateDots();

		requestAnimationFrame( () => {
			const height = dotsContainer.offsetHeight;
			container.style.setProperty(
				'--ghostlabs-glide-dots-height',
				`${ height }px`
			);
		} );
	};

	const updateDots = () => {
		const selected = embla.selectedScrollSnap();
		const dots = dotsContainer.querySelectorAll( '.ghostlabs-glide__dot' );
		dots.forEach( ( dot, index ) => {
			const isActive = index === selected;
			dot.classList.toggle( CLASSES.active, isActive );
			if ( isActive ) {
				dot.setAttribute( 'aria-current', 'true' );
			} else {
				dot.removeAttribute( 'aria-current' );
			}
		} );
	};

	embla.on( 'init', buildDots );
	embla.on( 'reInit', buildDots );
	embla.on( 'select', updateDots );
}

function setupProgressBar( embla, container ) {
	const progressBar = container.querySelector(
		'.ghostlabs-glide__progress-bar'
	);
	if ( ! progressBar ) {
		return;
	}

	const updateProgress = () => {
		const progress = Math.max( 0, Math.min( 1, embla.scrollProgress() ) );
		progressBar.style.transform = `scaleX(${ progress })`;
		progressBar.setAttribute(
			'aria-valuenow',
			Math.round( progress * 100 )
		);
	};

	embla.on( 'init', updateProgress );
	embla.on( 'scroll', updateProgress );
	embla.on( 'reInit', updateProgress );
}

function setupThumbnails( embla, container ) {
	const thumbsContainer = container.querySelector( SELECTORS.thumbs );
	if ( ! thumbsContainer ) {
		return null;
	}

	const thumbViewport = container.querySelector( SELECTORS.thumbsViewport );
	if ( ! thumbViewport ) {
		return null;
	}

	const isVertical = thumbsContainer.dataset.thumbsAxis === 'y';

	const emblaThumb = EmblaCarousel( thumbViewport, {
		containScroll: 'keepSnaps',
		dragFree: true,
		axis: isVertical ? 'y' : 'x',
		...( reducedMotion() ? { duration: 0 } : {} ),
	} );

	const thumbSlides = container.querySelectorAll( SELECTORS.thumbSlide );
	const buttons = Array.from( thumbSlides )
		.map( ( slide ) => slide.querySelector( 'button' ) )
		.filter( Boolean );

	buttons.forEach( ( button, index ) => {
		button.addEventListener( 'click', () => {
			embla.scrollTo( index, reducedMotion() );
		} );
	} );

	const updateSelected = () => {
		const selected = embla.selectedScrollSnap();
		thumbSlides.forEach( ( thumbSlide, index ) => {
			thumbSlide.classList.toggle(
				CLASSES.thumbSelected,
				index === selected
			);
		} );
		buttons.forEach( ( button, index ) => {
			const isActive = index === selected;
			button.setAttribute( 'tabindex', isActive ? '0' : '-1' );
			if ( isActive ) {
				button.setAttribute( 'aria-current', 'true' );
			} else {
				button.removeAttribute( 'aria-current' );
			}
		} );
		emblaThumb.scrollTo( selected );
	};

	const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
	const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

	thumbsContainer.addEventListener( 'keydown', ( e ) => {
		let targetIndex = null;

		if ( e.key === nextKey ) {
			e.preventDefault();
			const current = embla.selectedScrollSnap();
			targetIndex = ( current + 1 ) % buttons.length;
		} else if ( e.key === prevKey ) {
			e.preventDefault();
			const current = embla.selectedScrollSnap();
			targetIndex = ( current - 1 + buttons.length ) % buttons.length;
		} else if ( e.key === 'Home' ) {
			e.preventDefault();
			targetIndex = 0;
		} else if ( e.key === 'End' ) {
			e.preventDefault();
			targetIndex = buttons.length - 1;
		}

		if ( targetIndex !== null ) {
			embla.scrollTo( targetIndex, reducedMotion() );
			buttons[ targetIndex ].focus();
		}
	} );

	embla.on( 'select', updateSelected );
	embla.on( 'init', updateSelected );
	embla.on( 'reInit', updateSelected );

	return emblaThumb;
}

function setupAutoplay( embla, container, interval, onAutoAdvance ) {
	let timer = null;

	// Starts paused when the visitor has asked for reduced motion. `play()`
	// early-returns while this is true, so `embla.on( 'init', play )` and the
	// hover/focus handlers below all become no-ops without any of them needing
	// to know why — and the pause button stays a working control that can turn
	// autoplay on for someone who wants it.
	let userPaused = reducedMotion();

	const pauseBtn = container.querySelector( SELECTORS.pauseToggle );

	const setButtonState = ( paused ) => {
		if ( ! pauseBtn ) {
			return;
		}
		pauseBtn.dataset.state = paused ? 'paused' : 'playing';
		pauseBtn.setAttribute(
			'aria-label',
			paused ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause
		);
	};

	const play = () => {
		stop();
		if ( userPaused ) {
			return;
		}
		timer = setInterval( () => {
			onAutoAdvance();
			if ( embla.canScrollNext() ) {
				embla.scrollNext( reducedMotion() );
			} else {
				embla.scrollTo( 0, reducedMotion() );
			}
		}, interval );
	};

	const stop = () => {
		if ( timer ) {
			clearInterval( timer );
			timer = null;
		}
	};

	const onPauseClick = () => {
		userPaused = ! userPaused;
		if ( userPaused ) {
			stop();
		} else {
			play();
		}
		setButtonState( userPaused );
	};

	if ( pauseBtn ) {
		pauseBtn.addEventListener( 'click', onPauseClick );
	}

	// The server rendered this as playing, because it had no way to know. Correct
	// it before anything is announced, so the label matches what will happen when
	// the button is pressed.
	setButtonState( userPaused );

	const root = embla.rootNode();

	// ⚠️ The pointer leaving is not a reason to resume while keyboard focus is
	// still inside a slide: the next advance would make the focused slide
	// inert and drop focus to the document.
	const onMouseLeave = () => {
		if ( ! root.contains( root.ownerDocument.activeElement ) ) {
			play();
		}
	};
	root.addEventListener( 'mouseenter', stop );
	root.addEventListener( 'mouseleave', onMouseLeave );
	root.addEventListener( 'focusin', stop );
	root.addEventListener( 'focusout', play );

	embla.on( 'pointerDown', stop );
	embla.on( 'init', play );

	return {
		stop,
		play,
		destroy() {
			stop();
			if ( pauseBtn ) {
				pauseBtn.removeEventListener( 'click', onPauseClick );
			}
			root.removeEventListener( 'mouseenter', stop );
			root.removeEventListener( 'mouseleave', onMouseLeave );
			root.removeEventListener( 'focusin', stop );
			root.removeEventListener( 'focusout', play );
		},
	};
}

function pauseSlideMedia( slide ) {
	slide?.querySelectorAll( 'video' ).forEach( ( v ) => {
		if ( ! v.paused ) {
			v.dataset.wasPlaying = '1';
			v.pause();
		}
	} );
	pauseEmbed( slide );
}

function resumeSlideMedia( slide ) {
	// Under reduced motion only a video the visitor themself started comes
	// back; an autoplaying one stays on its poster until they press play.
	const autoplayAllowed = ! reducedMotion();
	slide?.querySelectorAll( 'video' ).forEach( ( v ) => {
		if ( ( v.autoplay && autoplayAllowed ) || v.dataset.wasPlaying ) {
			delete v.dataset.wasPlaying;
			v.play().catch( () => {} );
		}
	} );
	if ( autoplayAllowed ) {
		resumeEmbed( slide );
	}
}

/**
 * Stops every background video in the slider without recording it as having
 * been playing, so nothing resumes it on its own. Used when the visitor has
 * asked for reduced motion: the videos keep their controls, so anyone who
 * wants one can still play it.
 *
 * @param {HTMLElement} container The slider.
 */
export function holdBackgroundMotion( container ) {
	container.querySelectorAll( SELECTORS.slide ).forEach( ( slide ) => {
		slide.querySelectorAll( 'video' ).forEach( ( v ) => v.pause() );
		pauseEmbed( slide );
	} );
}

function setupVideoPlayback( embla, container, autoplayControl ) {
	const slides = container.querySelectorAll( SELECTORS.slide );
	if ( ! slides.length ) {
		return;
	}

	let previousIndex = embla.selectedScrollSnap();

	embla.on( 'select', () => {
		const current = embla.selectedScrollSnap();
		if ( current !== previousIndex ) {
			pauseSlideMedia( slides[ previousIndex ] );
			resumeSlideMedia( slides[ current ] );
			previousIndex = current;
		}
	} );

	embla.on( 'init', () => {
		const selected = embla.selectedScrollSnap();
		slides.forEach( ( slide, i ) => {
			if ( i !== selected ) {
				pauseSlideMedia( slide );
			}
		} );
		// ⚠️ A looping background video is motion the visitor asked not to
		// have (WCAG 2.2.2 and the motion preference): it starts paused, on its
		// poster, with its controls still there to play it.
		if ( reducedMotion() ) {
			holdBackgroundMotion( container );
		}
	} );

	// ⚠️ A player that loads after start-up never heard the pause sent then:
	// the iframes are lazy, and a message to a player that is not listening is
	// dropped. So an embed in a slide that is not showing is paused when it
	// actually loads, rather than left playing out of sight under a control
	// reading "Play". (Reduced motion is held earlier, in the URL itself —
	// `holdAutoplay()`.)
	slides.forEach( ( slide, i ) => {
		slide
			.querySelectorAll( 'iframe[data-provider]' )
			.forEach( ( iframe ) => {
				iframe.addEventListener( 'load', () => {
					if ( i !== embla.selectedScrollSnap() || reducedMotion() ) {
						pauseEmbed( slide );
					}
				} );
			} );
	} );

	if ( ! autoplayControl ) {
		return;
	}

	const onPlay = ( e ) => {
		if ( e.target.matches?.( 'video' ) ) {
			autoplayControl.stop();
		}
	};
	const onPause = ( e ) => {
		if ( e.target.matches?.( 'video' ) ) {
			autoplayControl.play();
		}
	};
	const onEnded = ( e ) => {
		if ( e.target.matches?.( 'video' ) ) {
			autoplayControl.play();
		}
	};

	container.addEventListener( 'play', onPlay, true );
	container.addEventListener( 'pause', onPause, true );
	container.addEventListener( 'ended', onEnded, true );

	return () => {
		container.removeEventListener( 'play', onPlay, true );
		container.removeEventListener( 'pause', onPause, true );
		container.removeEventListener( 'ended', onEnded, true );
	};
}

function setupLiveRegion(
	embla,
	container,
	isAutoAdvancing,
	clearAutoAdvancing
) {
	const region = container.querySelector( '.ghostlabs-glide__live-region' );
	if ( ! region ) {
		return;
	}

	const total = embla.scrollSnapList().length;
	const template = container.dataset.labelStatus || 'Slide %1$d of %2$d';

	embla.on( 'select', () => {
		if ( isAutoAdvancing() ) {
			clearAutoAdvancing();
			return;
		}
		const current = embla.selectedScrollSnap() + 1;
		region.textContent = formatLabel( template, current, total );
	} );
}

function setupFade( embla, container ) {
	const slides = container.querySelectorAll( SELECTORS.slide );
	const isAutoHeight = container.classList.contains( 'is-auto-height' );
	const isLoop = embla.internalEngine().options.loop;

	const applyFade = () => {
		const selected = embla.selectedScrollSnap();

		slides.forEach( ( slide, index ) => {
			const isActive = index === selected;
			slide.style.opacity = isActive ? '1' : '0';
			slide.style.pointerEvents = isActive ? 'auto' : 'none';

			if ( isLoop && ! isAutoHeight ) {
				slide.style.position = 'absolute';
				slide.style.inset = '0';
			}
		} );
	};

	embla.on( 'select', applyFade );
	embla.on( 'init', applyFade );
	embla.on( 'reInit', applyFade );

	if ( isLoop && ! isAutoHeight ) {
		embla.on( 'scroll', () => {
			slides.forEach( ( slide ) => {
				slide.style.transform = '';
			} );
		} );
	}

	const track = container.querySelector( SELECTORS.track );
	if ( track ) {
		track.style.position = 'relative';
	}
}

// Fade mode pins `transform: none` on the track/slides to keep the stacked
// absolute-positioned slides from being moved by Embla's looper. That also
// breaks Embla's drag on touch devices. Replace it with a simple swipe
// detector on mobile only, and hot-swap on viewport crossings.
function setupMobileSwipe( embla, container ) {
	const viewport = container.querySelector( SELECTORS.viewport );
	if ( ! viewport ) {
		return;
	}

	let enabled = MOBILE_QUERY.matches;
	let startX = 0;
	let startY = 0;
	const THRESHOLD = 50;

	const onTouchStart = ( e ) => {
		if ( ! enabled ) {
			return;
		}
		startX = e.touches[ 0 ].clientX;
		startY = e.touches[ 0 ].clientY;
	};

	const onTouchEnd = ( e ) => {
		if ( ! enabled ) {
			return;
		}
		const touch = e.changedTouches[ 0 ];
		const dx = touch.clientX - startX;
		const dy = touch.clientY - startY;

		if ( Math.abs( dx ) < Math.abs( dy ) ) {
			return;
		}
		if ( Math.abs( dx ) < THRESHOLD ) {
			return;
		}

		if ( dx > 0 ) {
			embla.scrollPrev( reducedMotion() );
		} else {
			embla.scrollNext( reducedMotion() );
		}
	};

	const onMediaChange = ( e ) => {
		enabled = e.matches;
		embla.reInit( { watchDrag: ! e.matches } );
	};

	viewport.addEventListener( 'touchstart', onTouchStart, { passive: true } );
	viewport.addEventListener( 'touchend', onTouchEnd, { passive: true } );
	MOBILE_QUERY.addEventListener( 'change', onMediaChange );

	return () => {
		viewport.removeEventListener( 'touchstart', onTouchStart );
		viewport.removeEventListener( 'touchend', onTouchEnd );
		MOBILE_QUERY.removeEventListener( 'change', onMediaChange );
	};
}

function setupKeyboardNav( embla, container ) {
	// The role, name and role description are rendered by the server, in the
	// site's language (Glide.php). Only the tab stop is added here, because it
	// is useful only once the arrow keys below are wired.
	container.setAttribute( 'tabindex', '0' );

	const onKeydown = ( e ) => {
		if ( e.target !== container ) {
			return;
		}
		if ( e.key === 'ArrowLeft' ) {
			e.preventDefault();
			embla.scrollPrev( reducedMotion() );
		} else if ( e.key === 'ArrowRight' ) {
			e.preventDefault();
			embla.scrollNext( reducedMotion() );
		}
	};

	container.addEventListener( 'keydown', onKeydown );

	return () => {
		container.removeEventListener( 'keydown', onKeydown );
	};
}

// Mark slides outside the visible set as `inert` so AT and keyboard users
// don't traverse hidden content. Compute the visible set deterministically
// from selectedScrollSnap + slidesPerView (with loop wrapping) — Embla's
// slidesInView() is driven by an async IntersectionObserver that has been
// observed to return both stale and over-inclusive sets at init time
// (especially in loop mode with slidesPerView > 1), inverting or nullifying
// the inert assignment.
//
// ⚠️ The window is the number of slides actually on screen, which on a narrow
// viewport is one whatever was configured. Counting the configured number
// there left the next slides un-inert while off screen, so a keyboard user
// tabbed into slides they could not see.
export function setupInertSlides(
	embla,
	container,
	isFade,
	slidesPerView,
	isLoop
) {
	const slides = container.querySelectorAll( SELECTORS.slide );
	if ( ! slides.length ) {
		return undefined;
	}
	const slideCount = slides.length;

	const update = () => {
		const perView = SINGLE_SLIDE_QUERY.matches
			? 1
			: Math.max( 1, slidesPerView );
		const selected = embla.selectedScrollSnap();
		const visible = new Set();

		if ( isFade || perView === 1 ) {
			visible.add( selected );
		} else {
			// align: 'start' (default) — visible window is [selected,
			// selected+perView). Loop mode wraps; non-loop clamps.
			for ( let offset = 0; offset < perView; offset++ ) {
				const raw = selected + offset;
				const idx = isLoop ? raw % slideCount : raw;
				if ( idx >= 0 && idx < slideCount ) {
					visible.add( idx );
				}
			}
		}

		slides.forEach( ( slide, i ) => {
			slide.toggleAttribute( 'inert', ! visible.has( i ) );
		} );
	};

	embla.on( 'init', update );
	embla.on( 'reInit', update );
	embla.on( 'select', update );
	SINGLE_SLIDE_QUERY.addEventListener( 'change', update );

	update();

	return () => SINGLE_SLIDE_QUERY.removeEventListener( 'change', update );
}

/**
 * Publishes slides-per-view and the gap to the stylesheet.
 *
 * ⚠️ **The gap applies at one slide per view too.** It used to be set only
 * above one, so at one per view slides touched mid-swipe whatever Gap said, and
 * only one tween effect set it for itself. At rest one-per-view hides it — the
 * track's negative margin and the slide's padding cancel — so it shows exactly
 * where it can: between slides as they move.
 *
 * @param {HTMLElement} container The slider's wrapper.
 * @param {Object}      config    The block's parsed slider config.
 */
export function setupSlidesPerView( container, config ) {
	const slidesPerView = config.slidesPerView ?? 1;
	const gap = config.gap ?? 0;

	if ( slidesPerView > 1 ) {
		container.style.setProperty(
			'--ghostlabs-glide-slides-per-view',
			slidesPerView
		);
	}

	if ( gap > 0 ) {
		container.style.setProperty( '--ghostlabs-glide-gap', `${ gap }px` );
	}
}
