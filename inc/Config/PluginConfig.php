<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Config;

use GHOSTLABS\GLIDE\Boot\Edition;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The plugin's identity, answered per edition.
 *
 * **Methods, not static properties, and that is the whole point.** A property is
 * a value compiled into the class; a method can answer differently in the build
 * it finds itself in. `$tier` was the literal `'pro'` in this shared class, so
 * every edition would have reported the same one in its REST namespace and its
 * cache keys. It is `Boot\Edition`'s answer now, which each tier compiles.
 *
 * ⚠️ **Converting a static property to a method without updating every reader is
 * a fatal `\Error`** — a static-property read against a class that no longer has
 * that property — and an `\Error` escapes the bootstrap's `catch (\Exception)`,
 * so the site white-screens rather than logging.
 *
 * Two things hold that line. A grep over each tier's `inc/`, `src/` and `dev/`
 * for `PluginConfig::` followed by a dollar sign, which is the cheap one — and
 * `PluginConfigTest::testExposesNoStaticProperties()`, which is the one that
 * keeps working when somebody adds a property back and the grep is not run.
 *
 * ⚠️ The grep is described rather than written out because a glob containing a
 * star-slash inside a docblock closes the comment, and the file below it stops
 * being PHP.
 *
 * ⚠️ **The tier belongs in an identifier, never in an option key.**
 * `restNameSpace()` embeds it, so the editions deliberately answer different
 * namespaces — which is fine, they are namespaces. `OptionsService`'s option name
 * must stay tier-independent, because switching between editions depends on both
 * of them reading the same row.
 *
 * This class is shared, so it may not name anything an edition might not have.
 * It used to implement a contract from an optional package, and two of the members
 * that contract required belong to the edition that ships that package; they live
 * with it now.
 */
final class PluginConfig
{
    /**
     * The vendor prefix, shared by every GhostLabs plugin.
     *
     * Not the text domain: that is `domain()` below, which composes this with
     * the slug. This one is the first half of the option key and nothing else.
     */
    public static function vendor(): string
    {
        return 'ghostlabs';
    }

    public static function slug(): string
    {
        return 'glide';
    }

    /**
     * Which edition this build is: `Boot\Edition`'s answer.
     *
     * 🔴 **Asked of `Edition`, never read from `GHOSTLABS_GLIDE_EDITION`.** Every
     * tier defines its own `Edition`, so the answer is compiled into the build it
     * describes. The constant read it replaced was refused by the command
     * center's trialware line, which treats any edition read in a free tree as
     * the start of a locked feature. The tier only ever names things here.
     */
    public static function tier(): string
    {
        return Edition::tier();
    }

    public static function restVersion(): string
    {
        return 'v1';
    }

    /**
     * 🔴 **The entry file's `GHOSTLABS_GLIDE_VERSION`, never a literal of its own.**
     *
     * A release stamps its number into the entry file — the `Version:` header,
     * `@version` and this constant — and not into a method's return value. This
     * returned `'1.0.2'` while 1.0.3 shipped, so a release reported the version
     * before it, and an update check comparing against that went on offering the
     * release that was already installed. Read from the constant, the stamp
     * reaches it.
     *
     * Not the precedent `tier()` is: that one moved *off* an edition constant,
     * because an edition read in a published tree is how a locked feature is
     * built. A version read is not. `PluginConfigTest` holds this to the constant.
     */
    public static function version(): string
    {
        return GHOSTLABS_GLIDE_VERSION;
    }

    /**
     * The admin page slug.
     *
     * A literal rather than `domain() . '-settings'`, deliberately: it is the
     * `page=` in a URL people bookmark and that other plugins link to, so it
     * should not move because the text domain did.
     */
    public static function settingsMenuSlug(): string
    {
        return 'ghostlabs-glide-settings';
    }

    /**
     * The text domain, and the identifier wp-kit's `getDomain()` answers with.
     */
    public static function domain(): string
    {
        return sprintf('%s-%s', self::vendor(), self::slug());
    }

    /**
     * ⚠️ Embeds the tier, so the editions answer different namespaces. Both
     * sides read it from here — the routes register with it and `AssetManager`
     * localizes it — so they cannot disagree with each other.
     */
    public static function restNameSpace(): string
    {
        return sprintf('%s/%s/%s/%s', self::vendor(), self::slug(), self::tier(), self::restVersion());
    }

    /**
     * The one-shot "switch complete" flag.
     *
     * The paid edition's entry header raises it in the branch that switches the
     * free edition off, and the paid edition consumes it on the next admin
     * render. It lives here, in the shared class, because in the request where
     * the paid edition is activated beside a still-active free one, free's header
     * won the constants and the only autoloader is free's.
     *
     * ⚠️ **Permanent, and deliberately tier-free.** It names data on installed
     * sites, and `tier()` differs between the edition that loaded first and the
     * one reading it.
     */
    public static function upgradePendingTransient(): string
    {
        return sprintf('_%s_%s_upgrade_pending', self::vendor(), self::slug());
    }
}
