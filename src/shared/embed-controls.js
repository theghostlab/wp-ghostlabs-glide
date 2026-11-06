const EMBED_CONTROLS_SELECTOR = '.ghostlabs-glide-slide__embed-controls';
const EMBED_IFRAME_SELECTOR = 'iframe[data-provider]';

function postCommand( iframe, command ) {
	if ( ! iframe?.contentWindow ) {
		return;
	}
	const provider = iframe.dataset.provider;
	if ( provider === 'youtube' ) {
		const func = {
			play: 'playVideo',
			pause: 'pauseVideo',
			mute: 'mute',
			unmute: 'unMute',
		}[ command ];
		if ( func ) {
			iframe.contentWindow.postMessage(
				JSON.stringify( { event: 'command', func, args: '' } ),
				'*'
			);
		}
	} else if ( provider === 'vimeo' ) {
		if ( command === 'mute' ) {
			iframe.contentWindow.postMessage(
				JSON.stringify( { method: 'setVolume', value: 0 } ),
				'*'
			);
		} else if ( command === 'unmute' ) {
			iframe.contentWindow.postMessage(
				JSON.stringify( { method: 'setVolume', value: 1 } ),
				'*'
			);
		} else {
			iframe.contentWindow.postMessage(
				JSON.stringify( { method: command } ),
				'*'
			);
		}
	}
}

export function setupEmbedControls( container ) {
	const controlGroups = container.querySelectorAll( EMBED_CONTROLS_SELECTOR );

	controlGroups.forEach( ( controls ) => {
		const slide = controls.closest( '.ghostlabs-glide-slide' );
		if ( ! slide ) {
			return;
		}

		const iframe = slide.querySelector( EMBED_IFRAME_SELECTOR );
		const video = ! iframe ? slide.querySelector( 'video' ) : null;

		if ( ! iframe && ! video ) {
			return;
		}

		controls.addEventListener( 'click', ( e ) => {
			const button = e.target.closest(
				'.ghostlabs-glide-slide__embed-control'
			);
			if ( ! button ) {
				return;
			}

			const action = button.dataset.action;

			if ( action === 'playPause' ) {
				const isPlaying = button.dataset.state === 'playing';
				if ( iframe ) {
					postCommand( iframe, isPlaying ? 'pause' : 'play' );
				} else if ( video ) {
					if ( isPlaying ) {
						video.pause();
					} else {
						video.play().catch( () => {} );
					}
				}
				button.dataset.state = isPlaying ? 'paused' : 'playing';
				button.setAttribute(
					'aria-label',
					isPlaying
						? button.dataset.labelPlay
						: button.dataset.labelPause
				);
			} else if ( action === 'mute' ) {
				const isMuted = button.dataset.state === 'muted';
				if ( iframe ) {
					postCommand( iframe, isMuted ? 'unmute' : 'mute' );
				} else if ( video ) {
					video.muted = ! isMuted;
				}
				button.dataset.state = isMuted ? 'unmuted' : 'muted';
				button.setAttribute(
					'aria-label',
					isMuted
						? button.dataset.labelMute
						: button.dataset.labelUnmute
				);
			}
		} );
	} );
}

/**
 * Sets a slide's play/pause control to say what the video is doing.
 *
 * @param {HTMLElement|null} slide   The slide.
 * @param {boolean}          playing Whether the video is playing.
 */
function showPlaybackState( slide, playing ) {
	const playBtn = slide?.querySelector( '[data-action="playPause"]' );
	if ( playBtn ) {
		playBtn.dataset.state = playing ? 'playing' : 'paused';
		playBtn.setAttribute(
			'aria-label',
			playing ? playBtn.dataset.labelPause : playBtn.dataset.labelPlay
		);
	}
}

export function pauseEmbed( slide ) {
	const iframe = slide?.querySelector( EMBED_IFRAME_SELECTOR );
	if ( iframe ) {
		postCommand( iframe, 'pause' );
	}
	showPlaybackState( slide, false );
}

export function resumeEmbed( slide ) {
	const iframe = slide?.querySelector( EMBED_IFRAME_SELECTOR );
	if ( iframe ) {
		postCommand( iframe, 'play' );
	}
	showPlaybackState( slide, true );
}

/**
 * Stops every background video in a Glide block from starting on its own, for
 * a visitor who has asked for reduced motion.
 *
 * ⚠️ **The embed's own URL, not a message to its player.** The players are
 * lazy iframes that load whenever the browser decides, and a `pause` sent
 * before a player is listening is dropped without a word — so the slider's
 * one pause at start-up missed every embed that loaded after it, and a slide
 * shown later played on `autoplay=1` under a control reading "Play". Rewriting
 * `autoplay=1` to `0` before the player starts cannot be missed: YouTube honours
 * it, and Vimeo honours an explicit `0` even in background mode (see
 * `Glide::buildVimeoEmbedUrl()`). An embed that had already started reloads,
 * paused. A native video loses its `autoplay` the same way.
 *
 * Every control then says Paused, which is now true, and the video still plays
 * for anyone who presses Play.
 *
 * @param {HTMLElement} container The Glide block.
 */
export function holdAutoplay( container ) {
	container.querySelectorAll( EMBED_IFRAME_SELECTOR ).forEach( ( iframe ) => {
		let url;
		try {
			url = new URL( iframe.getAttribute( 'src' ) || '' );
		} catch {
			return;
		}

		if ( url.searchParams.get( 'autoplay' ) === '1' ) {
			url.searchParams.set( 'autoplay', '0' );
			iframe.setAttribute( 'src', url.toString() );
		}

		showPlaybackState( iframe.closest( '.ghostlabs-glide-slide' ), false );
	} );

	container
		.querySelectorAll( 'video.ghostlabs-glide-slide__video-background' )
		.forEach( ( video ) => {
			video.autoplay = false;
			video.removeAttribute( 'autoplay' );
			video.pause();
			showPlaybackState(
				video.closest( '.ghostlabs-glide-slide' ),
				false
			);
		} );
}
