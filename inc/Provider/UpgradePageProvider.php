<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Provider;

use GHOSTLABS\GLIDE\Service\Loader;
use GHOSTLABS\GLIDE\Service\UpgradePage;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Settings → Glide: the upsell, and the three steps for somebody who has bought.
 *
 * Registered through the Loader on the same hooks the paid tier's
 * `AdminResourcesProvider` uses for its screen — same slug, same parent, same
 * point in the request — so the one address serves whichever edition is
 * running.
 */
final class UpgradePageProvider implements FeatureProviderInterface
{
    public function __construct(
        private readonly UpgradePage $page = new UpgradePage(),
    ) {
    }

    public function register(Loader $loader): void
    {
        $loader->add_action('admin_menu', $this->page, 'page');
        $loader->add_action('admin_enqueue_scripts', $this->page, 'scripts');
    }
}
