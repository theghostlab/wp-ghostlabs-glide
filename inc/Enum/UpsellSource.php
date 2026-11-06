<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Enum;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Which surface a buyer clicked from: the `from=` on every buy link.
 *
 * One enum, never literals at call sites. A typo'd `from` still produces a real URL, and the sale
 * lands in a bucket nobody reads.
 *
 * ⚠️ **A wire format.** The sales backend counts these values, and shipped plugins keep sending
 * them long after a rename. Add a case; never rename one, and never reuse a retired value for a
 * different surface. `UpsellSourceTest` pins them, and `CLAUDE.md` § Attribution mirrors them.
 *
 * `from` is a hint, never an authorisation: it must not touch pricing, entitlement or anything else a
 * buyer could change by editing a URL.
 */
enum UpsellSource: string
{
    /** Settings → Glide: the hero's button. */
    case Settings = 'settings';

    /** Settings → Glide: the ask again at the comparison table's foot, a later reading of the screen. */
    case SettingsTable = 'settings-table';

    /** The one buy link on this plugin's row on the Plugins screen. */
    case PluginsRow = 'plugins-row';

    /** The Upsell panel, last in the block sidebar. */
    case EditorPanel = 'editor-panel';

    /** The Upsell notice under Mode. */
    case EditorMode = 'editor-mode';

    /** The Upsell notice under the content slider's Tweens. */
    case EditorTweens = 'editor-tweens';
}
