<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Config;

use InvalidArgumentException;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * One row of the settings screen's comparison table: a feature, and what each edition has of it.
 *
 * ⚠️ **A cell is a verdict or a quantity, never only a verdict.** `true` / `false` say whether an
 * edition has it; a string says how much of it, so a row where this edition has part of
 * something names that part ("Sticky Chapters") instead of being flattened to a cross. A
 * boolean-only shape is what once produced "every interval" six lines above a control that
 * offered three of nine (Cycle Block).
 *
 * ⚠️ The column is `paid`, never the edition's name: a key is not copy.
 *
 * @package GhostLabsGlide
 */
final class Capability
{
    /**
     * @param string      $key   A stable handle: the row's `data-capability`, and what tests select on.
     * @param string      $label The row's heading, already translated.
     * @param bool|string $free  What this edition has of it.
     * @param bool|string $paid  What the paid edition has of it.
     */
    public function __construct(
        public readonly string $key,
        public readonly string $label,
        public readonly bool|string $free,
        public readonly bool|string $paid,
    ) {
        if (preg_match('/^[a-z][a-z0-9-]*$/', $key) !== 1) {
            throw new InvalidArgumentException(sprintf('A capability key is a lowercase handle, not "%s".', esc_html($key)));
        }

        if ($label === '') {
            throw new InvalidArgumentException(sprintf('Capability "%s" has no label.', esc_html($key)));
        }

        if ($free === '' || $paid === '') {
            throw new InvalidArgumentException(sprintf('Capability "%s" states an empty quantity.', esc_html($key)));
        }
    }
}
