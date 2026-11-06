<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Enum;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The Glide block patterns this edition ships, backed by their registered
 * pattern names. `Edition::patterns()` maps each to its class, and the renderer
 * branches on `markerClass()`.
 *
 * To add a pattern: a new BlockPatternInterface class, one case here, and an
 * entry in `Boot\Edition::patterns()`.
 *
 * 🔴 **Every edition defines this same enum, with its own cases** — safe for the
 * reason `Boot\Edition` is: no two tiers' `inc/` are ever on one autoload path.
 * This one carries only the patterns this edition contains. A block carrying a
 * marker it does not know still renders: `Glide::renderStickyScroll()` sends any
 * unrecognised marker on to the plain stack of steps, so no slide is lost.
 *
 * ⚠️ **These cases must agree with every other edition's**, value and marker:
 * shared code names them, and a block saved in one edition carries them into
 * another. `GlidePatternTest::testTheSharedCasesAreTheSameInEveryEdition()`
 * pins both literally, in both suites.
 */
enum GlidePattern: string
{
    case Testimonial    = 'ghostlabs-glide/testimonial';
    case StickyChapters = 'ghostlabs-glide/sticky-chapters';

    /**
     * The short pattern slug — the registered name's last segment.
     *
     * `ghostlabs-glide/sticky-chapters` → `sticky-chapters`.
     */
    public function slug(): string
    {
        return basename($this->value);
    }

    /**
     * The marker class the pattern stamps on its root block's className — the
     * layout contract the SCSS/JS select on.
     *
     * Distinct from the mode modifier classes (`ghostlabs-glide--content-slider`
     * and friends), which Glide.php and edit.js generate into the block
     * wrapper. Both end up in the same class list; never reuse a name across
     * the two.
     */
    public function markerClass(): string
    {
        return match ($this) {
            self::Testimonial    => 'ghostlabs-glide-testimonial',
            self::StickyChapters => 'ghostlabs-glide--sticky-chapters',
        };
    }
}
