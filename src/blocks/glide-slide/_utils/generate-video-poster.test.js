const mockApiFetch = jest.fn();
jest.mock(
	'@wordpress/api-fetch',
	() => ( {
		__esModule: true,
		default: ( ...args ) => mockApiFetch( ...args ),
	} ),
	{ virtual: true }
);

const { generateVideoPoster } = require( './generate-video-poster.js' );

const REST_NAMESPACE = 'ghostlabs/glide/pro/v1';

beforeEach( () => {
	global.ghostlabsGlide = { restNamespace: REST_NAMESPACE };
	jest.clearAllMocks();
	jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
} );

afterEach( () => {
	jest.useRealTimers();
	// eslint-disable-next-line no-console
	console.warn.mockRestore();
} );

describe( 'generateVideoPoster', () => {
	test( 'returns server result when ffmpeg available', async () => {
		mockApiFetch
			.mockResolvedValueOnce( { available: true } )
			.mockResolvedValueOnce( {
				success: true,
				posterUrl: 'http://example.com/poster.jpg',
				posterId: 99,
			} );

		const result = await generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);

		expect( result ).toEqual( {
			posterUrl: 'http://example.com/poster.jpg',
			posterId: 99,
		} );

		expect( mockApiFetch ).toHaveBeenCalledWith( {
			path: `/${ REST_NAMESPACE }/video/ffmpeg-status`,
		} );

		expect( mockApiFetch ).toHaveBeenCalledWith( {
			path: `/${ REST_NAMESPACE }/video/generate-poster`,
			method: 'POST',
			data: { attachmentId: 42 },
		} );
	} );

	test( 'only calls ffmpeg-status when not available', async () => {
		jest.useFakeTimers();

		mockApiFetch.mockResolvedValueOnce( { available: false } );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);

		jest.advanceTimersByTime( 16000 );
		const result = await promise;

		expect( mockApiFetch ).toHaveBeenCalledTimes( 1 );
		expect( mockApiFetch ).toHaveBeenCalledWith( {
			path: `/${ REST_NAMESPACE }/video/ffmpeg-status`,
		} );
		expect( result ).toBeNull();
	} );

	test( 'returns null when server throws', async () => {
		jest.useFakeTimers();

		mockApiFetch.mockRejectedValueOnce( new Error( 'network error' ) );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);

		jest.advanceTimersByTime( 16000 );
		const result = await promise;

		expect( result ).toBeNull();
	} );

	test( 'returns null when generate-poster has no success flag', async () => {
		jest.useFakeTimers();

		mockApiFetch
			.mockResolvedValueOnce( { available: true } )
			.mockResolvedValueOnce( { success: false } );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);

		jest.advanceTimersByTime( 16000 );
		const result = await promise;

		expect( result ).toBeNull();
	} );

	test( 'warns on failure', async () => {
		jest.useFakeTimers();

		mockApiFetch.mockRejectedValueOnce( new Error( 'network error' ) );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);

		jest.advanceTimersByTime( 16000 );
		await promise;

		// eslint-disable-next-line no-console
		expect( console.warn ).toHaveBeenCalledWith(
			'Auto poster generation failed:',
			expect.any( String )
		);
	} );

	test( 'uses correct rest namespace from global', async () => {
		global.ghostlabsGlide = { restNamespace: 'custom/namespace/v2' };

		mockApiFetch
			.mockResolvedValueOnce( { available: true } )
			.mockResolvedValueOnce( {
				success: true,
				posterUrl: 'http://example.com/poster.jpg',
				posterId: 1,
			} );

		await generateVideoPoster( 1, 'http://example.com/video.mp4' );

		expect( mockApiFetch ).toHaveBeenCalledWith( {
			path: '/custom/namespace/v2/video/ffmpeg-status',
		} );
	} );
} );

