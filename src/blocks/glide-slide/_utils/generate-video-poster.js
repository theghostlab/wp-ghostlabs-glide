/* global ghostlabsGlide */
import apiFetch from '@wordpress/api-fetch';

const TIMEOUT_MS = 15000;
const SEEK_TIME = 2.0;

function withTimeout( promise ) {
	return Promise.race( [
		promise,
		new Promise( ( _, reject ) =>
			setTimeout(
				() => reject( new Error( 'Poster generation timed out' ) ),
				TIMEOUT_MS
			)
		),
	] );
}

async function extractFrameViaCanvas( videoUrl, videoId ) {
	return new Promise( ( resolve, reject ) => {
		const video = document.createElement( 'video' );
		video.crossOrigin = 'anonymous';
		video.muted = true;
		video.preload = 'auto';
		video.src = videoUrl;

		const cleanup = () => {
			video.removeAttribute( 'src' );
			video.load();
		};

		video.addEventListener( 'error', () => {
			cleanup();
			reject( new Error( 'Video failed to load' ) );
		} );

		video.addEventListener( 'loadeddata', () => {
			video.currentTime = Math.min( SEEK_TIME, video.duration );
		} );

		video.addEventListener( 'seeked', () => {
			const canvas = document.createElement( 'canvas' );
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			const ctx = canvas.getContext( '2d' );
			ctx.drawImage( video, 0, 0, canvas.width, canvas.height );
			cleanup();

			canvas.toBlob(
				( blob ) => {
					if ( ! blob ) {
						reject( new Error( 'Canvas toBlob returned null' ) );
						return;
					}
					resolve( blob );
				},
				'image/jpeg',
				0.85
			);
		} );
	} ).then( async ( blob ) => {
		const formData = new FormData();
		formData.append( 'file', blob, `glide-poster-${ videoId }.jpg` );

		const media = await apiFetch( {
			path: '/wp/v2/media',
			method: 'POST',
			body: formData,
		} );

		return { posterUrl: media.source_url, posterId: media.id };
	} );
}

async function tryServerSide( videoId ) {
	const status = await apiFetch( {
		path: `/${ ghostlabsGlide.restNamespace }/video/ffmpeg-status`,
	} );

	if ( ! status?.available ) {
		return null;
	}

	const result = await apiFetch( {
		path: `/${ ghostlabsGlide.restNamespace }/video/generate-poster`,
		method: 'POST',
		data: { attachmentId: videoId },
	} );

	if ( result?.success ) {
		return { posterUrl: result.posterUrl, posterId: result.posterId };
	}

	return null;
}

export async function generateVideoPoster( videoId, videoUrl ) {
	try {
		return await withTimeout(
			( async () => {
				try {
					const serverResult = await tryServerSide( videoId );
					if ( serverResult ) {
						return serverResult;
					}
				} catch {
					// Server-side unavailable or failed — fall through to Canvas
				}

				return await extractFrameViaCanvas( videoUrl, videoId );
			} )()
		);
	} catch ( error ) {
		// eslint-disable-next-line no-console
		console.warn( 'Auto poster generation failed:', error.message );
		return null;
	}
}
