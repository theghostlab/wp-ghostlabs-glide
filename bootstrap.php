<?php
/**
 * Glide — Bootstrap
 *
 * Loaded by every tier's plugin header once the constants are defined. Lives in
 * shared/ so the build copies it to the assembled plugin root, identical for
 * every edition.
 *
 * ⚠️ **Nothing in this file may name a class or a package only one edition has.**
 * It asks `Boot\Edition` — the one class each tier folder must define — and that
 * answers for the build it was compiled into.
 *
 * @package GhostLabsGlide
 */

use GHOSTLABS\GLIDE\Boot\Edition;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ⚠️ Resolved from the plugin path, NOT __DIR__.
//
// In an assembled plugin the two are the same — the build copies this file to
// the plugin root, next to vendor/. In the repo they are not: this lives in
// shared/, which has no vendor/ and never will, while vendor/ belongs to the
// tier folder. `__DIR__` here would look for shared/vendor/autoload.php, miss,
// and take the admin-notice branch below — so the plugin would come up
// apparently installed and register nothing at all.
$ghostlabs_glide_autoload = GHOSTLABS_GLIDE_PLUGIN_PATH . 'vendor/autoload.php';

if ( ! file_exists( $ghostlabs_glide_autoload ) ) {
	add_action( 'admin_notices', function () {
		printf(
			'<div class="error"><p>%s</p></div>',
			esc_html__(
				'Glide error: the Composer autoloader is missing. Reinstall the plugin — or, if you are running it from source, install its dependencies and rebuild.',
				'ghostlabs-glide'
			)
		);
	} );

	return;
}

require_once $ghostlabs_glide_autoload;

// The version-gated shared libraries this edition ships.
//
// The newest copy of each wins across every GhostLabs plugin on the site, so they
// must be required here at include time — never inside a hook. Each registers its
// version now and a winner is elected on plugins_loaded priority 0; a copy that
// has not registered by then cannot win, and the kernel below constructs at
// priority 10, after every election.
//
// `Edition` supplies the list rather than this file naming the files, because
// which libraries exist is a property of the edition and only the edition knows
// it. ⚠️ Not every edition ships every library, and some of them may not be
// distributable everywhere this plugin is — so two `require_once` lines here
// would put a package's name in every build, which no build flag can strip,
// because this file is copied into every tier.
//
// Deliberately unguarded, unlike the autoloader above. These are hard
// dependencies, so a missing file is not a degraded mode to tolerate: a class
// drawn from one would fatal on first use anyway, further down the request where
// the cause is no longer visible. Failing here names the exact file.
foreach ( Edition::libraries() as $ghostlabs_glide_library ) {
	require_once $ghostlabs_glide_library;
}

// ⚠️ No text domain loading here. WordPress loads a .org-hosted plugin's translations itself
// since 4.6, and WordPress.org refused the same call in Friendly Skies' shared bootstrap on
// 2026-10-28. An edition distributed any other way loads its own through its kernel's providers.

// Which wiring runs is a property of the edition, not of what happens to be on
// disk, so the edition names its own kernel and this file never chooses.
//
// A `class_exists()` guard was rejected for the same reason it was rejected
// inside the Kernel: it makes the tier a runtime accident rather than a stated
// fact, and it fails silently — a build with a missing class would quietly serve
// some other edition's feature set rather than saying so.
$ghostlabs_glide_kernel = Edition::kernel();

add_action( 'plugins_loaded', function () use ( $ghostlabs_glide_kernel ) {
	try {
		$ghostlabs_glide_kernel::getInstance()->init()->run();
	} catch ( \Exception $e ) {
		error_log( '[GhostLabs Glide] ' . $e->getMessage() );
	}
}, 10 );
