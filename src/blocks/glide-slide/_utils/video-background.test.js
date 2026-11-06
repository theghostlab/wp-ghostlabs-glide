import { offersVideoBackground, playbackApplies } from './video-background.js';

// The paid edition's `@edition/slides.js` also exports its slide panels, which import these.
// WordPress supplies them at runtime and they are not installed for Jest.
// `virtual` because free's tree does not import them at all.
jest.mock( '@wordpress/block-editor', () => ( {} ), { virtual: true } );
jest.mock( '@wordpress/components', () => ( {} ), { virtual: true } );

/**
 * Runs in both editions, each against its own `@edition/slides.js`, so it
 * asserts only what every edition agrees on.
 */
describe( 'offersVideoBackground', () => {
	it( 'offers a video background in the content slider', () => {
		expect( offersVideoBackground( 'contentSlider' ) ).toBe( true );
	} );

	it( 'never offers one in sticky scroll, which renders no video', () => {
		expect( offersVideoBackground( 'stickyScroll' ) ).toBe( false );
	} );
} );

/**
 * The playback switches are offered exactly where the server embeds a player
 * of its own. Everywhere else the video is the provider's oEmbed player and
 * the switches would do nothing.
 */
describe( 'playbackApplies', () => {
	it.each( [
		[ 'file', 'https://example.com/clip.mp4', true ],
		[ 'external', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', true ],
		[ 'external', 'https://youtu.be/dQw4w9WgXcQ', true ],
		[ 'external', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', true ],
		[ 'external', 'https://vimeo.com/76979871', true ],
		[ 'external', 'https://player.vimeo.com/video/76979871', true ],
		// The domain matches but there is no ID: the server falls back to oEmbed.
		[ 'external', 'https://www.youtube.com/@somechannel', false ],
		[ 'external', 'https://vimeo.com/channels/staffpicks', false ],
		[ 'external', 'https://www.dailymotion.com/video/x8abc', false ],
	] )( '%s %s → %s', ( source, url, expected ) => {
		expect( playbackApplies( source, url ) ).toBe( expected );
	} );

	it( 'uses the server’s own patterns', () => {
		const { readFileSync } = require( 'fs' );
		const { join } = require( 'path' );
		const php = readFileSync(
			join( __dirname, '../../../../inc/Service/Glide.php' ),
			'utf8'
		);
		const js = readFileSync(
			join( __dirname, 'video-background.js' ),
			'utf8'
		);
		const patterns = [
			...php.matchAll(
				/private function (?:detectVideoProvider|extractYouTubeId|extractVimeoId)[\s\S]*?\n {4}\}/g
			),
		]
			.map( ( [ body ] ) => [
				...body.matchAll( /preg_match\('\/(.+?)\/i?'/g ),
			] )
			.flat()
			.map( ( [ , pattern ] ) => pattern );

		expect( patterns ).toHaveLength( 6 );
		patterns.forEach( ( pattern ) =>
			expect( js ).toContain( `/${ pattern }/` )
		);
	} );
} );
