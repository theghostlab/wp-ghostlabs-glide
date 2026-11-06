import {
	isCoverBlockEmpty,
	isImageBlockEmpty,
	extractThumbnailUrl,
	extractStepTitle,
} from './block-helpers';

describe( 'isCoverBlockEmpty', () => {
	const emptyCover = { attributes: {}, innerBlocks: [] };

	test( 'returns true for empty cover', () => {
		expect( isCoverBlockEmpty( emptyCover ) ).toBe( true );
	} );

	test( 'returns false when url is set', () => {
		expect(
			isCoverBlockEmpty( {
				attributes: { url: 'https://example.com/img.jpg' },
				innerBlocks: [],
			} )
		).toBe( false );
	} );

	test( 'returns false when useFeaturedImage is set', () => {
		expect(
			isCoverBlockEmpty( {
				attributes: { useFeaturedImage: true },
				innerBlocks: [],
			} )
		).toBe( false );
	} );

	test( 'returns false when overlayColor is set', () => {
		expect(
			isCoverBlockEmpty( {
				attributes: { overlayColor: 'vivid-red' },
				innerBlocks: [],
			} )
		).toBe( false );
	} );

	test( 'returns false when customOverlayColor is set', () => {
		expect(
			isCoverBlockEmpty( {
				attributes: { customOverlayColor: '#ff0000' },
				innerBlocks: [],
			} )
		).toBe( false );
	} );

	test( 'returns false when gradient is set', () => {
		expect(
			isCoverBlockEmpty( {
				attributes: { gradient: 'vivid-cyan-blue-to-vivid-purple' },
				innerBlocks: [],
			} )
		).toBe( false );
	} );

	test( 'returns false when customGradient is set', () => {
		expect(
			isCoverBlockEmpty( {
				attributes: {
					customGradient: 'linear-gradient(135deg,#000 0%,#fff 100%)',
				},
				innerBlocks: [],
			} )
		).toBe( false );
	} );

	test( 'returns false when heading has text', () => {
		expect(
			isCoverBlockEmpty( {
				attributes: {},
				innerBlocks: [
					{
						name: 'core/heading',
						attributes: { content: 'Hello World' },
					},
				],
			} )
		).toBe( false );
	} );

	test( 'returns true when heading has only HTML tags', () => {
		expect(
			isCoverBlockEmpty( {
				attributes: {},
				innerBlocks: [
					{
						name: 'core/heading',
						attributes: { content: '<strong></strong>' },
					},
				],
			} )
		).toBe( true );
	} );

	test( 'returns false when non-heading/paragraph inner block exists', () => {
		expect(
			isCoverBlockEmpty( {
				attributes: {},
				innerBlocks: [ { name: 'core/image', attributes: {} } ],
			} )
		).toBe( false );
	} );
} );

describe( 'isImageBlockEmpty', () => {
	test( 'returns true with no url or caption', () => {
		expect( isImageBlockEmpty( { attributes: {} } ) ).toBe( true );
	} );

	test( 'returns false when url is set', () => {
		expect(
			isImageBlockEmpty( {
				attributes: { url: 'https://example.com/img.jpg' },
			} )
		).toBe( false );
	} );

	test( 'returns false when caption has text', () => {
		expect(
			isImageBlockEmpty( {
				attributes: { caption: 'A nice photo' },
			} )
		).toBe( false );
	} );

	test( 'returns true when caption is only HTML', () => {
		expect(
			isImageBlockEmpty( {
				attributes: { caption: '<em></em>' },
			} )
		).toBe( true );
	} );

	test( 'returns false when both url and caption set', () => {
		expect(
			isImageBlockEmpty( {
				attributes: {
					url: 'https://example.com/img.jpg',
					caption: 'Photo',
				},
			} )
		).toBe( false );
	} );
} );

