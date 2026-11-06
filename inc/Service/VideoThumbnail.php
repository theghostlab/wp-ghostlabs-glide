<?php

declare(strict_types=1);

namespace GHOSTLABS\GLIDE\Service;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) exit;

class VideoThumbnail
{
    private static ?bool $ffmpegAvailable = null;

    private static ?bool $timeoutAvailable = null;

    /** Seconds either tool may run, wall clock where `timeout` exists and CPU time for ffmpeg. */
    public const TIME_LIMIT = 30;

    /**
     * Demuxers WordPress's own video types need. ffmpeg picks the demuxer from
     * the file's *content*, so a file that passed WordPress's type check could
     * still be read as a playlist or a concat list — the formats behind ffmpeg's
     * historic local-file-read and request-forgery bugs. Naming the containers
     * we accept keeps those parsers out entirely; anything else fails the
     * extraction, and the editor falls back to capturing a frame in the browser.
     */
    public const FORMAT_WHITELIST = 'mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,ogg,asf,flv,mpeg,mpegts';

    public static function isFfmpegAvailable(): bool
    {
        if (self::$ffmpegAvailable !== null) {
            return self::$ffmpegAvailable;
        }

        if (
            ! function_exists('exec')
            || in_array('exec', array_map('trim', explode(',', (string) ini_get('disable_functions'))), true)
        ) {
            self::$ffmpegAvailable = false;
            return false;
        }

        exec('which ffmpeg 2>/dev/null', $output, $exitCode);
        self::$ffmpegAvailable = $exitCode === 0;

        return self::$ffmpegAvailable;
    }

    /**
     * Input options for both tools: local files only, and only the containers
     * above.
     */
    public static function inputRestrictions(): string
    {
        return sprintf(
            '-protocol_whitelist file -format_whitelist %s',
            escapeshellarg(self::FORMAT_WHITELIST)
        );
    }

    /**
     * `timeout N ` where coreutils' timeout exists, else ''.
     *
     * ⚠️ PHP's `max_execution_time` does not count time spent in an `exec()`
     * child on Linux, so without this a crafted or enormous upload could hold a
     * PHP worker indefinitely, and an Author could repeat it.
     */
    public static function timeoutPrefix(): string
    {
        if (self::$timeoutAvailable === null) {
            exec('command -v timeout 2>/dev/null', $output, $exitCode);
            self::$timeoutAvailable = $exitCode === 0;
        }

        return self::$timeoutAvailable ? sprintf('timeout %d ', self::TIME_LIMIT) : '';
    }

    /** @return array{id: int, url: string|false}|WP_Error */
    public function extractFrame(int $attachmentId, float $timestamp = 2.0): array|WP_Error
    {
        $filePath = get_attached_file($attachmentId);

        if (! $filePath || ! file_exists($filePath)) {
            return new WP_Error('not_found', 'Attachment file not found.', ['status' => 404]);
        }

        $realPath = realpath($filePath);
        $uploadsBase = realpath(wp_upload_dir()['basedir']);

        if (! $realPath || ! $uploadsBase || ! str_starts_with($realPath, $uploadsBase . DIRECTORY_SEPARATOR)) {
            return new WP_Error('invalid_path', 'Attachment file is outside the uploads directory.', ['status' => 403]);
        }

        $mimeType = wp_check_filetype($filePath)['type'] ?: '';
        if (! str_starts_with($mimeType, 'video/')) {
            return new WP_Error('not_video', 'Attachment is not a video.', ['status' => 404]);
        }

        $timestamp = $this->clampTimestamp($realPath, $timestamp);

        $tempFile = wp_tempnam('glide-poster-');
        $outputPath = $tempFile . '.jpg';

        $command = sprintf(
            '%sffmpeg -nostdin -timelimit %d -ss %s %s -i %s -frames:v 1 -q:v 2 -f image2 %s 2>&1',
            self::timeoutPrefix(),
            self::TIME_LIMIT,
            escapeshellarg((string) $timestamp),
            self::inputRestrictions(),
            escapeshellarg($realPath),
            escapeshellarg($outputPath)
        );

        exec($command, $output, $exitCode);

        if ($exitCode !== 0 || ! file_exists($outputPath)) {
            wp_delete_file($tempFile);
            wp_delete_file($outputPath);
            return new WP_Error('extraction_failed', 'Frame extraction failed.', ['status' => 500]);
        }

        $result = $this->createAttachment($outputPath, $attachmentId);

        wp_delete_file($tempFile);
        wp_delete_file($outputPath);

        return $result;
    }

    private function clampTimestamp(string $filePath, float $timestamp): float
    {
        $command = sprintf(
            '%sffprobe -v error %s -show_entries format=duration -of csv=p=0 %s 2>/dev/null',
            self::timeoutPrefix(),
            self::inputRestrictions(),
            escapeshellarg($filePath)
        );

        exec($command, $output, $exitCode);

        if ($exitCode !== 0 || empty($output[0])) {
            return 0.0;
        }

        $duration = (float) trim($output[0]);

        return $duration > $timestamp ? $timestamp : 0.0;
    }

    /** @return array{id: int, url: string|false}|WP_Error */
    private function createAttachment(string $imagePath, int $sourceAttachmentId): array|WP_Error
    {
        $uploadDir = wp_upload_dir();
        $filename = sprintf('glide-poster-%d.jpg', $sourceAttachmentId);
        $destination = trailingslashit($uploadDir['path']) . wp_unique_filename($uploadDir['path'], $filename);

        if (! copy($imagePath, $destination)) {
            return new WP_Error('copy_failed', 'Failed to copy poster image.', ['status' => 500]);
        }

        $sourceTitle = get_the_title($sourceAttachmentId);

        $attachmentData = [
            /* translators: %s: the video's title */
            'post_title' => sprintf(__('Video poster: %s', 'ghostlabs-glide'), $sourceTitle),
            'post_mime_type' => 'image/jpeg',
            'post_status' => 'inherit',
        ];

        $attachmentId = wp_insert_attachment($attachmentData, $destination);

        if ($attachmentId === 0) {
            wp_delete_file($destination);
            return new WP_Error('attachment_failed', 'Failed to create attachment.', ['status' => 500]);
        }

        require_once ABSPATH . 'wp-admin/includes/image.php';

        $metadata = wp_generate_attachment_metadata($attachmentId, $destination);
        wp_update_attachment_metadata($attachmentId, $metadata);

        return [
            'id' => $attachmentId,
            'url' => wp_get_attachment_url($attachmentId),
        ];
    }
}
