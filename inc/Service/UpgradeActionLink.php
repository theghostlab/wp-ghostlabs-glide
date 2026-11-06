<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use GHOSTLABS\GLIDE\Enum\UpsellSource;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The one buy link in this plugin's row on the Plugins screen.
 *
 * **Why this surface.** `plugin_action_links` is the only in-admin upsell the WordPress.org review
 * team names in writing ("a link on their entry on the plugin list page"), and it interrupts
 * nothing: nobody who is not already reading a row about this plugin ever sees it.
 *
 * ⚠️ **One ask per row.** The row meta carries Docs (`DocsLink`) and no second ask.
 *
 * ⚠️ **Guarded twice on the plugin file.** It is registered on `plugin_action_links_{basename}`,
 * which fires for this row alone, and it still compares the file it is handed: the basename is
 * `GHOSTLABS_GLIDE_PLUGIN_SLUG`, never a literal, because the slug has changed once already.
 */
final class UpgradeActionLink
{
    /**
     * Append the buy link after core's own.
     *
     * ⚠️ Appends, never rebuilds: a callback that returned an array of its own would drop core's
     * Deactivate.
     *
     * @param array<int|string, string> $actions
     * @return array<int|string, string>
     */
    public function actionLinks(array $actions, string $pluginFile): array
    {
        if ($pluginFile !== GHOSTLABS_GLIDE_PLUGIN_SLUG) {
            return $actions;
        }

        $actions[] = $this->link();

        return $actions;
    }

    /**
     * ⚠️ **Bold, and no colour of its own.** The link keeps core's admin link colour, so it follows
     * the user's colour scheme and keeps core's hover and focus treatment. Weight is the one thing
     * added, because weight needs no hover state to work. Brand purple was drawn and rejected by the
     * owner (2026-08-30, in a sibling plugin), and the portfolio followed.
     *
     * `target="_blank"` keeps plugins.php open behind the sales page, which makes WCAG 3.2.5 apply:
     * the warning rides in `.screen-reader-text`, a core admin class already on this screen, so the
     * visible label stays short.
     */
    private function link(): string
    {
        return sprintf(
            '<a href="%s" target="_blank" rel="noopener noreferrer" style="font-weight:700">%s<span class="screen-reader-text"> %s</span></a>',
            esc_url(UpgradeEndpoints::buyProUrl(UpsellSource::PluginsRow)),
            esc_html(UpsellCopy::link()),
            esc_html__('(opens in a new tab)', 'ghostlabs-glide')
        );
    }
}
