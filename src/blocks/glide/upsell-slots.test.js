/**
 * Where the Glide block's sidebar renders the edition's three upsell slots.
 *
 * Read from the source rather than rendered: the block's edit component needs the whole editor
 * behind it, and what is under test is placement, which is a fact about this file. Parsed, not
 * matched as text, so formatting cannot make it pass or fail.
 *
 * Runs in both suites. What each slot renders is the edition's own test (`@edition/upsell.test.js`);
 * in an edition with nothing to sell they render nothing, and placing them costs nothing.
 */
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';

const SOURCE = fs.readFileSync( path.join( __dirname, 'edit.js' ), 'utf8' );
const AST = parse( SOURCE, { sourceType: 'module', plugins: [ 'jsx' ] } );

/**
 * Every node of a type, depth first, in source order.
 *
 * @param {Object} node Where to start.
 * @param {string} type The node type, e.g. `JSXElement`.
 * @return {Object[]} The matches.
 */
function findAll( node, type ) {
	const found = [];
	const visit = ( current ) => {
		if ( ! current || typeof current.type !== 'string' ) {
			return;
		}
		if ( current.type === type ) {
			found.push( current );
		}
		for ( const key of Object.keys( current ) ) {
			if ( [ 'loc', 'start', 'end', 'extra' ].includes( key ) ) {
				continue;
			}
			const value = current[ key ];
			( Array.isArray( value ) ? value : [ value ] ).forEach( visit );
		}
	};
	visit( node );

	return found;
}

const nameOf = ( element ) => element.openingElement.name.name;

const elements = ( name, root = AST ) =>
	findAll( root, 'JSXElement' ).filter( ( el ) => nameOf( el ) === name );

/**
 * A JSX child that renders something: elements and expressions, not whitespace or comments.
 *
 * @param {Object} element A JSXElement.
 * @return {Object[]} Its children that render.
 */
const renderedChildren = ( element ) =>
	element.children.filter(
		( child ) =>
			child.type === 'JSXElement' ||
			( child.type === 'JSXExpressionContainer' &&
				child.expression.type !== 'JSXEmptyExpression' )
	);

/**
 * The untranslated string a JSX attribute passes to the translation function, such as a panel's
 * title. (Not spelled as a call here: the text-domain gate reads comments.)
 *
 * @param {Object} element A JSXElement.
 * @param {string} attr    The attribute's name.
 * @return {string|undefined} The untranslated string.
 */
function translated( element, attr ) {
	const found = element.openingElement.attributes.find(
		( a ) => a.name?.name === attr
	);
	const call = found?.value?.expression;

	return call?.type === 'CallExpression' && call.callee.name === '__'
		? call.arguments[ 0 ].value
		: undefined;
}

const panel = ( title ) => {
	const matches = elements( 'PanelBody' ).filter(
		( el ) => translated( el, 'title' ) === title
	);
	expect( matches ).toHaveLength( 1 );

	return matches[ 0 ];
};

const isElement = ( node, name ) =>
	node?.type === 'JSXElement' && nameOf( node ) === name;

describe( 'the upsell slots in the Glide block’s sidebar', () => {
	it( 'come from the edition', () => {
		const imports = findAll( AST, 'ImportDeclaration' ).filter(
			( i ) => i.source.value === '@edition/upsell.js'
		);

		expect( imports ).toHaveLength( 1 );
		expect(
			imports[ 0 ].specifiers.map( ( s ) => s.imported.name ).sort()
		).toEqual( [
			'ModeUpsellNotice',
			'TweensUpsellNotice',
			'UpsellPanel',
		] );
	} );

	it.each( [ 'UpsellPanel', 'ModeUpsellNotice', 'TweensUpsellNotice' ] )(
		'render %s exactly once',
		( name ) => {
			expect( elements( name ) ).toHaveLength( 1 );
		}
	);

	// Last in the block's sidebar, so it never pushes the slider's own controls down. Core's
	// Advanced is a separate group and renders below every panel here.
	it( 'put the panel last, in both modes, told the mode', () => {
		const inspectors = elements( 'InspectorControls' ).filter(
			( el ) => elements( 'UpsellPanel', el ).length
		);
		expect( inspectors ).toHaveLength( 1 );

		const children = renderedChildren( inspectors[ 0 ] );
		const last = children.at( -1 );

		// A direct child, not inside an expression: rendered in every mode, not in one mode's
		// branch.
		expect( isElement( last, 'UpsellPanel' ) ).toBe( true );

		const attributes = last.openingElement.attributes;
		expect( attributes ).toHaveLength( 1 );
		expect( attributes[ 0 ].name.name ).toBe( 'mode' );
		expect( attributes[ 0 ].value.expression.name ).toBe( 'mode' );
	} );

	// Below the control, never above it, so it neither displaces the field nor reads as a gate.
	it( 'put the Mode notice right after the Mode select, last in Glide Settings', () => {
		const children = renderedChildren( panel( 'Glide Settings' ) );
		const select = children.findIndex(
			( child ) =>
				isElement( child, 'SelectControl' ) &&
				translated( child, 'label' ) === 'Mode'
		);

		expect( select ).toBeGreaterThan( -1 );
		expect( isElement( children[ select + 1 ], 'ModeUpsellNotice' ) ).toBe(
			true
		);
		expect( children ).toHaveLength( select + 2 );
	} );

	it( 'put the Tweens notice after the toggles, last in Tweens', () => {
		const children = renderedChildren( panel( 'Tweens' ) );
		const last = children.at( -1 );
		const toggles = children.at( -2 );

		expect( isElement( last, 'TweensUpsellNotice' ) ).toBe( true );
		expect( toggles.type ).toBe( 'JSXExpressionContainer' );
		expect( toggles.expression.callee.object.name ).toBe( 'TWEEN_OPTIONS' );
		expect( toggles.expression.callee.property.name ).toBe( 'map' );
	} );
} );
