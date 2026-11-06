<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Render;

use GHOSTLABS\GLIDE\Config\TierMatrix;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Settings → Glide's body: Penpot → WordPress > Plugins → **Upsell Page** (F3), as Penpot → Glide
 * → *Upsell surfaces · Design*, boards 5 and 5b, approved by the owner on 2026-11-05.
 *
 * Its shape is the argument: where your settings actually live, the quiet way in for somebody who
 * already bought, the hero that says what the paid edition is for, then the table that sets what
 * you have beside what you would be buying, and the ask again after the case is made.
 *
 * A composer only. Each section is its own renderer, so the order is the one thing this class
 * decides. The header band above it is `Service\UpgradePage`'s, because core's notice marker has
 * to follow it.
 *
 * @package GhostLabsGlide
 */
final class UpgradePage
{
    /**
     * @param BuyLink $tableLink The foot-of-table ask, from its own bucket
     *                           (`UpsellSource::SettingsTable`).
     * @param string  $docsUrl   The documentation, linked from the first card. Empty renders no
     *                           link.
     */
    public function __construct(
        private readonly UpgradePanel $panel,
        private readonly HeroBand $hero,
        private readonly ComparisonTable $table,
        private readonly BuyLink $tableLink,
        private readonly string $docsUrl = '',
    ) {
    }

    public function render(): void
    {
        echo '<div class="ghostlabs-glide-upgrade">';

        $this->orientation();
        $this->panel->render();
        $this->hero->render();

        echo '<section class="ghostlabs-glide-compare">';
        $this->table->render();
        $this->foot();
        echo '</section>';

        echo '</div>';
    }

    /**
     * Where the settings are. Most people arrive from the Settings link on the plugin's row,
     * expecting settings, and the honest answer is that there are none here: this edition stores
     * no option, and every setting belongs to a block.
     */
    private function orientation(): void
    {
        echo '<section class="ghostlabs-glide-upgrade__card">';

        printf('<h2 class="ghostlabs-glide-upgrade__card-title">%s</h2>', esc_html__('Where your settings live', 'ghostlabs-glide'));

        printf(
            '<p>%s</p>',
            esc_html__('Every setting lives on the block. Add a Glide block to a post or page, and its settings are in the block sidebar — there is nothing to configure here.', 'ghostlabs-glide')
        );

        // ⚠️ "three more" is `TierMatrix`'s count less this edition's, in a word; `UpgradePageTest`
        // holds it.
        printf(
            '<p>%s</p>',
            esc_html(sprintf(
                /* translators: %s: the paid edition's name. */
                __('%s adds three more sticky-scroll layouts and a marquee — what it includes is below.', 'ghostlabs-glide'),
                TierMatrix::paidEditionName()
            ))
        );

        // The people who arrive here looking for settings are exactly who the docs page is for.
        // No attribution: it is not an ask.
        if ($this->docsUrl !== '') {
            printf(
                '<p><a href="%s" target="_blank" rel="noopener noreferrer">%s<span class="screen-reader-text"> %s</span><span aria-hidden="true"> ↗</span></a></p>',
                esc_url($this->docsUrl),
                esc_html__('Read the Glide docs', 'ghostlabs-glide'),
                esc_html__('(opens in a new tab)', 'ghostlabs-glide')
            );
        }

        echo '</section>';
    }

    /**
     * The ask, repeated at the foot of the table. The table is tall enough to push the hero's link
     * off-screen, so the offer comes again: the same offer, a later reading of the screen, and
     * therefore its own attribution bucket.
     *
     * ⚠️ "the feature tour", not "the full" one: the product page leaves out a transition this
     * table names (claims check, 2026-11-03). It is true only while that page is live.
     */
    private function foot(): void
    {
        echo '<div class="ghostlabs-glide-compare__foot"><div class="ghostlabs-glide-compare__note">';

        printf('<p class="ghostlabs-glide-compare__note-title">%s</p>', esc_html__('Ready when you are', 'ghostlabs-glide'));
        printf('<p>%s</p>', esc_html__('Pricing and the feature tour live on the product page.', 'ghostlabs-glide'));

        echo '</div>';

        $this->tableLink->render('ghostlabs-glide-button ghostlabs-glide-button--primary ghostlabs-glide-button--large');

        echo '</div>';
    }
}
