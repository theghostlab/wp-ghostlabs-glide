<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use GHOSTLABS\GLIDE\Boot\Edition;
use GHOSTLABS\GLIDE\Enum\GlidePattern;
use WP_Block;

if ( ! defined( 'ABSPATH' ) ) exit;

class Glide
{
    /**
     * The markup for whatever this edition ships beyond the content slider and
     * the base sticky layouts.
     *
     * 🔴 **A trait rather than a collaborator, and that is not a shortcut.** The
     * renderers an edition adds reach fifteen private helpers of this class —
     * `stickyStepData()`, `stickyStyle()`, `clampInt()`, `renderStepList()` and
     * the rest. Moving them to an object would mean making that surface public,
     * which is a far larger change to this class than the split is worth, and it
     * would publish an internal vocabulary as an API. Trait methods are compiled
     * into the class, so they keep private access and nothing has to open up.
     *
     * ⚠️ **Every edition must define this trait**, and the failure mode if one
     * does not is a fatal at include time rather than a fallback — the same shape
     * as `@edition`'s empty SCSS partial, which must exist because `@use` is
     * resolved at compile time. `EditionRenderersTest` runs in both suites for
     * exactly this reason. Safe for the same single reason `Boot\Edition` is: no
     * two tiers' `inc/` are ever on one autoload path.
     *
     * It answers four questions and no others:
     *
     *   renderEditionMode(string $mode): string   — a mode this class has no
     *                                               markup for, already resolved
     *                                               against Edition::modes()
     *   renderEditionStickyLayout(): ?string      — the marker-dispatched sticky
     *                                               layouts, null for none
     *   editionSlideTemplate(): ?string           — a sprintf template wrapping a
     *                                               slide for a tween effect,
     *                                               null for the plain slide
     *   editionStepAnchor(WP_Block, string, int): ?string
     *                                             — a sticky step's id, null for
     *                                               the request-unique default
     */
    use EditionRenderers;

    private string $mode;
    /** @var array<string, mixed> */
    private array $config;

    /**
     * @param array<string, mixed> $attributes
     * @param WP_Block $block
     */
    public function __construct(private array $attributes, private WP_Block $block)
    {
        $requested = $this->attributes['mode'] ?? 'contentSlider';

        // ⚠️ **Resolved against what this edition ships, not taken as given.**
        // A block moved between editions can carry a mode this build has not
        // compiled a stylesheet or a module for. Rendering it as asked enqueued a
        // stylesheet which was never registered — `wp_enqueue_style()` on an
        // unregistered handle does nothing and says nothing — and loaded no
        // script, so it came out as an unstyled stack with no error anywhere.
        //
        // Falling back to the content slider preserves every slide the author
        // wrote, which is the property that matters: the gate is absence, and
        // absence must never lose content. `view.js` falls back the same way, to
        // the same mode, for the same reason.
        $this->mode = array_key_exists($requested, Edition::modes())
            ? $requested
            : 'contentSlider';

        $this->config = $this->attributes[$this->mode] ?? [];
    }

    /**
     * The mode this block will actually render as.
     *
     * `render.php` enqueues from this rather than from the attribute, so the
     * stylesheet always matches the markup.
     */
    public function resolvedMode(): string
    {
        return $this->mode;
    }

    /**
     * What `render.php` echoes: the block rendered, with the stylesheet of the
     * mode it actually renders in enqueued.
     *
     * ⚠️ The *resolved* mode, not the requested one. A block can carry a mode
     * this edition does not ship, and enqueueing that names a handle that was
     * never registered — which fails silently, leaving the block unstyled.
     *
     * Here rather than in the template so the template assigns nothing (see
     * `BlockMarkup`), and separate from `render()` so a test can render without
     * touching the style queue.
     *
     * @param array<string, mixed> $attributes
     */
    public static function renderBlock(array $attributes, WP_Block $block): string
    {
        $glide = new self($attributes, $block);

        ModeStyleLoader::enqueueMode($glide->resolvedMode());

        return $glide->render();
    }

    public function render(): string
    {
        $hasSlides = false;
        foreach ($this->block->inner_blocks as $innerBlock) {
            if ($innerBlock->name === 'ghostlabs/glide-slide') {
                $hasSlides = true;
                break;
            }
        }

        if (!$hasSlides) {
            return '';
        }

        return match ($this->mode) {
            'stickyScroll'  => $this->renderStickyScroll(),
            'contentSlider' => $this->renderContentSlider(),

            // Anything else is a mode this edition compiled and this class does
            // not know the markup for. `__construct` has already resolved the
            // request against `Edition::modes()`, so the only values that reach
            // here are ones the edition answered for.
            default         => $this->renderEditionMode($this->mode),
        };
    }

    /**
     * The block's authored className, split into tokens.
     *
     * This is where block patterns stamp their marker class — the layout
     * contract the editor, the stylesheet and the frontend module all branch
     * on. Distinct from the mode modifier classes this renderer generates into
     * the wrapper itself.
     *
     * @return list<string>
     */
    private function markerClasses(): array
    {
        $className = trim((string) ($this->attributes['className'] ?? ''));

        if ($className === '') {
            return [];
        }

        return preg_split('/\s+/', $className) ?: [];
    }

    private function hasMarker(GlidePattern $pattern): bool
    {
        return in_array($pattern->markerClass(), $this->markerClasses(), true);
    }

