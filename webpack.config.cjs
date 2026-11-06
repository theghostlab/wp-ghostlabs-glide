// ⚠️ **Deliberately byte-identical to the other tier's webpack.config.cjs**, and
// it genuinely was not: this header lived in one copy only, and said they were
// identical. Every path in the file is relative to __dirname or to the shared
// root, so the logic is tier-agnostic by construction rather than by discipline —
// keep the two in step, and prefer copying over re-deriving.
//
// The difference between the editions is what each root *contains*, not what this
// says: `modeEntries()` globs `src/modes/` in both roots and finds however many
// that build has, without being told which edition it is in.

const fs = require( 'fs' );
const path = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

// **Two layouts, one config.** In the monorepo the shared root is a sibling. In a
// source distribution `build.sh` has already flattened `shared/` and this tier
// into one tree, so there is no sibling and the same files sit under `./src`.
//
// That question has to be asked here rather than hardcoded, because a source
// distribution compiles its own assets: webpack derives module ids from each
// module's request path, so a shared module is `../shared/src/…` in the monorepo
// and `./src/…` there. Same code, different ids, different bytes — which is why
// copying the monorepo's build output into a source distribution can never
// reproduce. It is the same question the PHP side's two-root PSR-4 map answers by
// falling through.
const MONOREPO_SHARED_SRC = path.resolve( __dirname, '../shared/src' );
const SHARED_SRC = fs.existsSync( MONOREPO_SHARED_SRC )
	? MONOREPO_SHARED_SRC
	: path.resolve( __dirname, 'src' );

const TIER_SRC = path.resolve( __dirname, 'src' );

/**
 * Entry points for every block, wherever its source root is.
 *
 * wp-scripts' own discovery globs `**\/block.json` under this tier's `src/` and
 * explicitly warns-and-skips anything resolving outside it, so the shared root
 * has to be described here.
 *
 * The entry name is the script's path relative to its source root, without the
 * extension — exactly wp-scripts' own naming — so `blocks/glide/index` lands at
 * `build/blocks/glide/index.js` whichever root it came from. That is what keeps
 * the compiled output in the same place across the move.
 *
 * @return {Object<string,string>} entry name → absolute source path
 */
