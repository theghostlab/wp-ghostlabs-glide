<?php

namespace GHOSTLABS\GLIDE;

use Exception;
use GHOSTLABS\GLIDE\Provider\BlockKeywordsProvider;
use GHOSTLABS\GLIDE\Provider\BlocksProvider;
use GHOSTLABS\GLIDE\Provider\DocsLinkProvider;
use GHOSTLABS\GLIDE\Provider\EditorAssetsProvider;
use GHOSTLABS\GLIDE\Provider\FeatureProviderInterface;
use GHOSTLABS\GLIDE\Provider\ModeStylesProvider;
use GHOSTLABS\GLIDE\Provider\PatternsProvider;
use GHOSTLABS\GLIDE\Provider\VideoRoutesProvider;
use GHOSTLABS\GLIDE\Service\BlockFactory;
use GHOSTLABS\GLIDE\Service\Loader;
use GHOSTLABS\GLIDE\Traits\Singleton;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The free tier's wiring, and the engine every edition runs.
 *
 * **Nothing in this class may name a class it cannot be sure exists.** It is
 * bound for `shared/`, so it will be compiled into every build and forms the
 * whole of the free tier's wiring — which means it can only construct what free
 * ships and only type-hint against packages free installs. An edition with more
 * to wire subclasses this and appends.
 *
 * The alternative — one Kernel with `class_exists()` guards — was considered and
 * rejected: it makes an edition's wiring a runtime property of what happens to
 * be on disk rather than a stated fact, and it leaves collaborator graphs in the
 * source of builds that cannot satisfy them, for a reader to trip over.
 *
 * ⚠️ **Nothing gates block registration.** `run()` used to register blocks only
 * behind a runtime check an edition might not be able to satisfy, which meant a
 * build could install, activate and register nothing at all. An edition whose
 * features need such a check puts them in providers of its own; block
 * registration is not one of them.
 */
class Kernel
{
    use Singleton;

    protected Loader $loader;

    /**
     * Shared collaborators, built once here rather than per provider.
     *
     * `BlockFactory` is the one that matters: `BlocksProvider` registers what it
     * finds and `EditorAssetsProvider` asks it which blocks those were, so both
     * have to be looking at the same answer.
     */
    protected BlockFactory $blockFactory;

    /**
     * @throws Exception
     */
    public function init(): static
    {
        $this->bootCollaborators();

        foreach ($this->providers() as $provider) {
            $provider->register($this->loader);
        }

        return $this;
    }

    /**
     * Build what the providers are handed, before any of them is asked for.
     *
     * Separate from `init()` so a subclass can add its own. A subclass whose
     * providers need a collaborator built from one of these needs it to exist
     * before `providers()` is called — overriding `init()` instead would mean
     * either duplicating this loop or reading a typed property before it is
     * assigned.
     */
    protected function bootCollaborators(): void
    {
        $this->loader       = new Loader();
        $this->blockFactory = new BlockFactory();
    }

    /**
     * The feature set every edition shares.
     *
     * ⚠️ **`BlocksProvider` is last, and that is load bearing.** It throws when
     * `build/blocks/` is empty, which is how a build that was never compiled
     * announces itself instead of silently registering nothing. That exception
     * aborts the loop in `init()`, so everything after it never registers — and
     * the REST routes have to have registered by then, because a site with no
     * blocks still needs its endpoints reachable. Registering them first
     * preserves exactly
     * what the old `init()` did, where the same throw happened later still, in
     * `run()`.
     *
     * Being last costs the blocks nothing: they hook `init` at priority 10
     * *directly*, while `PatternsProvider` hooks the same hook and priority
     * through the `Loader`, which does not flush until every provider has run.
     * The blocks register first whatever order this list is in.
     *
     * @return list<FeatureProviderInterface>
     */
    protected function providers(): array
    {
        return [
            new VideoRoutesProvider(),
            new BlockKeywordsProvider(),
            new DocsLinkProvider(),
            new EditorAssetsProvider($this->blockFactory),
            new PatternsProvider(),
            new ModeStylesProvider(),
            new BlocksProvider($this->blockFactory),
        ];
    }

    public function run(): void
    {
        $this->loader->run();
    }
}
