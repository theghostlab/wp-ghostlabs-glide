/**
 * This edition's admin stylesheet, compiled from its sources.
 *
 *   dev/scss/<name>.scss  ->  assets/css/<name>.css
 *
 * What `sass dev/scss:assets/css --no-source-map` does, as a script, because the style has to
 * follow the environment and a package.json script cannot read one on every platform. Every
 * `.scss` file that is not a partial compiles to the same relative path, and each output ends in a
 * newline, as the CLI writes it.
 *
 * `GHOSTLABS_MINIFY=0` builds `expanded`, `=1` and unset `compressed`: the same contract as
 * webpack.config.cjs, which builds the rest of the tree.
 *
 * ⚠️ **Called by `pnpm run build`, so both builds compile it.** A development build copies the
 * tracked `assets/css/` as it stands; `build.sh --dist` runs `pnpm run build` inside the tree it
 * assembled, from the sources that ship. It lives in `dev/`, beside the sources, because that is
 * the directory a source distribution keeps and the plugin zip drops.
 *
 * Paths are relative to the working directory, which pnpm sets to the plugin root. An optional
 * first argument names another output directory (the stylesheet test compiles into a scratch one).
 */
import fs from 'node:fs';
import path from 'node:path';
import * as sass from 'sass';

const style = process.env.GHOSTLABS_MINIFY === '0' ? 'expanded' : 'compressed';
const from = 'dev/scss';
const to = process.argv[ 2 ] ?? 'assets/css';

const sources = fs
	.readdirSync( from, { recursive: true } )
	.filter(
		( file ) =>
			file.endsWith( '.scss' ) &&
			! path.basename( file ).startsWith( '_' ) &&
			! file.split( path.sep ).some( ( part ) => part.startsWith( '_' ) )
	)
	.sort();

for ( const file of sources ) {
	const { css } = sass.compile( path.join( from, file ), {
		style,
		sourceMap: false,
	} );
	const out = path.join( to, file.replace( /\.scss$/, '.css' ) );

	fs.mkdirSync( path.dirname( out ), { recursive: true } );
	fs.writeFileSync( out, css + '\n' );
}
