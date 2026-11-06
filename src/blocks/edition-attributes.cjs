/**
 * What an edition adds to a block's attribute schema, merged into the shared
 * `block.json` when the build copies it.
 *
 * The shared `block.json` declares what every edition ships, and nothing more.
 * An edition that renders more declares the rest in its own
 * `src/edition/block-attributes.json`, keyed by block name, and the build
 * merges it in — so the `block.json` each edition ships is that edition's
 * schema, and a build that adds nothing ships the shared one byte for byte.
 *
 * ⚠️ **An attribute an edition does not declare is dropped from a block it
 * edits.** WordPress parses only declared attributes out of a block comment and
 * serialises only declared ones back, so a value one edition saved and another
 * does not declare is gone after the first save in the second. It does not
 * invalidate the block: both blocks' `save()` read no attribute. Keys inside an
 * object attribute are different — the object is kept whole — which is why an
 * edition extends an object's `default` rather than adding a second object.
 *
 * ⚠️ **Additive only, and every way of getting it wrong throws.** An edition
 * adds a new attribute whole, or adds keys to an existing object attribute's
 * `default`. It may not redeclare, retype or change a default that is already
 * there, and it may not name a block no `block.json` declares. Each of those
 * would otherwise build cleanly and ship a schema missing what the edition
 * renders, and the first save would drop the author's settings.
 *
 * CommonJS, because `webpack.config.cjs` requires it.
 */

'use strict';

/**
 * @param {unknown} value Anything.
 * @return {boolean} True for a plain, non-array object.
 */
function isPlainObject( value ) {
	return (
		typeof value === 'object' && value !== null && ! Array.isArray( value )
	);
}

/**
 * One block's metadata with an edition's additions merged in.
 *
 * Returns new objects and never mutates its arguments.
 *
 * @param {Object} metadata  A parsed `block.json`.
 * @param {Object} additions Attribute name → what the edition adds to it.
 * @return {Object} The merged metadata.
 */
function mergeEditionAttributes( metadata, additions ) {
	const block = metadata.name;
	const declared = metadata.attributes || {};
	const attributes = { ...declared };

	for ( const [ key, addition ] of Object.entries( additions ) ) {
		const existing = declared[ key ];

		if ( existing === undefined ) {
			if (
				! isPlainObject( addition ) ||
				typeof addition.type !== 'string'
			) {
				throw new Error(
					`${ block }: the added attribute "${ key }" declares no type.`
				);
			}

			attributes[ key ] = addition;
			continue;
		}

		const extendsDefaultOnly =
			isPlainObject( addition ) &&
			Object.keys( addition ).join() === 'default' &&
			isPlainObject( addition.default ) &&
			isPlainObject( existing.default );

		if ( ! extendsDefaultOnly ) {
			throw new Error(
				`${ block }: "${ key }" is already declared, so an edition may only add keys to its object default.`
			);
		}

		const clashes = Object.keys( addition.default ).filter( ( name ) =>
			Object.hasOwn( existing.default, name )
		);

		if ( clashes.length ) {
			throw new Error(
				`${ block }: "${ key }" already has a default for ${ clashes.join(
					', '
				) }. An edition adds keys and never changes one.`
			);
		}

		attributes[ key ] = {
			...existing,
			default: { ...existing.default, ...addition.default },
		};
	}

	return { ...metadata, attributes };
}

/**
 * The merged `block.json` text for every manifest an edition adds to.
 *
 * A manifest the edition adds nothing to is absent from the result, so the
 * build copies it unchanged.
 *
 * @param {Array<{file: string, source: string}>} manifests Every `block.json` the build copies.
 * @param {Object}                                additions Block name → attribute additions.
 * @return {Map<string, string>} manifest path → the merged JSON text.
 */
function editionSchemas( manifests, additions ) {
	if ( ! isPlainObject( additions ) ) {
		throw new Error( 'block-attributes.json must hold a JSON object.' );
	}

	const schemas = new Map();
	const unmatched = new Set( Object.keys( additions ) );

	for ( const { file, source } of manifests ) {
		const metadata = JSON.parse( source );
		const added = additions[ metadata.name ];

		if ( added === undefined ) {
			continue;
		}

		unmatched.delete( metadata.name );
		schemas.set(
			file,
			JSON.stringify(
				mergeEditionAttributes( metadata, added ),
				null,
				'\t'
			) + '\n'
		);
	}

	if ( unmatched.size ) {
		throw new Error(
			`block-attributes.json names blocks no block.json declares: ${ [
				...unmatched,
			].join( ', ' ) }.`
		);
	}

	return schemas;
}

module.exports = { mergeEditionAttributes, editionSchemas };
