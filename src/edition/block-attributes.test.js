import additions from './block-attributes.json';
import glide from '@shared/blocks/glide/block.json';
import glideSlide from '@shared/blocks/glide-slide/block.json';

/**
 * This edition ships the shared schema exactly, so the lists below are what
 * it ships.
 *
 * ⚠️ **A positive list, on purpose.** An attribute added to a shared
 * `block.json` reaches this build whether or not this build renders it, and
 * nothing else asks. Adding one here is the decision that it belongs in every
 * edition; an attribute only some editions render goes in theirs instead.
 */
describe( 'the schema this edition ships', () => {
	it( 'adds nothing to the shared block.json', () => {
		expect( additions ).toEqual( {} );
	} );

	it( 'declares these Glide attributes and no others', () => {
		expect( Object.keys( glide.attributes ).sort() ).toEqual(
			[ 'contentSlider', 'mode', 'regionLabel', 'stickyScroll' ].sort()
		);
	} );

	it( 'defaults these content slider settings and no others', () => {
		expect(
			Object.keys( glide.attributes.contentSlider.default ).sort()
		).toEqual(
			[
				'autoHideControls',
				'autoplay',
				'autoplayInterval',
				'dragFree',
				'fade',
				'fit',
				'gap',
				'height',
				'heightAuto',
				'heightDesktop',
				'heightMobile',
				'heightTablet',
				'loop',
				'navigation',
				'showArrows',
				'showThumbnails',
				'slidesPerView',
				'speed',
				'thumbnailPosition',
				'useResponsiveHeight',
				'verticalAlign',
			].sort()
		);
	} );

	it( 'defaults these sticky scroll settings and no others', () => {
		expect(
			Object.keys( glide.attributes.stickyScroll.default ).sort()
		).toEqual(
			[
				'markerStyle',
				'railPosition',
				'railWidth',
				'showProgressLine',
				'showStepCounter',
				'smoothScroll',
				'stickyOffset',
			].sort()
		);
	} );

	it( 'declares these Glide Slide attributes and no others', () => {
		expect( Object.keys( glideSlide.attributes ).sort() ).toEqual(
			[
				'includeInContents',
				'stepTitle',
				'useHeadingAsTitle',
				'videoAutoplay',
				'videoControls',
				'videoId',
				'videoLoop',
				'videoMuted',
				'videoPoster',
				'videoSource',
				'videoUrl',
			].sort()
		);
	} );
} );
