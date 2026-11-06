<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Render;

use GHOSTLABS\GLIDE\Config\TierMatrix;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The settings screen's brand hero: Upsell Page F3's wave band, as Cycle Block, Undercard,
 * Serendipity and Friendly Skies ship it.
 *
 * The one piece of the screen that is not wp-admin furniture. It is inset from the content column
 * rather than full-bleed, so it reads as a panel *on* the settings screen instead of a takeover
 * *of* it, which is the reason a marketing band is acceptable in somebody's admin at all.
 *
 * ⚠️ The gradient, the line texture and the sweep ship inside the plugin
 * (`assets/images/upsell/`, drawn by `assets/css/upgrade.css`): Guideline 7 prohibits offloading
 * assets to a remote service.
 *
 * The copy is board 5's, approved by the owner on 2026-11-05 and claims-checked on 2026-11-03.
 * Verbatim: the register is where it changes.
 *
 * @package GhostLabsGlide
 */
final class HeroBand
{
    /** @param BuyLink $link The hero's own ask, from `UpsellSource::Settings`. */
    public function __construct(private readonly BuyLink $link)
    {
    }

    public function render(): void
    {
        echo '<section class="ghostlabs-glide-hero">';

        // Decorative, and marked as such: backgrounds behind hidden nodes rather than images a
        // screen reader has to skip past.
        echo '<div class="ghostlabs-glide-hero__texture" aria-hidden="true"></div>';
        echo '<div class="ghostlabs-glide-hero__sweep" aria-hidden="true"></div>';

        echo '<div class="ghostlabs-glide-hero__copy">';

        printf('<p class="ghostlabs-glide-hero__eyebrow">%s</p>', esc_html(TierMatrix::paidEditionName()));

        // ⚠️ "Three" is `TierMatrix`'s count less this edition's, in a word; `HeroBandTest` holds it.
        printf(
            '<h2 class="ghostlabs-glide-hero__headline">%s</h2>',
            esc_html__('Three more ways to tell a story on scroll.', 'ghostlabs-glide')
        );

        printf(
            '<p class="ghostlabs-glide-hero__sub">%s</p>',
            esc_html__('Everything the free edition does — plus Sticky Media, Stacking Cards and Horizontal Pin, a marquee of any blocks, chapter links made from each step\'s title, and the Scale and Barn Doors slide transitions.', 'ghostlabs-glide')
        );

        $this->link->render('ghostlabs-glide-hero__pill');

        echo '</div></section>';
    }
}
