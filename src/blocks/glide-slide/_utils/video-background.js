import { supportsVideoBackground } from '@edition/slides.js';

/**
 * Whether a slide inside a Glide block of this mode offers a Video Background.
 *
 * ⚠️ **Sticky Scroll never renders one, in any edition.** Its renderers build
 * each step from the slide's content alone (`Glide::stickyStepData()`). The
 * panel used to show there anyway, and the canvas drew the poster, so the
 * editor promised a video the page never played. That rule is shared, because
 * Sticky Scroll is. Whatever else a mode rules out (a paid mode may have nowhere
 * for a video layer to sit) is the edition's to say, through
 * `supportsVideoBackground()`.
 *
 * @param {string} parentMode The containing Glide block's mode.
 * @return {boolean} True when the panel, and the canvas poster, should show.
 */
export function offersVideoBackground( parentMode ) {
	return (
		parentMode !== 'stickyScroll' && supportsVideoBackground( parentMode )
	);
}

/**
 * Whether the frontend drives this video's playback itself — the JS twin of
 * `Glide::renderExternalVideoBackground()`, which embeds a player of its own
 * only for a YouTube or Vimeo URL it can extract an ID from. Anything else,
 * including such a URL with no ID in it, falls back to oEmbed and is that
 * provider's own player, which takes none of the playback settings — so
 * offering them would be offering switches that do nothing.
 *
 * ⚠️ The patterns are `Glide::detectVideoProvider()` and `extractVideoId()`
 * copied as they are, not the editor's `getYouTubeId()`, which accepts URLs
 * the server does not; `video-background.test.js` holds them equal. Change one side and change the other.
 *
 * @param {string} source `file` or `external`.
 * @param {string} url    The video URL.
 * @return {boolean} Whether Autoplay, Loop, Muted and Show controls apply.
 */
export function playbackApplies( source, url ) {
	if ( source !== 'external' ) {
		return true;
	}
	if ( /(?:youtube\.com|youtu\.be)/i.test( url ) ) {
		return [
			/youtu\.be\/([a-zA-Z0-9_-]+)/,
			/[?&]v=([a-zA-Z0-9_-]+)/,
			/\/(?:embed|shorts)\/([a-zA-Z0-9_-]+)/,
		].some( ( pattern ) => pattern.test( url ) );
	}
	if ( /vimeo\.com/i.test( url ) ) {
		return /vimeo\.com\/(?:video\/)?(\d+)/.test( url );
	}
	return false;
}
