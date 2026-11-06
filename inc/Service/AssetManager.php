<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use GHOSTLABS\GLIDE\Boot\Edition;
use GHOSTLABS\GLIDE\Config\PluginConfig;
use WP_Block_Type_Registry;

if ( ! defined( 'ABSPATH' ) ) exit;

class AssetManager
{
    public function __construct(private BlockFactory $blockFactory) {}

    public function registerHooks(Loader $loader): void
    {
        $loader->add_action('enqueue_block_editor_assets', $this, 'editorAssets');
    }

    public function editorAssets(): void
    {
        $vars = [
            'restNamespace' => PluginConfig::restNameSpace(),

            // No settings URL either (2026-11-05): nothing in the editor read
            // it, and it pointed at `admin.php` while the screen is under
            // `options-general.php`.

            // ⚠️ No edition. What the editor offers is what the edition
            // compiled, through the `@edition` alias, and a tier handed to
            // the client is an invitation to branch on it.
        ];

        // Whatever this edition's own editor modules read, as data the
        // edition compiled; `[]` from an edition with nothing to add. ⚠️ `+`,
        // not `array_merge()`: an edition adds keys and never replaces one
        // every edition's bundles read.
        $vars += Edition::editorVars();

        wp_localize_script('ghostlabs-glide-editor-script', 'ghostlabsGlide', $vars);

        $this->setScriptTranslations();
    }

    /**
     * Point every editor bundle at the plugin's translations.
     *
     * Without this the editor strings are never translated at all. PHP's
     * `load_plugin_textdomain()` does nothing for JavaScript — the editor reads
     * its strings from a per-handle JSON file, and WordPress only knows to load
     * one if the handle has been registered here. It is a silent gap: the .pot
     * extracts, translators translate, the .json files ship, and the editor
     * keeps rendering English.
     *
     * ⚠️ The handles are read from the registry rather than listed, so a block
     * added later cannot be silently left untranslated. The names come from
     * BlockFactory — this plugin's own build directory — and not from filtering
     * the global registry by the `ghostlabs/` namespace: several GhostLabs
     * plugins register blocks under it, and pointing another plugin's handle at
     * this plugin's domain breaks its translations instead.
     *
     * The path is passed so a bundled translation is found; WordPress still
     * falls back to WP_LANG_DIR for the ones WordPress.org delivers.
     */
    private function setScriptTranslations(): void
    {
        $registry  = WP_Block_Type_Registry::get_instance();
        $languages = GHOSTLABS_GLIDE_PLUGIN_PATH . 'languages';

        foreach ($this->blockFactory->blockNames() as $name) {
            $blockType = $registry->get_registered($name);

            if ($blockType === null) {
                continue;
            }

            foreach ($blockType->editor_script_handles as $handle) {
                wp_set_script_translations($handle, 'ghostlabs-glide', $languages);
            }
        }
    }
}
