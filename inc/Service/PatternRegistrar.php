<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use GHOSTLABS\GLIDE\BlockPattern\BlockPatternInterface;
use GHOSTLABS\GLIDE\Boot\Edition;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Registers the Glide block patterns.
 *
 * The registrar is the creator: each pattern is its own
 * BlockPatternInterface implementation owning its name, title, description,
 * scoping and markup; the registrar instantiates whatever this edition ships and
 * applies the shared category uniformly.
 *
 * 🔴 **The roster is `Boot\Edition::patterns()`, not the enum.** Iterating
 * `GlidePattern::cases()` registered every case unconditionally — so an edition
 * would have offered layouts it cannot render, in the Patterns panel, and drawn
 * them as a plain stack of steps. The gate is absence: an edition can only name
 * the pattern classes its own tree contains.
 *
 * Registration is deliberately independent of block registration, matching how
 * the routes register — the hooks are queued whether or not any block was.
 *
 * Registered is not the same as listed: a pattern declaring `inserter()` false
 * stays in the registry (and in the REST pattern list the Glide block's layout
 * picker reads) while staying out of the editor's Patterns UI. See
 * BlockPatternInterface::inserter().
 */
class PatternRegistrar
{
    private const CATEGORY = 'ghostlabs-glide';

    public function registerHooks(Loader $loader): void
    {
        $loader->add_action('init', $this, 'registerCategory', 9);
        $loader->add_action('init', $this, 'registerPatterns');
    }

    public function registerCategory(): void
    {
        if (! function_exists('register_block_pattern_category')) {
            return;
        }

        register_block_pattern_category(
            self::CATEGORY,
            ['label' => __('Glide', 'ghostlabs-glide')]
        );
    }

    public function registerPatterns(): void
    {
        if (! function_exists('register_block_pattern')) {
            return;
        }

        foreach (Edition::patterns() as $class) {
            $pattern = new $class();

            register_block_pattern($pattern->name(), $this->patternArgs($pattern));
        }
    }

    /**
     * The register_block_pattern args for one pattern — the shared category
     * plus whatever the pattern itself declares.
     *
     * @return array<string, mixed>
     */
    public function patternArgs(BlockPatternInterface $pattern): array
    {
        $args = [
            'title'       => $pattern->title(),
            'description' => $pattern->description(),
            'categories'  => [self::CATEGORY],
            'inserter'    => $pattern->inserter(),
            'content'     => $pattern->content(),
        ];

        // An empty list means unscoped. The key is omitted rather than passed
        // as [], which would register the pattern against no block at all
        // instead of against all of them.
        $blockTypes = $pattern->blockTypes();
        if ($blockTypes !== []) {
            $args['blockTypes'] = $blockTypes;
        }

        return $args;
    }
}
