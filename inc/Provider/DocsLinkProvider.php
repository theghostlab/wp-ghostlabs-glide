<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Provider;

use GHOSTLABS\GLIDE\Service\DocsLink;
use GHOSTLABS\GLIDE\Service\Loader;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The Docs link on the Plugins screen, in every edition.
 */
final class DocsLinkProvider implements FeatureProviderInterface
{
    public function __construct(
        private readonly DocsLink $docsLink = new DocsLink(),
    ) {
    }

    public function register(Loader $loader): void
    {
        $loader->add_filter('plugin_row_meta', $this->docsLink, 'rowMeta', 10, 2);
    }
}
