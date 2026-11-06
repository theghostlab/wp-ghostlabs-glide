<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Render;

use GHOSTLABS\GLIDE\Config\TierMatrix;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * What this edition includes, beside what the paid one adds.
 *
 * ⚠️ **A renderer, not a declaration.** Every label, quantity and verdict comes from
 * `Config\TierMatrix`; nothing here restates a feature. The drift this closes is a screen that
 * says "everything" six lines above a control that withholds three things.
 *
 * A real `<table>` with `th[scope]` on both axes, so every cell is announced with the feature and
 * the edition it belongs to.
 *
 * @package GhostLabsGlide
 */
final class ComparisonTable
{
    /**
     * The two marks, 20×20.
     *
     * ⚠️ The marks ARE the answer of their cell, so they are graphical objects that need 3:1
     * against the ground (WCAG 1.4.11), and axe cannot see that: it reads text, not SVG fills. The
     * colour is the stylesheet's, and the E2E spec measures the computed colour of every mark.
     */
    private const CHECK = 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z';

    private const CROSS = 'M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z';

    public function render(): void
    {
        echo '<table class="ghostlabs-glide-compare__table">';

        printf(
            '<caption class="screen-reader-text">%s</caption>',
            esc_html(sprintf(
                /* translators: %s: the paid edition's name. */
                __('What the free edition includes, and what %s adds', 'ghostlabs-glide'),
                TierMatrix::paidEditionName()
            ))
        );

        printf(
            '<thead><tr><th scope="col" class="ghostlabs-glide-compare__feature"><span class="screen-reader-text">%s</span></th>'
            . '<th scope="col" class="ghostlabs-glide-compare__free">%s</th>'
            . '<th scope="col" class="ghostlabs-glide-compare__paid">%s</th></tr></thead>',
            esc_html__('Feature', 'ghostlabs-glide'),
            esc_html__('Free', 'ghostlabs-glide'),
            /* translators: the comparison table's column for the paid edition, one word wide. */
            esc_html__('Pro', 'ghostlabs-glide')
        );

        echo '<tbody>';

        foreach (TierMatrix::capabilities() as $capability) {
            printf(
                '<tr data-capability="%s"><th scope="row">%s</th><td class="ghostlabs-glide-compare__free">',
                esc_attr($capability->key),
                esc_html($capability->label)
            );
            $this->cell($capability->free, true);
            echo '</td><td class="ghostlabs-glide-compare__paid">';
            $this->cell($capability->paid, false);
            echo '</td></tr>';
        }

        echo '</tbody></table>';
    }

    /**
     * A verdict or a quantity. A quantity is rendered as itself, so a row where this edition has
     * part of something says which part.
     *
     * @param bool $muted This edition's column: its marks are gray, the paid column's purple. A
     *                    cross is gray in either.
     */
    private function cell(bool|string $value, bool $muted): void
    {
        if (is_string($value)) {
            echo esc_html($value);

            return;
        }

        printf(
            '<svg class="ghostlabs-glide-compare__mark%s" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">'
            . '<path fill-rule="evenodd" clip-rule="evenodd" d="%s"/></svg>'
            . '<span class="screen-reader-text">%s</span>',
            ($muted || !$value) ? ' ghostlabs-glide-compare__mark--muted' : '',
            esc_attr($value ? self::CHECK : self::CROSS),
            $value ? esc_html__('Included', 'ghostlabs-glide') : esc_html__('Not included', 'ghostlabs-glide')
        );
    }
}