    private function renderContentSlider(): string
    {
        $slides = $this->renderSlides();
        $overlayHtml = $this->renderOverlay();
        $config = wp_json_encode($this->config) ?: '{}';
        $showArrows = (bool) ($this->config['showArrows'] ?? true);
        $navigation = $this->config['navigation'] ?? 'dots';
        $showThumbnails = !empty($this->config['showThumbnails']);

        // ⚠️ **With arrows off and no dots or thumbnails, nothing on the page
        // could move the slider**, and slides 2–N are inert — so a screen-reader
        // or keyboard user could never reach them (arrow keys on the focused
        // container are consumed by a screen reader's browse mode). The arrows
        // are still rendered then, visually hidden until they take focus, so the
        // author's design is kept and the content stays reachable.
        $keyboardOnlyArrows = !$showArrows && $navigation !== 'dots' && !$showThumbnails;

        $arrows = '';
        if ($showArrows || $keyboardOnlyArrows) {
            $arrowClass = $keyboardOnlyArrows ? ' ghostlabs-glide__arrow--focus-only' : '';
            $arrows = sprintf(
                '<button class="ghostlabs-glide__arrow ghostlabs-glide__arrow--prev%5$s" aria-label="%1$s" type="button">%2$s</button>'
                . '<button class="ghostlabs-glide__arrow ghostlabs-glide__arrow--next%5$s" aria-label="%3$s" type="button">%4$s</button>',
                esc_attr__('Previous slide', 'ghostlabs-glide'),
                $this->arrowSvg('prev'),
                esc_attr__('Next slide', 'ghostlabs-glide'),
                $this->arrowSvg('next'),
                esc_attr($arrowClass),
            );
        }

        $autoplay = !empty($this->config['autoplay']);
        $pauseButton = '';
        if ($autoplay) {
            $pauseLabel = esc_attr__('Pause', 'ghostlabs-glide');
            $playLabel  = esc_attr__('Play', 'ghostlabs-glide');
            $pauseButton = sprintf(
                '<button class="ghostlabs-glide__pause" type="button" data-state="playing" '
                . 'aria-label="%1$s" data-label-pause="%1$s" data-label-play="%2$s">'
                . '<svg class="ghostlabs-glide__pause-icon ghostlabs-glide__pause-icon--pause" '
                . 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" '
                . 'fill="currentColor" aria-hidden="true">'
                . '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'
                . '<svg class="ghostlabs-glide__pause-icon ghostlabs-glide__pause-icon--play" '
                . 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" '
                . 'fill="currentColor" aria-hidden="true">'
                . '<path d="M8 5v14l11-7z"/></svg>'
                . '</button>',
                $pauseLabel,
                $playLabel,
            );
        }

        $navHtml = '';
        if ($navigation === 'dots') {
            $navHtml = sprintf(
                '<div class="ghostlabs-glide__dots" role="group" aria-label="%s"></div>',
                esc_attr__('Slide pagination', 'ghostlabs-glide')
            );
        } elseif ($navigation === 'progress') {
            $navHtml = sprintf(
                '<div class="ghostlabs-glide__progress"><div class="ghostlabs-glide__progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="%s"></div></div>',
                esc_attr__('Slide progress', 'ghostlabs-glide')
            );
        }

        $height = $this->validHeight($this->config['height'] ?? null, '60vh');
        $heightAuto = !empty($this->config['heightAuto']);
        $useResponsiveHeight = !empty($this->config['useResponsiveHeight']);
        // ⚠️ Still applied with no control to set it. The Media Fit control was
        // live for a week in April 2026 and blocks saved then may carry a value;
        // the default matches the stylesheet's fallback, so nothing else changes.
        $fit = $this->config['fit'] ?? 'cover';
        if (!in_array($fit, ['fill', 'contain', 'cover', 'none', 'scale-down'], true)) {
            $fit = 'cover';
        }
        $verticalAlign = $this->config['verticalAlign'] ?? 'center';
        $justify = match ($verticalAlign) {
            'top'    => 'flex-start',
            'bottom' => 'flex-end',
            default  => 'center',
        };

        if ($heightAuto) {
            $style = sprintf(
                '--ghostlabs-glide-slide-fit:%s;--ghostlabs-glide-slide-justify:%s;',
                esc_attr((string) $fit),
                esc_attr($justify),
            );
        } elseif ($useResponsiveHeight) {
            $style = sprintf(
                '--ghostlabs-glide-height-desktop:%dpx;--ghostlabs-glide-height-tablet:%dpx;--ghostlabs-glide-height-mobile:%dpx;--ghostlabs-glide-slide-fit:%s;--ghostlabs-glide-slide-justify:%s;',
                (int) ($this->config['heightDesktop'] ?? 600),
                (int) ($this->config['heightTablet'] ?? 450),
                (int) ($this->config['heightMobile'] ?? 300),
                esc_attr((string) $fit),
                esc_attr($justify),
            );
        } else {
            $style = sprintf(
                '--ghostlabs-glide-slide-height:%s;--ghostlabs-glide-slide-fit:%s;--ghostlabs-glide-slide-justify:%s;',
                esc_attr((string) $height),
                esc_attr((string) $fit),
                esc_attr($justify),
            );
        }

        $tweenClasses = array_filter([
            !empty($this->config['fade'])      ? 'is-tween-fade'       : null,
            !empty($this->config['parallax'])  ? 'is-tween-parallax'   : null,
            !empty($this->config['scale'])     ? 'is-tween-scale'      : null,
            !empty($this->config['barnDoors']) ? 'is-tween-barn-doors' : null,
        ]);
        $wrapperClass = 'ghostlabs-glide ghostlabs-glide--content-slider';
        if ($tweenClasses) {
            $wrapperClass .= ' ' . implode(' ', $tweenClasses);
        }
        if (!empty($this->config['loop'])) {
            $wrapperClass .= ' is-loop';
        }
        if ($heightAuto) {
            $wrapperClass .= ' is-auto-height';
        }
        if ($useResponsiveHeight && !$heightAuto) {
            $wrapperClass .= ' is-responsive-height';
        }

        $thumbnailPosition = $this->config['thumbnailPosition'] ?? 'bottom';
        if (!in_array($thumbnailPosition, ['top', 'bottom', 'left', 'right'], true)) {
            $thumbnailPosition = 'bottom';
        }
        $thumbnailHtml = '';

        if ($showThumbnails) {
            $wrapperClass .= ' has-thumbnails has-thumbnails--' . $thumbnailPosition;
            $thumbnailHtml = $this->renderThumbnails();
        }

        if ($overlayHtml !== '') {
            $wrapperClass .= ' has-overlay';
        }
        if (!empty($this->config['autoHideControls'])) {
            $wrapperClass .= ' is-auto-hide-controls';
        }

        // The carousel is named and described server-side, in the site's language.
        // The frontend module used to set these in English, and filled the dot
        // names and the live region in English too; it now reads the templates
        // below instead.
        return sprintf(
            '<div %s data-glide-mode="contentSlider" data-glide-config="%s">'
            . '<div class="ghostlabs-glide__viewport">'
            . '<div class="ghostlabs-glide__track">%s</div>'
            . '</div>'
            . '%s%s%s%s%s'
            . '<div class="ghostlabs-glide__live-region screen-reader-text" aria-live="polite" aria-atomic="true"></div>'
            . '</div>',
            get_block_wrapper_attributes([
                'class' => $wrapperClass,
                'style' => $style,
                'role' => 'region',
                'aria-roledescription' => _x('carousel', 'aria-roledescription of the content slider', 'ghostlabs-glide'),
                'aria-label' => $this->regionLabel(__('Carousel', 'ghostlabs-glide')),
                /* translators: %d: slide number */
                'data-label-dot' => __('Go to slide %d', 'ghostlabs-glide'),
                /* translators: 1: current slide number, 2: number of slides */
                'data-label-status' => __('Slide %1$d of %2$d', 'ghostlabs-glide'),
            ]),
            esc_attr($config),
            $slides,
            $overlayHtml,
            $arrows,
            $navHtml,
            $pauseButton,
            $thumbnailHtml,
        );
    }