describe( 'extractFrameViaCanvas (via generateVideoPoster fallback)', () => {
	let mockVideo;
	let mockCanvas;
	let originalCreateElement;

	function createMockVideo( overrides = {} ) {
		const listeners = {};
		return {
			crossOrigin: '',
			muted: false,
			preload: '',
			src: '',
			currentTime: 0,
			duration: overrides.duration ?? 10,
			videoWidth: overrides.videoWidth ?? 640,
			videoHeight: overrides.videoHeight ?? 480,
			addEventListener: ( evt, fn ) => {
				listeners[ evt ] = fn;
			},
			removeAttribute: jest.fn(),
			load: jest.fn(),
			_fire: ( evt ) => listeners[ evt ]?.(),
			_listeners: listeners,
		};
	}

	function createMockCanvas( blob ) {
		const ctx = { drawImage: jest.fn() };
		return {
			width: 0,
			height: 0,
			getContext: jest.fn( () => ctx ),
			toBlob: jest.fn( ( cb ) => cb( blob ) ),
			_ctx: ctx,
		};
	}

	function flushPromises() {
		return new Promise( ( resolve ) => setImmediate( resolve ) );
	}

	beforeEach( () => {
		originalCreateElement = document.createElement.bind( document );
		mockVideo = createMockVideo();
		mockCanvas = createMockCanvas( new Blob( [ 'fake' ] ) );

		jest.spyOn( document, 'createElement' ).mockImplementation( ( tag ) => {
			if ( tag === 'video' ) {
				return mockVideo;
			}
			if ( tag === 'canvas' ) {
				return mockCanvas;
			}
			return originalCreateElement( tag );
		} );

		mockApiFetch.mockResolvedValueOnce( { available: false } );
	} );

	afterEach( () => {
		document.createElement.mockRestore();
	} );

	test( 'creates video element with correct attributes', async () => {
		mockApiFetch.mockResolvedValueOnce( {
			source_url: 'http://example.com/poster.jpg',
			id: 99,
		} );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);
		await flushPromises();

		mockVideo._fire( 'loadeddata' );
		mockVideo._fire( 'seeked' );
		await promise;

		expect( mockVideo.crossOrigin ).toBe( 'anonymous' );
		expect( mockVideo.muted ).toBe( true );
		expect( mockVideo.preload ).toBe( 'auto' );
		expect( mockVideo.src ).toBe( 'http://example.com/video.mp4' );
	} );

	test( 'seeks to SEEK_TIME clamped to duration', async () => {
		mockVideo = createMockVideo( { duration: 10 } );
		jest.spyOn( document, 'createElement' ).mockImplementation( ( tag ) => {
			if ( tag === 'video' ) {
				return mockVideo;
			}
			if ( tag === 'canvas' ) {
				return mockCanvas;
			}
			return originalCreateElement( tag );
		} );
		mockApiFetch.mockResolvedValueOnce( {
			source_url: 'http://example.com/poster.jpg',
			id: 99,
		} );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);
		await flushPromises();

		mockVideo._fire( 'loadeddata' );
		expect( mockVideo.currentTime ).toBe( 2.0 );

		mockVideo._fire( 'seeked' );
		await promise;
	} );

	test( 'seeks to duration when shorter than SEEK_TIME', async () => {
		mockVideo = createMockVideo( { duration: 0.5 } );
		jest.spyOn( document, 'createElement' ).mockImplementation( ( tag ) => {
			if ( tag === 'video' ) {
				return mockVideo;
			}
			if ( tag === 'canvas' ) {
				return mockCanvas;
			}
			return originalCreateElement( tag );
		} );
		mockApiFetch.mockResolvedValueOnce( {
			source_url: 'http://example.com/poster.jpg',
			id: 99,
		} );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);
		await flushPromises();

		mockVideo._fire( 'loadeddata' );
		expect( mockVideo.currentTime ).toBe( 0.5 );

		mockVideo._fire( 'seeked' );
		await promise;
	} );

	test( 'creates canvas with video dimensions and draws frame', async () => {
		mockApiFetch.mockResolvedValueOnce( {
			source_url: 'http://example.com/poster.jpg',
			id: 99,
		} );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);
		await flushPromises();

		mockVideo._fire( 'loadeddata' );
		mockVideo._fire( 'seeked' );
		await promise;

		expect( mockCanvas.width ).toBe( 640 );
		expect( mockCanvas.height ).toBe( 480 );
		expect( mockCanvas.getContext ).toHaveBeenCalledWith( '2d' );
		expect( mockCanvas._ctx.drawImage ).toHaveBeenCalledWith(
			mockVideo,
			0,
			0,
			640,
			480
		);
	} );

	test( 'calls toBlob with JPEG at 0.85 quality', async () => {
		mockApiFetch.mockResolvedValueOnce( {
			source_url: 'http://example.com/poster.jpg',
			id: 99,
		} );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);
		await flushPromises();

		mockVideo._fire( 'loadeddata' );
		mockVideo._fire( 'seeked' );
		await promise;

		expect( mockCanvas.toBlob ).toHaveBeenCalledWith(
			expect.any( Function ),
			'image/jpeg',
			0.85
		);
	} );

	test( 'uploads blob and returns posterUrl/posterId', async () => {
		mockApiFetch.mockResolvedValueOnce( {
			source_url: 'http://example.com/generated-poster.jpg',
			id: 55,
		} );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);
		await flushPromises();

		mockVideo._fire( 'loadeddata' );
		mockVideo._fire( 'seeked' );
		const result = await promise;

		expect( result ).toEqual( {
			posterUrl: 'http://example.com/generated-poster.jpg',
			posterId: 55,
		} );

		const uploadCall = mockApiFetch.mock.calls.find(
			( call ) => call[ 0 ].path === '/wp/v2/media'
		);
		expect( uploadCall ).toBeTruthy();
		expect( uploadCall[ 0 ].method ).toBe( 'POST' );
		expect( uploadCall[ 0 ].body ).toBeInstanceOf( FormData );
	} );

	test( 'returns null when video fires error', async () => {
		const promise = generateVideoPoster(
			42,
			'http://example.com/bad-video.mp4'
		);
		await flushPromises();

		mockVideo._fire( 'error' );
		const result = await promise;

		expect( result ).toBeNull();
		// eslint-disable-next-line no-console
		expect( console.warn ).toHaveBeenCalledWith(
			'Auto poster generation failed:',
			expect.any( String )
		);
	} );

	test( 'returns null when toBlob returns null', async () => {
		mockCanvas = createMockCanvas( null );
		jest.spyOn( document, 'createElement' ).mockImplementation( ( tag ) => {
			if ( tag === 'video' ) {
				return mockVideo;
			}
			if ( tag === 'canvas' ) {
				return mockCanvas;
			}
			return originalCreateElement( tag );
		} );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);
		await flushPromises();

		mockVideo._fire( 'loadeddata' );
		mockVideo._fire( 'seeked' );
		const result = await promise;

		expect( result ).toBeNull();
		// eslint-disable-next-line no-console
		expect( console.warn ).toHaveBeenCalledWith(
			'Auto poster generation failed:',
			expect.any( String )
		);
	} );

	test( 'cleans up video src on error and after seeked', async () => {
		mockApiFetch.mockResolvedValueOnce( {
			source_url: 'http://example.com/poster.jpg',
			id: 99,
		} );

		const promise = generateVideoPoster(
			42,
			'http://example.com/video.mp4'
		);
		await flushPromises();

		mockVideo._fire( 'loadeddata' );
		mockVideo._fire( 'seeked' );
		await promise;

		expect( mockVideo.removeAttribute ).toHaveBeenCalledWith( 'src' );
		expect( mockVideo.load ).toHaveBeenCalled();
	} );
} );
