<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Provider;

use GHOSTLABS\GLIDE\Service\Loader;
use GHOSTLABS\GLIDE\Service\ModeStyleLoader;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The per-mode frontend stylesheets, registered so a rendered block can enqueue
 * only the one its mode needs.
 *
 * Free-tier. Which stylesheets exist is a property of what the edition compiled,
 * not of this wiring.
 */
final class ModeStylesProvider implements FeatureProviderInterface
{
    public function __construct(
        private readonly ModeStyleLoader $modeStyles = new ModeStyleLoader(),
    ) {
    }

    public function register(Loader $loader): void
    {
        $this->modeStyles->registerHooks($loader);
    }
}
