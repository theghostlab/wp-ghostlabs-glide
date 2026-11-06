<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * A Docs link in this plugin's row on the Plugins screen.
 *
 * 🟢 **Why the row needs one:** core shows *either* "View details" *or* "Visit
 * plugin site" — an `elseif` — and an install from WordPress.org gets the
 * former, which suppresses the `Plugin URI`. Without this the row has no route
 * to the documentation at all.
 *
 * One page documents every edition, so every edition links the same address.
 * ⚠️ Deliberately the public address in every environment, as `Plugin URI` is.
 */
final class DocsLink
{
    public const URL = 'https://theghostlab.io/docs/glide';

    /**
     * @param array<int|string, string> $meta
     * @return array<int|string, string>
     */
    public function rowMeta(array $meta, string $pluginFile): array
    {
        if ($pluginFile !== GHOSTLABS_GLIDE_PLUGIN_SLUG) {
            return $meta;
        }

        // ⚠️ **Built through the static helper below, with the label translated inline, on purpose.**
        // The command center's row-links gate reads the built tree for exactly this shape — the
        // helper's call, URL first and the translated label second, inside this method — to
        // resolve and request every link before a release. Inline `sprintf()` markup registered
        // fine and was invisible to it, so every build read "has no row meta" and the release was
        // held. `DocsLinkTest` pins the shape.
        //
        // ⚠️ The gate reads comments as code. Never spell the helper's call (class, double colon,
        // name, open paren) in a comment in this method: the gate's match starts at the comment,
        // captures everything up to the real call as the URL, and the link reads Unresolved.
        $meta[] = self::link(
            self::URL,
            __('Docs', 'ghostlabs-glide'),
            /* translators: the accessible name of the Plugins row's Docs link; keep the word "Docs" in it. */
            __('Glide docs', 'ghostlabs-glide')
        );

        return $meta;
    }

    /**
     * One row link, every part escaped.
     *
     * ⚠️ The accessible name says whose link it is — a Plugins screen has a "Docs" for every
     * plugin that offers one — and must still contain the visible label (WCAG 2.5.3, label in
     * name), so "click Docs" works by voice. This link used to be named "Glide documentation
     * (opens in a new tab)", which does not contain "Docs". Both strings are translations, so a
     * locale can break the pairing; the name is then dropped and the label names the link.
     *
     * No `target="_blank"`: core's own row links do not force a new tab. The portfolio's other
     * plugins build theirs the same way.
     */
    public static function link(string $url, string $label, string $accessibleName): string
    {
        $named = $accessibleName !== '' && mb_stripos($accessibleName, $label) !== false;

        return sprintf(
            '<a href="%s"%s>%s</a>',
            esc_url($url),
            $named ? sprintf(' aria-label="%s"', esc_attr($accessibleName)) : '',
            esc_html($label)
        );
    }
}
