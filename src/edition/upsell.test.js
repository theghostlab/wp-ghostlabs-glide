/**
 * This edition's three upsell surfaces in the Glide block's sidebar.
 *
 * ⚠️ The copy below is a stand-in, never the shipped copy: that is PHP's, pinned verbatim by
 * `EditorUpsellTest`. This file ships in the source distribution, which the isolation gate reads.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import {
	UpsellPanel,
	ModeUpsellNotice,
	TweensUpsellNotice,
	focusControlAbove,
} from './upsell.js';

// WordPress globals at runtime, not packages this tier installs. Each stand-in keeps the one
// behaviour the surfaces depend on, and records the props it was given.
jest.mock(
	'@wordpress/components',
	() => {
		const { useState, createElement: el } = jest.requireActual( 'react' );
		const props = { Notice: [], PanelBody: [], ExternalLink: [] };

		return {
			mockProps: props,
			PanelBody: ( p ) => {
				props.PanelBody.push( p );
				const [ open, setOpen ] = useState( p.initialOpen ?? true );

				return el(
					'div',
					{ 'data-panel': p.title, 'data-open': String( open ) },
					el(
						'button',
						{
							type: 'button',
							'aria-expanded': open,
							onClick: () => {
								setOpen( ! open );
								p.onToggle?.( ! open );
							},
						},
						p.title
					),
					open ? p.children : null
				);
			},
			Notice: ( p ) => {
				props.Notice.push( p );

				return el(
					'div',
					{ 'data-notice': '', className: p.className },
					p.children,
					p.isDismissible !== false
						? el(
								'button',
								{
									type: 'button',
									'aria-label': 'Close',
									onClick: p.onRemove,
								},
								'×'
						  )
						: null
				);
			},
			ExternalLink: ( p ) => {
				props.ExternalLink.push( p );

				return el(
					'a',
					{ href: p.href, target: '_blank', rel: 'noopener' },
					p.children
				);
			},
		};
	},
	{ virtual: true }
);

jest.mock(
	'@wordpress/data',
	() => {
		const prefs = {};
		const set = jest.fn( ( scope, name, value ) => {
			prefs[ scope ] = { ...prefs[ scope ], [ name ]: value };
		} );

		return {
			mockPrefs: prefs,
			mockSet: set,
			useSelect: ( mapSelect ) =>
				mapSelect( ( store ) => {
					if ( store !== 'core/preferences' ) {
						throw new Error( `unexpected store ${ store }` );
					}
					return {
						get: ( scope, name ) => prefs[ scope ]?.[ name ],
					};
				} ),
			useDispatch: ( store ) => {
				if ( store !== 'core/preferences' ) {
					throw new Error( `unexpected store ${ store }` );
				}
				return { set };
			},
		};
	},
	{ virtual: true }
);

jest.mock( '@wordpress/preferences', () => ( { store: 'core/preferences' } ), {
	virtual: true,
} );

jest.mock( '@wordpress/a11y', () => ( { speak: jest.fn() } ), {
	virtual: true,
} );

const components = jest.requireMock( '@wordpress/components' );
const data = jest.requireMock( '@wordpress/data' );
const { speak } = jest.requireMock( '@wordpress/a11y' );

const COPY = {
	link: 'Buy it',
	panel: {
		title: 'The paid edition',
		lead: {
			contentSlider: 'Slider lead.',
			stickyScroll: 'Sticky lead.',
		},
		keeps: 'Keeps line.',
		switches: 'Switches line.',
	},
	mode: { title: 'Mode title.', body: 'Mode body.' },
	tweens: { title: 'Tweens title.', body: 'Tweens body.' },
};

const URLS = {
	panel: 'https://example.test/buy?from=editor-panel',
	mode: 'https://example.test/buy?from=editor-mode',
	tweens: 'https://example.test/buy?from=editor-tweens',
};

let container;
let root;

const render = ( element ) =>
	act( () => {
		root.render( element );
	} );

const click = ( node ) =>
	act( () => {
		node.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );
	} );

beforeAll( () => {
	global.IS_REACT_ACT_ENVIRONMENT = true;
} );

beforeEach( () => {
	window.ghostlabsGlide = {
		restNamespace: 'ghostlabs/glide/free/v1',
		upgrade: { urls: { ...URLS }, copy: COPY },
	};
	Object.keys( data.mockPrefs ).forEach(
		( scope ) => delete data.mockPrefs[ scope ]
	);
	data.mockSet.mockClear();
	speak.mockClear();
	Object.values( components.mockProps ).forEach( ( list ) =>
		list.splice( 0 )
	);

	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
} );

afterEach( () => {
	act( () => root.unmount() );
	container.remove();
	delete window.ghostlabsGlide;
} );

const links = () => [ ...container.querySelectorAll( 'a' ) ];
const lastProps = ( name ) => components.mockProps[ name ].at( -1 );

describe( 'the upsell panel', () => {
	it( 'starts closed, in both modes', async () => {
		for ( const mode of [ 'contentSlider', 'stickyScroll' ] ) {
			await render( <UpsellPanel mode={ mode } /> );

			expect( lastProps( 'PanelBody' ).initialOpen ).toBe( false );
			expect(
				container.querySelector( '[data-panel]' ).dataset.open
			).toBe( 'false' );
			expect( container.textContent ).not.toContain( 'lead.' );
		}
	} );

	it( 'is titled by PHP', async () => {
		await render( <UpsellPanel mode="contentSlider" /> );

		expect( lastProps( 'PanelBody' ).title ).toBe( 'The paid edition' );
	} );

	it.each( [
		[ 'contentSlider', 'Slider lead.' ],
		[ 'stickyScroll', 'Sticky lead.' ],
	] )( 'says what %s gains when opened', async ( mode, lead ) => {
		await render( <UpsellPanel mode={ mode } /> );
		await click( container.querySelector( 'button' ) );

		const paragraphs = [ ...container.querySelectorAll( 'p' ) ].map(
			( p ) => p.textContent
		);

		expect( paragraphs ).toEqual( [
			lead,
			'Keeps line.',
			'Switches line.',
			'Buy it',
		] );
		expect( container.querySelector( 'strong' ).textContent ).toBe(
			'Keeps line.'
		);
	} );

	// A block pasted from an edition with more modes renders here as a content slider.
	it( 'reads a mode this edition does not ship as the content slider', async () => {
		await render( <UpsellPanel mode="somethingElse" /> );
		await click( container.querySelector( 'button' ) );

		expect( container.textContent ).toContain( 'Slider lead.' );
	} );

	it( 'links to its own URL, in a new tab', async () => {
		await render( <UpsellPanel mode="contentSlider" /> );
		await click( container.querySelector( 'button' ) );

		expect( links().map( ( a ) => a.getAttribute( 'href' ) ) ).toEqual( [
			URLS.panel,
		] );
		expect( lastProps( 'ExternalLink' ).children ).toBe( 'Buy it' );
	} );

	// 🔴 No literal in JavaScript and no fallback (spec § The URL contract).
	it.each( [ undefined, '', 42 ] )(
		'renders no link at all when the URL is %p',
		async ( url ) => {
			window.ghostlabsGlide.upgrade.urls.panel = url;

			await render( <UpsellPanel mode="contentSlider" /> );
			await click( container.querySelector( 'button' ) );

			expect( links() ).toEqual( [] );
			expect( container.textContent ).toContain( 'Slider lead.' );
			expect( container.textContent ).not.toContain( 'Buy it' );
		}
	);

	it( 'renders nothing when PHP sent no copy', async () => {
		delete window.ghostlabsGlide.upgrade;

		await render( <UpsellPanel mode="contentSlider" /> );

		expect( container.innerHTML ).toBe( '' );
	} );

	// The inner notice is standing copy: not spoken on every open, and no close button that
	// does nothing.
	it( 'frames the switch lines as a notice that neither speaks nor dismisses', async () => {
		await render( <UpsellPanel mode="contentSlider" /> );
		await click( container.querySelector( 'button' ) );

		expect( lastProps( 'Notice' ).spokenMessage ).toBe( '' );
		expect( lastProps( 'Notice' ).isDismissible ).toBe( false );
	} );

	describe( 'when the mode changes', () => {
		// 🔴 Spec §1: a panel whose words change in response to anything announces them. A
		// closed panel is read when it is opened, so only an open one speaks.
		it( 'announces the new lead while open', async () => {
			await render( <UpsellPanel mode="contentSlider" /> );
			await click( container.querySelector( 'button' ) );
			expect( speak ).not.toHaveBeenCalled();

			await render( <UpsellPanel mode="stickyScroll" /> );

			expect( container.textContent ).toContain( 'Sticky lead.' );
			expect( speak ).toHaveBeenCalledTimes( 1 );
			expect( speak ).toHaveBeenCalledWith( 'Sticky lead.', 'polite' );
		} );

		it( 'says nothing while closed', async () => {
			await render( <UpsellPanel mode="contentSlider" /> );
			await render( <UpsellPanel mode="stickyScroll" /> );

			expect( speak ).not.toHaveBeenCalled();
		} );

		it( 'says nothing when it is only opened, or closed again', async () => {
			await render( <UpsellPanel mode="stickyScroll" /> );
			await click( container.querySelector( 'button' ) );
			await click( container.querySelector( 'button' ) );

			expect( speak ).not.toHaveBeenCalled();
		} );

		it( 'stays open', async () => {
			await render( <UpsellPanel mode="contentSlider" /> );
			await click( container.querySelector( 'button' ) );
			await render( <UpsellPanel mode="stickyScroll" /> );

			expect(
				container.querySelector( '[data-panel]' ).dataset.open
			).toBe( 'true' );
		} );
	} );
} );

describe.each( [
	[ 'under Mode', ModeUpsellNotice, 'mode', 'Mode title.', 'Mode body.' ],
	[
		'under Tweens',
		TweensUpsellNotice,
		'tweens',
		'Tweens title.',
		'Tweens body.',
	],
] )( 'the notice %s', ( _, Notice, surface, title, body ) => {
	const PREFERENCE = `${ surface }UpsellDismissed`;

	it( 'says its two lines, the first in bold, then links to its own URL', async () => {
		await render( <Notice /> );

		expect(
			[ ...container.querySelectorAll( 'p' ) ].map(
				( p ) => p.textContent
			)
		).toEqual( [ title, body, 'Buy it' ] );
		expect( container.querySelector( 'strong' ).textContent ).toBe( title );
		expect( links().map( ( a ) => a.getAttribute( 'href' ) ) ).toEqual( [
			URLS[ surface ],
		] );
	} );

	// Standing copy, not an event: the default speaks it every time the block is selected.
	it( 'is not spoken', async () => {
		await render( <Notice /> );

		expect( lastProps( 'Notice' ).spokenMessage ).toBe( '' );
		expect( lastProps( 'Notice' ).status ).toBe( 'info' );
	} );

	it( 'renders no link at all when the URL is missing', async () => {
		delete window.ghostlabsGlide.upgrade.urls[ surface ];

		await render( <Notice /> );

		expect( links() ).toEqual( [] );
		expect( container.textContent ).toContain( body );
	} );

	it( 'renders nothing when PHP sent no copy', async () => {
		window.ghostlabsGlide.upgrade = { urls: { ...URLS } };

		await render( <Notice /> );

		expect( container.innerHTML ).toBe( '' );
	} );

	// ⚠️ `isDismissible` alone hides a notice for one render and wires its button to nothing; a
	// notice that comes back is the top named grievance with upsells.
	it( 'is dismissed for good, per user, in core/preferences', async () => {
		await render( <Notice /> );
		await click( container.querySelector( 'button[aria-label="Close"]' ) );

		expect( data.mockSet ).toHaveBeenCalledTimes( 1 );
		expect( data.mockSet ).toHaveBeenCalledWith(
			'ghostlabs/glide',
			PREFERENCE,
			true
		);
	} );

	// WCAG 2.4.3: the Close button goes with the notice, and focus left on <body> announces
	// nothing. It moves to the control the notice sits under.
	it( 'hands focus to the control above it when dismissed', async () => {
		await render(
			<>
				<select data-testid="control" />
				<Notice />
			</>
		);
		const closeButton = container.querySelector(
			'button[aria-label="Close"]'
		);
		closeButton.focus();

		await click( closeButton );

		expect( document.activeElement ).toBe(
			container.querySelector( '[data-testid="control"]' )
		);
	} );

	it( 'does not render once dismissed', async () => {
		data.mockPrefs[ 'ghostlabs/glide' ] = { [ PREFERENCE ]: true };

		await render( <Notice /> );

		expect( container.innerHTML ).toBe( '' );
	} );

	it( 'is dismissed on its own: the other notice stays', async () => {
		const Other =
			surface === 'mode' ? TweensUpsellNotice : ModeUpsellNotice;
		data.mockPrefs[ 'ghostlabs/glide' ] = { [ PREFERENCE ]: true };

		await render( <Other /> );

		expect( container.innerHTML ).not.toBe( '' );
	} );
} );

describe( 'focusControlAbove', () => {
	const build = ( html ) => {
		const tree = document.createElement( 'div' );
		tree.innerHTML = html;
		document.body.appendChild( tree );
		return tree;
	};

	afterEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'takes the last control before the notice', () => {
		const tree = build(
			'<div><input id="a"><input id="b"></div><div id="notice"></div>'
		);

		expect( focusControlAbove( tree.querySelector( '#notice' ) ) ).toBe(
			true
		);
		expect( document.activeElement.id ).toBe( 'b' );
	} );

	it( 'passes over a control that cannot take focus, to the nearest one above that can', () => {
		const tree = build(
			'<div><input id="a"></div><div><input id="b" disabled><input id="c" disabled></div><div id="notice"></div>'
		);

		expect( focusControlAbove( tree.querySelector( '#notice' ) ) ).toBe(
			true
		);
		expect( document.activeElement.id ).toBe( 'a' );
	} );

	// F3: the Tweens notice while no tween is on and more than one slide is in view.
	it( 'falls back to the panel toggle when every control above is disabled', () => {
		const tree = build(
			'<div class="components-panel__body"><h2><button class="components-panel__body-toggle" id="toggle">Tweens</button></h2><div><input type="checkbox" id="none" disabled checked></div><div><input type="checkbox" id="fade" disabled></div><div id="notice"></div></div>'
		);
		const notice = tree.querySelector( '#notice' );
		const close = document.createElement( 'button' );
		notice.appendChild( close );
		close.focus();

		expect( focusControlAbove( notice ) ).toBe( true );
		expect( document.activeElement.id ).toBe( 'toggle' );
	} );

	it( 'says so when nothing at all can take focus', () => {
		const tree = build(
			'<div><input id="a" disabled></div><div id="notice"></div>'
		);

		expect( focusControlAbove( tree.querySelector( '#notice' ) ) ).toBe(
			false
		);
	} );

	it( 'falls back to the panel toggle when nothing above can take focus', () => {
		const tree = build(
			'<div class="components-panel__body"><h2><button class="components-panel__body-toggle" id="toggle">Panel</button></h2><div id="notice"></div></div>'
		);
		const notice = tree.querySelector( '#notice' );
		// The heading is above the notice, so take it out of the way to test the fallback.
		tree.querySelector( 'h2' ).after( document.createElement( 'p' ) );
		tree.querySelector( '.components-panel__body' ).prepend( notice );

		expect( focusControlAbove( notice ) ).toBe( true );
		expect( document.activeElement.id ).toBe( 'toggle' );
	} );
} );
