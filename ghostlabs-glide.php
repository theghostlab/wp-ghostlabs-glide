<?php
/**
 * Plugin Name:       GhostLabs Glide
 * Plugin URI:        https://theghostlab.io/glide
 * Description:       Content slider plugin. Free edition (content slider mode).
 * Version:           1.0.4
 * Requires at least: 6.6
 * Requires PHP:      8.1
 * Author:            GhostLabs
 * Author URI:        https://theghostlab.io
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       ghostlabs-glide
 * Domain Path:       /languages
 *
 * @package GhostLabsGlide
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ⚠️ Guarded, because both editions can be present on one site during an
// upgrade. WordPress loads active plugins in alphabetical order, so whichever
// comes first defines these and the second would fatal on a redefinition —
// before the paid edition's header has had a chance to switch this one off.
if ( ! defined( 'GHOSTLABS_GLIDE_EDITION' ) ) {
	define( 'GHOSTLABS_GLIDE_EDITION', 'free' );
}
if ( ! defined( 'GHOSTLABS_GLIDE_VERSION' ) ) {
	define( 'GHOSTLABS_GLIDE_VERSION', '1.0.4' );
}
if ( ! defined( 'GHOSTLABS_GLIDE_PLUGIN_PATH' ) ) {
	define( 'GHOSTLABS_GLIDE_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'GHOSTLABS_GLIDE_PLUGIN_URL' ) ) {
	define( 'GHOSTLABS_GLIDE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
}
if ( ! defined( 'GHOSTLABS_GLIDE_PLUGIN_SLUG' ) ) {
	define( 'GHOSTLABS_GLIDE_PLUGIN_SLUG', plugin_basename( __FILE__ ) );
}

// 🔴 **This edition switches no plugin off — not even the paid one.** It used
// to deactivate any other active `ghostlabs-glide.php`, which WordPress.org's
// *Changing Active Plugins* item forbids of a plugin it hosts. It also undid
// the switch: on the request after the paid edition was activated, this guard
// ran after that edition's own and switched it off too. The paid edition's
// header handles the overlap, and it is never on .org.
// `NoInDashboardInstallTest` holds the ban.

// Boot the plugin. The bootstrap lives in shared/ and is identical for every tier.
require_once GHOSTLABS_GLIDE_PLUGIN_PATH . 'bootstrap.php';
