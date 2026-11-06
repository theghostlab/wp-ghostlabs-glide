<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Provider;

use GHOSTLABS\GLIDE\RestRoute\VideoRoutes;
use GHOSTLABS\GLIDE\Service\Loader;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Server-side video poster extraction, behind `upload_files`.
 *
 * Free-tier: video slides and the automatic poster are content-slider features,
 * and the content slider is what free is.
 *
 * ⚠️ Registers on `rest_api_init` **directly**, matching the single closure this
 * was split out of. Route registration order carries no meaning — these are
 * distinct routes — but the direct-versus-deferred distinction does, and the
 * REST routes have always registered before the `Loader` flushes.
 */
final class VideoRoutesProvider implements FeatureProviderInterface
{
    public function register(Loader $loader): void
    {
        add_action('rest_api_init', $this->routes(...));
    }

    public function routes(): void
    {
        (new VideoRoutes())->routes();
    }
}
