<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use GHOSTLABS\GLIDE\Config\PluginConfig;
use GHOSTLABS\GLIDE\Enum\UpsellSource;
use GHOSTLABS\GLIDE\Render\BuyLink;
use GHOSTLABS\GLIDE\Render\ComparisonTable;
use GHOSTLABS\GLIDE\Render\HeroBand;
use GHOSTLABS\GLIDE\Render\UpgradePage as UpgradePageBody;
use GHOSTLABS\GLIDE\Render\UpgradePanel;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Settings → Glide: the portfolio's Upsell Page (F3), as its siblings' settings screens are
 * (owner, 2026-11-03; nexus `marketing/glide/DECISIONS.md` § Upgrade prompts).
 *
 * There is nothing to configure. This edition stores no option, and every setting belongs to a
 * block, so the screen exists because the Settings link has to lead somewhere: it says where the
 * settings live, offers the way in for somebody who already bought, and makes the case.
 * WordPress.org's Guideline 11 names this screen as the place for that. No nag, no countdown, no
 * notice that comes back: it is only ever reached deliberately.
 *
 * This class registers the screen, loads its one stylesheet and draws the header band; the body is
 * `Render\UpgradePage`, a composer of one renderer per section.
 *
 * Registered under the SAME menu slug and parent as the paid edition's settings screen,
 * deliberately: after the switch the same address resolves to that screen, which is where the
 * buyer enters their key.
 *
 * 🔴 **It explains, and it does nothing itself** (`Render\UpgradePanel`). WordPress.org refuses an
 * in-place install (Guideline 8, *Changing Active Plugins*); `NoInDashboardInstallTest` holds the
 * ban. ⚠️ Do not restore the old client here.
 *
 * Plain PHP, and one stylesheet compiled from `dev/scss/` with no script: a `<details>` opens
 * without one, and a bundle on WordPress.org is a provenance question a reviewer should not have
 * to ask.
 */
class UpgradePage
{
    /**
     * The wrapper id the page is anchored on. The stylesheet loads on this screen alone, so its
     * selectors need no id of their own; tests and the screenshot harness find the screen by it.
     */
    public const ROOT_ID = 'ghostlabs-glide-upgrade';

    public function page(): void
    {
        add_submenu_page(
            'options-general.php',
            __('Glide', 'ghostlabs-glide'),
            __('Glide', 'ghostlabs-glide'),
            'manage_options',
            PluginConfig::settingsMenuSlug(),
            [$this, 'render'],
        );
    }

    /**
     * This screen's one asset, and only on this screen.
     *
     * ⚠️ Compiled, not hand-written: `dev/scss/upgrade.scss` → `assets/css/upgrade.css`, by the
     * tier's `pnpm run build` for a development build and in place by `build.sh --dist`. The
     * compiled file is tracked, and `tests/tooling/upgrade-stylesheet.test.js` fails when it is
     * not a compile of its sources.
     */
    public function scripts(): void
    {
        $screen = get_current_screen();

        // Derived, not spelled out: WordPress builds this id from the menu
        // slug, so a slug change that left a literal here would silently stop
        // the stylesheet loading with the page still rendering.
        if (!$screen || $screen->id !== 'settings_page_' . PluginConfig::settingsMenuSlug()) {
            return;
        }

        wp_enqueue_style(
            'ghostlabs-glide-upgrade',
            GHOSTLABS_GLIDE_PLUGIN_URL . 'assets/css/upgrade.css',
            [],
            PluginConfig::version()
        );
    }

    public function render(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        printf('<div class="wrap ghostlabs-glide-screen" id="%s">', esc_attr(self::ROOT_ID));

        // The header band names the plugin and the edition.
        //
        // ⚠️ The `wp-header-end` marker is load-bearing. Core's common.js moves every admin notice
        // to just after it, or, without it, to just after the first heading in `.wrap`, which is
        // the h1 inside this flex band: a sibling's screen had another plugin's notice land
        // between the title and the badge (2026-10-12). The marker keeps notices below the band.
        printf(
            '<div class="ghostlabs-glide-screen__header"><h1 class="ghostlabs-glide-screen__title">%s</h1>'
            . '<span class="ghostlabs-glide-screen__badge">%s</span></div><hr class="wp-header-end">',
            esc_html__('Glide', 'ghostlabs-glide'),
            esc_html__('Free', 'ghostlabs-glide')
        );

        // ⚠️ `upload_plugins` is the only check needed: core's `map_meta_cap` already refuses it
        // under DISALLOW_FILE_MODS and limits it to super admins on a network.
        (new UpgradePageBody(
            new UpgradePanel(
                AccountEndpoints::accountUrl(),
                current_user_can('upload_plugins') ? admin_url('plugin-install.php?tab=upload') : null
            ),
            new HeroBand(new BuyLink(UpgradeEndpoints::buyProUrl(UpsellSource::Settings))),
            new ComparisonTable(),
            new BuyLink(UpgradeEndpoints::buyProUrl(UpsellSource::SettingsTable)),
            DocsLink::URL
        ))->render();

        echo '</div>';
    }
}
