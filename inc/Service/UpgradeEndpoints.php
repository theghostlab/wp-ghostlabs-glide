<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use GHOSTLABS\GLIDE\Enum\UpsellSource;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Where the upsell's buy button sends the customer.
 *
 * ⚠️ Deliberately NOT on the rewritable dev host — this is the public marketing
 * address, correct in every environment. The account, which is on the dev host,
 * is `AccountEndpoints`.
 */
final class UpgradeEndpoints
{
    private const BUY_PRO_URL = 'https://theghostlab.io/glide';

    /**
     * The buy link for one surface: the product page, and which surface asked.
     *
     * 🔴 **No checkout-return contract.** Until 2026-10-26 this could carry
     * `upgrade_return` and `domain`. With them the sales backend mints a claim
     * and its receipt page redirects the buyer straight back to wp-admin for the
     * in-place upgrade to redeem. That upgrade is gone, so the redirect would
     * only take the buyer away from the one page showing their key and the
     * download. `UpgradeEndpointsTest` pins its absence.
     */
    public static function buyProUrl(UpsellSource $source): string
    {
        return self::BUY_PRO_URL . '?from=' . rawurlencode($source->value);
    }
}
