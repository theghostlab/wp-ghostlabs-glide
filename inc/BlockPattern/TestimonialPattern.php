<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\BlockPattern;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Testimonial: a slide's worth of content — title, a 5-star
 * ghostlabs/glide-testimonial-rating, a quotation and an author citation.
 *
 * Scoped to `ghostlabs/glide-slide`, so it is offered when editing a slide
 * rather than in the general inserter. The `ghostlabs-glide-testimonial`
 * marker class is the styling contract that
 * src/blocks/glide-slide/patterns/_testimonial.scss selects on; without it
 * this is just a group of core blocks.
 */
class TestimonialPattern implements BlockPatternInterface
{
    public function name(): string
    {
        return 'ghostlabs-glide/testimonial';
    }

    public function title(): string
    {
        return __('Testimonial', 'ghostlabs-glide');
    }

    public function description(): string
    {
        return __('A testimonial slide with a title, a 5-star rating, a quotation and an author citation.', 'ghostlabs-glide');
    }

    /**
     * @return list<string>
     */
    public function blockTypes(): array
    {
        return ['ghostlabs/glide-slide'];
    }

    /**
     * Offered in the Patterns UI, unlike the sticky-scroll layouts.
     *
     * This one seeds the *inside* of a slide the author already has, so the
     * Patterns list scoped to `ghostlabs/glide-slide` is exactly the right
     * surface for it — there is no picker covering this case.
     */
    public function inserter(): bool
    {
        return true;
    }

    public function content(): string
    {
        $title = esc_html__('A glowing review', 'ghostlabs-glide');
        $quote = esc_html__('This product changed how our team works — fast, intuitive, and beautifully built.', 'ghostlabs-glide');
        $cite = esc_html__('Jane Doe, Acme Co.', 'ghostlabs-glide');

        return '<!-- wp:group {"tagName":"article","className":"ghostlabs-glide-testimonial","layout":{"type":"flex","orientation":"vertical"}} -->
<article class="wp-block-group ghostlabs-glide-testimonial">
<!-- wp:heading {"level":3,"className":"ghostlabs-glide-testimonial__title"} -->
<h3 class="wp-block-heading ghostlabs-glide-testimonial__title">'
            . $title
            . '</h3>
<!-- /wp:heading -->

<!-- wp:ghostlabs/glide-testimonial-rating {"value":5} /-->

<!-- wp:quote {"className":"ghostlabs-glide-testimonial__quote"} -->
<blockquote class="wp-block-quote ghostlabs-glide-testimonial__quote"><!-- wp:paragraph -->
<p>'
            . $quote
            . '</p>
<!-- /wp:paragraph --><cite>'
            . $cite
            . '</cite></blockquote>
<!-- /wp:quote -->
</article>
<!-- /wp:group -->';
    }
}
