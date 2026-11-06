<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\RestRoute;

use GHOSTLABS\GLIDE\Config\PluginConfig;
use GHOSTLABS\GLIDE\Service\VideoThumbnail;
use WP_Error;
use WP_HTTP_Response;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) exit;

class VideoRoutes implements RestRouteInterface
{
    public function routes(): void
    {
        register_rest_route(PluginConfig::restNameSpace(), '/video/ffmpeg-status', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'ffmpegStatus'],
                'permission_callback' => function () {
                    return current_user_can('upload_files');
                },
            ],
        ]);

        register_rest_route(PluginConfig::restNameSpace(), '/video/generate-poster', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'generatePoster'],
                'permission_callback' => [$this, 'canGeneratePoster'],
                'args' => [
                    'attachmentId' => [
                        'required' => true,
                        'type' => 'integer',
                        'validate_callback' => function ($value): bool {
                            return is_numeric($value) && (int) $value > 0;
                        },
                        'sanitize_callback' => function ($value): int {
                            return absint($value);
                        },
                    ],
                    'timestamp' => [
                        'required' => false,
                        'type' => 'number',
                        'default' => 2.0,
                        'sanitize_callback' => function ($value): float {
                            return max(0.0, (float) $value);
                        },
                    ],
                ],
            ],
        ]);
    }

    /**
     * `upload_files`, and the id has to be an attachment the user may read.
     *
     * ⚠️ `upload_files` alone let an Author extract a frame from any attachment
     * by id — private, trashed, or attached to someone else's draft — and the
     * source's title was copied onto a new attachment they owned. Reading the
     * source is the right bar: an unattached `inherit` attachment maps to
     * `publish` in core, so picking a colleague's library video still works.
     */
    public function canGeneratePoster(WP_REST_Request $request): bool
    {
        $attachmentId = absint($request->get_param('attachmentId'));

        return current_user_can('upload_files')
            && $attachmentId > 0
            && get_post_type($attachmentId) === 'attachment'
            && current_user_can('read_post', $attachmentId);
    }

    public function ffmpegStatus(): WP_REST_Response|WP_HTTP_Response
    {
        return rest_ensure_response([
            'available' => VideoThumbnail::isFfmpegAvailable(),
        ]);
    }

    public function generatePoster(WP_REST_Request $request): WP_Error|WP_REST_Response|WP_HTTP_Response
    {
        if (! VideoThumbnail::isFfmpegAvailable()) {
            return rest_ensure_response(
                new WP_Error('ffmpeg_unavailable', 'ffmpeg is not available on this server.', ['status' => 501])
            );
        }

        $attachmentId = $request->get_param('attachmentId');
        $timestamp = (float) $request->get_param('timestamp');

        $thumbnail = new VideoThumbnail();
        $result = $thumbnail->extractFrame($attachmentId, $timestamp);

        if (is_wp_error($result)) {
            return rest_ensure_response($result);
        }

        return rest_ensure_response([
            'success' => true,
            'posterId' => $result['id'],
            'posterUrl' => $result['url'],
        ]);
    }
}
