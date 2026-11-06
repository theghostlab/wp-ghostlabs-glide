<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Render;

use GHOSTLABS\GLIDE\Config\TierMatrix;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * A buy link on the settings screen: the hero's pill and the table foot's button share one shape,
 * so it is written once.
 *
 * Every link lands on the product page, not a checkout, so every one reads *See* and the paid
 * edition's name: one label for one URL (Undercard's rule, and every sibling's settings screen).
 *
 * @package GhostLabsGlide
 */
final class BuyLink
{
    /**
     * @param string $url Built by `Service\UpgradeEndpoints::buyProUrl()`, so it carries the
     *                    surface it was built for. 🔴 No fallback: empty renders nothing at all.
     */
    public function __construct(private readonly string $url)
    {
    }

    /** @param string $class The look, which belongs to where the link sits, not to the link. */
    public function render(string $class): void
    {
        if ($this->url === '') {
            return;
        }

        // ⚠️ The new-tab warning is part of the accessible name (WCAG 3.2.5), hidden visually only
        // because the design carries an arrow instead. Removing the span silently reintroduces the
        // failure. The arrow is decoration, so it is hidden from the accessibility tree.
        printf(
            '<a class="%s" href="%s" target="_blank" rel="noopener noreferrer">%s'
            . '<span class="screen-reader-text"> %s</span><span aria-hidden="true"> →</span></a>',
            esc_attr($class),
            esc_url($this->url),
            esc_html(sprintf(
                /* translators: %s: the paid edition's name. */
                __('See %s', 'ghostlabs-glide'),
                TierMatrix::paidEditionName()
            )),
            esc_html__('(opens in a new tab)', 'ghostlabs-glide')
        );
    }
}
