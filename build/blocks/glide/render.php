<?php
/**
 * Server-side rendering for the ghostlabs/glide block.
 *
 * @var array<string, mixed> $attributes The block attributes.
 * @var string               $content    The block default content.
 * @var WP_Block             $block      The block instance.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped as it is built (Glide::render(): esc_attr(), esc_url(), esc_html() and wp_json_encode() throughout); the slides' inner HTML is core's block renderer's, which wp_kses_post() would strip of embeds.
echo \GHOSTLABS\GLIDE\Service\Glide::renderBlock( $attributes, $block );
