<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The buyer's GhostLabs account, where the paid edition is downloaded.
 *
 * It is a link and nothing more: this edition sends that backend no request of
 * any kind. The in-place upgrade that used to call it is gone — WordPress.org
 * refuses installing a paid version of the same plugin (Guideline 8) — and
 * `NoInDashboardInstallTest` holds the ban.
 *
 * ## ⚠️ The base is the backend axis, not the marketing one
 *
 * `https://enter.theghostlab.io` is rewritten at release by
 * `build.sh --release-host=https://…`, and `assert_no_dev_host()` refuses a
 * build that still carries it. That is the paid edition's backend axis too.
 * `UpgradeEndpoints` is the marketing address, a different origin, and its test
 * refuses this host there. That is why this is a class of its own.
 *
 * Keep it one uninterrupted literal. A composed base is the helper the textual
 * rewrite would miss. A finished production URL is worse: the rewrite never
 * matches it, so the assertion has nothing to find.
 */
final class AccountEndpoints
{
    /** The backend's origin. See the class docblock before touching it. */
    private const BACKEND_BASE = 'https://enter.theghostlab.io';

    /** The customer account, which lists each purchase with its download. */
    private const ACCOUNT_PATH = '/account';

    public static function accountUrl(): string
    {
        return self::BACKEND_BASE . self::ACCOUNT_PATH;
    }
}
