import { createBlock } from '@wordpress/blocks';

export const insertSlideBlock = ( clientId, sliderRef ) => () => {
	const innerCount = wp.data
		.select( 'core/block-editor' )
		.getBlocksByClientId( clientId )[ 0 ].innerBlocks.length;
	const block = createBlock( 'ghostlabs/glide-slide' );

	wp.data
		.dispatch( 'core/block-editor' )
		.insertBlock( block, innerCount, clientId );

	if ( sliderRef.current ) {
		sliderRef.current.scrollIntoView( {
			behavior: 'smooth',
			block: 'start',
		} );
	}
};
