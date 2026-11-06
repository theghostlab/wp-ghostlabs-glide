<?php

namespace GHOSTLABS\GLIDE\Service;

if ( ! defined( 'ABSPATH' ) ) exit;

class BlockFactory
{
    private string $blocksDir = GHOSTLABS_GLIDE_PLUGIN_PATH.'build/blocks';

    /**
     * @var array|string[]
     */
    private array $dirBlackList = ['..', '.', '.DS_Store'];

    /**
     * @return array<callable>
     */
    public function setRegisterBlocks(): array
    {
        if( !is_dir($this->blocksDir) ) return [];

        $scanResult = scandir($this->blocksDir);
        if ($scanResult === false) return [];

        /** @var array<string> $filteredBlocks */
        $filteredBlocks = array_diff($scanResult, $this->dirBlackList);
        $blocks = array_values($filteredBlocks);

        if( empty($blocks) ) return [];

        $new_functions = [];

        foreach ($blocks as $block)
        {
            $new_functions[] = function () use ($block) {
                $blockType = $this->blocksDir.'/'.$block;
                register_block_type( $blockType );
            };
        }

        return $new_functions;
    }

    /**
     * The block names this plugin registers, read from its own build directory.
     *
     * ⚠️ Exists so that callers do not have to guess the set from the block
     * namespace. Several GhostLabs plugins register blocks under `ghostlabs/`,
     * so `str_starts_with($name, 'ghostlabs/')` over the global registry also
     * matches another plugin's blocks — and anything done to those on this
     * plugin's behalf is wrong in a way neither plugin reports.
     *
     * @return array<string>
     */
    public function blockNames(): array
    {
        $names = [];

        foreach ($this->blockDirs() as $dir) {
            $manifest = $this->blocksDir . '/' . $dir . '/block.json';

            if (!is_readable($manifest)) {
                continue;
            }

            $contents = file_get_contents($manifest);
            if ($contents === false) {
                continue;
            }

            $decoded = json_decode($contents, true);
            if (is_array($decoded) && isset($decoded['name']) && is_string($decoded['name'])) {
                $names[] = $decoded['name'];
            }
        }

        return $names;
    }

    /**
     * @return array<string>
     */
    private function blockDirs(): array
    {
        if( !is_dir($this->blocksDir) ) return [];

        $scanResult = scandir($this->blocksDir);
        if ($scanResult === false) return [];

        /** @var array<string> $filtered */
        $filtered = array_diff($scanResult, $this->dirBlackList);

        return array_values($filtered);
    }
}