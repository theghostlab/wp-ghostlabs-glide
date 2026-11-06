import { readFileSync } from 'fs';
import { join } from 'path';

import { holdAutoplay } from './embed-controls.js';

/**
 * Reduced motion has to stop a background video from starting at all. A pause
 * message sent to a lazy player that is not listening yet is lost, so the hold
 * is in the embed's URL, and the control says what is now true.
 */
describe( 'holdAutoplay', () => {
	const control = `<div class="ghostlabs-glide-slide__embed-controls">
		<button data-action="playPause" data-state="playing"
			data-label-play="Play video" data-label-pause="Pause video"
			aria-label="Pause video"></button>
	</div>`;

	function block( background ) {
		const el = document.createElement( 'div' );
		el.innerHTML = `<div class="ghostlabs-glide-slide">${ background }${ control }</div>`;
		return el;
	}

	const button = ( el ) => el.querySelector( '[data-action="playPause"]' );

	it.each( [
		[
			'youtube',
			'https://www.youtube.com/embed/abc?controls=0&enablejsapi=1&autoplay=1&mute=1',
		],
		[
			'vimeo',
			'https://player.vimeo.com/video/123?background=1&autoplay=1&muted=1&loop=1',
		],
	] )( 'turns off a %s embed’s autoplay in its URL', ( provider, src ) => {
		const el = block(
			`<iframe data-provider="${ provider }" src="${ src }"></iframe>`
		);

		holdAutoplay( el );

		const held = new URL(
			el.querySelector( 'iframe' ).getAttribute( 'src' )
		);
		expect( held.searchParams.get( 'autoplay' ) ).toBe( '0' );
		expect( held.host ).toBe( new URL( src ).host );
	} );

	it( 'leaves every other parameter as it was', () => {
		const src =
			'https://www.youtube.com/embed/abc?controls=0&enablejsapi=1&autoplay=1&loop=1&playlist=abc';
		const el = block(
			`<iframe data-provider="youtube" src="${ src }"></iframe>`
		);

		holdAutoplay( el );

		const before = new URL( src ).searchParams;
		const after = new URL(
			el.querySelector( 'iframe' ).getAttribute( 'src' )
		).searchParams;
		before.delete( 'autoplay' );
		after.delete( 'autoplay' );
		expect( after.toString() ).toBe( before.toString() );
	} );

	it( 'does not touch an embed that was not autoplaying', () => {
		const src =
			'https://www.youtube.com/embed/abc?controls=0&enablejsapi=1';
		const el = block(
			`<iframe data-provider="youtube" src="${ src }"></iframe>`
		);

		holdAutoplay( el );

		expect( el.querySelector( 'iframe' ).getAttribute( 'src' ) ).toBe(
			src
		);
	} );

	it( 'sets the control to say the video is paused', () => {
		const el = block(
			'<iframe data-provider="youtube" src="https://www.youtube.com/embed/abc?autoplay=1"></iframe>'
		);

		holdAutoplay( el );

		expect( button( el ).dataset.state ).toBe( 'paused' );
		expect( button( el ).getAttribute( 'aria-label' ) ).toBe(
			'Play video'
		);
	} );

	it( 'takes a native background video’s autoplay away', () => {
		const el = block(
			'<video class="ghostlabs-glide-slide__video-background" autoplay></video>'
		);
		const video = el.querySelector( 'video' );
		video.pause = jest.fn();

		holdAutoplay( el );

		expect( video.hasAttribute( 'autoplay' ) ).toBe( false );
		expect( video.pause ).toHaveBeenCalled();
		expect( button( el ).dataset.state ).toBe( 'paused' );
	} );

	// At page load, not when the slider module arrives: the players may start
	// before it does.
	it( 'is applied by the view script under reduced motion', () => {
		const view = readFileSync(
			join( __dirname, '../blocks/glide/view.js' ),
			'utf8'
		);

		expect( view ).toMatch(
			/if \( window\.matchMedia\( '\(prefers-reduced-motion: reduce\)' \)\.matches \) \{\s*holdAutoplay\( el \);/
		);
	} );
} );