    /**
     * Sticky Scroll dispatch.
     *
     * The mode carries the plumbing; the pattern's marker class decides the
     * layout. A block in this mode with no marker — someone chose the mode
     * from the Mode select rather than inserting a pattern — falls back to the
     * plain stacked steps rather than rendering nothing, so no content is ever
     * lost to a missing class.
     */
    private function renderStickyScroll(): string
    {
        if ($this->hasMarker(GlidePattern::StickyChapters)) {
            return $this->renderStickyChapters();
        }

        // Layouts this edition compiled, if any. Null means it has none for the
        // marker on this block — which includes the case of no marker at all.
        $editionLayout = $this->renderEditionStickyLayout();

        if ($editionLayout !== null) {
            return $editionLayout;
        }

        return $this->renderStickySteps();
    }

    /**
     * Per-step data, resolved once and shared by the rail and the step list so
     * the two cannot disagree about IDs, titles or ordering.
     *
     * @return list<array{id: string, title: string, include: bool, stacked: bool, classes: string, media: array{url: string, alt: string, fit: string}|null, html: string}>
     */
    private function stickyStepData(): array
    {
        $steps = [];
        $index = 0;

        foreach ($this->block->inner_blocks as $innerBlock) {
            if ($innerBlock->name !== 'ghostlabs/glide-slide') {
                continue;
            }

            $title = $this->stepTitle($innerBlock, $index);

            $steps[] = [
                // The edition's anchor if it has one, else unique per render.
                // Either way the rail links are built from this same array in
                // the same pass, so every anchor resolves.
                'id'      => $this->editionStepAnchor($innerBlock, $title, $index)
                    ?? wp_unique_id('ghostlabs-glide-step-'),
                'title'   => $title,
                'include' => (bool) ($innerBlock->attributes['includeInContents'] ?? true),
                'stacked' => (bool) ($innerBlock->attributes['keepInStack'] ?? true),
                'classes' => $this->slideClasses($innerBlock),
                'media'   => $this->stepMedia($innerBlock),
                'html'    => $this->renderSlideContent($innerBlock),
            ];

            $index++;
        }

        return $steps;
    }

    /**
     * A step's contents-rail label. With "Use heading as title" on (the
     * default), the first heading found anywhere inside the step; with it off,
     * the step title the author typed. With it on, a step that has no heading
     * falls back to a kept title; either way the last resort is "Step N".
     *
     * Mirrored in JS by extractStepTitle() in glide/_utils/block-helpers.js so
     * the editor rail reads the same as the frontend one.
     */
    private function stepTitle(WP_Block $slideBlock, int $index): string
    {
        // ⚠️ The toggle decides, not whichever value is set. The Step title
        // field only shows with "Use heading as title" off, and turning it back
        // on keeps what was typed — so a title can sit there hidden, and when it
        // was checked first the rail kept showing it with no field to change it.
        // With the toggle on, the title only stands in for a missing heading.
        $explicit = trim((string) ($slideBlock->attributes['stepTitle'] ?? ''));

        if (!empty($slideBlock->attributes['useHeadingAsTitle'] ?? true)) {
            $heading = $this->extractHeadingText($slideBlock);
            if ($heading !== '') {
                return $heading;
            }
        }

        if ($explicit !== '') {
            return $explicit;
        }

        /* translators: %d: step number */
        return sprintf(__('Step %d', 'ghostlabs-glide'), $index + 1);
    }

    private function extractHeadingText(WP_Block $block): string
    {
        foreach ($block->inner_blocks as $innerBlock) {
            if ($innerBlock->name === 'core/heading') {
                $text = $this->headingText($innerBlock);
                if ($text !== '') {
                    return $text;
                }
            }

            // Headings routinely sit a level or two down — inside a Cover's
            // inner container, or a Group.
            $nested = $this->extractHeadingText($innerBlock);
            if ($nested !== '') {
                return $nested;
            }
        }

        return '';
    }