describe( 'extractThumbnailUrl', () => {
	test( 'returns videoPoster when present', () => {
		expect(
			extractThumbnailUrl( {
				attributes: { videoPoster: 'https://example.com/poster.jpg' },
				innerBlocks: [],
			} )
		).toBe( 'https://example.com/poster.jpg' );
	} );

	test( 'returns core/image url', () => {
		expect(
			extractThumbnailUrl( {
				attributes: {},
				innerBlocks: [
					{
						name: 'core/image',
						attributes: { url: 'https://example.com/img.jpg' },
						innerBlocks: [],
					},
				],
			} )
		).toBe( 'https://example.com/img.jpg' );
	} );

	test( 'returns core/cover url', () => {
		expect(
			extractThumbnailUrl( {
				attributes: {},
				innerBlocks: [
					{
						name: 'core/cover',
						attributes: { url: 'https://example.com/cover.jpg' },
						innerBlocks: [],
					},
				],
			} )
		).toBe( 'https://example.com/cover.jpg' );
	} );

	test( 'returns nested image url', () => {
		expect(
			extractThumbnailUrl( {
				attributes: {},
				innerBlocks: [
					{
						name: 'core/group',
						attributes: {},
						innerBlocks: [
							{
								name: 'core/image',
								attributes: {
									url: 'https://example.com/nested.jpg',
								},
								innerBlocks: [],
							},
						],
					},
				],
			} )
		).toBe( 'https://example.com/nested.jpg' );
	} );

	test( 'returns empty string when no images found', () => {
		expect(
			extractThumbnailUrl( {
				attributes: {},
				innerBlocks: [
					{
						name: 'core/paragraph',
						attributes: {},
						innerBlocks: [],
					},
				],
			} )
		).toBe( '' );
	} );

	test( 'prioritizes poster over inner image', () => {
		expect(
			extractThumbnailUrl( {
				attributes: { videoPoster: 'https://example.com/poster.jpg' },
				innerBlocks: [
					{
						name: 'core/image',
						attributes: { url: 'https://example.com/img.jpg' },
						innerBlocks: [],
					},
				],
			} )
		).toBe( 'https://example.com/poster.jpg' );
	} );

	test( 'returns empty string for empty slide', () => {
		expect(
			extractThumbnailUrl( { attributes: {}, innerBlocks: [] } )
		).toBe( '' );
	} );
} );

describe( 'extractStepTitle', () => {
	const heading = ( content ) => ( {
		name: 'core/heading',
		attributes: { content },
		innerBlocks: [],
	} );

	const step = ( attributes, innerBlocks = [] ) => ( {
		attributes,
		innerBlocks,
	} );

	test( 'uses the step title when the heading is turned off', () => {
		expect(
			extractStepTitle(
				step( { stepTitle: 'Explicit', useHeadingAsTitle: false }, [
					heading( 'Heading' ),
				] ),
				0
			)
		).toBe( 'Explicit' );
	} );

	// The field hides when the toggle goes back on and keeps what was typed,
	// so a title the author can no longer see must not override the heading.
	test( 'lets the heading win over a title kept from when it was off', () => {
		expect(
			extractStepTitle(
				step( { stepTitle: 'Leftover' }, [ heading( 'Heading' ) ] ),
				0
			)
		).toBe( 'Heading' );
	} );

	test( 'uses a kept title when the step has no heading', () => {
		expect( extractStepTitle( step( { stepTitle: 'Kept' }, [] ), 0 ) ).toBe(
			'Kept'
		);
	} );

	test( 'falls back to the first heading', () => {
		expect(
			extractStepTitle( step( {}, [ heading( 'Deployment' ) ] ), 0 )
		).toBe( 'Deployment' );
	} );

	test( 'strips markup from the heading', () => {
		expect(
			extractStepTitle(
				step( {}, [ heading( '<strong>Bold</strong> title' ) ] ),
				0
			)
		).toBe( 'Bold title' );
	} );

	test( 'finds a heading nested inside another block', () => {
		const nested = step( {}, [
			{
				name: 'core/cover',
				attributes: {},
				innerBlocks: [
					{
						name: 'core/group',
						attributes: {},
						innerBlocks: [ heading( 'Nested' ) ],
					},
				],
			},
		] );

		expect( extractStepTitle( nested, 0 ) ).toBe( 'Nested' );
	} );

	test( 'ignores the heading when the author opts out', () => {
		expect(
			extractStepTitle(
				step( { useHeadingAsTitle: false }, [ heading( 'Heading' ) ] ),
				2
			)
		).toBe( 'Step 3' );
	} );

	test( 'falls back to a numbered label when there is no heading', () => {
		expect( extractStepTitle( step( {}, [] ), 0 ) ).toBe( 'Step 1' );
	} );

	test( 'treats a whitespace-only title as absent', () => {
		expect(
			extractStepTitle(
				step( { stepTitle: '   ' }, [ heading( 'Heading' ) ] ),
				0
			)
		).toBe( 'Heading' );
	} );
} );
