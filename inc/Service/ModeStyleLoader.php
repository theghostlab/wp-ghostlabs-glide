<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use GHOSTLABS\GLIDE\Boot\Edition;
use GHOSTLABS\GLIDE\Enum\GlidePattern;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Registers one frontend stylesheet per mode this edition ships, so a rendered
 * block enqueues only the one its mode needs.
 */
class ModeStyleLoader
{
    public function registerHooks(Loader $loader): void
    {
        $loader->add_action('wp_enqueue_scripts', $this, 'registerStyles');
    }

    /**
     * ⚠️ **No `file_exists()` guard, deliberately.** There was one, and it turned
     * a missing stylesheet into a silent skip: the mode registered no style,
     * `wp_enqueue_style()` for it did nothing, and the block rendered unstyled
     * with nothing anywhere to say why.
     *
     * The list comes from `Edition::modes()` now, so it names exactly what this
     * edition compiled — which means a slug that is named and not built is a
     * mistake, and should read as one.
     */
    public function registerStyles(): void
    {
        foreach (Edition::modes() as $slug) {
            $path = GHOSTLABS_GLIDE_PLUGIN_PATH . "build/modes/{$slug}/frontend.css";

            wp_register_style(
                "ghostlabs-glide-mode-{$slug}",
                GHOSTLABS_GLIDE_PLUGIN_URL . "build/modes/{$slug}/frontend.css",
                [],
                file_exists($path) ? (string) filemtime($path) : GHOSTLABS_GLIDE_VERSION
            );
        }
    }

    /**
     * Enqueue the stylesheet for a mode this edition ships.
     *
     * ⚠️ Callers must pass a *resolved* mode — `Glide::resolvedMode()` — not the
     * one the block asked for. A block pasted between editions can carry a
     * `data-glide-mode` this build does not ship, which names a stylesheet that
     * was never registered; `wp_enqueue_style()` on an unregistered handle does
     * nothing at all and says nothing about it.
     */
    public static function enqueueMode(string $mode): void
    {
        $slug = Edition::modes()[$mode] ?? 'content-slider';

        wp_enqueue_style("ghostlabs-glide-mode-{$slug}");
    }

    /**
     * Enqueue one Sticky Scroll layout's own stylesheet, after the mode's.
     *
     * Called by the renderer that draws the layout, so the stylesheet is loaded
     * exactly when the layout is — a page of Sticky Chapters loads none of the
     * others. The layouts the mode stylesheet already carries need no call.
     *
     * 🔴 The dependency on the mode handle is what orders the two: the layout
     * overrides base rules at equal specificity, and loaded first it would lose
     * every one of them.
     *
     * ⚠️ No `file_exists()` guard, for the reason `registerStyles()` gives: only
     * a renderer this edition compiled calls this, so a missing file is a build
     * fault and should read as one.
     */
    public static function enqueueLayout(GlidePattern $layout): void
    {
        $slug = $layout->slug();
        $relative = "build/modes/sticky-scroll/layouts/{$slug}/frontend.css";
        $path = GHOSTLABS_GLIDE_PLUGIN_PATH . $relative;

        wp_enqueue_style(
            "ghostlabs-glide-layout-{$slug}",
            GHOSTLABS_GLIDE_PLUGIN_URL . $relative,
            ['ghostlabs-glide-mode-sticky-scroll'],
            file_exists($path) ? (string) filemtime($path) : GHOSTLABS_GLIDE_VERSION
        );
    }
}