    /**
     * A heading block's text.
     *
     * core/heading declares `content` with `"source": "html"`, which means the
     * text is parsed out of the markup by the block deserialiser on the client
     * and never reaches $block->attributes on the server — attributes there
     * hold only what the block comment's JSON carries, which for a heading is
     * usually just `{"level":2}`. The text has to come from the block's own
     * innerHTML instead.
     *
     * The attribute is still checked first: a heading whose text does live in
     * attrs should win, and the editor's JS twin reads it from there.
     */
    private function headingText(WP_Block $heading): string
    {
        $raw = $heading->attributes['content'] ?? '';

        if (!is_string($raw) || trim($raw) === '') {
            $raw = $heading->parsed_block['innerHTML'] ?? '';
        }

        return trim(wp_strip_all_tags((string) $raw));
    }

    /**
     * @param list<array{id: string, title: string, include: bool, stacked: bool, classes: string, media: array{url: string, alt: string, fit: string}|null, html: string}> $steps
     */
    private function renderStepList(array $steps, bool $mediaAlternatives = false): string
    {
        $output = '';

        foreach ($steps as $index => $step) {
            // A layout whose media lives outside the steps (a pane beside them)
            // asks for each step's image alternative to be put back in the step,
            // where the reading order meets it.
            $alternative = '';
            if ($mediaAlternatives && $step['media'] !== null && trim($step['media']['alt']) !== '') {
                $alternative = sprintf(
                    '<span class="ghostlabs-glide__step-media-alt screen-reader-text" role="img" aria-label="%s"></span>',
                    esc_attr($step['media']['alt']),
                );
            }

            $output .= sprintf(
                // tabindex="-1" so the browser's own anchor navigation moves
                // focus here, not just the scroll position.
                //
                // The step index is emitted for every pattern, not just the
                // card stack that needs it for its staggered offset: it costs
                // nothing and saves a second, near-identical step renderer.
                '<section class="ghostlabs-glide__step%s%s" id="%s" tabindex="-1" style="--ghostlabs-glide-step-index:%d">%s%s</section>',
                $step['stacked'] ? '' : ' is-unstacked',
                esc_attr($step['classes']),
                esc_attr($step['id']),
                $index,
                $alternative,
                $step['html'],
            );
        }

        return sprintf('<div class="ghostlabs-glide__steps">%s</div>', $output);
    }

    /**
     * Plain stacked steps — the no-marker fallback.
     */
    private function renderStickySteps(): string
    {
        $steps = $this->stickyStepData();

        if ($steps === []) {
            return '';
        }

        return sprintf(
            '<div %s data-glide-mode="stickyScroll" data-glide-config="%s">%s</div>',
            get_block_wrapper_attributes([
                'class' => 'ghostlabs-glide ghostlabs-glide--sticky-scroll',
                'style' => $this->stickyStyle(),
            ]),
            esc_attr(wp_json_encode($this->config) ?: '{}'),
            $this->renderStepList($steps),
        );
    }

    /**
     * @param array<string, string> $extra Additional custom properties.
     */
    private function stickyStyle(array $extra = []): string
    {
        // Lengths keep an explicit unit: these are substituted raw into calc()
        // in the stylesheet, where a unitless zero invalidates the expression.
        $style = sprintf(
            '--ghostlabs-glide-sticky-offset:%dpx;--ghostlabs-glide-rail-width:%dpx;',
            $this->clampInt($this->config['stickyOffset'] ?? 40, 0, 400),
            $this->clampInt($this->config['railWidth'] ?? 240, 120, 480),
        );

        foreach ($extra as $property => $value) {
            $style .= sprintf('%s:%s;', $property, esc_attr($value));
        }

        return $style;
    }

    /**
     * The image a step contributes to the sticky pane, if it declares one.
     *
     * Steps without media deliberately return null rather than falling back to
     * an image inside the step: the pane keeps showing whatever the previous
     * step established, which is what scrollytelling wants when several
     * paragraphs of narration sit against a single image.
     *
     * @return array{url: string, alt: string, fit: string}|null
     */
    private function stepMedia(WP_Block $slideBlock): ?array
    {
        $url = trim((string) ($slideBlock->attributes['stepMediaUrl'] ?? ''));

        if ($url === '') {
            return null;
        }

        return [
            'url' => $url,
            'alt' => (string) ($slideBlock->attributes['stepMediaAlt'] ?? ''),
            'fit' => $this->allowed(
                $slideBlock->attributes['stepMediaFit'] ?? 'cover',
                ['cover', 'contain'],
                'cover'
            ),
        ];
    }

    private function clampInt(mixed $value, int $min, int $max): int
    {
        return max($min, min($max, (int) $value));
    }

    private function renderStickyChapters(): string
    {
        $steps = $this->stickyStepData();

        if ($steps === []) {
            return '';
        }

        $railPosition = $this->allowed($this->config['railPosition'] ?? 'left', ['left', 'right', 'top'], 'left');
        $markerStyle  = $this->allowed($this->config['markerStyle'] ?? 'numbered', ['numbered', 'dot', 'plain'], 'numbered');

        // ⚠️ No `mobileBehaviour`. A phone always gets the rail as a stuck
        // strip, so the highlight stays on screen (sticky-scroll/style.scss).
        // Blocks saved before 2026-10-31 still carry the key, usually as
        // "details", which unstuck the rail; it is ignored on purpose.
        $classes = [
            'ghostlabs-glide',
            'ghostlabs-glide--sticky-scroll',
            'has-rail--' . $railPosition,
            'is-marker-' . $markerStyle,
        ];

        // The marker class itself arrives via the block's own className, which
        // get_block_wrapper_attributes merges in — it is not re-added here.

        return sprintf(
            '<div %s data-glide-mode="stickyScroll" data-glide-config="%s">%s%s</div>',
            get_block_wrapper_attributes([
                'class' => implode(' ', $classes),
                'style' => $this->stickyStyle(),
            ]),
            esc_attr(wp_json_encode($this->config) ?: '{}'),
            $this->renderRail($steps),
            $this->renderStepList($steps),
        );
    }

