import { __, sprintf } from '@wordpress/i18n';

export function isCoverBlockEmpty( coverBlock ) {
	const { attributes, innerBlocks } = coverBlock;

	if ( attributes.url || attributes.useFeaturedImage ) {
		return false;
	}

	if ( attributes.overlayColor || attributes.customOverlayColor ) {
		return false;
	}

	if ( attributes.gradient || attributes.customGradient ) {
		return false;
	}

	for ( const inner of innerBlocks ) {
		if (
			inner.name !== 'core/heading' &&
			inner.name !== 'core/paragraph'
		) {
			return false;
		}
		const content = inner.attributes.content;
		if ( content ) {
			const text =
				typeof content === 'string' ? content : String( content );
			if ( text.replace( /<[^>]*>/g, '' ).trim().length > 0 ) {
				return false;
			}
		}
	}

	return true;
}

export function isImageBlockEmpty( imageBlock ) {
	if ( imageBlock.attributes.url ) {
		return false;
	}
	const caption = imageBlock.attributes.caption;
	if ( caption ) {
		const text = typeof caption === 'string' ? caption : String( caption );
		if ( text.replace( /<[^>]*>/g, '' ).trim().length > 0 ) {
			return false;
		}
	}
	return true;
}

/**
 * The first heading text found anywhere inside a block tree.
 *
 * @param {Object} block Block with an innerBlocks array.
 * @return {string} Heading text, stripped of markup, or an empty string.
 */
function extractHeadingText( block ) {
	for ( const inner of block.innerBlocks || [] ) {
		if ( inner.name === 'core/heading' && inner.attributes?.content ) {
			const raw = inner.attributes.content;
			const text = ( typeof raw === 'string' ? raw : String( raw ) )
				.replace( /<[^>]*>/g, '' )
				.trim();
			if ( text ) {
				return text;
			}
		}

		// Headings routinely sit a level or two down — inside a Cover's inner
		// container, or a Group.
		const nested = extractHeadingText( inner );
		if ( nested ) {
			return nested;
		}
	}
	return '';
}

/**
 * A step's contents-rail label.
 *
 * The JS twin of Glide::stepTitle() — the editor rail must read the same as
 * the frontend one, so the two resolution orders have to stay in step: with
 * "Use heading as title" on, the first heading, then the step title, then a
 * numbered fallback; with it off, the step title, then the fallback.
 *
 * @param {Object} slideBlock The glide-slide block.
 * @param {number} index      Zero-based step position, for the fallback label.
 * @return {string} The rail label.
 */
export function extractStepTitle( slideBlock, index ) {
	// ⚠️ The toggle decides, as in `Glide::stepTitle()`: a title kept from when
	// "Use heading as title" was off only stands in for a missing heading.
	if ( slideBlock.attributes?.useHeadingAsTitle !== false ) {
		const heading = extractHeadingText( slideBlock );
		if ( heading ) {
			return heading;
		}
	}

	const explicit = ( slideBlock.attributes?.stepTitle || '' ).trim();
	if ( explicit ) {
		return explicit;
	}

	/* translators: %d: step number */
	return sprintf( __( 'Step %d', 'ghostlabs-glide' ), index + 1 );
}

export function extractThumbnailUrl( slideBlock ) {
	const poster = slideBlock.attributes?.videoPoster;
	if ( poster ) {
		return poster;
	}

	for ( const inner of slideBlock.innerBlocks ) {
		if ( inner.name === 'core/image' && inner.attributes?.url ) {
			return inner.attributes.url;
		}
		if ( inner.name === 'core/cover' && inner.attributes?.url ) {
			return inner.attributes.url;
		}
		const nested = extractThumbnailUrl( {
			innerBlocks: inner.innerBlocks,
			attributes: {},
		} );
		if ( nested ) {
			return nested;
		}
	}
	return '';
}
