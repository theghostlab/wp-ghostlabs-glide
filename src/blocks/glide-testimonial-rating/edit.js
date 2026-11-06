import { __, sprintf } from '@wordpress/i18n';
import {
	AlignmentControl,
	BlockControls,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	Dropdown,
	RangeControl,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const value = Math.max( 1, Math.min( 5, attributes.value ?? 5 ) );
	const { textAlign } = attributes;
	const stars = '★'.repeat( value ) + '☆'.repeat( 5 - value );
	const label = sprintf(
		/* translators: %d is the star rating from 1 to 5 */
		__( '%d out of 5 stars', 'ghostlabs-glide' ),
		value
	);

	const className = [
		'ghostlabs-glide-testimonial__rating',
		textAlign ? `has-text-align-${ textAlign }` : '',
	]
		.filter( Boolean )
		.join( ' ' );

	// ⚠️ No role or aria-label here: useBlockProps overwrites both with the
	// block's own ("document", "Block: …") in the canvas, so they never reached
	// a screen reader. The value is spoken from the visually hidden text below.
	const blockProps = useBlockProps( { className } );

	return (
		<>
			<BlockControls group="block">
				<AlignmentControl
					value={ textAlign }
					onChange={ ( next ) =>
						setAttributes( { textAlign: next } )
					}
				/>
			</BlockControls>

			<BlockControls>
				<ToolbarGroup>
					<Dropdown
						popoverProps={ { placement: 'bottom-start' } }
						renderToggle={ ( { isOpen, onToggle } ) => (
							<ToolbarButton
								icon="star-filled"
								label={ sprintf(
									/* translators: %d is the current star rating */
									__( 'Rating: %d / 5', 'ghostlabs-glide' ),
									value
								) }
								onClick={ onToggle }
								aria-expanded={ isOpen }
								// A dialog holding a slider, not a menu, which is
								// what `true` announces.
								aria-haspopup="dialog"
							/>
						) }
						renderContent={ () => (
							<div
								style={ {
									padding: '8px 12px',
									minWidth: '220px',
								} }
							>
								<RangeControl
									__nextHasNoMarginBottom
									label={ __( 'Stars', 'ghostlabs-glide' ) }
									value={ value }
									min={ 1 }
									max={ 5 }
									step={ 1 }
									onChange={ ( next ) =>
										setAttributes( {
											value:
												typeof next === 'number'
													? next
													: 5,
										} )
									}
									__next40pxDefaultSize
								/>
							</div>
						) }
					/>
				</ToolbarGroup>
			</BlockControls>

			<div { ...blockProps }>
				<span aria-hidden="true">{ stars }</span>
				<span className="screen-reader-text">{ label }</span>
			</div>
		</>
	);
}
