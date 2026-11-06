import {
	mergeEditionAttributes,
	editionSchemas,
} from './edition-attributes.cjs';

const base = () => ( {
	name: 'example/block',
	title: 'Example',
	attributes: {
		label: { type: 'string', default: '' },
		settings: { type: 'object', default: { size: 1 } },
	},
} );

describe( 'mergeEditionAttributes', () => {
	it( 'adds a new attribute whole', () => {
		const added = { type: 'number', default: 0 };
		const merged = mergeEditionAttributes( base(), { count: added } );

		expect( merged.attributes.count ).toEqual( added );
		expect( merged.attributes.label ).toEqual( base().attributes.label );
	} );

	it( 'adds keys to an object default and keeps the ones declared', () => {
		const merged = mergeEditionAttributes( base(), {
			settings: { default: { colour: 'red' } },
		} );

		expect( merged.attributes.settings ).toEqual( {
			type: 'object',
			default: { size: 1, colour: 'red' },
		} );
	} );

	it( 'leaves everything outside the attributes alone', () => {
		const merged = mergeEditionAttributes( base(), {} );

		expect( merged ).toEqual( base() );
	} );

	it( 'never mutates the metadata it was given', () => {
		const metadata = base();
		mergeEditionAttributes( metadata, {
			count: { type: 'number' },
			settings: { default: { colour: 'red' } },
		} );

		expect( metadata ).toEqual( base() );
	} );

	// Each of these would otherwise build cleanly and ship a schema that is
	// not what the edition renders.
	it( 'refuses a new attribute with no type', () => {
		expect( () =>
			mergeEditionAttributes( base(), { count: { default: 0 } } )
		).toThrow( /declares no type/ );
	} );

	it( 'refuses to redeclare an attribute', () => {
		expect( () =>
			mergeEditionAttributes( base(), {
				label: { type: 'string', default: 'x' },
			} )
		).toThrow( /may only add keys/ );
	} );

	it( 'refuses to extend a default that is not an object', () => {
		expect( () =>
			mergeEditionAttributes( base(), { label: { default: { a: 1 } } } )
		).toThrow( /may only add keys/ );
	} );

	it( 'refuses to change a default key already declared', () => {
		expect( () =>
			mergeEditionAttributes( base(), {
				settings: { default: { size: 2 } },
			} )
		).toThrow( /already has a default for size/ );
	} );
} );

describe( 'editionSchemas', () => {
	const manifests = [
		{ file: '/a/block.json', source: JSON.stringify( base() ) },
		{
			file: '/b/block.json',
			source: JSON.stringify( { name: 'example/other', attributes: {} } ),
		},
	];

	it( 'returns nothing when the edition adds nothing', () => {
		expect( editionSchemas( manifests, {} ).size ).toBe( 0 );
	} );

	it( 'merges only the manifests the edition adds to', () => {
		const schemas = editionSchemas( manifests, {
			'example/block': { count: { type: 'number' } },
		} );

		expect( [ ...schemas.keys() ] ).toEqual( [ '/a/block.json' ] );
		expect(
			JSON.parse( schemas.get( '/a/block.json' ) ).attributes.count
		).toEqual( { type: 'number' } );
	} );

	it( 'writes tab-indented JSON with a trailing newline, as block.json is', () => {
		const text = editionSchemas( manifests, {
			'example/block': { count: { type: 'number' } },
		} ).get( '/a/block.json' );

		expect( text ).toMatch( /^\{\n\t"name"/ );
		expect( text.endsWith( '}\n' ) ).toBe( true );
	} );

	// A misspelt block name would otherwise add nothing anywhere and build.
	it( 'refuses additions for a block no manifest declares', () => {
		expect( () =>
			editionSchemas( manifests, {
				'example/missing': { count: { type: 'number' } },
			} )
		).toThrow( /example\/missing/ );
	} );

	it( 'refuses additions that are not an object', () => {
		expect( () => editionSchemas( manifests, [] ) ).toThrow(
			/JSON object/
		);
	} );
} );
