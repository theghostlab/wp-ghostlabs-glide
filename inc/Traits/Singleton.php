<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Traits;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * One instance per class — including subclasses.
 *
 * 🔴 **The obvious implementation is wrong the moment anything extends the
 * class using it**, and it fails silently. It was:
 *
 *     private static ?self $instance = null;
 *     public static function getInstance(): self
 *     {
 *         if (self::$instance === null) {
 *             self::$instance = new self();
 *         }
 *         return self::$instance;
 *     }
 *
 * `self` in a trait resolves to the class that *uses* it, so `self::$instance`
 * and `new self()` both mean `Kernel` — and a subclass inherits that one static
 * property rather than getting its own. Asking a subclass for its instance
 * therefore returned a plain `Kernel`, so an edition that extends the kernel to
 * add its own wiring silently came up with none of it. Nothing errors; the
 * plugin is simply missing whatever the subclass was for.
 *
 * So: `new static()` for late static binding, and the instances keyed by class
 * so a parent and its subclass cannot share one. `SingletonTest` holds both.
 */
trait Singleton
{
    /** @var array<class-string, static> */
    private static array $instances = [];

    final public function __construct() {}
    final public function __clone() {}
    final public function __wakeup() {}

    final public static function getInstance(): static
    {
        return self::$instances[static::class] ??= new static();
    }

    /**
     * Drop the cached instances.
     *
     * For tests only — a singleton outlives a single test method, and a suite
     * sharing one process would otherwise carry a kernel built by an earlier
     * case into the next one.
     */
    final public static function resetInstances(): void
    {
        self::$instances = [];
    }
}
