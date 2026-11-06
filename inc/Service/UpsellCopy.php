<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Every word the editor's upsell surfaces and the Plugins row's buy link say, written once.
 *
 * The owner approved these on the Penpot boards (2026-11-05) after the claims check of 2026-11-01:
 * nexus `marketing/glide/DECISIONS.md` § Upgrade prompts. `EditorUpsellTest` pins them verbatim,
 * because a reworded sentence is copy nobody has checked.
 *
 * ⚠️ **In PHP, and in this one file, on purpose.** The editor reads them from the localized vars,
 * so the compiled script names nothing the paid edition adds, and `verify-tier-isolation.sh` has
 * exactly one path to pardon (as it pardons `UpgradePage.php`). Copy added anywhere else is a leak.
 *
 * ⚠️ **Translated when asked, never at load.** A value resolved when the class loads bakes in
 * whichever locale was active first. No textdomain is loaded for them: WordPress.org delivers this
 * edition's translations itself (`FreeBuildLoadsNoTextdomainTest`).
 *
 * ⚠️ **One of the names below is only ever listed last, never first** (register § Never claim;
 * `EditorUpsellTest` holds which).
 */
final class UpsellCopy
{
    /** The one label every editor link and the Plugins row's link carries. */
    public static function link(): string
    {
        return __('Get Glide Pro', 'ghostlabs-glide');
    }

    public static function panelTitle(): string
    {
        return __('Glide Pro', 'ghostlabs-glide');
    }

    /**
     * The panel's first paragraph, which follows the block's mode.
     *
     * ⚠️ Keyed by the two modes this edition ships. "Its chapter links are made from each step's
     * title" is the catalogue's probed bullet: this edition numbers its chapter links.
     *
     * @return array{contentSlider: string, stickyScroll: string}
     */
    public static function panelLead(): array
    {
        return [
            'contentSlider' => __('Glide Pro is a separate plugin. It adds two modes, Marquee and Parallax, and three tweens for this slider: Scale, Barn Doors and Parallax.', 'ghostlabs-glide'),
            'stickyScroll'  => __("Glide Pro is a separate plugin. It adds three more sticky-scroll layouts: Sticky Media, Stacking Cards and Horizontal Pin. Its chapter links are made from each step's title, with an Anchor field to pin one.", 'ghostlabs-glide'),
        ];
    }

    /**
     * ⚠️ "Keeps every block and setting", never "changes nothing else": the paid edition rebuilds
     * chapter links from the step titles and keeps no alias for this edition's numbered ones, so a
     * link copied from a page built here stops pointing at its chapter.
     */
    public static function panelKeeps(): string
    {
        return __('Switching keeps every block and setting.', 'ghostlabs-glide');
    }

    /**
     * True of the paid edition's header: activating it deactivates this plugin. This plugin
     * installs, activates and deactivates nothing itself.
     */
    public static function panelSwitches(): string
    {
        return __('Activate Glide Pro and it switches this plugin off.', 'ghostlabs-glide');
    }

    public static function modeTitle(): string
    {
        return __('Glide Pro adds two more modes.', 'ghostlabs-glide');
    }

    /**
     * ⚠️ Reworded after the claims check of 2026-11-01 found the first draft false. Any new
     * wording here is new copy: run the check again before it ships.
     */
    public static function modeBody(): string
    {
        return __('Marquee, a continuous loop of any blocks, and Parallax.', 'ghostlabs-glide');
    }

    public static function tweensTitle(): string
    {
        return __('Glide Pro adds three tweens.', 'ghostlabs-glide');
    }

    public static function tweensBody(): string
    {
        return __('Scale, Barn Doors and Parallax.', 'ghostlabs-glide');
    }
}
