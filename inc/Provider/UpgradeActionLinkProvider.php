<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Provider;

use GHOSTLABS\GLIDE\Service\Loader;
use GHOSTLABS\GLIDE\Service\UpgradeActionLink;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The Plugins row's buy link.
 *
 * On `plugin_action_links_{basename}` rather than the global `plugin_action_links`, which fires once
 * per plugin on the screen. Two accepted arguments, because the callback reads the plugin file; with
 * one, WordPress calls it with the links alone and the screen fatals.
 */
final class UpgradeActionLinkProvider implements FeatureProviderInterface
{
    public function __construct(
        private readonly UpgradeActionLink $link = new UpgradeActionLink(),
    ) {
    }

    public function register(Loader $loader): void
    {
        $loader->add_filter('plugin_action_links_' . GHOSTLABS_GLIDE_PLUGIN_SLUG, $this->link, 'actionLinks', 10, 2);
    }
}
