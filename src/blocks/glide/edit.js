import { createBlock, parse } from '@wordpress/blocks';
import { __, sprintf } from '@wordpress/i18n';
import { speak } from '@wordpress/a11y';
import {
	InnerBlocks,
	InspectorControls,
	BlockControls,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	useSelect,
	useDispatch,
	select as globalSelect,
} from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { useMergeRefs } from '@wordpress/compose';
import {
	Notice,
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
	ToolbarGroup,
	ToolbarButton,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { chevronLeft, chevronRight } from '@wordpress/icons';

import './editor.scss';
import { insertSlideBlock } from './_utils/block.js';
import {
	isCoverBlockEmpty,
	isImageBlockEmpty,
	extractThumbnailUrl,
	extractStepTitle,
} from './_utils/block-helpers.js';
import { layoutHasMarker } from '../_shared/marker.js';
import { MARKERS } from '@edition/markers.js';

// This edition's marker vocabulary, in the order a block is tested against it.
// A pasted block carrying a marker this edition does not know resolves to none,
// and renders as the plain step stack, as it does on the page.
const MARKER_CLASSES = Object.values( MARKERS );
import { LayoutThumbnail } from './_utils/layout-thumbnails.js';
import { attributesForMode } from './_utils/mode-change.js';
import { offersAccessibleName } from './_utils/accessible-name.js';
import { LAYOUT_CHOICES } from '@edition/layouts.js';
import {
	MODE_OPTIONS,
	MODE_MODIFIERS,
	modeStyleVars,
	modeClassNames,
	applyModeTemplateSwap,
} from '@edition/modes.js';
import { MODE_PANELS, TWEEN_OPTIONS } from '@edition/mode-panels.js';
// The edition's upsell slots in the sidebar: a panel last, and a notice under
// Mode and under the tween toggles. An edition with nothing to sell renders
// nothing in all three.
import {
	UpsellPanel,
	ModeUpsellNotice,
	TweensUpsellNotice,
} from '@edition/upsell.js';
import {
	STICKY_LAYOUT_PANELS,
	StickyLayoutPreview,
	stickyLayoutAllowedChildren,
	stickyLayoutClassNames,
	stickyLayoutStyleVars,
} from '@edition/sticky-layouts.js';

/**
 * Layout picker for a block with nothing in it yet.
 *
 * Inserting Glide used to seed a content-slider slide and leave the four
 * scrollytelling layouts reachable only from the global inserter — so the way
 * to get one was to abandon the block you had just made and drag a pattern in
 * beside it, which left the empty one behind. Picking a sticky layout here
 * *replaces this block* with the pattern's own, so there is only ever one.
 *
 * @param {Object}   props               Component props.
 * @param {Array}    props.choices       The layouts to offer, already filtered
 *                                       by entitlement.
 * @param {Function} props.onPickMode    Called with the choice for a plain mode.
 * @param {Function} props.onPickPattern Called with the choice and the
 *                                       registered pattern, which may be
 *                                       undefined if it is not registered.
 * @return {Element} The picker.
 */
function GlideLayoutPicker( { choices, onPickMode, onPickPattern } ) {
	// Registered patterns have moved between stores across WordPress versions,
	// and @wordpress/block-editor is a runtime external here rather than a
	// dependency we can pin — so both homes are tried and a miss is survivable
	// (see pickPattern, which does nothing when the pattern is missing).
	//
	// ⚠️ Both of these are *unfiltered* pattern lists, and must stay so. Every
	// pattern registers with `inserter: true` today, but the block-editor
	// store's own pattern selectors — __experimentalGetAllowedPatterns and
	// friends — filter on `inserter` and on the block context, so swapping
	// either line for one of those can hide a registered pattern from this
	// picker, and a missed pattern makes its card do nothing at all, with
	// nothing logged anywhere.
	const { patterns, patternsLoaded } = useSelect( ( select ) => {
		const core = select( 'core' );
		const fromCore = core?.getBlockPatterns?.();

		// ⚠️ `getBlockPatterns()` resolves over REST, so it answers `[]` for a
		// moment after the editor loads. A sticky card clicked in that window
		// found no pattern and did nothing at all, and the author saw no
		// response. Until it has resolved, the sticky cards are disabled.
		// Where the core store has no such selector there is nothing to wait
		// for.
		const loaded = core?.getBlockPatterns
			? !! core.hasFinishedResolution?.( 'getBlockPatterns' )
			: true;

		if ( fromCore?.length ) {
			return { patterns: fromCore, patternsLoaded: loaded };
		}
		return {
			patterns:
				select( 'core/block-editor' ).getSettings()
					?.__experimentalBlockPatterns || [],
			patternsLoaded: loaded,
		};
	}, [] );

	return (
		<div className="ghostlabs-glide__layout-picker">
			<p className="ghostlabs-glide__layout-picker-title">
				{ __( 'Glide', 'ghostlabs-glide' ) }
			</p>
			<p className="ghostlabs-glide__layout-picker-instructions">
				{ __(
					'Choose a layout. Every one of these is editable afterwards, and the mode can still be changed in the sidebar.',
					'ghostlabs-glide'
				) }
			</p>
			<div className="ghostlabs-glide__layout-picker-grid">
				{ choices.map( ( choice ) => (
					// A plain button rather than <Button>: this is a card with
					// a diagram and two lines of text, and components-button
					// brings a height, a centred single line and its own hover
					// colours that all have to be undone first.
					<button
						key={ choice.key }
						type="button"
						className="ghostlabs-glide__layout-choice"
						// aria-disabled rather than disabled: a natively disabled
						// card drops out of the tab order with no explanation
						// while the patterns load.
						aria-disabled={
							!! choice.pattern && ! patternsLoaded
								? 'true'
								: undefined
						}
						onClick={ () => {
							if ( choice.pattern && ! patternsLoaded ) {
								return;
							}
							if ( choice.pattern ) {
								onPickPattern(
									choice,
									patterns.find(
										( p ) => p.name === choice.pattern
									)
								);
							} else {
								onPickMode( choice );
							}
						} }
					>
						<LayoutThumbnail
							layout={ choice.key }
							className="ghostlabs-glide__layout-choice-thumb"
						/>
						<span className="ghostlabs-glide__layout-choice-label">
							{ choice.label }
						</span>
						<span className="ghostlabs-glide__layout-choice-description">
							{ choice.description }
						</span>
					</button>
				) ) }
			</div>
		</div>
	);
}

const VERTICAL_ALIGN_TO_JUSTIFY = {
	top: 'flex-start',
	center: 'center',
	bottom: 'flex-end',
};

const COVER_TEMPLATE = [
	'core/cover',
	{ minHeight: 100, minHeightUnit: '%', dimRatio: 50 },
	[
		[
			'core/heading',
			{ level: 2, placeholder: __( 'Slide title', 'ghostlabs-glide' ) },
		],
		[
			'core/paragraph',
			{ placeholder: __( 'Slide description', 'ghostlabs-glide' ) },
		],
	],
];

export default function Edit( { clientId, attributes, setAttributes } ) {
	// Only the modes this file renders panels for are destructured. Anything an
	// edition adds reaches its own config through `attributes`, which is what
	// `MODE_PANELS` is handed — a name here would be a mode this build might
	// not have.
	const { mode, contentSlider, stickyScroll } = attributes;

	// The panel this edition supplies for the current mode, if it supplies one.
	// Resolved to a component here rather than at the JSX site so the render
	// reads as "the edition's panel, if any" and not as a lookup.
	const EditionModePanel = MODE_PANELS[ mode ];

	// The pattern's marker class is read straight off this block's own
	// className — there is no attribute behind it. Descendants find it by
	// walking ancestors instead; see _shared/marker.js and use-glide-pattern.js.
	const isStickyChapters = layoutHasMarker(
		attributes,
		MARKERS.stickyChapters
	);

	// 🔴 **The marker itself, not a flag per layout.** This resolved one boolean
	// per sticky layout and branched on each, which meant the shared editor
	// naming layouts only some editions ship and compiling a panel for every
	// one of them. Resolving to the marker and handing that to `@edition` keeps
	// the vocabulary here — a pasted block carries one of these and has to
	// render — without this file knowing what any of them looks like.
	const stickyMarker =
		MARKER_CLASSES.find( ( marker ) =>
			layoutHasMarker( attributes, marker )
		) ?? '';

	const sliderRef = useRef( null );
	// Derived from `mode` on every render, never held in state. It was state,
	// set only by the Mode select, so picking a layout from the card grid,
	// undo and redo all changed the mode and left the old modifier class on
	// the canvas wrapper.
	const modifier = MODE_MODIFIERS[ mode ];

	// ⚠️ **Full width is set where a mode is chosen, never by an effect.** An
	// effect backfilled `align: 'full'` whenever the attribute was empty, and the
	// block declares no default alignment, so the toolbar's "None" — which
	// clears the attribute — was put back to full on the next render, and a
	// content-width slider could not be made at all. `pickMode()` and the Mode
	// select set it instead, once, when the author picks the mode.

	const childBlocks = useSelect(
		( select ) => select( 'core/block-editor' ).getBlocks( clientId ),
		[ clientId ]
	);

	const {
		selectBlock,
		moveBlockToPosition,
		insertBlock,
		removeBlock,
		replaceBlock,
		replaceInnerBlocks,
	} = useDispatch( 'core/block-editor' );

	const hasOverlay = childBlocks.some(
		( b ) => b.name === 'ghostlabs/glide-overlay'
	);

	useEffect( () => {
		if ( ! hasOverlay ) {
			return;
		}
		const overlayIndex = childBlocks.findIndex(
			( b ) => b.name === 'ghostlabs/glide-overlay'
		);
		if ( overlayIndex > 0 ) {
			moveBlockToPosition(
				childBlocks[ overlayIndex ].clientId,
				clientId,
				clientId,
				0
			);
		}
	}, [ childBlocks, hasOverlay, clientId, moveBlockToPosition ] );

	useEffect( () => {
		if ( mode !== 'contentSlider' ) {
			return;
		}
		if ( ! contentSlider.showThumbnails || ! contentSlider.showArrows ) {
			return;
		}

		const pos = contentSlider.thumbnailPosition || 'bottom';
		if ( pos !== 'top' && pos !== 'bottom' ) {
			return;
		}

		const wrapper = sliderRef.current;
		if ( ! wrapper ) {
			return;
		}

		const viewport = wrapper.querySelector( '.block-editor-inner-blocks' );
		const arrows = wrapper.querySelectorAll( '.ghostlabs-glide__arrow' );
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
		observer.observe( wrapper );
		update();

		return () => {
			observer.disconnect();
			arrows.forEach( ( arrow ) => {
				arrow.style.top = '';
			} );
		};
	}, [
		mode,
		contentSlider.showThumbnails,
		contentSlider.showArrows,
		contentSlider.thumbnailPosition,
	] );

	const getAllowedChildren = () => {
		if ( mode === 'contentSlider' && ! hasOverlay ) {
			return [ 'ghostlabs/glide-slide', 'ghostlabs/glide-overlay' ];
		}
		// A sticky layout may seed blocks of its own among the steps — the
		// media pane is an ordinary core/group carrying a marker class — and
		// they have to be allowed here or they cannot be inserted, moved back,
		// or restored after a delete.
		const extra = stickyLayoutAllowedChildren( stickyMarker );

		return extra
			? [ 'ghostlabs/glide-slide', ...extra ]
			: [ 'ghostlabs/glide-slide' ];
	};
	const allowedChildren = getAllowedChildren();

	const slideBlocks = childBlocks.filter(
		( b ) => b.name === 'ghostlabs/glide-slide'
	);
	const slideCount = slideBlocks.length;

	const selectedChildIndex = useSelect(
		( select ) => {
			const selected =
				select( 'core/block-editor' ).getSelectedBlockClientId();
			return slideBlocks.findIndex( ( b ) => b.clientId === selected );
		},
		[ slideBlocks ]
	);

	/**
	 * Swap this block for the pattern's own.
	 *
	 * Replacing rather than filling is the point: the pattern's root *is* a
	 * Glide block, already carrying its mode, its marker class and its seeded
	 * steps, so the author ends up with one correctly configured block instead
	 * of the empty one they started from sitting beside the one they wanted.
	 *
	 * @param {Object} choice  The chosen entry from LAYOUT_CHOICES.
	 * @param {Object} pattern The registered pattern, if it was found.
	 */
	const pickPattern = ( choice, pattern ) => {
		const root = pattern?.content
			? parse( pattern.content ).find(
					( block ) => block.name === 'ghostlabs/glide'
			  )
			: undefined;

		// 🔴 If the pattern was not registered, do nothing at all.
		//
		// This used to fall back to "the layout's actual contract" — set the
		// sticky mode and stamp `MARKERS[ choice.key ]` onto the className. That
		// is the one path that can put a *paid* marker on a block in an edition
		// that cannot render it, because an unregistered pattern is exactly what
		// a paid pattern looks like from here. The block would then carry a
		// marker with no layout behind it and render as a plain stack of steps.
		//
		// Leaving the block untouched is the honest outcome: the author sees the
		// picker unchanged and nothing has been written to the post. An
		// unregistered pattern in the edition that offers it is a bug in that
		// edition, not something to paper over with a fabricated marker.
		if ( ! root ) {
			return;
		}

		replaceBlock( clientId, root );
	};

	// The plain modes have no pattern behind them; the slide seeds its own
	// contents from SLIDE_TEMPLATES once it knows the parent mode.
	const pickMode = ( choice ) => {
		setAttributes( attributesForMode( choice.mode ) );
		// `true` selects the new slide, which moves focus to it. Without it the
		// focused card unmounted and keyboard focus fell to the document.
		replaceInnerBlocks(
			clientId,
			[ createBlock( 'ghostlabs/glide-slide' ) ],
			true
		);
	};

	const getContentSliderHeightVars = () => {
		if ( contentSlider.heightAuto ) {
			return {};
		}
		if ( contentSlider.useResponsiveHeight ) {
			return {
				'--ghostlabs-glide-height-desktop': `${ contentSlider.heightDesktop }px`,
				'--ghostlabs-glide-height-tablet': `${ contentSlider.heightTablet }px`,
				'--ghostlabs-glide-height-mobile': `${ contentSlider.heightMobile }px`,
			};
		}
		return {
			'--ghostlabs-glide-slide-height': contentSlider.height,
		};
	};
	const contentSliderHeightVars = getContentSliderHeightVars();

	const contentSliderVars =
		mode === 'contentSlider'
			? {
					...contentSliderHeightVars,
					'--ghostlabs-glide-slide-fit': contentSlider.fit,
					'--ghostlabs-glide-slide-justify':
						VERTICAL_ALIGN_TO_JUSTIFY[
							contentSlider.verticalAlign
						] || 'center',
					'--ghostlabs-glide-slides-per-view':
						contentSlider.slidesPerView,
					'--ghostlabs-glide-gap': `${ contentSlider.gap }px`,
			  }
			: {};

	// Whatever custom properties the modes *this edition compiled* need on the
	// wrapper. Empty for a mode with none, and empty in a build that ships no
	// mode beyond the two below.
	const editionVars = modeStyleVars( mode, attributes );

	const tweenClasses =
		mode === 'contentSlider'
			? [
					contentSlider.fade && 'is-tween-fade',
					contentSlider.parallax && 'is-tween-parallax',
					contentSlider.scale && 'is-tween-scale',
					contentSlider.barnDoors && 'is-tween-barn-doors',
			  ].filter( Boolean )
			: [];

	const stickyVars =
		mode === 'stickyScroll'
			? {
					// Lengths keep their unit: the stylesheet substitutes these
					// into calc(), where a unitless zero invalidates it.
					'--ghostlabs-glide-sticky-offset': `${
						stickyScroll?.stickyOffset ?? 40
					}px`,
					'--ghostlabs-glide-rail-width': `${
						stickyScroll?.railWidth ?? 240
					}px`,

					// Mirrors the renderer. Feeds a layout numeral's
					// counter-reset, which cannot count its own siblings.
					// Unitless: counter-reset takes an integer.
					'--ghostlabs-glide-step-total': `${ slideBlocks.length }`,

					// Whatever the layout on this block needs on top. The two
					// above belong to the mode and every edition has them.
					...stickyLayoutStyleVars( stickyMarker, stickyScroll ),
			  }
			: {};

	const listedSteps =
		mode === 'stickyScroll'
			? slideBlocks.filter(
					( b ) => b.attributes?.includeInContents !== false
			  )
			: [];

	// 🔴 No filter, because the list *is* the entitlement. `LAYOUT_CHOICES` comes
	// from `@edition/layouts.js` and each edition ships its own — free's does not
	// contain the paid entries at all. What was here before was a runtime branch
	// on a localized global that defaulted to `pro` when the global was missing,
	// so any failure to enqueue offered every paid layout to a free install.

	// A picker offering one card is not a choice, so an edition with a single
	// layout gets the InnerBlocks template instead and lands on a content slider
	// exactly as it did before the picker existed.
	const offersAChoice = LAYOUT_CHOICES.length > 1;
	const isPickingLayout = childBlocks.length === 0 && offersAChoice;

	// The canvas badge for the active tween. A translated string in a data
	// attribute, because CSS `content` text cannot be translated.
	const activeTween =
		mode === 'contentSlider'
			? TWEEN_OPTIONS.find( ( { key } ) => contentSlider[ key ] )
			: undefined;

	const blockProps = useBlockProps( {
		...( activeTween
			? { 'data-ghostlabs-tween-label': activeTween.label }
			: {} ),
		className:
			'ghostlabs-glide ' +
			modifier +
			( tweenClasses.length ? ' ' + tweenClasses.join( ' ' ) : '' ) +
			( mode === 'contentSlider' && contentSlider.heightAuto
				? ' is-auto-height'
				: '' ) +
			( mode === 'contentSlider' &&
			contentSlider.useResponsiveHeight &&
			! contentSlider.heightAuto
				? ' is-responsive-height'
				: '' ) +
			( mode === 'contentSlider' && contentSlider.showThumbnails
				? ` has-thumbnails has-thumbnails--${
						contentSlider.thumbnailPosition || 'bottom'
				  }`
				: '' ) +
			( mode === 'contentSlider' && contentSlider.autoHideControls
				? ' is-auto-hide-controls'
				: '' ) +
			// Anything a mode this edition ships needs beyond its modifier.
			modeClassNames( mode, attributes ) +
			// Arrows and the progress bar render off the mode's settings
			// alone, so an empty content slider painted them over the picker.
			// Suppressed in one place in editor.scss rather than as a
			// condition on each, which is easy to forget when chrome is added.
			( isPickingLayout ? ' is-picking-layout' : '' ) +
			( isStickyChapters
				? ` has-rail--${
						stickyScroll?.railPosition || 'left'
				  } is-marker-${ stickyScroll?.markerStyle || 'numbered' }`
				: '' ) +
			// And whatever the layout on this block needs. Chapters is above
			// because every edition ships it.
			stickyLayoutClassNames( stickyMarker, stickyScroll ),
		style: {
			'--ghostlabs-slide-count': slideCount,
			...contentSliderVars,
			...editionVars,
			...stickyVars,
		},
	} );

	const mergedRef = useMergeRefs( [ blockProps.ref, sliderRef ] );

	const updateModeAttr = ( modeKey, key, value ) => {
		const current = attributes[ modeKey ] || {};
		setAttributes( { [ modeKey ]: { ...current, [ key ]: value } } );
	};

	const updateModeAttrs = ( modeKey, partial ) => {
		const current = attributes[ modeKey ] || {};
		setAttributes( { [ modeKey ]: { ...current, ...partial } } );
	};

	const goToSlide = ( direction ) => {
		if ( ! slideBlocks.length ) {
			return;
		}
		const current = Math.max( 0, selectedChildIndex );
		let next;
		if ( direction === 'prev' ) {
			next = current > 0 ? current - 1 : slideCount - 1;
		} else {
			next = current < slideCount - 1 ? current + 1 : 0;
		}
		selectBlock( slideBlocks[ next ].clientId );
		speak(
			sprintf(
				/* translators: 1: current slide number, 2: number of slides */
				__( 'Slide %1$d of %2$d', 'ghostlabs-glide' ),
				next + 1,
				slideCount
			)
		);
	};

	return (
		<>
			<BlockControls>
				{ mode === 'contentSlider' && slideCount > 1 && (
					<ToolbarGroup>
						<ToolbarButton
							icon={ chevronLeft }
							label={ __( 'Previous slide', 'ghostlabs-glide' ) }
							onClick={ () => goToSlide( 'prev' ) }
						/>
						<span className="ghostlabs-glide__slide-indicator">
							{ sprintf(
								/* translators: 1: slide number, 2: number of slides */
								__( '%1$d / %2$d', 'ghostlabs-glide' ),
								Math.max( 1, selectedChildIndex + 1 ),
								slideCount
							) }
						</span>
						<ToolbarButton
							icon={ chevronRight }
							label={ __( 'Next slide', 'ghostlabs-glide' ) }
							onClick={ () => goToSlide( 'next' ) }
						/>
					</ToolbarGroup>
				) }
			</BlockControls>

			<InspectorControls>
				<PanelBody title={ __( 'Glide Settings', 'ghostlabs-glide' ) }>
					{ offersAccessibleName( mode, stickyMarker ) && (
						<TextControl
							label={ __( 'Accessible name', 'ghostlabs-glide' ) }
							help={ __(
								'Names this section for screen readers. Give each one on a page its own name, such as "Customer stories"; left empty, a generic name is used.',
								'ghostlabs-glide'
							) }
							value={ attributes.regionLabel || '' }
							onChange={ ( val ) =>
								setAttributes( { regionLabel: val } )
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) }
					<SelectControl
						label={ __( 'Mode', 'ghostlabs-glide' ) }
						value={ mode }
						options={ MODE_OPTIONS }
						onChange={ ( newMode ) => {
							setAttributes( attributesForMode( newMode ) );

							const slides = globalSelect( 'core/block-editor' )
								.getBlocks( clientId )
								.filter(
									( b ) => b.name === 'ghostlabs/glide-slide'
								);

							// Which placeholder block a mode wants in each
							// slide is the edition's answer, because the modes
							// that disagree about it are the ones only some
							// editions have. An untouched placeholder is
							// swapped; anything the author has typed into is
							// left alone.
							applyModeTemplateSwap( newMode, {
								slides,
								coverTemplate: COVER_TEMPLATE,
								createBlock,
								replaceBlock,
								isCoverBlockEmpty,
								isImageBlockEmpty,
							} );
						} }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					{ /* Below the select and its help, never above it. */ }
					<ModeUpsellNotice />
				</PanelBody>

				{ mode === 'contentSlider' && (
					<>
						<ContentSliderControls
							config={ contentSlider }
							onChange={ ( key, val ) =>
								updateModeAttr( 'contentSlider', key, val )
							}
							onChangeMany={ ( partial ) =>
								updateModeAttrs( 'contentSlider', partial )
							}
						/>
						<PanelBody
							title={ __( 'Overlay', 'ghostlabs-glide' ) }
							initialOpen={ hasOverlay }
						>
							<ToggleControl
								label={ __(
									'Enable overlay',
									'ghostlabs-glide'
								) }
								help={ __(
									'Display content on top of the slider.',
									'ghostlabs-glide'
								) }
								checked={ hasOverlay }
								onChange={ ( val ) => {
									if ( val ) {
										insertBlock(
											createBlock(
												'ghostlabs/glide-overlay'
											),
											0,
											clientId
										);
										updateModeAttrs( 'contentSlider', {
											showArrows: false,
											autoplay: true,
										} );
									} else {
										const overlay = childBlocks.find(
											( b ) =>
												b.name ===
												'ghostlabs/glide-overlay'
										);
										if ( overlay ) {
											removeBlock( overlay.clientId );
										}
										updateModeAttrs( 'contentSlider', {
											showArrows: true,
											autoplay: false,
										} );
									}
								} }
								__nextHasNoMarginBottom
							/>
						</PanelBody>
					</>
				) }

				{ /*
				 * The panel for a mode this edition added, if it added one.
				 * Looked up rather than listed. Naming a mode here would
				 * compile its panel into builds with no renderer, no
				 * stylesheet and no module behind it.
				 */ }
				{ EditionModePanel && (
					<EditionModePanel
						config={ attributes[ mode ] }
						onChange={ ( key, val ) =>
							updateModeAttr( mode, key, val )
						}
					/>
				) }

				{ mode === 'stickyScroll' && (
					<StickyScrollControls
						config={ stickyScroll }
						marker={ stickyMarker }
						isChapters={ isStickyChapters }
						onChange={ ( key, val ) =>
							updateModeAttr( 'stickyScroll', key, val )
						}
					/>
				) }

				{ /*
				 * Last, in every mode, so it never pushes the block's own
				 * controls down. Told the mode, because what it says follows it.
				 */ }
				<UpsellPanel mode={ mode } />
			</InspectorControls>

			<div { ...blockProps } ref={ mergedRef }>
				{ mode === 'contentSlider' && contentSlider.showArrows && (
					<>
						<span
							className="ghostlabs-glide__arrow ghostlabs-glide__arrow--prev"
							aria-hidden="true"
							style={ { pointerEvents: 'none' } }
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								width="24"
								height="24"
								fill="currentColor"
								aria-hidden="true"
								focusable="false"
							>
								<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
							</svg>
						</span>
						<span
							className="ghostlabs-glide__arrow ghostlabs-glide__arrow--next"
							aria-hidden="true"
							style={ { pointerEvents: 'none' } }
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								width="24"
								height="24"
								fill="currentColor"
								aria-hidden="true"
								focusable="false"
							>
								<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
							</svg>
						</span>
					</>
				) }
				{ /*
				 * Whatever preview the layout on this block needs beyond its
				 * own inner blocks. A layout whose pane has nothing among them
				 * to look at showed an empty column in the canvas where the
				 * front end shows the pane, which reads as a broken block
				 * rather than as an unset option — but which layouts those are
				 * is the edition's answer, not this file's.
				 */ }
				<StickyLayoutPreview
					marker={ stickyMarker }
					config={ stickyScroll }
					slides={ slideBlocks }
					activeIndex={ selectedChildIndex }
				/>
				{ isStickyChapters && listedSteps.length > 0 && (
					<nav
						className="ghostlabs-glide__rail"
						aria-hidden="true"
						style={ { pointerEvents: 'none' } }
					>
						{ /* Mirrors Glide::renderRail(). The nav is aria-hidden
						     in the canvas, so unlike the frontend this copy
						     needs no id for the nav to be named by. */ }
						<p className="ghostlabs-glide__rail-title">
							{ __( 'Contents', 'ghostlabs-glide' ) }
						</p>
						{ stickyScroll?.showProgressLine && (
							<span className="ghostlabs-glide__rail-progress" />
						) }
						<ol className="ghostlabs-glide__rail-list">
							{ listedSteps.map( ( slide, i ) => (
								<li
									key={ slide.clientId }
									className={
										'ghostlabs-glide__rail-item' +
										( slide.clientId ===
										slideBlocks[
											Math.max( 0, selectedChildIndex )
										]?.clientId
											? ' is-active'
											: '' )
									}
								>
									<span className="ghostlabs-glide__rail-link">
										<span className="ghostlabs-glide__rail-marker" />
										<span className="ghostlabs-glide__rail-text">
											{ extractStepTitle( slide, i ) }
										</span>
									</span>
								</li>
							) ) }
						</ol>
						{ stickyScroll?.showStepCounter && (
							<p className="ghostlabs-glide__rail-counter">
								{ Math.max( 1, selectedChildIndex + 1 ) } /{ ' ' }
								{ listedSteps.length }
							</p>
						) }
					</nav>
				) }
				{ /* No inner blocks means a freshly inserted block, so offer the
				     layouts rather than silently seeding a content slider — the
				     four sticky ones were otherwise reachable only from the
				     global inserter. The InnerBlocks template is what made the
				     block never look empty, so the picker could never appear;
				     it survives only for the edition that has nothing to pick
				     (see offersAChoice), where seeding a slide outright is the
				     behaviour that was there before the picker. */ }
				{ isPickingLayout ? (
					<GlideLayoutPicker
						choices={ LAYOUT_CHOICES }
						onPickMode={ pickMode }
						onPickPattern={ pickPattern }
					/>
				) : (
					<InnerBlocks
						template={
							offersAChoice
								? undefined
								: [ [ 'ghostlabs/glide-slide' ] ]
						}
						allowedBlocks={ allowedChildren }
						renderAppender={ () => (
							<button
								className="ghostlabs-glide__content-entry-appender components-button block-editor-inserter__toggle has-icon"
								onClick={ insertSlideBlock(
									clientId,
									sliderRef
								) }
								aria-label={ __(
									'Add Slide',
									'ghostlabs-glide'
								) }
								type="button"
								title={ __( 'Add Slide', 'ghostlabs-glide' ) }
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									width="24"
									height="24"
									aria-hidden="true"
									focusable="false"
								>
									<path d="M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z" />
								</svg>
							</button>
						) }
					/>
				) }
				{ mode === 'contentSlider' &&
					contentSlider.navigation === 'dots' &&
					slideCount > 0 && (
						<div
							className="ghostlabs-glide__dots"
							aria-hidden="true"
							style={ { pointerEvents: 'none' } }
						>
							{ Array.from( { length: slideCount } ).map(
								( _, i ) => (
									<span
										key={ i }
										className={
											'ghostlabs-glide__dot' +
											( i === 0 ? ' is-active' : '' )
										}
									/>
								)
							) }
						</div>
					) }
				{ mode === 'contentSlider' &&
					contentSlider.navigation === 'progress' && (
						<div
							className="ghostlabs-glide__progress"
							aria-hidden="true"
							style={ { pointerEvents: 'none' } }
						>
							<div
								className="ghostlabs-glide__progress-bar"
								style={ { transform: 'scaleX(0.25)' } }
							/>
						</div>
					) }
				{ mode === 'contentSlider' &&
					contentSlider.showThumbnails &&
					slideCount > 0 && (
						<div
							className="ghostlabs-glide__thumbs"
							aria-hidden="true"
							style={ { pointerEvents: 'none' } }
						>
							<div className="ghostlabs-glide__thumbs__viewport">
								<div className="ghostlabs-glide__thumbs__track">
									{ slideBlocks.map( ( slide, i ) => {
										const thumbUrl =
											extractThumbnailUrl( slide );
										return (
											<div
												key={ slide.clientId }
												className={
													'ghostlabs-glide__thumbs__slide' +
													( i ===
													( selectedChildIndex >= 0
														? selectedChildIndex
														: 0 )
														? ' is-thumb-selected'
														: '' )
												}
											>
												<span className="ghostlabs-glide__thumbs__placeholder">
													{ thumbUrl ? (
														<img
															src={ thumbUrl }
															alt=""
														/>
													) : (
														i + 1
													) }
												</span>
											</div>
										);
									} ) }
								</div>
							</div>
						</div>
					) }
			</div>
		</>
	);
}

/**
 * The tween flags a `contentSlider` object can carry.
 *
 * ⚠️ **All four in every edition, and not the same list as `TWEEN_OPTIONS`.**
 * They are keys inside one object attribute, which a parse keeps whole, so a
 * block saved by an edition that offers more effects arrives with its flags
 * intact whether or not this edition's schema gives them a default — and the
 * exclusivity logic below always has to clear all of them. `TWEEN_OPTIONS` comes
 * from `@edition` and is the shorter question: which of them this build renders
 * a toggle for.
 *
 * Keeping them apart is what makes a block that arrives with an effect this
 * edition cannot offer still turn *off* correctly.
 */
const TWEEN_KEYS = [ 'fade', 'parallax', 'scale', 'barnDoors' ];

function ContentSliderControls( { config, onChange, onChangeMany } ) {
	const setExclusiveTween = ( key, val ) => {
		if ( ! val ) {
			onChange( key, false );
			return;
		}
		const partial = { [ key ]: true };
		TWEEN_KEYS.forEach( ( k ) => {
			if ( k !== key ) {
				partial[ k ] = false;
			}
		} );
		onChangeMany( partial );
	};

	const tweenGated = config.slidesPerView !== 1;
	const tweenGateHelp = __( 'Requires 1 slide per view.', 'ghostlabs-glide' );

	const noTweenActive = ! TWEEN_KEYS.some( ( k ) => config[ k ] );
	const clearAllTweens = () => {
		const partial = {};
		TWEEN_KEYS.forEach( ( k ) => ( partial[ k ] = false ) );
		onChangeMany( partial );
	};

	return (
		<>
			<PanelBody
				title={ __( 'Slider Settings', 'ghostlabs-glide' ) }
				initialOpen={ true }
			>
				<ToggleControl
					label={ __(
						'Auto-fit to tallest slide',
						'ghostlabs-glide'
					) }
					help={ __(
						'Track stretches to the tallest slide at every viewport. Works best with text-based slides.',
						'ghostlabs-glide'
					) }
					checked={ !! config.heightAuto }
					onChange={ ( val ) => onChange( 'heightAuto', val ) }
					__nextHasNoMarginBottom
				/>
				{ ! config.heightAuto && (
					<>
						<ToggleControl
							label={ __(
								'Responsive heights',
								'ghostlabs-glide'
							) }
							help={ __(
								'Set different slide heights for desktop, tablet, and mobile.',
								'ghostlabs-glide'
							) }
							checked={ !! config.useResponsiveHeight }
							onChange={ ( val ) =>
								onChange( 'useResponsiveHeight', val )
							}
							__nextHasNoMarginBottom
						/>
						{ config.useResponsiveHeight ? (
							<>
								<RangeControl
									label={ __(
										'Desktop Height (px)',
										'ghostlabs-glide'
									) }
									value={ config.heightDesktop }
									onChange={ ( val ) =>
										onChange( 'heightDesktop', val )
									}
									min={ 100 }
									max={ 1200 }
									step={ 10 }
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
								<RangeControl
									label={ __(
										'Tablet Height (px)',
										'ghostlabs-glide'
									) }
									value={ config.heightTablet }
									onChange={ ( val ) =>
										onChange( 'heightTablet', val )
									}
									min={ 100 }
									max={ 1200 }
									step={ 10 }
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
								<RangeControl
									label={ __(
										'Mobile Height (px)',
										'ghostlabs-glide'
									) }
									value={ config.heightMobile }
									onChange={ ( val ) =>
										onChange( 'heightMobile', val )
									}
									min={ 100 }
									max={ 1200 }
									step={ 10 }
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
							</>
						) : (
							<UnitControl
								label={ __(
									'Slide Height',
									'ghostlabs-glide'
								) }
								value={ config.height }
								onChange={ ( val ) =>
									onChange( 'height', val )
								}
								units={ [
									{
										value: 'vh',
										label: 'vh',
										default: 60,
									},
									{
										value: 'px',
										label: 'px',
										default: 500,
									},
									{
										value: '%',
										label: '%',
										default: 80,
									},
								] }
								__next40pxDefaultSize
							/>
						) }
					</>
				) }
				<SelectControl
					label={ __( 'Vertical Alignment', 'ghostlabs-glide' ) }
					value={ config.verticalAlign }
					options={ [
						{ label: __( 'Top', 'ghostlabs-glide' ), value: 'top' },
						{
							label: __( 'Center', 'ghostlabs-glide' ),
							value: 'center',
						},
						{
							label: __( 'Bottom', 'ghostlabs-glide' ),
							value: 'bottom',
						},
					] }
					onChange={ ( val ) => onChange( 'verticalAlign', val ) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Loop', 'ghostlabs-glide' ) }
					checked={ config.loop }
					onChange={ ( val ) => onChange( 'loop', val ) }
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Show Arrows', 'ghostlabs-glide' ) }
					checked={ config.showArrows }
					onChange={ ( val ) => onChange( 'showArrows', val ) }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Navigation', 'ghostlabs-glide' ) }
					value={ config.navigation }
					options={ [
						{
							label: __( 'Dots', 'ghostlabs-glide' ),
							value: 'dots',
						},
						{
							label: __( 'Progress Bar', 'ghostlabs-glide' ),
							value: 'progress',
						},
						{
							label: __( 'None', 'ghostlabs-glide' ),
							value: 'none',
						},
					] }
					onChange={ ( val ) => onChange( 'navigation', val ) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				{ ! config.showArrows &&
					config.navigation !== 'dots' &&
					! config.showThumbnails && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'With arrows, dots and thumbnails all off, nothing on the page shows how to change slides. Previous and next buttons are still added for keyboard and screen reader users, visible only while they have focus.',
								'ghostlabs-glide'
							) }
						</Notice>
					) }
				<ToggleControl
					label={ __( 'Auto-hide Controls', 'ghostlabs-glide' ) }
					checked={ !! config.autoHideControls }
					onChange={ ( val ) => onChange( 'autoHideControls', val ) }
					__nextHasNoMarginBottom
				/>
				{ config.autoHideControls && (
					<Notice status="warning" isDismissible={ false }>
						{ __(
							'Controls are hidden until hover or keyboard focus. Users who rely on touch without hover may need an extra tap to discover controls.',
							'ghostlabs-glide'
						) }
					</Notice>
				) }
				<RangeControl
					label={ __( 'Slides Per View', 'ghostlabs-glide' ) }
					value={ config.slidesPerView }
					onChange={ ( val ) => {
						// Tweens only mean anything at one slide per view, so
						// raising this clears them. Over TWEEN_KEYS — the whole
						// schema — rather than the four names it used to list:
						// a block can arrive carrying an effect this edition
						// never offered, and it has to be cleared too.
						const active = TWEEN_KEYS.some( ( k ) => config[ k ] );

						if ( val !== 1 && active ) {
							onChangeMany( {
								slidesPerView: val,
								...Object.fromEntries(
									TWEEN_KEYS.map( ( k ) => [ k, false ] )
								),
							} );
						} else {
							onChange( 'slidesPerView', val );
						}
					} }
					min={ 1 }
					max={ 6 }
					step={ 1 }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<RangeControl
					label={ __( 'Gap (px)', 'ghostlabs-glide' ) }
					value={ config.gap }
					onChange={ ( val ) => onChange( 'gap', val ) }
					min={ 0 }
					max={ 100 }
					step={ 1 }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<RangeControl
					label={ __( 'Speed', 'ghostlabs-glide' ) }
					value={ config.speed }
					onChange={ ( val ) => onChange( 'speed', val ) }
					min={ 1 }
					max={ 20 }
					step={ 1 }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Drag Free', 'ghostlabs-glide' ) }
					checked={ config.dragFree }
					onChange={ ( val ) => onChange( 'dragFree', val ) }
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Autoplay', 'ghostlabs-glide' ) }
					checked={ config.autoplay }
					onChange={ ( val ) => onChange( 'autoplay', val ) }
					__nextHasNoMarginBottom
				/>
				{ config.autoplay && (
					<RangeControl
						label={ __(
							'Autoplay Interval (ms)',
							'ghostlabs-glide'
						) }
						value={ config.autoplayInterval }
						onChange={ ( val ) =>
							onChange( 'autoplayInterval', val )
						}
						min={ 1000 }
						max={ 10000 }
						step={ 500 }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				) }
			</PanelBody>
			<PanelBody
				title={ __( 'Tweens', 'ghostlabs-glide' ) }
				initialOpen={ ! noTweenActive }
			>
				<ToggleControl
					label={ __( 'None', 'ghostlabs-glide' ) }
					checked={ noTweenActive }
					disabled={ noTweenActive }
					onChange={ clearAllTweens }
					__nextHasNoMarginBottom
				/>
				{ TWEEN_OPTIONS.map( ( { key, label } ) => (
					<ToggleControl
						key={ key }
						label={ label }
						checked={ !! config[ key ] }
						disabled={ tweenGated }
						help={ tweenGated ? tweenGateHelp : undefined }
						onChange={ ( val ) => setExclusiveTween( key, val ) }
						__nextHasNoMarginBottom
					/>
				) ) }
				<TweensUpsellNotice />
			</PanelBody>
			<PanelBody
				title={ __( 'Thumbnails', 'ghostlabs-glide' ) }
				initialOpen={ false }
			>
				<ToggleControl
					label={ __( 'Show Thumbnails', 'ghostlabs-glide' ) }
					checked={ !! config.showThumbnails }
					onChange={ ( val ) => onChange( 'showThumbnails', val ) }
					__nextHasNoMarginBottom
				/>
				{ config.showThumbnails && (
					<SelectControl
						label={ __( 'Position', 'ghostlabs-glide' ) }
						value={ config.thumbnailPosition || 'bottom' }
						options={ [
							{
								label: __( 'Bottom', 'ghostlabs-glide' ),
								value: 'bottom',
							},
							{
								label: __( 'Top', 'ghostlabs-glide' ),
								value: 'top',
							},
							{
								label: __( 'Left', 'ghostlabs-glide' ),
								value: 'left',
							},
							{
								label: __( 'Right', 'ghostlabs-glide' ),
								value: 'right',
							},
						] }
						onChange={ ( val ) =>
							onChange( 'thumbnailPosition', val )
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				) }
			</PanelBody>
		</>
	);
}

/**
 * The Sticky Scroll inspector, dispatched on the block's marker class.
 *
 * Every panel belongs to a *pattern*, not to the mode: without a marker there is
 * nothing pattern-specific to configure, so the inspector says so rather than
 * offering controls that would style nothing.
 *
 * ⚠️ **The layouts this edition adds are looked up, not listed.** Sticky
 * Chapters is below because every edition ships it; the rest come from
 * `@edition/sticky-layouts.js`, and a marker with no entry there lands on the
 * same notice a block with no marker gets — which is also what the front end
 * renders for it.
 *
 * @param {Object}   props            Component props.
 * @param {Object}   props.config     The stickyScroll attribute.
 * @param {string}   props.marker     The block's marker class, or an empty string.
 * @param {boolean}  props.isChapters Whether that marker is Sticky Chapters.
 * @param {Function} props.onChange   Attribute setter, (key, value).
 */
function StickyScrollControls( { config = {}, marker, isChapters, onChange } ) {
	const EditionLayoutPanel = STICKY_LAYOUT_PANELS[ marker ];

	if ( EditionLayoutPanel ) {
		return <EditionLayoutPanel config={ config } onChange={ onChange } />;
	}

	if ( ! isChapters ) {
		return (
			<PanelBody
				title={ __( 'Sticky Scroll', 'ghostlabs-glide' ) }
				initialOpen={ true }
			>
				<Notice status="info" isDismissible={ false }>
					{ __(
						'Insert a Sticky Scroll pattern to choose a layout. Each pattern brings its own settings; until then these slides render as a plain stack.',
						'ghostlabs-glide'
					) }
				</Notice>
			</PanelBody>
		);
	}

	return (
		<>
			<PanelBody
				title={ __( 'Sticky Chapters', 'ghostlabs-glide' ) }
				initialOpen={ true }
			>
				<SelectControl
					label={ __( 'Rail position', 'ghostlabs-glide' ) }
					value={ config.railPosition || 'left' }
					options={ [
						{
							label: __( 'Left', 'ghostlabs-glide' ),
							value: 'left',
						},
						{
							label: __( 'Right', 'ghostlabs-glide' ),
							value: 'right',
						},
						{
							label: __( 'Top bar', 'ghostlabs-glide' ),
							value: 'top',
						},
					] }
					onChange={ ( val ) => onChange( 'railPosition', val ) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<RangeControl
					label={ __( 'Rail Width (px)', 'ghostlabs-glide' ) }
					value={ config.railWidth ?? 240 }
					onChange={ ( val ) => onChange( 'railWidth', val ) }
					min={ 120 }
					max={ 480 }
					step={ 10 }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<RangeControl
					label={ __( 'Sticky Offset (px)', 'ghostlabs-glide' ) }
					help={ __(
						'Distance from the top of the viewport once the rail sticks.',
						'ghostlabs-glide'
					) }
					value={ config.stickyOffset ?? 40 }
					onChange={ ( val ) => onChange( 'stickyOffset', val ) }
					min={ 0 }
					max={ 400 }
					step={ 4 }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Marker style', 'ghostlabs-glide' ) }
					value={ config.markerStyle || 'numbered' }
					options={ [
						{
							label: __( 'Numbered', 'ghostlabs-glide' ),
							value: 'numbered',
						},
						{ label: __( 'Dot', 'ghostlabs-glide' ), value: 'dot' },
						{
							label: __( 'Plain', 'ghostlabs-glide' ),
							value: 'plain',
						},
					] }
					onChange={ ( val ) => onChange( 'markerStyle', val ) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Show progress line', 'ghostlabs-glide' ) }
					checked={ !! config.showProgressLine }
					onChange={ ( val ) => onChange( 'showProgressLine', val ) }
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Show step counter', 'ghostlabs-glide' ) }
					checked={ !! config.showStepCounter }
					onChange={ ( val ) => onChange( 'showStepCounter', val ) }
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Smooth scroll', 'ghostlabs-glide' ) }
					help={ __(
						'Animate the jump when a chapter is clicked. Readers who ask for reduced motion always get an instant jump.',
						'ghostlabs-glide'
					) }
					// Absent means on — blocks saved before this option
					// existed have no key, and the block default is true.
					checked={ config.smoothScroll !== false }
					onChange={ ( val ) => onChange( 'smoothScroll', val ) }
					__nextHasNoMarginBottom
				/>
				{ /* ⚠️ No "On mobile" control: a phone always gets the rail
				   as a stuck strip (2026-10-31). Its "Unstick the rail"
				   default let the highlight scroll off screen. */ }
			</PanelBody>
		</>
	);
}
