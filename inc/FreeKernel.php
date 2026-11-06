<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE;

use GHOSTLABS\GLIDE\Provider\FeatureProviderInterface;
use GHOSTLABS\GLIDE\Provider\UpgradeActionLinkProvider;
use GHOSTLABS\GLIDE\Provider\UpgradePageProvider;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The free tier's wiring: the shared set, plus Settings → Glide and the
 * Plugins row's buy link.
 *
 * A class of its own rather than more of `Kernel` because both are this
 * edition's alone, and the shared kernel may not name what only one edition has.
 *
 * 🔴 **Nothing here installs, activates or calls out.** This class used to wire
 * the in-place upgrade's REST routes and a dev-only TLS relaxation for its
 * package download. WordPress.org refuses the upgrade (Guideline 8), so both are
 * gone; `NoInDashboardInstallTest` and `FreeKernelTest` hold that.
 */
class FreeKernel extends Kernel
{
    /**
     * The settings screen and the row link, then the shared set — prepended,
     * so that `BlocksProvider` stays last overall: it throws on an
     * uncompiled build, and the screen pointing at a working one must have
     * registered by then.
     *
     * @return list<FeatureProviderInterface>
     */
    protected function providers(): array
    {
        return [
            new UpgradePageProvider(),
            new UpgradeActionLinkProvider(),
            ...parent::providers(),
        ];
    }
}
