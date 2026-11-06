<?php
/**
 * Server-side rendering for the ghostlabs/glide-overlay block.
 *
 * `Glide::renderOverlay()` renders the overlay through this file, so that
 * WordPress applies the block's colour and padding supports to the wrapper.
 * The markup is `BlockMarkup::overlay()`'s, which says why it is built there.
 *
 * @var array<string, mixed> $attributes The block attributes.
 * @var string               $content    The block default content.
 * @var WP_Block             $block      The block instance.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped as it is built (BlockMarkup::overlay()): the wrapper by get_block_wrapper_attributes(), the children by core's block renderer.
echo \GHOSTLABS\GLIDE\Service\BlockMarkup::overlay( $block );
