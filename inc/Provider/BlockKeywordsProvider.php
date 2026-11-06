<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Provider;

use GHOSTLABS\GLIDE\Boot\Edition;
use GHOSTLABS\GLIDE\Service\Loader;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Adds each edition's own inserter keywords to the blocks it registers.
 *
 * 🟡 **`block.json` carried four keywords, two of which named modes not every
 * edition ships.** Searching the inserter for one of them surfaced Glide in a
 * build that offers no such mode — a poor first run, and keyword-stuffing absent
 * features is a WordPress.org guideline problem as well as a bad one.
 *
 * ⚠️ **Keywords only — the attribute schema differs per edition too, but not
 * here.** An edition's extra attributes are merged into its `block.json` when
 * the build copies it (`src/blocks/edition-attributes.cjs`), so the file each
 * edition ships already declares them. Keywords are added at runtime instead
 * because they are search terms, and nothing outside the inserter reads them.
 *
 * ⚠️ **Not a tier branch.** `Edition::blockKeywords()` has the same shape as
 * `Edition::libraries()` and `Edition::modes()` — a question the edition answers
 * with data it compiled. An edition with nothing to add returns an empty array
 * and this provider registers no filter at all; nothing anywhere asks which tier
 * it is.
 *
 * @package GhostLabsGlide
 */
final class BlockKeywordsProvider implements FeatureProviderInterface
{
    /**
     * Block name → the keywords this edition adds to it.
     *
     * @var array<string, list<string>>
     */
    private array $keywords;

    public function __construct()
    {
        $this->keywords = Edition::blockKeywords();
    }

    public function register(Loader $loader): void
    {
        if ($this->keywords === []) {
            return;
        }

        // Through the Loader rather than directly, unlike `BlocksProvider`.
        // That one has to beat the pattern registrar to `init` 10; this filter
        // only has to exist before `register_block_type()` reads a manifest,
        // and the Loader flushes inside `plugins_loaded` — well before `init`.
        $loader->add_filter('block_type_metadata', $this, 'addKeywords');
    }

    /**
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    public function addKeywords(array $metadata): array
    {
        $name = $metadata['name'] ?? '';

        if (!is_string($name) || !isset($this->keywords[$name])) {
            return $metadata;
        }

        $declared = $metadata['keywords'] ?? [];

        // Appended rather than replaced: `block.json` holds the terms every
        // edition shares, and this adds the ones only this build can deliver
        // on. Unique, so a term in both lists is not indexed twice.
        $metadata['keywords'] = array_values(array_unique(array_merge(
            is_array($declared) ? $declared : [],
            $this->keywords[$name],
        )));

        return $metadata;
    }
}
