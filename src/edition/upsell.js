import { ExternalLink, Notice, PanelBody } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { store as preferencesStore } from '@wordpress/preferences';
import { speak } from '@wordpress/a11y';

import './upsell.scss';

/**
 * This edition's three upsell surfaces in the Glide block's sidebar: a panel last in the sidebar,
 * a notice under Mode and a notice under the content slider's Tweens. The shared `edit.js` renders
 * the slots; the edition decides what fills them.
 *
 * They point out, and never refuse: the controls beside them offer only what this build does, and
 * nothing they name is in it (WordPress.org Guideline 5).
 *
 * 🔴 **Every word and every URL comes from PHP** (`Service\EditorUpsell`, through the localized
 * `ghostlabsGlide.upgrade`). There is no literal URL here and no fallback: a surface whose URL is
 * missing renders its copy with no link, and one whose copy is missing renders nothing. A
 * hard-coded link would render, resolve and file the sale under no surface at all. The copy is
 * PHP's too, so this script names nothing the other edition adds.
 */
const SCOPE = 'ghostlabs/glide';

/**
 * What PHP sent for the upsell surfaces, read when a surface renders.
 *
 * Off `window` rather than a bare global: the localized object is a window property.
 *
 * @return {Object} `{ urls, copy }`, either possibly missing.
 */
const upgrade = () => window.ghostlabsGlide?.upgrade ?? {};

/**
 * One surface's buy URL, or nothing.
 *
 * @param {string} surface `panel`, `mode` or `tweens`.
 * @return {string|null} The URL PHP built for it, or null.
 */
const urlFor = ( surface ) => {
	const url = upgrade().urls?.[ surface ];

	return typeof url === 'string' && url !== '' ? url : null;
};

/**
 * The link, or nothing when PHP sent no URL for this surface.
 *
 * ⚠️ `ExternalLink` opens a new tab, says so to a screen reader ("(opens in a new tab)") and draws
 * the ↗. The new tab is the point: the editor keeps its unsaved post in this one.
 *
 * @param {Object} props         Component props.
 * @param {string} props.surface `panel`, `mode` or `tweens`.
 * @return {Element|null} A paragraph holding the link.
 */
function BuyLink( { surface } ) {
	const href = urlFor( surface );
	const label = upgrade().copy?.link;

	if ( ! href || ! label ) {
		return null;
	}

	return (
		<p>
			<ExternalLink href={ href }>{ label }</ExternalLink>
		</p>
	);
}

/**
 * The panel, last in the block's sidebar and closed, in both modes.
 *
 * ⚠️ **Closed because every Glide inspector has real controls above it**: an advert must not push
 * the controls an author came for below the fold. The spec's exception (open it when it is the
 * inspector's only panel) does not apply here, and would the day a mode ships no panel of its own.
 *
 * 🔴 **The lead follows the mode, so a change while open is announced** (spec §1). The author
 * switches mode in Glide Settings, far above; the panel's first paragraph changes out of view. A
 * closed panel is read when it is opened, so only an open one speaks, and only the paragraph that
 * changed. `onToggle` mirrors the panel's own state; the panel stays uncontrolled.
 *
 * @param {Object} props      Component props.
 * @param {string} props.mode The block's mode attribute.
 * @return {Element|null} The panel.
 */
export function UpsellPanel( { mode } ) {
	const copy = upgrade().copy?.panel;
	// A block saved with a mode this edition does not ship renders as a content slider.
	const lead = copy?.lead?.[ mode ] ?? copy?.lead?.contentSlider;

	const [ isOpen, setIsOpen ] = useState( false );
	const spoken = useRef( lead );

	useEffect( () => {
		if ( isOpen && lead && spoken.current !== lead ) {
			speak( lead, 'polite' );
		}
		spoken.current = lead;
	}, [ isOpen, lead ] );

	if ( ! copy?.title || ! lead ) {
		return null;
	}

	return (
		<PanelBody
			title={ copy.title }
			initialOpen={ false }
			onToggle={ () => setIsOpen( ( was ) => ! was ) }
			className="ghostlabs-glide-upsell-panel"
		>
			<p className="ghostlabs-glide-upsell-panel__lead">{ lead }</p>
			{ /*
			 * `Notice` for its look only. `spokenMessage` empty, or the copy is read aloud every
			 * time the panel opens; not dismissible, or its close button would do nothing.
			 */ }
			<Notice
				className="ghostlabs-glide-upsell"
				status="info"
				spokenMessage=""
				isDismissible={ false }
			>
				<p>
					<strong>{ copy.keeps }</strong>
				</p>
				<p>{ copy.switches }</p>
				<BuyLink surface="panel" />
			</Notice>
		</PanelBody>
	);
}

