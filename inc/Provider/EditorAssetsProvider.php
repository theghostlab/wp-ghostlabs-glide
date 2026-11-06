<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Provider;

use GHOSTLABS\GLIDE\Service\AssetManager;
use GHOSTLABS\GLIDE\Service\BlockFactory;
use GHOSTLABS\GLIDE\Service\Loader;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * What the block editor needs from the server: the localized settings object,
 * and the translations for every editor bundle.
 *
 * Free-tier — the blocks are the plugin.
 *
 * Takes the `BlockFactory` rather than building one, because `AssetManager`
 * asks it which blocks this plugin registered and the answer has to be the same
 * one `BlocksProvider` acted on.
 */
final class EditorAssetsProvider implements FeatureProviderInterface
{
    private AssetManager $assetManager;

    public function __construct(BlockFactory $blockFactory)
    {
        $this->assetManager = new AssetManager($blockFactory);
    }

    public function register(Loader $loader): void
    {
        $this->assetManager->registerHooks($loader);
    }
}
