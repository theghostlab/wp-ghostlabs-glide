<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use GHOSTLABS\GLIDE\Enum\UpsellSource;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * What the block editor's three upsell surfaces are handed: one buy URL per surface, and their copy.
 *
 * The surfaces are this edition's `@edition/upsell.js`: the panel last in the Glide block's sidebar
 * (`editor-panel`), the notice under Mode (`editor-mode`) and the notice under the content slider's
 * Tweens (`editor-tweens`). They read this and nothing else.
 *
 * 🔴 **Every URL is finished here, one per surface, each with its own `from`.** The script never
 * composes one, never appends a source and has no fallback: a surface with no URL renders no link
 * (spec `upsell-surfaces.md` § The URL contract). A hard-coded link would render and resolve and
 * file the sale under no surface at all.
 *
 * Reached through `Boot\Edition::editorVars()`, which the shared `AssetManager` merges into the
 * localized editor object. An edition with nothing to sell answers that with `[]`, so nothing
 * anywhere asks which edition is running.
 */
final class EditorUpsell
{
    /**
     * @return array{upgrade: array{
     *     urls: array{panel: string, mode: string, tweens: string},
     *     copy: array{
     *         link: string,
     *         panel: array{title: string, lead: array{contentSlider: string, stickyScroll: string}, keeps: string, switches: string},
     *         mode: array{title: string, body: string},
     *         tweens: array{title: string, body: string}
     *     }
     * }}
     */
    public function vars(): array
    {
        return [
            'upgrade' => [
                'urls' => [
                    'panel'  => UpgradeEndpoints::buyProUrl(UpsellSource::EditorPanel),
                    'mode'   => UpgradeEndpoints::buyProUrl(UpsellSource::EditorMode),
                    'tweens' => UpgradeEndpoints::buyProUrl(UpsellSource::EditorTweens),
                ],
                'copy' => [
                    'link'   => UpsellCopy::link(),
                    'panel'  => [
                        'title'    => UpsellCopy::panelTitle(),
                        'lead'     => UpsellCopy::panelLead(),
                        'keeps'    => UpsellCopy::panelKeeps(),
                        'switches' => UpsellCopy::panelSwitches(),
                    ],
                    'mode'   => [
                        'title' => UpsellCopy::modeTitle(),
                        'body'  => UpsellCopy::modeBody(),
                    ],
                    'tweens' => [
                        'title' => UpsellCopy::tweensTitle(),
                        'body'  => UpsellCopy::tweensBody(),
                    ],
                ],
            ],
        ];
    }
}