function blockEntries() {
	const entries = {};

	for ( const root of [ SHARED_SRC, TIER_SRC ] ) {
		const blocksDir = path.join( root, 'blocks' );

		if ( ! fs.existsSync( blocksDir ) ) {
			continue;
		}

		for ( const name of fs.readdirSync( blocksDir ) ) {
			const metadata = path.join( blocksDir, name, 'block.json' );

			if ( ! fs.existsSync( metadata ) ) {
				continue;
			}

			const block = JSON.parse( fs.readFileSync( metadata, 'utf8' ) );

			for ( const field of [ 'editorScript', 'script', 'viewScript' ] ) {
				const declared = block[ field ];

				if (
					typeof declared !== 'string' ||
					! declared.startsWith( 'file:' )
				) {
					continue;
				}

				const relative = declared
					.replace( 'file:', '' )
					.replace( /^\.\//, '' )
					.replace( /\.m?[jt]sx?$/, '' );

				const source = [ 'js', 'jsx', 'ts', 'tsx' ]
					.map( ( ext ) =>
						path.join( blocksDir, name, `${ relative }.${ ext }` )
					)
					.find( ( candidate ) => fs.existsSync( candidate ) );

				if ( ! source ) {
					// eslint-disable-next-line no-console
					console.warn(
						`[glide] no source for ${ declared } in ${ metadata }`
					);
					continue;
				}

				entries[ `blocks/${ name }/${ relative }` ] = source;
			}
		}
	}

	return entries;
}

/**
 * One entry per mode that has a frontend, from whichever root holds it.
 *
 * ⚠️ Discovered rather than listed. The modes are split across the two roots,
 * and which root holds which is exactly what differs between editions — a
 * hardcoded list would have to be edited in every tier each time that boundary
 * moved. `ModeStyleLoader` reads the compiled result the same way.
 *
 * @return {Object<string,string>} entry name → absolute source path
 */
function modeEntries() {
	const entries = {};

	for ( const root of [ SHARED_SRC, TIER_SRC ] ) {
		const modesDir = path.join( root, 'modes' );

		if ( ! fs.existsSync( modesDir ) ) {
			continue;
		}

		for ( const name of fs.readdirSync( modesDir ) ) {
			const frontend = path.join( modesDir, name, 'frontend.js' );

			if ( fs.existsSync( frontend ) ) {
				entries[ `modes/${ name }/frontend` ] = frontend;
			}

			// A mode's layouts, each its own stylesheet, so a page loads only
			// the layouts it renders (`ModeStyleLoader::enqueueLayout()`).
			const layoutsDir = path.join( modesDir, name, 'layouts' );

			if ( ! fs.existsSync( layoutsDir ) ) {
				continue;
			}

			for ( const layout of fs.readdirSync( layoutsDir ) ) {
				const layoutFrontend = path.join(
					layoutsDir,
					layout,
					'frontend.js'
				);

				if ( fs.existsSync( layoutFrontend ) ) {
					entries[ `modes/${ name }/layouts/${ layout }/frontend` ] =
						layoutFrontend;
				}
			}
		}
	}

	return entries;
}

// block.json and render.php are copied, not compiled. wp-scripts' own
// CopyWebpackPlugin is scoped to this tier's src/, so the shared root's copies
// are appended to the same plugin instance rather than adding a second one —
// which also avoids depending on copy-webpack-plugin directly, whose version is
// wp-scripts' business and not ours.
//
// ⚠️ Without this every shared block ships with no block.json and no render.php:
// BlockFactory scans build/blocks/ for manifests and would find none, so the
// plugin would register zero blocks while the build reported success.
const copyPlugin = defaultConfig.plugins.find(
	( plugin ) => plugin.constructor && plugin.constructor.name === 'CopyPlugin'
);

/**
 * Every `block.json` this build copies, from whichever root holds it.
 *
 * @return {Array<{file: string, source: string}>} absolute path and contents
 */
function blockManifests() {
	const manifests = [];

	for ( const root of new Set( [ SHARED_SRC, TIER_SRC ] ) ) {
		const blocksDir = path.join( root, 'blocks' );

		if ( ! fs.existsSync( blocksDir ) ) {
			continue;
		}

		for ( const name of fs.readdirSync( blocksDir ) ) {
			const file = path.join( blocksDir, name, 'block.json' );

			if ( fs.existsSync( file ) ) {
				manifests.push( {
					file,
					source: fs.readFileSync( file, 'utf8' ),
				} );
			}
		}
	}

	return manifests;
}

// ⚠️ **The attribute schema each edition ships is the shared `block.json` plus
// what this tier's `src/edition/block-attributes.json` adds**, merged as it is
// copied. The rules, and why every way of breaking them throws, are in
// `blocks/edition-attributes.cjs`.
//
// The file is required in every tier, even as `{}`: a tier without one would
// build the shared schema alone, report success, and drop on first save every
// attribute it renders beyond it.
const EDITION_ATTRIBUTES = path.join(
	TIER_SRC,
	'edition',
	'block-attributes.json'
);

if ( ! fs.existsSync( EDITION_ATTRIBUTES ) ) {
	throw new Error(
		`[glide] ${ EDITION_ATTRIBUTES } is missing. A tier that adds no attributes says so with {}.`
	);
}

const { editionSchemas } = require(
	path.join( SHARED_SRC, 'blocks', 'edition-attributes.cjs' )
);

const EDITION_SCHEMAS = editionSchemas(
	blockManifests(),
	JSON.parse( fs.readFileSync( EDITION_ATTRIBUTES, 'utf8' ) )
);

const appliedSchemas = new Set();

/**
 * A `block.json` as this edition ships it: merged where the edition adds to it,
 * and otherwise exactly as written.
 *
 * @param {Buffer|string} content      The file as read.
 * @param {string}        absoluteFrom Its path.
 * @return {Buffer|string} What to copy.
 */
function withEditionSchema( content, absoluteFrom ) {
	const file = path.resolve( absoluteFrom );
	const schema = EDITION_SCHEMAS.get( file );

	if ( schema === undefined ) {
		return content;
	}

	appliedSchemas.add( file );

	return schema;
}

/**
 * ⚠️ **A merge that never ran would look exactly like one that did** — the build
 * copies the shared `block.json`, succeeds, and the edition ships without its
 * own attributes. So the build fails if any merged schema was not the one
 * copied.
 */
class EditionSchemaCheck {
	apply( compiler ) {
		compiler.hooks.afterEmit.tap(
			'GlideEditionSchemaCheck',
			( compilation ) => {
				const missed = [ ...EDITION_SCHEMAS.keys() ].filter(
					( file ) => ! appliedSchemas.has( file )
				);

				if ( missed.length ) {
					compilation.errors.push(
						new Error(
							`[glide] copied without this edition's attributes: ${ missed.join(
								', '
							) }`
						)
					);
				}
			}
		);
	}
}

// wp-scripts' own rule copies any `block.json` under this tier's src/, which in
// a flattened source distribution is every one of them. Its transform rewrites
// script paths, so the merge runs first and hands it the result.
const ownBlockJsonRule =
	copyPlugin &&
	copyPlugin.patterns.find( ( pattern ) => pattern.from === '**/block.json' );

if ( ownBlockJsonRule ) {
	const ownTransform = ownBlockJsonRule.transform;

	ownBlockJsonRule.transform = ( content, absoluteFrom ) => {
		const merged = withEditionSchema( content, absoluteFrom );

		return ownTransform ? ownTransform( merged, absoluteFrom ) : merged;
	};
}

if ( copyPlugin && SHARED_SRC !== TIER_SRC ) {
	copyPlugin.patterns.push(
		{
			from: '**/block.json',
			context: path.join( SHARED_SRC, 'blocks' ),
			to: 'blocks',
			noErrorOnMissing: true,
			transform: withEditionSchema,
		},
		{
			from: '**/*.php',
			context: path.join( SHARED_SRC, 'blocks' ),
			to: 'blocks',
			noErrorOnMissing: true,
		}
	);
}

// `GHOSTLABS_MINIFY=0` asks for readable assets, which is what a WordPress.org
// reviewer needs to read (owner, 2026-10-08). `=1` or unset leaves wp-scripts'
// production build alone, which minifies. The contract is the same in every
// GhostLabs repo (ported from Undercard's, 2026-10-24): the command center sets
// `0` when it builds a submission zip, and `/wporg-svn` sets `1`. build.sh
// measures what came out, because a flag that is ignored still builds.
//
// ⚠️ **wp-scripts minifies in three places, and `optimization.minimize` reaches
// only one of them.** Terser handles the JS. The CSS goes through cssnano inside
// postcss-loader's plugin list, and sass-loader defaults to `style: "compressed"`
// whenever webpack's mode is production. Turning Terser off alone leaves every
// stylesheet on one line, and nothing reports it.
const READABLE = process.env.GHOSTLABS_MINIFY === '0';

/**
 * One loader entry with its minification removed.
 *
 * cssnano is found by constructor name, the same way CopyPlugin is found above:
 * it is a postcss `Processor` rather than a named plugin, and naming it here
 * would mean depending on a package that is wp-scripts' business.
 *
 * @param {Object|string} entry A `use` entry from a module rule.
 * @return {Object|string} The entry, copied where it changes.
 */
function readableLoader( entry ) {
	const loader = typeof entry === 'string' ? entry : entry.loader || '';
	const options = ( typeof entry === 'object' && entry.options ) || {};

	if ( loader.includes( 'postcss-loader' ) && options.postcssOptions ) {
		const plugins = ( options.postcssOptions.plugins || [] ).filter(
			( plugin ) =>
				! (
					plugin &&
					plugin.constructor &&
					plugin.constructor.name === 'Processor'
				)
		);

		return {
			...entry,
			options: {
				...options,
				postcssOptions: { ...options.postcssOptions, plugins },
			},
		};
	}

	if ( loader.includes( 'sass-loader' ) ) {
		return {
			...entry,
			options: {
				...options,
				sassOptions: { ...options.sassOptions, style: 'expanded' },
			},
		};
	}

	return entry;
}

/**
 * The module rules with every minifying loader option removed.
 *
 * Copies rather than mutates: wp-scripts shares one array of CSS loaders between
 * its .css, .pcss and .scss rules.
 *
 * ⚠️ It also stops inlining the SVGs a stylesheet names. wp-scripts makes them
 * base64 data URIs, and in Undercard one 48 KB wave became a 64,000-character
 * line of unreadable text in otherwise readable CSS, which the command center's
 * 100-characters-a-line gate refused. Emitted as files instead, under
 * the name wp-scripts gives every other image.
 *
 * @param {Array<Object>} rules wp-scripts' module rules.
 * @return {Array<Object>} The rules, readable.
 */
function readableRules( rules ) {
	return rules.map( ( rule ) => {
		if ( rule.type === 'asset/inline' ) {
			return {
				...rule,
				type: 'asset/resource',
				generator: { filename: 'images/[name].[hash:8][ext]' },
			};
		}

		return Array.isArray( rule.use )
			? { ...rule, use: rule.use.map( readableLoader ) }
			: rule;
	} );
}

module.exports = {
	...defaultConfig,
	plugins: [ ...defaultConfig.plugins, new EditionSchemaCheck() ],
	...( READABLE && {
		optimization: { ...defaultConfig.optimization, minimize: false },
		module: {
			...defaultConfig.module,
			rules: readableRules( defaultConfig.module.rules ),
		},
	} ),
	resolve: {
		...defaultConfig.resolve,

		// Sources under shared/ have no node_modules above them and never will:
		// the monorepo layout puts all tooling inside {tier}-only/, so shared/ is
		// source and nothing else. Webpack resolves bare specifiers by walking up
		// from the importing file, which from shared/src/ walks past the repo root
		// and finds nothing.
		//
		// Naming this tier's node_modules explicitly is what lets one dependency
		// tree compile two source roots — and it is why each tier compiles the
		// shared sources itself rather than shared/ having a build of its own.
		modules: [ path.resolve( __dirname, 'node_modules' ), 'node_modules' ],

		alias: {
			...( defaultConfig.resolve && defaultConfig.resolve.alias ),

			// What a shared module reaches another shared module by, so its import
			// does not depend on how deep it sits or which layout it is compiled
			// in.
			'@shared': SHARED_SRC,

			// ⚠️ The tier seam. Everything a shared source is not allowed to
			// know lives behind this alias: which slider modes this build
			// ships, which tween effects, which sticky layouts, and the panels
			// and stylesheets for each. Every tier answers in its own
			// src/edition/, so no shared file ever names a feature — it asks,
			// and gets back whatever that build compiled.
			//
			// Sass reaches this too: sass-loader consults webpack's aliases after
			// its own resolution fails, so `@use "@edition/modes"` lands here.
			'@edition': path.join( TIER_SRC, 'edition' ),
		},
	},
	entry: {
		...( typeof defaultConfig.entry === 'function'
			? defaultConfig.entry()
			: defaultConfig.entry ),
		...blockEntries(),
		...modeEntries(),
	},
	output: {
		...defaultConfig.output,
		// Chunks go into the same build directory.
		// publicPath "auto" lets webpack determine the base URL at runtime
		// from the script tag that loaded the entry point.
		publicPath: 'auto',
		chunkFilename: 'blocks/glide/[name].js?ver=[chunkhash]',
	},
};
