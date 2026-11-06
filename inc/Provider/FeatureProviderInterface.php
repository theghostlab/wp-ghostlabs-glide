<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Provider;

use GHOSTLABS\GLIDE\Service\Loader;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * One feature's worth of wiring.
 *
 * `Kernel` used to name every service by hand and hang them off a chain of
 * private `define*()` methods. That is fine while there is one tier and fatal
 * the moment there are two: `new Settings(...)` cannot be evaluated in a build
 * that has no such class, and the `use` statement above it is only harmless
 * because autoloading is lazy.
 *
 * So the feature set is **data** — a list each edition answers for itself —
 * rather than a chain of calls compiled into one class. `Kernel` returns the
 * list every edition shares and names nothing beyond it; a subclass appends
 * whatever else its own edition ships.
 *
 * **Providers own their collaborators.** A provider is handed only what it
 * cannot build — the shared `Loader`, and anything that must be exactly one
 * instance — and constructs the rest itself. That is what keeps the shared list
 * free of constructor signatures a free build cannot satisfy.
 *
 * ⚠️ **Wire through the `Loader` or directly, but match what the feature did
 * before.** The two are not interchangeable. `Loader` defers every
 * `add_action`/`add_filter` to `run()`, while calling `add_action()` here adds
 * the hook immediately. Both land inside `plugins_loaded` priority 10 and so
 * beat every hook they target — but callbacks on the *same* hook at the *same*
 * priority fire in registration order, so moving a feature between the two
 * silently reorders it against its neighbours.
 *
 * The live example: blocks register on `init` priority 10 *directly*, and
 * `PatternRegistrar` registers on `init` priority 10 *through the Loader*. The
 * blocks therefore always register first, whatever order the providers run in —
 * and they have to, because a pattern references the blocks it is built from.
 */
interface FeatureProviderInterface
{
    /**
     * Hook this feature onto WordPress. Called once, during `plugins_loaded`.
     */
    public function register(Loader $loader): void;
}
