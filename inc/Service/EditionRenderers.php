<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use WP_Block;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The server-side markup for everything this edition adds to `Glide`: nothing.
 *
 * 🔴 **The gate is absence, and this file is what absence looks like.** This
 * edition ships the content slider and Sticky Chapters, and `Glide` already
 * holds the markup for both — so there is nothing here to guard, nothing to
 * mark unreachable, and nothing an unwanted caller could reach. The five
 * renderers that used to sit in the shared class, dead but readable, are not in
 * this tree at all.
 *
 * ⚠️ **It has to exist even so.** `Glide` is shared and `use`s this trait
 * unconditionally; a missing trait is a fatal at include time, not a fallback —
 * every block on the site would stop rendering. That is the same reason the
 * `@edition` SCSS partials exist while empty: `use` and `@use` are both resolved
 * at compile time and neither has a conditional form.
 *
 * `EditionRenderersTest` runs in both editions' suites and asserts the methods
 * below exist with matching signatures, because "one edition quietly grew
 * another hook" is otherwise only discovered by a white screen.
 *
 * @package GhostLabsGlide
 */
trait EditionRenderers
{
    /**
     * Unreachable, and correct to keep.
     *
     * `Glide::render()` only takes its `default` arm for a mode that is neither
     * `contentSlider` nor `stickyScroll`, and `__construct` has already replaced
     * anything outside `Edition::modes()` — which here is exactly those two. So
     * no value can arrive.
     *
     * ⚠️ **Not `throw`, though nothing can call it.** The one way to be wrong
     * about that is a mode added to `Edition::modes()` before its markup exists,
     * and the cost of being wrong should be a slider rather than a fatal on a
     * published page. Every slide the author wrote survives either way, which is
     * the property the whole tier split is built to preserve.
     */
    private function renderEditionMode(string $mode): string
    {
        unset($mode);

        return $this->renderContentSlider();
    }

    /**
     * No marker-dispatched layouts beyond the one `Glide` holds itself.
     *
     * Null is what sends `renderStickyScroll()` on to `renderStickySteps()`, so
     * a block carrying a marker this edition has no layout for renders as the
     * plain stack of steps rather than as nothing. It needs no vocabulary for
     * the marker: anything that is not a layout `Glide` holds itself ends here.
     */
    private function renderEditionStickyLayout(): ?string
    {
        return null;
    }

    /**
     * No tween effects, so every slide is a plain div.
     *
     * A block pasted from an edition that has them still carries the flag and
     * still gets the `is-tween-*` class — the flag is a key inside the
     * `contentSlider` object, which a parse keeps whole whatever this edition's
     * schema declares — but there is no module to animate anything and
     * `_tweens.scss` here styles nothing. Returning the
     * layered wrapper anyway would lay a slide out for a motion that never
     * arrives, which looks like a bug rather than like an absent feature.
     */
    private function editionSlideTemplate(): ?string
    {
        return null;
    }

    /**
     * No anchors of its own, so every step keeps the request-unique ID `Glide`
     * gives it, and the contents rail links to that.
     *
     * A step saved by an edition that pins anchors still renders, with this
     * ID. This edition's schema does not declare the pinned value, so the editor
     * drops it on the first save made here.
     */
    private function editionStepAnchor(WP_Block $step, string $title, int $index): ?string
    {
        unset($step, $title, $index);

        return null;
    }
}
