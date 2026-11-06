import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

import './editor.scss';

export default function Edit() {
	// No role or aria-label: useBlockProps overwrites both in the canvas, so
	// they never reached the editor's accessibility tree. The front end names
	// the overlay as a group (render.php).
	const blockProps = useBlockProps( {
		className: 'ghostlabs-glide-overlay',
	} );

	return (
		<div { ...blockProps }>
			<div className="ghostlabs-glide-overlay__content">
				<InnerBlocks
					template={ [
						[
							'core/cover',
							{
								dimRatio: 50,
								customOverlayColor: '#000000',
								textColor: 'white',
							},
							[
								[
									'core/heading',
									{
										level: 2,
										placeholder: __(
											'Overlay title',
											'ghostlabs-glide'
										),
									},
								],
								[
									'core/paragraph',
									{
										placeholder: __(
											'Overlay description',
											'ghostlabs-glide'
										),
									},
								],
							],
						],
					] }
				/>
			</div>
		</div>
	);
}
