<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Provider;

use Exception;
use GHOSTLABS\GLIDE\Service\BlockFactory;
use GHOSTLABS\GLIDE\Service\Loader;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Registers whatever blocks were compiled into `build/blocks/`.
 *
 * This is the tier split's cleanest seam and the one it leans on: a block absent
 * from a build needs no gate of any kind, because nothing ever registered it.
 * Each edition compiles what it ships and this reads the result.
 *
 * ⚠️ **Nothing gates this.** `Kernel::run()` used to call `registerBlocks()`
 * only behind a runtime check an edition might not be able to satisfy, which
 * meant a build could register zero blocks and ship a plugin that does nothing.
 * An edition whose features need such a check puts them in providers of its own;
 * block registration is not one of them.
 *
 * ⚠️ `add_action` directly, not through the `Loader`. Blocks and
 * `PatternRegistrar::registerPatterns()` both land on `init` at priority 10, and
 * a pattern's markup names the blocks it is built from — so the blocks have to
 * register first. Going direct is what guarantees that: the `Loader` does not
 * flush until every provider has run.
 */
final class BlocksProvider implements FeatureProviderInterface
{
    public function __construct(
        private readonly BlockFactory $blocks,
    ) {
    }

    /**
     * @throws Exception
     */
    public function register(Loader $loader): void
    {
        $blocks = $this->blocks->setRegisterBlocks();

        if (empty($blocks)) {
            throw new Exception('No blocks found');
        }

        foreach ($blocks as $block) {
            add_action('init', $block);
        }
    }
}
