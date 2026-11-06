<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Config;

use GHOSTLABS\GLIDE\Enum\GlidePattern;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * What this edition includes, beside what the paid edition adds — declared once.
 *
 * The free/paid line would otherwise be restated in the settings screen's table, its hero, the
 * readme and the catalogue, and in a sibling plugin it drifted three times before anybody noticed.
 * So the facts live here, and `TierMatrixTest` holds them to what this build compiles:
 *
 * - **The free column agrees with the enforcement lists.** `Boot\Edition`'s modes and patterns,
 *   the Tweens panel's options and the step anchors are what this build actually offers; a test
 *   fails the day the table and they disagree.
 * - **The paid totals are stated, not counted.** This build carries none of the paid edition's
 *   code, so there is nothing here to count; the same test reads the paid edition's own source
 *   from the monorepo and holds the numbers to it.
 * - **Labels resolve when asked.** Nothing here is memoised or a constant, because a registry
 *   that translated its labels while loading would bake in whichever locale registered first.
 * - **Facts only.** Feature names, verdicts and quantities. The hero's and the card's sentences
 *   stay on their surfaces, where they were written.
 *
 * Free-only: the paid edition sells nothing, so it has no table to fill.
 *
 * @package GhostLabsGlide
 */
final class TierMatrix
{
    /**
     * How many sticky-scroll layouts the paid edition has, this build's included.
     *
     * The hero's "Three more ways" and the card's "three more sticky-scroll layouts" are this
     * less `freeStickyLayouts()`, said in a word; their tests hold the word to it.
     */
    public const PAID_STICKY_LAYOUT_COUNT = 4;

    /** The paid edition's name, as this edition's copy says it. A product name, so not translated. */
    public static function paidEditionName(): string
    {
        return 'Glide Pro';
    }

    /**
     * Every sticky-scroll layout this build registers, by pattern name, labelled as the layout
     * picker labels it.
     *
     * @return array<string, string>
     */
    public static function freeStickyLayouts(): array
    {
        return [
            GlidePattern::StickyChapters->value => __('Sticky Chapters', 'ghostlabs-glide'),
        ];
    }

    /**
     * The comparison table's rows, in the order approved by the owner on 2026-11-05 (Penpot →
     * Glide → Upsell surfaces · Design, board 5) and claims-checked on 2026-11-03.
     *
     * ⚠️ The one paid mode the register never markets (§ Never claim) has no row of its own: it is
     * named once, last, inside the transitions row, and the owner approved the board that way.
     * Adding a row for it is one entry here, and a question for the owner first.
     *
     * @return list<Capability>
     */
    public static function capabilities(): array
    {
        return [
            new Capability(
                'sticky-layouts',
                __('Sticky-scroll layouts', 'ghostlabs-glide'),
                self::named(self::freeStickyLayouts()),
                self::all(self::PAID_STICKY_LAYOUT_COUNT)
            ),
            new Capability(
                // ⚠️ A quantity, not a cross: this edition has chapter links of its own, numbered
                // (claims check, 2026-11-03). A cross read as "free has none".
                'chapter-links',
                __('Chapter links', 'ghostlabs-glide'),
                /* translators: the kind of chapter link the free edition makes: #…-step-1, #…-step-2. */
                __('Numbered', 'ghostlabs-glide'),
                __('From each step\'s title', 'ghostlabs-glide')
            ),
            new Capability(
                'content-slider',
                __('A content slider with every navigation and playback option', 'ghostlabs-glide'),
                true,
                true
            ),
            new Capability(
                'slide-content',
                __('Any blocks inside a slide, except another Glide', 'ghostlabs-glide'),
                true,
                true
            ),
            new Capability(
                'marquee',
                __('Marquee: a continuous loop of any blocks', 'ghostlabs-glide'),
                false,
                true
            ),
            new Capability(
                // ⚠️ "at one slide per view" is the truth, not a hedge: the editor disables every
                // transition above one slide per view, Fade included.
                'fade',
                __('The Fade transition, at one slide per view', 'ghostlabs-glide'),
                true,
                true
            ),
            new Capability(
                'transitions',
                __('The Scale, Barn Doors and Parallax transitions, at one slide per view', 'ghostlabs-glide'),
                false,
                true
            ),
        ];
    }

    /** @param array<string, string> $labels */
    private static function named(array $labels): string
    {
        return implode(
            /* translators: separates the names in a short list, as in "Sticky Chapters, Sticky Media". */
            __(', ', 'ghostlabs-glide'),
            array_values($labels)
        );
    }

    private static function all(int $count): string
    {
        return sprintf(
            /* translators: %d: how many there are in all, as in "All 4". */
            __('All %d', 'ghostlabs-glide'),
            $count
        );
    }
}
