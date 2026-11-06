<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use WP_Block;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The markup of the three small blocks, built for their `render.php` to echo.
 *
 * ⚠️ **The templates assign nothing and echo once.** WordPress includes a block's
 * `render.php` inside a closure, so its variables are not truly global — but
 * WordPress.org's Plugin Check cannot see that and reports each one
 * (`PrefixAllGlobals.NonPrefixedVariableFound`), and it reports an echo it cannot
 * see escaped (`EscapeOutput.OutputNotEscaped`, an ERROR that `/wporg-submit`
 * refuses). So the logic lives here, and each template's one echo says why it is
 * not escaped again. `RenderTemplatesTest` holds both.
 *
 * Every value is escaped as it is built: the wrapper attributes by
 * `get_block_wrapper_attributes()`, which escapes them itself; the inner HTML by
 * the core block renderer that produced it, which `wp_kses_post()` would strip
 * of the embeds and slider markup it legitimately carries.
 *
 * @package GhostLabsGlide
 */
final class BlockMarkup
{
    /**
     * `ghostlabs/glide-overlay`: its children inside the support-styled wrapper.
     *
     * ⚠️ The children come from `$block->inner_blocks`, not from the saved
     * `$content`, which is `save.js`'s wrapper with the same support classes and
     * inline styles already on it. Wrapping that again applied the padding twice.
     */
    public static function overlay(WP_Block $block): string
    {
        $inner = '';

        foreach ($block->inner_blocks as $innerBlock) {
            $inner .= $innerBlock->render();
        }

        return sprintf(
            '<div %s><div class="ghostlabs-glide-overlay__content">%s</div></div>',
            get_block_wrapper_attributes([
                'class' => 'ghostlabs-glide-overlay',
                // A labelled group, not a landmark: it sits inside the
                // carousel's own region, and a nested "Slide overlay" landmark
                // on every slider only lengthened the landmark list.
                'role'       => 'group',
                'aria-label' => __('Slide overlay', 'ghostlabs-glide'),
            ]),
            $inner
        );
    }

    /**
     * `ghostlabs/glide-slide`: the wrapper and the content, nothing else.
     *
     * ⚠️ **Never shown, and it must stay cheap.** A slide only ever sits inside
     * a Glide block, and `Glide` renders every slide itself, video background
     * included; `glide/render.php` discards the inner blocks' output. WordPress
     * still renders it for every slide on every page view. It used to build the
     * video background too, and for an external video that meant an uncached
     * `wp_oembed_get()` per slide per view (5 s a slide with YouTube slow,
     * measured 2026-10-26).
     */
    public static function slide(string $content): string
    {
        return sprintf(
            '<div %s>%s</div>',
            get_block_wrapper_attributes(['class' => 'ghostlabs-glide-slide']),
            $content
        );
    }

    /**
     * `ghostlabs/glide-testimonial-rating`: one to five stars, named for
     * assistive technology and hidden from it as glyphs.
     *
     * @param array<string, mixed> $attributes
     */
    public static function rating(array $attributes): string
    {
        $value = max(1, min(5, (int) ($attributes['value'] ?? 5)));
        $label = sprintf(
            /* translators: %d is the star rating from 1 to 5 */
            __('%d out of 5 stars', 'ghostlabs-glide'),
            $value
        );
        $stars = str_repeat('★', $value) . str_repeat('☆', 5 - $value);

        $textAlign = $attributes['textAlign'] ?? '';
        $textAlign = in_array($textAlign, ['left', 'center', 'right'], true) ? $textAlign : '';

        $classes = ['ghostlabs-glide-testimonial__rating'];

        if ($textAlign !== '') {
            $classes[] = 'has-text-align-' . $textAlign;
        }

        return sprintf(
            '<div %s><span aria-hidden="true">%s</span></div>',
            get_block_wrapper_attributes([
                'class'      => implode(' ', $classes),
                'role'       => 'img',
                'aria-label' => $label,
            ]),
            esc_html($stars)
        );
    }
}
