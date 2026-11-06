<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Boot;

use GHOSTLABS\GLIDE\BlockPattern\BlockPatternInterface;
use GHOSTLABS\GLIDE\BlockPattern\StickyChaptersPattern;
use GHOSTLABS\GLIDE\BlockPattern\TestimonialPattern;
use GHOSTLABS\GLIDE\Enum\GlidePattern;
use GHOSTLABS\GLIDE\FreeKernel;
use GHOSTLABS\GLIDE\Kernel;
use GHOSTLABS\GLIDE\Service\EditorUpsell;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * What this edition boots.
 *
 * `shared/bootstrap.php` is copied into every build, so it cannot name a class or
 * a package that only one edition has. It asks this class instead.
 *
 * ⚠️ **Every edition defines this same class name**, which is safe for exactly
 * one reason: no two tiers' `inc/` directories are ever on one autoload path.
 *
 * @package GhostLabsGlide
 */
final class Edition
{
    /**
     * 🔴 **None, and that is deliberate.**
     *
     * Nothing this edition ships uses one — measured with
     * `grep -rn 'GhostLabs\\WPKit' shared/inc inc`, which returns nothing.
     * Vendoring a package on the chance it is needed is worse than not having it,
     * so `composer.json` here requires nothing but PHP and this build installs
     * with no registry credentials at all, which is what lets anyone clone this
     * repository and build it.
     *
     * The bootstrap iterates this unguarded, so an empty list simply loads
     * nothing.
     *
     * @return list<string>
     */
    public static function libraries(): array
    {
        return [];
    }

    /**
     * The base kernel plus this edition's own provider: Settings → Glide.
     *
     * @return class-string<Kernel>
     */
    public static function kernel(): string
    {
        return FreeKernel::class;
    }

    /**
     * Which edition this is, for the names that carry it (the REST namespace).
     *
     * 🔴 **A literal, because this class is compiled into this edition alone.**
     * `PluginConfig::tier()` asks here. It used to read `GHOSTLABS_GLIDE_EDITION`,
     * and WordPress.org's trialware line in the command center refuses any read
     * of an edition constant in a free tree — branching on one is how a locked
     * feature gets built. The tier only ever names things; nothing is offered or
     * withheld on it.
     */
    public static function tier(): string
    {
        return 'free';
    }

    /**
     * Both of this edition's `GlidePattern` cases. The enum carries no others,
     * and no other pattern class exists in this tree — the gate is absence, not
     * a filter.
     *
     * @return array<string, class-string<BlockPatternInterface>>
     */
    public static function patterns(): array
    {
        return [
            GlidePattern::Testimonial->value    => TestimonialPattern::class,
            GlidePattern::StickyChapters->value => StickyChaptersPattern::class,
        ];
    }

    /**
     * ⚠️ Two of the four the block's attribute allows. Neither the modules nor
     * the stylesheets for the others are compiled here.
     *
     * `Glide` resolves a requested mode against this, so a block carrying a mode
     * this build does not ship renders as a content slider — keeping every slide
     * — instead of enqueueing a stylesheet that was never registered.
     *
     * @return array<string, string>
     */
    public static function modes(): array
    {
        return [
            'contentSlider' => 'content-slider',
            'stickyScroll'  => 'sticky-scroll',
        ];
    }

    /**
     * Extra inserter keywords this edition adds, keyed by block name.
     *
     * 🟡 **None — and the point is what is no longer there.** `block.json`
     * named two modes that not every edition ships, so searching the inserter
     * for one of them surfaced Glide in a build that offers neither. The shared
     * manifest now carries only terms every edition can deliver on, and an
     * edition that adds a mode adds the word for it here.
     *
     * ⚠️ The attribute schema differs per edition as well, but at build time:
     * an edition's extra attributes are in its `src/edition/block-attributes.json`,
     * and this one's is empty.
     *
     * @return array<string, list<string>>
     */
    public static function blockKeywords(): array
    {
        return [];
    }

    /**
     * What this edition adds to the block editor's localized object.
     *
     * The upsell surfaces' URLs and copy (`Service\EditorUpsell`), read by
     * this edition's `src/edition/upsell.js` and by nothing else. ⚠️ **Not a
     * tier branch**: the shared `AssetManager` merges whatever this answers,
     * and an edition with nothing to add answers `[]`, as `blockKeywords()`
     * does. Nothing asks which edition is running.
     *
     * @return array<string, mixed>
     */
    public static function editorVars(): array
    {
        return (new EditorUpsell())->vars();
    }
}