const FOCUSABLE =
	'select, input:not([type="hidden"]), textarea, button, [href], [tabindex]:not([tabindex="-1"])';

/**
 * Focuses `el` and says whether it took focus.
 *
 * ⚠️ `focus()` on a control that cannot take it (disabled, hidden, inert) does nothing and
 * throws nothing, so the only proof is where focus is afterwards. The Tweens notice sits under
 * None and Fade Transition, both disabled while no tween is on and more than one slide is in
 * view, and trusting `focus()` there left focus on `<body>` (accessibility audit 2026-11-05, F3).
 *
 * @param {Element} el The control.
 * @return {boolean} Whether it has focus now.
 */
function tookFocus( el ) {
	el.focus();
	return el.ownerDocument.activeElement === el;
}

/**
 * Moves focus to the last control before `node` in its panel that can take it — the control a
 * notice sits under, or the nearest one above it.
 *
 * ⚠️ **Called before the notice goes.** Its Close button has focus, and unmounting it leaves
 * focus on `<body>`: a keyboard user's next Tab happens to land somewhere sensible, but a screen
 * reader announces nothing (WCAG 2.4.3; accessibility audit 2026-11-05, F1). The panel's own
 * toggle is the fallback when nothing above the notice can take focus.
 *
 * @param {Element|null} node The notice's wrapper.
 * @return {boolean} Whether focus was moved.
 */
export function focusControlAbove( node ) {
	for (
		let el = node?.previousElementSibling;
		el;
		el = el.previousElementSibling
	) {
		const targets = el.matches( FOCUSABLE )
			? [ el ]
			: [ ...el.querySelectorAll( FOCUSABLE ) ];

		for ( let i = targets.length - 1; i >= 0; i-- ) {
			if ( tookFocus( targets[ i ] ) ) {
				return true;
			}
		}
	}

	const toggle = node
		?.closest( '.components-panel__body' )
		?.querySelector( '.components-panel__body-toggle' );

	return toggle ? tookFocus( toggle ) : false;
}

/**
 * A notice under one free control, naming what the other edition adds to it.
 *
 * Below the control and its help text, never above, so it neither displaces the field nor reads
 * as a gate.
 *
 * ⚠️ **Dismissed for good, per user**, in `core/preferences`, which the block editor keeps in user
 * meta. `isDismissible` alone hides a notice for one render and wires its button to nothing, and a
 * notice that comes back is the top named grievance with upsells.
 *
 * ⚠️ `spokenMessage=""`: standing copy, not a response to anything the author did. The default
 * speaks it into the live region every time the block is selected.
 *
 * @param {Object} props            Component props.
 * @param {string} props.surface    `mode` or `tweens`: its copy and URL.
 * @param {string} props.preference Its dismissal's name in this plugin's preferences scope.
 * @return {Element|null} The notice.
 */
function UpsellNotice( { surface, preference } ) {
	const wrapper = useRef( null );
	const dismissed = useSelect(
		( select ) => select( preferencesStore ).get( SCOPE, preference ),
		[ preference ]
	);
	const { set } = useDispatch( preferencesStore );
	const copy = upgrade().copy?.[ surface ];

	if ( dismissed || ! copy?.title || ! copy?.body ) {
		return null;
	}

	return (
		<div ref={ wrapper }>
			<Notice
				className="ghostlabs-glide-upsell"
				status="info"
				spokenMessage=""
				onRemove={ () => {
					focusControlAbove( wrapper.current );
					set( SCOPE, preference, true );
				} }
			>
				<p>
					<strong>{ copy.title }</strong>
				</p>
				<p>{ copy.body }</p>
				<BuyLink surface={ surface } />
			</Notice>
		</div>
	);
}

/**
 * Under the Mode select, in both modes.
 *
 * @return {Element|null} The notice.
 */
export const ModeUpsellNotice = () => (
	<UpsellNotice surface="mode" preference="modeUpsellDismissed" />
);

/**
 * Under the content slider's tween toggles.
 *
 * @return {Element|null} The notice.
 */
export const TweensUpsellNotice = () => (
	<UpsellNotice surface="tweens" preference="tweensUpsellDismissed" />
);
