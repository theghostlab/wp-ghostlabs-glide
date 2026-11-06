<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Provider;

use GHOSTLABS\GLIDE\Service\Loader;
use GHOSTLABS\GLIDE\Service\PatternRegistrar;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The block pattern category and every pattern in the roster.
 *
 * Free-tier: free ships two of the five patterns, and which two is a property of
 * the roster rather than of this wiring.
 *
 * ⚠️ Registers on `init` at priority 9 (the category) and 10 (the patterns),
 * both through the `Loader`. The blocks go on `init` 10 as well but register
 * *directly*, so they always come first — which is required, since a pattern's
 * markup names the blocks it is built from.
 */
final class PatternsProvider implements FeatureProviderInterface
{
    public function __construct(
        private readonly PatternRegistrar $patterns = new PatternRegistrar(),
    ) {
    }

    public function register(Loader $loader): void
    {
        $this->patterns->registerHooks($loader);
    }
}