    /**
     * The contents rail: a real nav/ol of anchor links, so it navigates,
     * scrolls and moves focus with JavaScript disabled. The frontend module
     * only adds the active state on top.
     *
     * @param list<array{id: string, title: string, include: bool, stacked: bool, classes: string, media: array{url: string, alt: string, fit: string}|null, html: string}> $steps
     */
    private function renderRail(array $steps): string
    {
        $items = '';

        foreach ($steps as $step) {
            if (!$step['include']) {
                continue;
            }

            $items .= sprintf(
                '<li class="ghostlabs-glide__rail-item">'
                . '<a class="ghostlabs-glide__rail-link" href="#%s">'
                . '<span class="ghostlabs-glide__rail-marker" aria-hidden="true"></span>'
                . '<span class="ghostlabs-glide__rail-text">%s</span>'
                . '</a></li>',
                esc_attr($step['id']),
                esc_html($step['title']),
            );
        }

        if ($items === '') {
            return '';
        }

        $progress = '';
        if (!empty($this->config['showProgressLine'])) {
            $progress = '<span class="ghostlabs-glide__rail-progress" aria-hidden="true"></span>';
        }

        $counter = '';
        if (!empty($this->config['showStepCounter'])) {
            $listed = count(array_filter($steps, static fn (array $s): bool => $s['include']));
            $counter = sprintf(
                '<p class="ghostlabs-glide__rail-counter" aria-hidden="true">'
                . '<span class="ghostlabs-glide__rail-counter-current">1</span> / %d</p>',
                $listed,
            );
        }

        // The rail carries a visible title rather than only an accessible one.
        // The stylesheet needs something to render there, and a CSS ::before
        // cannot carry a translatable string. Once the heading is on the page
        // the nav is named by it — keeping aria-label as well would give the
        // nav two names and announce "Contents" twice.
        $titleId = wp_unique_id('ghostlabs-glide-rail-title-');

        return sprintf(
            '<nav class="ghostlabs-glide__rail" aria-labelledby="%1$s">'
            . '<p class="ghostlabs-glide__rail-title" id="%1$s">%2$s</p>'
            . '%3$s<ol class="ghostlabs-glide__rail-list">%4$s</ol>%5$s</nav>',
            esc_attr($titleId),
            esc_html($this->authoredLabel() !== ''
                /* translators: %s: the section's accessible name, set by the author */
                ? sprintf(__('Contents: %s', 'ghostlabs-glide'), $this->authoredLabel())
                : __('Contents', 'ghostlabs-glide')),
            $progress,
            $items,
            $counter,
        );
    }

    /**
     * @param list<string> $allowed
     */
    private function allowed(mixed $value, array $allowed, string $fallback): string
    {
        return in_array($value, $allowed, true) ? (string) $value : $fallback;
    }

    private function renderOverlay(): string
    {
        foreach ($this->block->inner_blocks as $innerBlock) {
            if ($innerBlock->name !== 'ghostlabs/glide-overlay') {
                continue;
            }

            // ⚠️ Rendered as its own block, through its own render.php, and
            // never as markup written here. Block supports (the overlay's
            // colour and padding) are applied by get_block_wrapper_attributes(),
            // which reads whichever block WP_Block::render() is rendering — and
            // inside this method that is the *Glide* block. Hard-coding the
            // wrapper here once dropped every colour and padding the editor set.
            return render_block($innerBlock->parsed_block);
        }

        return '';
    }

    /**
     * Every slide, in the wrapper this class builds for it.
     *
     * @param bool $withVideo Whether slides carry their video background and
     *                        its controls. A mode with nowhere for a video to
     *                        sit, and no script to drive one, asks for none: a
     *                        slide that kept a video from another mode would
     *                        otherwise render it under controls nothing wires.
     */
    private function renderSlides(bool $withVideo = true): string
    {
        $output = '';
        $innerBlocks = $this->block->inner_blocks;
        $index = 0;

        foreach ($innerBlocks as $innerBlock) {
            if ($innerBlock->name !== 'ghostlabs/glide-slide') {
                continue;
            }

            $videoBg = $withVideo ? $this->renderSlideVideoBackground($innerBlock) : '';
            $embedControls = $withVideo ? $this->renderSlideEmbedControls($innerBlock) : '';
            $slideContent = $this->renderSlideContent($innerBlock);
            $attrs = $index === 0
                ? ' data-glide-first="true"'
                : '';

            // A tween effect may need the slide's contents wrapped in layers it
            // can transform independently of the slide itself. Which effects
            // exist, and what geometry each needs, is the edition's business —
            // an edition with no tween modules returns null and every slide is a
            // plain div, because markup laid out for an animation that never runs
            // reads as a rendering fault rather than as an absent feature.
            //
            // ⚠️ The first placeholder is the slide's own classes, inside the
            // class attribute, in every edition's template.
            $template = $this->editionSlideTemplate()
                ?? '<div class="ghostlabs-glide-slide%s"%s>%s%s%s</div>';

            $output .= sprintf(
                $template,
                esc_attr($this->slideClasses($innerBlock)),
                $attrs,
                $videoBg,
                $slideContent,
                $embedControls,
            );

            $index++;
        }

        return $output;
    }

