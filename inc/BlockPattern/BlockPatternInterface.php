<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\BlockPattern;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * A self-contained block-pattern definition.
 *
 * Each implementation owns one pattern: its registered name, its translated
 * title/description, the block types it is scoped to, and its block markup.
 * The pattern category is the one cross-pattern concern, applied uniformly by
 * PatternRegistrar, which instantiates every class `Boot\Edition::patterns()`
 * names and registers it on `init`.
 *
 * Scoping is per-pattern rather than uniform because Glide's patterns are not
 * all the same shape: the testimonial seeds the inside of a slide and is
 * scoped to `ghostlabs/glide-slide`, while the sticky-scroll patterns seed a
 * whole Glide block and are reached from that block's own layout picker.
 *
 * Visibility is per-pattern for the same reason — see inserter().
 *
 * The marker class a pattern stamps on its root block's `className` — the
 * layout contract the SCSS/JS select on, and the signal the editor and
 * renderer branch on — lives on the enum, not here. See Enum\GlidePattern.
 */
interface BlockPatternInterface
{
    /** The registered pattern name, e.g. `ghostlabs-glide/testimonial`. */
    public function name(): string;

    /** Translated, human-facing pattern title. */
    public function title(): string;

    /** Translated, human-facing pattern description. */
    public function description(): string;

    /**
     * Block types this pattern is offered for; an empty list leaves it
     * unscoped, so it surfaces in the general inserter.
     *
     * @return list<string>
     */
    public function blockTypes(): array;

    /**
     * Whether the pattern is offered in the editor's Patterns UI.
     *
     * `false` still *registers* the pattern — it stays in
     * WP_Block_Patterns_Registry and in the `/wp/v2/block-patterns/patterns`
     * response — but hides it from every editor pattern surface at once.
     *
     * ⚠️ It is one boolean over two surfaces that are worth telling apart: the
     * global inserter's Patterns tab, *and* the selected block's own Patterns
     * panel (`getPatternsByBlockTypes`, which resolves through the same
     * filter). The sticky layouts are duplicated by the Glide block's layout
     * picker on the first surface but reachable only from the second once a
     * block has content, so they currently return true. There is no way to
     * split the two without dropping `blockTypes` scoping and filtering the
     * inserter by hand.
     *
     * ⚠️ Whatever this returns, the picker must read the *unfiltered* registry
     * — `select('core').getBlockPatterns()`, which is the REST list — and not
     * the block-editor store's own pattern selectors. Those apply
     * `.filter(({ inserter = true }) => !!inserter)`, so the day this turns
     * false the picker would silently fall back to its marker-only path with
     * no error anywhere.
     */
    public function inserter(): bool;

    /** The pattern's block markup (the `content` register_block_pattern arg). */
    public function content(): string;
}
