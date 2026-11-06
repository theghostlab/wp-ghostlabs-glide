import { __, sprintf } from '@wordpress/i18n';
import { speak } from '@wordpress/a11y';
import {
	BlockControls,
	InnerBlocks,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	useBlockProps,
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { useInstanceId } from '@wordpress/compose';
import {
	BaseControl,
	Button,
	Notice,
	PanelBody,
	TextControl,
	ToggleControl,
	ToolbarButton,
	ToolbarGroup,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { chevronLeft, chevronRight } from '@wordpress/icons';

import { generateVideoPoster } from './_utils/generate-video-poster.js';
import {
	useGlideMarker,
	useHasGlideMarker,
} from '../_shared/use-glide-pattern.js';
import { MARKERS } from '@edition/markers.js';
import {
	offersVideoBackground,
	playbackApplies,
} from './_utils/video-background.js';
import {
	SLIDE_TEMPLATES,
	STICKY_SLIDE_TEMPLATES,
	SLIDE_PANELS,
} from '@edition/slides.js';
import { STICKY_SLIDE_PANELS } from '@edition/sticky-slide-panels.js';
import './editor.scss';

// Module-level so `useGlideMarker`'s dependency array is stable across renders.
const MARKER_CLASSES = Object.values( MARKERS );

function getYouTubeId( url ) {
	const match = url.match(
		/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^&?#]+)/i
	);
	return match ? match[ 1 ] : '';
}

function getVimeoId( url ) {
	const match = url.match( /vimeo\.com\/(?:video\/)?(\d+)/i );
	return match ? match[ 1 ] : '';
}

/**
 * The largest poster YouTube has for a video.
 *
 * ⚠️ Not every video has a `maxresdefault.jpg` — older and low-resolution
 * uploads do not — and a missing one answers with a 120×90 grey placeholder
 * rather than failing outright, so it can load "successfully". `hqdefault.jpg`
 * exists for every video, so it is the fallback for both outcomes.
 *
 * @param {string} id The YouTube video ID.
 * @return {Promise<string>} The poster URL.
 */
function getYouTubePoster( id ) {
	const best = `https://img.youtube.com/vi/${ id }/maxresdefault.jpg`;
	const fallback = `https://img.youtube.com/vi/${ id }/hqdefault.jpg`;

	return new Promise( ( resolve ) => {
		const probe = new window.Image();
		probe.onload = () =>
			resolve( probe.naturalWidth > 120 ? best : fallback );
		probe.onerror = () => resolve( fallback );
		probe.src = best;
	} );
}

function getVideoThumbnailUrl( url ) {
	const ytId = getYouTubeId( url );
	if ( ytId ) {
		return getYouTubePoster( ytId );
	}

	const vimeoId = getVimeoId( url );
	if ( vimeoId ) {
		return fetch(
			`https://vimeo.com/api/oembed.json?url=${ encodeURIComponent(
				url
			) }`
		)
			.then( ( res ) => ( res.ok ? res.json() : null ) )
			.then( ( data ) => data?.thumbnail_url || '' )
			.catch( () => '' );
	}

	return Promise.resolve( '' );
}

/**
 * What a fresh slide starts with, for every mode that has no opinion.
 *
 * ⚠️ **The default, not the whole list.** `@edition/slides.js` supplies per-mode
 * overrides and the lookup falls back to this, which is how an edition avoids
 * carrying identical copies of it for every mode it ships. Almost every mode
 * wants exactly this; the ones that do not say so in their own edition.
 */
const DEFAULT_SLIDE_TEMPLATE = [
	[
		'core/cover',
		{ minHeight: 100, minHeightUnit: '%', dimRatio: 50 },
		[
			[
				'core/heading',
				{
					level: 2,
					placeholder: __( 'Slide title', 'ghostlabs-glide' ),
				},
			],
			[
				'core/paragraph',
				{
					placeholder: __( 'Slide description', 'ghostlabs-glide' ),
				},
			],
		],
	],
];

export default function Edit( { clientId, attributes, setAttributes } ) {
	const {
		videoSource,
		videoUrl,
		videoId,
		videoPoster,
		videoAutoplay,
		videoLoop,
		videoMuted,
		videoControls,
		stepTitle,
		useHeadingAsTitle,
		includeInContents,
	} = attributes;

	const instanceId = useInstanceId( Edit );

	// Which controls this slide offers is decided by the pattern that seeded
	// it, found by walking ancestors for the marker class. No attribute on
	// this block records it.
	const isStickyChapters = useHasGlideMarker(
		clientId,
		MARKERS.stickyChapters
	);

	// 🔴 **The marker, not a flag per layout.** This resolved one boolean per
	// sticky layout and branched on each, which meant the shared slide editor
	// naming layouts only some editions ship and compiling their step controls
	// into every build. The hook is asked once for the whole vocabulary and the
	// answer handed to `@edition`, which knows what — if anything — this build
	// has to offer for it.
	const stickyMarker = useGlideMarker( clientId, MARKER_CLASSES );
	const EditionStickyPanel = STICKY_SLIDE_PANELS[ stickyMarker ];

	const allowedBlocks = useSelect( ( select ) => {
		const blackList = [ 'ghostlabs/glide', 'ghostlabs/glide-slide' ];
		const blockTypes = select( 'core/blocks' ).getBlockTypes();
		return blockTypes
			.map( ( block ) => block.name )
			.filter( ( name ) => ! blackList.includes( name ) );
	}, [] );

	const { parentClientId, parentMode } = useSelect(
		( select ) => {
			const { getBlockRootClientId, getBlock } =
				select( 'core/block-editor' );
			const parentId = getBlockRootClientId( clientId );
			if ( ! parentId ) {
				return { parentClientId: null, parentMode: 'contentSlider' };
			}
			const parentBlock = getBlock( parentId );
			return {
				parentClientId: parentId,
				parentMode: parentBlock?.attributes?.mode || 'contentSlider',
			};
		},
		[ clientId ]
	);

	// The per-slide panel this edition supplies for the containing mode, if it
	// supplies one.
	const EditionSlidePanel = SLIDE_PANELS[ parentMode ];

	const hasVideoBackground = offersVideoBackground( parentMode );

	const siblings = useSelect(
		( select ) =>
			parentClientId
				? select( 'core/block-editor' ).getBlocks( parentClientId )
				: [],
		[ parentClientId ]
	);

	const { selectBlock } = useDispatch( 'core/block-editor' );
	const { createNotice } = useDispatch( 'core/notices' );

	const pendingPosterVideoId = useRef( null );

	const handleVideoSelect = ( media ) => {
		const attrs = { videoUrl: media.url, videoId: media.id };
		const thumb = media.image?.src || '';
		const hasRealThumb =
			thumb && ! thumb.includes( 'wp-includes/images/media/' );
		if ( hasRealThumb ) {
			attrs.videoPoster = thumb;
		}
		setAttributes( attrs );

		if ( ! hasRealThumb ) {
			pendingPosterVideoId.current = media.id;
			// The outcome is told to everyone through the editor's snackbar, which
			// a screen reader announces, rather than left to the console: the
			// wait can run to fifteen seconds with nothing else to show.
			generateVideoPoster( media.id, media.url ).then( ( result ) => {
				if ( pendingPosterVideoId.current !== media.id ) {
					return;
				}
				if ( result?.posterUrl ) {
					setAttributes( { videoPoster: result.posterUrl } );
					createNotice(
						'success',
						__(
							'Poster image generated from the video.',
							'ghostlabs-glide'
						),
						{ type: 'snackbar', isDismissible: true }
					);
					return;
				}
				createNotice(
					'warning',
					__(
						'A poster image could not be generated. Choose one under Poster image.',
						'ghostlabs-glide'
					),
					{ type: 'snackbar', isDismissible: true }
				);
			} );
		}
	};

	const prevVideoUrl = useRef( videoUrl );
	useEffect( () => {
		if (
			videoSource !== 'external' ||
			! videoUrl ||
			videoUrl === prevVideoUrl.current
		) {
			prevVideoUrl.current = videoUrl;
			return;
		}

		const timer = setTimeout( () => {
			prevVideoUrl.current = videoUrl;
			getVideoThumbnailUrl( videoUrl ).then( ( thumb ) => {
				if ( thumb ) {
					setAttributes( { videoPoster: thumb } );
				}
			} );
		}, 800 );

		return () => clearTimeout( timer );
	}, [ videoUrl, videoSource ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const slideCount = siblings.length;
	const currentIndex = siblings.findIndex( ( b ) => b.clientId === clientId );

	const goToSlide = ( direction ) => {
		if ( ! slideCount ) {
			return;
		}
		const current = Math.max( 0, currentIndex );
		let next;
		if ( direction === 'prev' ) {
			next = current > 0 ? current - 1 : slideCount - 1;
		} else {
			next = current < slideCount - 1 ? current + 1 : 0;
		}
		selectBlock( siblings[ next ].clientId );
		speak(
			sprintf(
				/* translators: 1: current slide number, 2: number of slides */
				__( 'Slide %1$d of %2$d', 'ghostlabs-glide' ),
				next + 1,
				slideCount
			)
		);
	};

	const posterHelpId = `ghostlabs-glide-slide-poster-help-${ instanceId }`;

	return (
		<>
			<BlockControls>
				{ parentMode === 'contentSlider' && slideCount > 1 && (
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
								Math.max( 1, currentIndex + 1 ),
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

			{ /*
			 * The step controls the layout around this slide adds, if this
			 * edition has that layout. Looked up by marker rather than asked
			 * one layout at a time.
			 */ }
			{ EditionStickyPanel && (
				<EditionStickyPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					instanceId={ instanceId }
				/>
			) }

			{ isStickyChapters && (
				<InspectorControls>
					<PanelBody
						title={ __( 'Step', 'ghostlabs-glide' ) }
						initialOpen={ true }
					>
						<ToggleControl
							label={ __(
								'Use heading as title',
								'ghostlabs-glide'
							) }
							help={ __(
								'Takes the first heading in this step for the contents rail.',
								'ghostlabs-glide'
							) }
							checked={ useHeadingAsTitle !== false }
							onChange={ ( val ) =>
								setAttributes( { useHeadingAsTitle: val } )
							}
							__nextHasNoMarginBottom
						/>
						{ useHeadingAsTitle === false && (
							<TextControl
								label={ __( 'Step title', 'ghostlabs-glide' ) }
								value={ stepTitle || '' }
								onChange={ ( val ) =>
									setAttributes( { stepTitle: val } )
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						) }
						<ToggleControl
							label={ __(
								'Include in contents',
								'ghostlabs-glide'
							) }
							help={ __(
								'Turn off to keep the step in the page but out of the rail.',
								'ghostlabs-glide'
							) }
							checked={ includeInContents !== false }
							onChange={ ( val ) =>
								setAttributes( { includeInContents: val } )
							}
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>
			) }

			{ /*
			 * Per-slide settings for a mode this edition added, if it added
			 * any. Looked up rather than listed. Naming a mode here would
			 * compile its panel into a build with no such mode to
			 * configure.
			 */ }
			{ EditionSlidePanel && (
				<EditionSlidePanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			) }

			{ hasVideoBackground && (
				<InspectorControls>
					<PanelBody
						title={ __( 'Video Background', 'ghostlabs-glide' ) }
						initialOpen={ !! videoUrl }
					>
						<ToggleGroupControl
							label={ __( 'Source', 'ghostlabs-glide' ) }
							value={ videoSource || 'file' }
							onChange={ ( value ) =>
								setAttributes( {
									videoSource: value,
									videoUrl: '',
									videoId: undefined,
									videoPoster: '',
								} )
							}
							isBlock
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						>
							<ToggleGroupControlOption
								value="file"
								label={ __( 'File', 'ghostlabs-glide' ) }
							/>
							<ToggleGroupControlOption
								value="external"
								label={ __( 'URL', 'ghostlabs-glide' ) }
							/>
						</ToggleGroupControl>

						{ ( videoSource || 'file' ) === 'file' && (
							<MediaUploadCheck>
								{ /*
								 * ⚠️ A visual label, not `label`: BaseControl's
								 * `label` renders `<label for={ id }>`, and no
								 * button here carries that id, so it labelled
								 * nothing. Each button names its own target.
								 */ }
								<BaseControl __nextHasNoMarginBottom>
									<BaseControl.VisualLabel>
										{ __( 'Video', 'ghostlabs-glide' ) }
									</BaseControl.VisualLabel>
									{ videoUrl ? (
										<>
											<div className="ghostlabs-glide-slide__video-preview">
												<video
													src={ videoUrl }
													muted
													style={ {
														width: '100%',
														display: 'block',
														borderRadius: '2px',
													} }
												/>
											</div>
											<div
												style={ {
													display: 'flex',
													gap: '8px',
													marginTop: '8px',
												} }
											>
												<MediaUpload
													onSelect={
														handleVideoSelect
													}
													allowedTypes={ [ 'video' ] }
													value={ videoId }
													render={ ( { open } ) => (
														<Button
															variant="secondary"
															onClick={ open }
															size="small"
														>
															{ __(
																'Replace video',
																'ghostlabs-glide'
															) }
														</Button>
													) }
												/>
												<Button
													variant="tertiary"
													onClick={ () =>
														setAttributes( {
															videoUrl: '',
															videoId: undefined,
															videoPoster: '',
														} )
													}
													isDestructive
													size="small"
												>
													{ __(
														'Remove video',
														'ghostlabs-glide'
													) }
												</Button>
											</div>
										</>
									) : (
										<MediaUpload
											onSelect={ handleVideoSelect }
											allowedTypes={ [ 'video' ] }
											value={ videoId }
											render={ ( { open } ) => (
												<Button
													variant="secondary"
													onClick={ open }
												>
													{ __(
														'Select video',
														'ghostlabs-glide'
													) }
												</Button>
											) }
										/>
									) }
								</BaseControl>
							</MediaUploadCheck>
						) }

						{ videoSource === 'external' && (
							<TextControl
								label={ __( 'Video URL', 'ghostlabs-glide' ) }
								help={ __(
									'Paste a YouTube, Vimeo, or other oEmbed-compatible URL.',
									'ghostlabs-glide'
								) }
								value={ videoUrl }
								onChange={ ( val ) =>
									setAttributes( { videoUrl: val } )
								}
								placeholder="https://www.youtube.com/watch?v=..."
								__nextHasNoMarginBottom
							/>
						) }

						{ videoUrl && (
							<>
								<MediaUploadCheck>
									<BaseControl __nextHasNoMarginBottom>
										<BaseControl.VisualLabel>
											{ __(
												'Poster image',
												'ghostlabs-glide'
											) }
										</BaseControl.VisualLabel>
										<p
											id={ posterHelpId }
											className="components-base-control__help"
										>
											{ __(
												'Shown before the video loads. Also used as the thumbnail image.',
												'ghostlabs-glide'
											) }
										</p>
										{ videoPoster ? (
											<>
												<img
													src={ videoPoster }
													alt=""
													style={ {
														width: '100%',
														height: 'auto',
														display: 'block',
														borderRadius: '2px',
													} }
												/>
												<div
													style={ {
														display: 'flex',
														gap: '8px',
														marginTop: '8px',
													} }
												>
													<MediaUpload
														onSelect={ ( media ) =>
															setAttributes( {
																videoPoster:
																	media.url,
															} )
														}
														allowedTypes={ [
															'image',
														] }
														render={ ( {
															open,
														} ) => (
															<Button
																variant="secondary"
																onClick={ open }
																size="small"
																aria-describedby={
																	posterHelpId
																}
															>
																{ __(
																	'Replace poster image',
																	'ghostlabs-glide'
																) }
															</Button>
														) }
													/>
													<Button
														variant="tertiary"
														onClick={ () =>
															setAttributes( {
																videoPoster: '',
															} )
														}
														isDestructive
														size="small"
													>
														{ __(
															'Remove poster image',
															'ghostlabs-glide'
														) }
													</Button>
												</div>
											</>
										) : (
											<MediaUpload
												onSelect={ ( media ) =>
													setAttributes( {
														videoPoster: media.url,
													} )
												}
												allowedTypes={ [ 'image' ] }
												render={ ( { open } ) => (
													<Button
														variant="secondary"
														onClick={ open }
														aria-describedby={
															posterHelpId
														}
													>
														{ __(
															'Select poster image',
															'ghostlabs-glide'
														) }
													</Button>
												) }
											/>
										) }
									</BaseControl>
								</MediaUploadCheck>

								{ playbackApplies( videoSource, videoUrl ) ? (
									<>
										<ToggleControl
											label={ __(
												'Autoplay',
												'ghostlabs-glide'
											) }
											checked={ videoAutoplay }
											onChange={ ( val ) =>
												setAttributes( {
													videoAutoplay: val,
												} )
											}
											help={
												videoAutoplay && ! videoMuted
													? __(
															'Autoplay requires muted in most browsers.',
															'ghostlabs-glide'
													  )
													: undefined
											}
											__nextHasNoMarginBottom
										/>
										<ToggleControl
											label={ __(
												'Loop',
												'ghostlabs-glide'
											) }
											checked={ videoLoop }
											onChange={ ( val ) =>
												setAttributes( {
													videoLoop: val,
												} )
											}
											__nextHasNoMarginBottom
										/>
										<ToggleControl
											label={ __(
												'Muted',
												'ghostlabs-glide'
											) }
											checked={ videoMuted }
											onChange={ ( val ) =>
												setAttributes( {
													videoMuted: val,
												} )
											}
											__nextHasNoMarginBottom
										/>
										<ToggleControl
											label={ __(
												'Show controls',
												'ghostlabs-glide'
											) }
											checked={ videoControls !== false }
											onChange={ ( val ) =>
												setAttributes( {
													videoControls: val,
												} )
											}
											__nextHasNoMarginBottom
										/>
										{ videoControls === false && (
											<Notice
												status="warning"
												isDismissible={ false }
											>
												{ __(
													'Without controls, visitors cannot pause or mute this video. Moving content that plays for more than five seconds needs a way to stop it (WCAG 2.2.2). Keep controls on unless the video is short and stops on its own.',
													'ghostlabs-glide'
												) }
											</Notice>
										) }
									</>
								) : (
									<p className="components-base-control__help">
										{ __(
											"This video plays in its own provider's player, with that player's settings. Autoplay, loop, mute and controls apply to YouTube and Vimeo videos.",
											'ghostlabs-glide'
										) }
									</p>
								) }
							</>
						) }
					</PanelBody>
				</InspectorControls>
			) }

			<div
				{ ...useBlockProps( {
					...( videoUrl && hasVideoBackground
						? {
								className: 'has-video-background',
								style: videoPoster
									? {
											'--ghostlabs-slide-poster': `url(${ videoPoster })`,
									  }
									: undefined,
						  }
						: {} ),
				} ) }
			>
				<InnerBlocks
					allowedBlocks={ allowedBlocks }
					// The layout's own template first: some sticky layouts
					// style a group their pattern seeds, and the mode alone
					// cannot say which.
					template={
						STICKY_SLIDE_TEMPLATES[ stickyMarker ] ||
						SLIDE_TEMPLATES[ parentMode ] ||
						DEFAULT_SLIDE_TEMPLATE
					}
				/>
			</div>
		</>
	);
}