    /**
     * The Additional CSS classes an author gave a slide, with a leading space,
     * or ''.
     *
     * ⚠️ **Glide builds every slide's wrapper itself** and never renders the
     * slide block's own, so the author's classes have to be carried across or
     * they are lost — which they were, in every mode, while the editor applied
     * them. Alignment classes are not carried: a slide in a track has no
     * alignment, and a theme's `.alignfull` rules would pull it out of the
     * track. They can only arrive from a slide saved while the block still
     * offered alignment, which the editor keeps as a custom class rather than
     * invalidating the block.
     */
    private function slideClasses(WP_Block $slide): string
    {
        $raw = $slide->attributes['className'] ?? '';

        if (!is_string($raw) || trim($raw) === '') {
            return '';
        }

        $classes = [];

        foreach (preg_split('/\s+/', trim($raw)) ?: [] as $token) {
            $token = (string) preg_replace('/[^A-Za-z0-9_-]/', '', $token);

            if ($token === '' || preg_match('/^align(wide|full|left|right|center|none)$/', $token) === 1) {
                continue;
            }

            $classes[] = $token;
        }

        return $classes === [] ? '' : ' ' . implode(' ', array_unique($classes));
    }

    private function renderSlideContent(WP_Block $slideBlock): string
    {
        $content = '';

        foreach ($slideBlock->inner_blocks as $innerBlock) {
            $content .= render_block($innerBlock->parsed_block);
        }

        return $content;
    }

    private function renderSlideVideoBackground(WP_Block $slideBlock): string
    {
        $videoUrl = $slideBlock->attributes['videoUrl'] ?? '';
        if ($videoUrl === '') {
            return '';
        }

        $source = $slideBlock->attributes['videoSource'] ?? 'file';

        if ($source === 'external') {
            return $this->renderExternalVideoBackground($slideBlock);
        }

        $poster   = $slideBlock->attributes['videoPoster'] ?? '';
        $autoplay = !empty($slideBlock->attributes['videoAutoplay']);
        $loop     = !empty($slideBlock->attributes['videoLoop']);
        $muted    = !empty($slideBlock->attributes['videoMuted']);
        $mimeType = wp_check_filetype($videoUrl)['type'] ?: 'video/mp4';

        return sprintf(
            '<video class="ghostlabs-glide-slide__video-background"%s%s%s playsinline%s aria-hidden="true">'
            . '<source src="%s" type="%s" />'
            . '</video>',
            $autoplay ? ' autoplay' : '',
            $loop ? ' loop' : '',
            $muted ? ' muted' : '',
            $poster !== '' ? sprintf(' poster="%s"', esc_url($poster)) : '',
            esc_url($videoUrl),
            esc_attr($mimeType),
        );
    }

    private function renderExternalVideoBackground(WP_Block $slideBlock): string
    {
        $url      = $slideBlock->attributes['videoUrl'] ?? '';
        $autoplay = !empty($slideBlock->attributes['videoAutoplay']);
        $loop     = !empty($slideBlock->attributes['videoLoop']);
        $muted    = !empty($slideBlock->attributes['videoMuted']);

        $provider = $this->detectVideoProvider($url);
        $videoId  = $this->extractVideoId($url, $provider);

        if ($provider !== '' && $videoId !== '') {
            $iframeSrc = $this->buildEmbedUrl($provider, $videoId, $autoplay, $loop, $muted);
        } else {
            $oembedHtml = $this->cachedOembed($url);
            if ($oembedHtml === '') {
                return '';
            }
            // `inert`, not only aria-hidden: the provider's own player carries
            // focusable controls, and aria-hidden on focusable content leaves a
            // keyboard user on something a screen reader cannot announce.
            return sprintf(
                '<div class="ghostlabs-glide-slide__video-background ghostlabs-glide-slide__video-background--oembed" aria-hidden="true" inert>%s</div>',
                $oembedHtml,
            );
        }

        return sprintf(
            '<iframe class="ghostlabs-glide-slide__video-background ghostlabs-glide-slide__video-background--embed"'
            . ' src="%s" data-provider="%s" allow="autoplay; encrypted-media" allowfullscreen'
            . ' loading="lazy" aria-hidden="true" tabindex="-1" title="%s"></iframe>',
            esc_url($iframeSrc),
            esc_attr($provider),
            esc_attr__('Background video', 'ghostlabs-glide'),
        );
    }

    /**
     * `wp_oembed_get()`, cached. Uncached it is an outbound request to the
     * provider on every page view, for every slide with such a video.
     *
     * A miss is cached too, for an hour rather than a day, so a dead or
     * unsupported URL does not cost a request per view either, and a provider
     * that was briefly down is asked again soon.
     */
    private function cachedOembed(string $url): string
    {
        $key = 'ghostlabs_glide_oembed_' . md5($url);
        $cached = get_transient($key);

        if (is_string($cached)) {
            return $cached;
        }

        // Discovery follows the site's own setting, as core's embeds do. Left on
        // unconditionally it overrode a site that had switched it off.
        $html = wp_oembed_get($url, ['discover' => (bool) apply_filters('embed_oembed_discover', true)]);
        $html = is_string($html) ? $html : '';

        set_transient($key, $html, $html === '' ? HOUR_IN_SECONDS : DAY_IN_SECONDS);

        return $html;
    }

    private function renderSlideEmbedControls(WP_Block $slideBlock): string
    {
        $videoUrl = $slideBlock->attributes['videoUrl'] ?? '';
        if ($videoUrl === '') {
            return '';
        }

        // Matches block.json's default, which is on: a background video that
        // plays and loops needs a way to stop it (WCAG 2.2.2), so the controls
        // are only ever absent because an author switched them off — and the
        // editor warns when they do.
        $showControls = $slideBlock->attributes['videoControls'] ?? true;
        if (!$showControls) {
            return '';
        }

        $source   = $slideBlock->attributes['videoSource'] ?? 'file';
        $autoplay = !empty($slideBlock->attributes['videoAutoplay']);
        $muted    = !empty($slideBlock->attributes['videoMuted']);
        $initialState = $autoplay ? 'playing' : 'paused';
        $initialMute  = $muted ? 'muted' : 'unmuted';

        if ($source === 'external') {
            // Only a video Glide embeds itself takes these commands. One that
            // fell back to oEmbed — any other provider, or a YouTube or Vimeo
            // URL with no ID to extract — is that provider's own player.
            $provider = $this->detectVideoProvider($videoUrl);
            if ($provider === '' || $this->extractVideoId($videoUrl, $provider) === '') {
                return '';
            }
            return $this->renderEmbedControls($provider, $initialState, $initialMute);
        }

        return $this->renderEmbedControls('native', $initialState, $initialMute);
    }

