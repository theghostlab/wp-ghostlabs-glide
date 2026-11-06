<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Render;

use GHOSTLABS\GLIDE\Config\TierMatrix;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * "Already own …?": the way in for somebody who has bought the paid edition (board 5b, approved
 * by the owner on 2026-11-05).
 *
 * It stays quiet: a single row until opened. A buyer finds it without scrolling, and nobody else
 * has it shouting at them.
 *
 * 🔴 **It explains, and it does nothing itself.** Until 2026-10-26 this screen took a key and
 * installed the paid edition in place. WordPress.org refuses that: Guideline 8 forbids installing
 * a paid version of the same plugin from anywhere but WordPress.org, and the review's *Changing
 * Active Plugins* item forbids a plugin switching plugins on or off. Now the buyer takes three
 * steps, each on a screen this plugin does not own: their account to download, core's uploader to
 * install, core's Activate link to switch over. The paid edition's own header switches this one
 * off. `NoInDashboardInstallTest` holds the ban; the old client is kept at the tag
 * `reference/in-place-upgrade-free-2026-10-08`. ⚠️ Do not restore it here.
 *
 * A native `<details>`, so there is no script at all: closed by default, operable from the
 * keyboard, and it opens without JavaScript.
 *
 * @package GhostLabsGlide
 */
final class UpgradePanel
{
    /**
     * @param string      $downloadUrl Where the buyer downloads it: their account, on our own domain
     *                                 (`Service\AccountEndpoints`, on the release-host axis).
     * @param string|null $uploadUrl   Core's plugin uploader, or null where this user cannot upload:
     *                                 a subsite administrator on a network, or anyone on a site with
     *                                 file changes turned off.
     */
    public function __construct(
        private readonly string $downloadUrl,
        private readonly ?string $uploadUrl,
    ) {
    }

    public function render(): void
    {
        $name = TierMatrix::paidEditionName();

        echo '<section class="ghostlabs-glide-upgrade__strip ghostlabs-glide-handoff">';
        echo '<details class="ghostlabs-glide-handoff__details">';

        // ⚠️ The space between the two spans is the accessible name's: without it the summary
        // announces the heading and the label as one run-on phrase. The flex layout ignores it.
        printf(
            '<summary class="ghostlabs-glide-handoff__summary"><span class="ghostlabs-glide-handoff__heading">%s</span> '
            . '<span class="ghostlabs-glide-button ghostlabs-glide-button--secondary">%s</span></summary>',
            esc_html(sprintf(
                /* translators: %s: the paid edition's name. */
                __('Already own %s?', 'ghostlabs-glide'),
                $name
            )),
            esc_html__('Have a license?', 'ghostlabs-glide')
        );

        echo '<div class="ghostlabs-glide-handoff__region">';

        // ⚠️ "every block and setting is kept", never "nothing changes": the paid edition makes
        // its chapter links from each step's title and keeps no alias for this edition's
        // numbered ones, so a link somebody copied from a chapter here does change.
        printf(
            '<p class="ghostlabs-glide-handoff__sub">%s</p>',
            esc_html(sprintf(
                /* translators: %s: the paid edition's name. */
                __('%s is a separate plugin. When you activate it, it switches this plugin off. Every block and setting is kept; chapter links are made from each step\'s title instead, so a link copied from a chapter here will change.', 'ghostlabs-glide'),
                $name
            ))
        );

        echo '<ol class="ghostlabs-glide-handoff__steps">';

        printf(
            '<li><a href="%s" target="_blank" rel="noopener noreferrer">%s<span class="screen-reader-text"> %s</span><span aria-hidden="true"> ↗</span></a></li>',
            esc_url($this->downloadUrl),
            esc_html(sprintf(
                /* translators: %s: the paid edition's name. */
                __('Download %s from your account', 'ghostlabs-glide'),
                $name
            )),
            esc_html__('(opens in a new tab)', 'ghostlabs-glide')
        );

        // The screen is named by its heading, "Add Plugins", which every supported WordPress
        // shares. The menu item is not: it reads "Add New Plugin" before 6.8 and "Add Plugin" from
        // 6.8. The linked step names no button: the link opens the upload tab, where the toggle
        // reads "Browse Plugins" because the form is already open.
        if ($this->uploadUrl !== null) {
            printf(
                '<li><a href="%s">%s</a> %s</li>',
                esc_url($this->uploadUrl),
                esc_html__('Upload it to this site', 'ghostlabs-glide'),
                esc_html__('from the Add Plugins screen.', 'ghostlabs-glide')
            );
        } else {
            printf(
                '<li>%s</li>',
                esc_html__('Upload it to this site from the Add Plugins screen, with its Upload Plugin button. Your account can\'t upload plugins here. Ask whoever manages plugins on this site to upload it for you.', 'ghostlabs-glide')
            );
        }

        printf(
            '<li>%s</li>',
            esc_html(sprintf(
                /* translators: %s: the paid edition's name. */
                __('Activate %s, then enter your license key in its settings.', 'ghostlabs-glide'),
                $name
            ))
        );

        echo '</ol></div></details></section>';
    }
}
