<?php
/**
 * Server-side rendering for the ghostlabs/glide-testimonial-rating block.
 *
 * @var array<string, mixed> $attributes The block attributes.
 * @var string               $content    The block default content.
 * @var WP_Block             $block      The block instance.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped as it is built (BlockMarkup::rating()): the wrapper by get_block_wrapper_attributes(), the stars by esc_html().
echo \GHOSTLABS\GLIDE\Service\BlockMarkup::rating( $attributes );