    private function renderEmbedControls(string $provider, string $playState, string $muteState): string
    {
        $pauseLabel  = esc_attr__('Pause video', 'ghostlabs-glide');
        $playLabel   = esc_attr__('Play video', 'ghostlabs-glide');
        $muteLabel   = esc_attr__('Mute video', 'ghostlabs-glide');
        $unmuteLabel = esc_attr__('Unmute video', 'ghostlabs-glide');

        $groupLabel = esc_attr__('Video controls', 'ghostlabs-glide');

        return sprintf(
            '<div class="ghostlabs-glide-slide__embed-controls" data-provider="%s" role="group" aria-label="%s">'
            . '<button class="ghostlabs-glide-slide__embed-control" type="button"'
            . ' data-action="playPause" data-state="%s"'
            . ' aria-label="%s" data-label-pause="%s" data-label-play="%s">'
            . '<svg class="ghostlabs-glide-slide__embed-icon ghostlabs-glide-slide__embed-icon--pause"'
            . ' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"'
            . ' fill="currentColor" aria-hidden="true">'
            . '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'
            . '<svg class="ghostlabs-glide-slide__embed-icon ghostlabs-glide-slide__embed-icon--play"'
            . ' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"'
            . ' fill="currentColor" aria-hidden="true">'
            . '<path d="M8 5v14l11-7z"/></svg>'
            . '</button>'
            . '<button class="ghostlabs-glide-slide__embed-control" type="button"'
            . ' data-action="mute" data-state="%s"'
            . ' aria-label="%s" data-label-mute="%s" data-label-unmute="%s">'
            . '<svg class="ghostlabs-glide-slide__embed-icon ghostlabs-glide-slide__embed-icon--unmuted"'
            . ' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"'
            . ' fill="currentColor" aria-hidden="true">'
            . '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>'
            . '<svg class="ghostlabs-glide-slide__embed-icon ghostlabs-glide-slide__embed-icon--muted"'
            . ' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"'
            . ' fill="currentColor" aria-hidden="true">'
            . '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
            . '</button>'
            . '</div>',
            esc_attr($provider),
            $groupLabel,
            esc_attr($playState),
            $playState === 'playing' ? $pauseLabel : $playLabel,
            $pauseLabel,
            $playLabel,
            esc_attr($muteState),
            $muteState === 'muted' ? $unmuteLabel : $muteLabel,
            $muteLabel,
            $unmuteLabel,
        );
    }

    private function detectVideoProvider(string $url): string
    {
        if (preg_match('/(?:youtube\.com|youtu\.be)/i', $url)) {
            return 'youtube';
        }
        if (preg_match('/vimeo\.com/i', $url)) {
            return 'vimeo';
        }
        return '';
    }

    private function extractVideoId(string $url, string $provider): string
    {
        return match ($provider) {
            'youtube' => $this->extractYouTubeId($url),
            'vimeo'   => $this->extractVimeoId($url),
            default   => '',
        };
    }

    private function extractYouTubeId(string $url): string
    {
        // youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID, youtube.com/shorts/ID
        if (preg_match('/youtu\.be\/([a-zA-Z0-9_-]+)/', $url, $m)) {
            return $m[1];
        }
        if (preg_match('/[?&]v=([a-zA-Z0-9_-]+)/', $url, $m)) {
            return $m[1];
        }
        if (preg_match('/\/(?:embed|shorts)\/([a-zA-Z0-9_-]+)/', $url, $m)) {
            return $m[1];
        }
        return '';
    }

    private function extractVimeoId(string $url): string
    {
        if (preg_match('/vimeo\.com\/(?:video\/)?(\d+)/', $url, $m)) {
            return $m[1];
        }
        return '';
    }

    private function buildEmbedUrl(string $provider, string $videoId, bool $autoplay, bool $loop, bool $muted): string
    {
        return match ($provider) {
            'youtube' => $this->buildYouTubeEmbedUrl($videoId, $autoplay, $loop, $muted),
            'vimeo'   => $this->buildVimeoEmbedUrl($videoId, $autoplay, $loop, $muted),
            default   => '',
        };
    }

    private function buildYouTubeEmbedUrl(string $videoId, bool $autoplay, bool $loop, bool $muted): string
    {
        $params = [
            'controls'    => '0',
            'showinfo'    => '0',
            'rel'         => '0',
            'playsinline' => '1',
            'enablejsapi' => '1',
            'origin'      => home_url(),
        ];

        if ($autoplay) {
            $params['autoplay'] = '1';
        }
        if ($muted) {
            $params['mute'] = '1';
        }
        if ($loop) {
            $params['loop'] = '1';
            $params['playlist'] = $videoId;
        }

        return 'https://www.youtube.com/embed/' . $videoId . '?' . http_build_query($params);
    }

