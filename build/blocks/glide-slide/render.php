<?php
/**
 * Server-side rendering for the ghostlabs/glide-slide block.
 *
 * ⚠️ **This output is never shown, and it must stay cheap.** `Glide` renders
 * every slide itself; see `BlockMarkup::slide()` for why WordPress still runs
 * this for every slide on every page view.
 *
 * @var array<string, mixed> $attributes The block attributes.
 * @var string               $content    The block default content.
 * @var WP_Block             $block      The block instance.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped as it is built (BlockMarkup::slide()): the wrapper by get_block_wrapper_attributes(), the content by core's block renderer.
echo \GHOSTLABS\GLIDE\Service\BlockMarkup::slide( $content );
