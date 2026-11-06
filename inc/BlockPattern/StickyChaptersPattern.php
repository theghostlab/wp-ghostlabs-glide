<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\BlockPattern;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Sticky Chapters: a contents rail that stays in view while the steps beside
 * it scroll past — the interactive table of contents.
 *
 * Seeds a whole Glide block in `stickyScroll` mode, so it is unscoped and
 * surfaces in the general inserter rather than inside a slide.
 *
 * The `ghostlabs-glide--sticky-chapters` marker class is the contract: it
 * selects the layout in sticky-scroll/style.scss, routes the frontend module
 * in sticky-scroll/index.js, picks the branch in Glide::renderStickyScroll(),
 * and gates the inspector panels in both edit.js files. Without it this is
 * four slides in a plain stack.
 *
 * The rail is not authored — it is derived from each step's heading, so the
 * seeded steps lead with one.
 */
class StickyChaptersPattern implements BlockPatternInterface
{
    public function name(): string
    {
        return 'ghostlabs-glide/sticky-chapters';
    }

    public function title(): string
    {
        return __('Sticky Chapters', 'ghostlabs-glide');
    }

    public function description(): string
    {
        return __('A contents rail that sticks in view while the chapters beside it scroll past, highlighting the one you are reading.', 'ghostlabs-glide');
    }

    /**
     * Scoped to the Glide block itself, not left unscoped.
     *
     * The pattern's root *is* a ghostlabs/glide block, so WordPress offers it
     * from the block's own Patterns surface — which is where an author who has
     * already inserted Glide will look. Unscoped, the only way to reach it was
     * the global inserter, and dragging from there inserts a *second* block
     * beside the one they started with.
     *
     * @return list<string>
     */
    public function blockTypes(): array
    {
        return ['ghostlabs/glide'];
    }

    /**
     * Still listed in the Patterns UI, for now.
     *
     * The Glide block's layout picker offers this same layout and is the
     * better route — it fills the empty block the author is standing in,
     * where inserting from Patterns drops a whole second Glide block beside
     * it. Returning false here would hide the duplicate, but `inserter` is one
     * boolean covering two surfaces: it would also drop the pattern from the
     * *selected block's* own Patterns panel (getPatternsByBlockTypes runs
     * through the same filter), which is today the only way to convert a Glide
     * block that already has content. Left listed until that trade is settled.
     */
    public function inserter(): bool
    {
        return true;
    }

    public function content(): string
    {
        $steps = [
            [
                esc_html__('Overview', 'ghostlabs-glide'),
                esc_html__('Open with the short version — what this section covers and why it is worth the scroll.', 'ghostlabs-glide'),
            ],
            [
                esc_html__('Configuration', 'ghostlabs-glide'),
                esc_html__('Each chapter is a slide. Give it a heading and the contents rail builds itself from them.', 'ghostlabs-glide'),
            ],
            [
                esc_html__('Deployment', 'ghostlabs-glide'),
                esc_html__('The rail stays stuck for as long as this column is tall, then releases with the section.', 'ghostlabs-glide'),
            ],
        ];

        $markup = '';
        foreach ($steps as [$heading, $body]) {
            $markup .= '<!-- wp:ghostlabs/glide-slide -->
<div class="wp-block-ghostlabs-glide-slide"><!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">'
            . $heading
            . '</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>'
            . $body
            . '</p>
<!-- /wp:paragraph --></div>
<!-- /wp:ghostlabs/glide-slide -->
';
        }

        // Both blocks have a save() that emits a wrapper, so the pattern has to
        // emit it too: the editor validates saved markup against save() output,
        // and a bare block comment fails as "expected Object, saw end of
        // content". The class list must carry the align and className supports
        // as well, since useBlockProps.save() folds them in.
        return '<!-- wp:ghostlabs/glide {"align":"wide","mode":"stickyScroll","className":"ghostlabs-glide--sticky-chapters"} -->
<div class="wp-block-ghostlabs-glide alignwide ghostlabs-glide--sticky-chapters">'
            . $markup
            . '</div>
<!-- /wp:ghostlabs/glide -->';
    }
}