    /**
     * ⚠️ **All three playback values are always sent, the off ones included.**
     * `background=1` is what hides Vimeo's chrome, and it also turns autoplay,
     * loop and mute on. An absent parameter leaves that in force, so a slide
     * with all three switched off still played, looped and stayed silent. An
     * explicit `0` overrides it (measured in the player, 2026-10-30).
     */
    private function buildVimeoEmbedUrl(string $videoId, bool $autoplay, bool $loop, bool $muted): string
    {
        $params = [
            'background' => '1',
            'dnt'        => '1',
            'autoplay'   => $autoplay ? '1' : '0',
            'muted'      => $muted ? '1' : '0',
            'loop'       => $loop ? '1' : '0',
        ];

        return 'https://player.vimeo.com/video/' . $videoId . '?' . http_build_query($params);
    }

    private function renderThumbnails(): string
    {
        $innerBlocks = $this->block->inner_blocks;
        $position = $this->config['thumbnailPosition'] ?? 'bottom';
        $isVertical = in_array($position, ['left', 'right'], true);
        $thumbSlides = '';
        $index = 0;

        foreach ($innerBlocks as $innerBlock) {
            if ($innerBlock->name !== 'ghostlabs/glide-slide') {
                continue;
            }

            $imageUrl = $this->extractThumbnailImage($innerBlock);
            $selectedClass = $index === 0 ? ' is-thumb-selected' : '';

            if ($imageUrl !== '') {
                $thumbContent = sprintf(
                    '<img src="%s" alt="" loading="lazy" />',
                    esc_url($imageUrl)
                );
            } elseif (!empty($innerBlock->attributes['videoUrl'])) {
                $thumbContent = '<span class="ghostlabs-glide__thumbs__placeholder">
                                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" data-icon="SvgVideo2" aria-hidden="true"><path d="M13.85 18.29H5.269A2.269 2.269 0 013 16.02V7.98a2.269 2.269 0 012.269-2.27h8.581a2.269 2.269 0 012.269 2.27v8.04a2.269 2.269 0 01-2.269 2.27zm2.269-4.584l4.881 2V8.294l-4.881 2"></path></svg>
                    </span>';
            } else {
                $thumbContent = sprintf(
                    '<span class="ghostlabs-glide__thumbs__placeholder">%d</span>',
                    $index + 1
                );
            }

            $ariaCurrent = $index === 0 ? ' aria-current="true"' : '';
            $tabindex = $index === 0 ? '0' : '-1';

            $thumbSlides .= sprintf(
                '<div class="ghostlabs-glide__thumbs__slide%s">'
                . '<button type="button" tabindex="%s" aria-label="%s"%s>%s</button>'
                . '</div>',
                $selectedClass,
                $tabindex,
                /* translators: %d: slide number */
                esc_attr(sprintf(__('Go to slide %d', 'ghostlabs-glide'), $index + 1)),
                $ariaCurrent,
                $thumbContent,
            );

            $index++;
        }

        return sprintf(
            '<div class="ghostlabs-glide__thumbs" role="toolbar" aria-label="%s" aria-orientation="%s" data-thumbs-axis="%s">'
            . '<div class="ghostlabs-glide__thumbs__viewport">'
            . '<div class="ghostlabs-glide__thumbs__track">%s</div>'
            . '</div>'
            . '</div>',
            esc_attr__('Thumbnail navigation', 'ghostlabs-glide'),
            $isVertical ? 'vertical' : 'horizontal',
            $isVertical ? 'y' : 'x',
            $thumbSlides,
        );
    }

    private function extractThumbnailImage(WP_Block $slideBlock): string
    {
        $videoPoster = $slideBlock->attributes['videoPoster'] ?? '';
        if ($videoPoster !== '') {
            return $videoPoster;
        }

        return $this->extractThumbnailFromInnerBlocks($slideBlock);
    }

    private function extractThumbnailFromInnerBlocks(WP_Block $block): string
    {
        foreach ($block->inner_blocks as $innerBlock) {
            if ($innerBlock->name === 'core/image' && !empty($innerBlock->attributes['url'])) {
                return $innerBlock->attributes['url'];
            }
            if ($innerBlock->name === 'core/cover') {
                $bgType = $innerBlock->attributes['backgroundType'] ?? 'image';
                if ($bgType === 'image' && !empty($innerBlock->attributes['url'])) {
                    return $innerBlock->attributes['url'];
                }
                if ($bgType === 'video' && !empty($innerBlock->attributes['poster'])) {
                    return $innerBlock->attributes['poster'];
                }
            }
            if ($innerBlock->name === 'core/video' && !empty($innerBlock->attributes['poster'])) {
                return $innerBlock->attributes['poster'];
            }
            $nested = $this->extractThumbnailFromInnerBlocks($innerBlock);
            if ($nested !== '') {
                return $nested;
            }
        }
        return '';
    }

    /**
     * A CSS length from block config, or the fallback.
     *
     * ⚠️ **`is_string` first, and it is not belt and braces.** The mode objects in
     * `block.json` declare no `properties`, so nested values reach the server as
     * whatever JSON type was saved, and under `strict_types` a number handed to
     * `preg_match()` is a `TypeError` that takes the whole page render down. `\z`
     * rather than `$`, which would also accept a trailing newline.
     */
    private function validHeight(mixed $value, string $fallback): string
    {
        if (!is_string($value) || !preg_match('/^\d+(?:\.\d+)?(?:px|em|rem|vh|vw|%)\z/', $value)) {
            return $fallback;
        }

        return $value;
    }

    /**
     * The accessible name the author gave this block, or ''.
     */
    private function authoredLabel(): string
    {
        $label = $this->attributes['regionLabel'] ?? '';

        return is_string($label) ? trim($label) : '';
    }

    /**
     * A landmark's accessible name: the author's, or the mode's generic one.
     *
     * Two blocks in the same mode on one page share the generic name, which is
     * why the editor offers the field and says so.
     */
    private function regionLabel(string $fallback): string
    {
        $authored = $this->authoredLabel();

        return $authored !== '' ? $authored : $fallback;
    }

    private function arrowSvg(string $direction): string
    {
        if ($direction === 'prev') {
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
    }
}
