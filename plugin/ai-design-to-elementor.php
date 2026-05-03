<?php
/**
 * Plugin Name: AI Design to Elementor
 * Description: Converts public design URLs into Elementor-first WordPress pages using a SaaS conversion service.
 * Version: 0.1.6
 * Author: AI Design to WordPress
 * Requires Plugins: elementor
 */

if (!defined('ABSPATH')) {
    exit;
}

final class AI_Design_To_Elementor_Plugin {
    private const VERSION = '0.1.6';
    private const OPTION_API_BASE = 'ai_design_to_elementor_api_base';
    private const OPTION_LICENSE = 'ai_design_to_elementor_license_key';
    private const OPTION_CALLBACK_TOKEN = 'ai_design_to_elementor_callback_token';
    private const OPTION_LAST_JOB = 'ai_design_to_elementor_last_job';

    public static function boot(): void {
        add_action('admin_menu', [self::class, 'register_admin_menu']);
        add_action('admin_init', [self::class, 'handle_settings_save']);
        add_action('rest_api_init', [self::class, 'register_rest_routes']);
    }

    public static function register_admin_menu(): void {
        add_menu_page(
            'AI Design to Elementor',
            'AI Design',
            'manage_options',
            'ai-design-to-elementor',
            [self::class, 'render_admin_page'],
            'dashicons-layout',
            58
        );
    }

    public static function render_admin_page(): void {
        if (!current_user_can('manage_options')) {
            return;
        }

        $api_base = esc_url(get_option(self::OPTION_API_BASE, ''));
        $license = esc_attr(get_option(self::OPTION_LICENSE, ''));
        $last_job = get_option(self::OPTION_LAST_JOB, []);
        $ready = self::requirements_status();
        ?>
        <div class="wrap">
            <h1>AI Design to Elementor</h1>
            <p><strong>Version <?php echo esc_html(self::VERSION); ?></strong></p>
            <?php if (!$ready['ok']) : ?>
                <div class="notice notice-error"><p><?php echo esc_html(implode(' ', $ready['messages'])); ?></p></div>
            <?php endif; ?>
            <form method="post" data-ai-design-submit>
                <?php wp_nonce_field('ai_design_to_elementor_settings'); ?>
                <h2>Connection</h2>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="ai_design_api_base">Conversion API</label></th>
                        <td>
                            <input class="regular-text" id="ai_design_api_base" name="ai_design_api_base" value="<?php echo $api_base; ?>" />
                            <p class="description">Leave blank to run a direct WordPress import test without the SaaS API.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="ai_design_license_key">License Key</label></th>
                        <td><input class="regular-text" id="ai_design_license_key" name="ai_design_license_key" value="<?php echo $license; ?>" /></td>
                    </tr>
                </table>
                <h2>Pages</h2>
                <p>Enter one page per line as <code>Page Title | https://public-design-url.example</code>.</p>
                <textarea name="ai_design_pages" rows="8" class="large-text code"></textarea>
                <?php submit_button('Create Conversion Job', 'primary', 'ai_design_submit_job', false, $ready['ok'] ? [] : ['disabled' => 'disabled']); ?>
            </form>
            <?php if (!empty($last_job)) : ?>
                <h2>Last Job</h2>
                <?php self::render_progress_panel($last_job); ?>
                <pre><?php echo esc_html(wp_json_encode($last_job, JSON_PRETTY_PRINT)); ?></pre>
                <?php self::render_job_actions($last_job); ?>
            <?php endif; ?>
            <?php self::render_manual_refresh(); ?>
            <?php self::render_processing_overlay($last_job); ?>
            <?php self::render_auto_refresh_script($last_job); ?>
        </div>
        <?php
    }

    private static function render_processing_overlay(array $last_job): void {
        $is_active = self::ai_design_is_active_job($last_job);
        ?>
        <style>
            .ai-design-overlay {
                position: fixed;
                inset: 0;
                z-index: 100000;
                display: none;
                align-items: center;
                justify-content: center;
                background: rgba(12, 18, 28, 0.72);
                backdrop-filter: blur(3px);
            }
            .ai-design-overlay.is-visible {
                display: flex;
            }
            .ai-design-overlay__panel {
                width: min(520px, calc(100vw - 40px));
                padding: 28px;
                border-radius: 8px;
                background: #fff;
                box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
                text-align: center;
            }
            .ai-design-overlay__panel .spinner {
                float: none;
                width: 32px;
                height: 32px;
                margin: 0 auto 14px;
            }
            .ai-design-overlay__panel h2 {
                margin: 0 0 8px;
            }
            .ai-design-overlay__panel p {
                margin: 0;
                color: #50575e;
            }
        </style>
        <div class="ai-design-overlay <?php echo $is_active ? 'is-visible' : ''; ?>" aria-live="polite" aria-busy="true">
            <div class="ai-design-overlay__panel">
                <span class="spinner is-active"></span>
                <h2>Building your Elementor site kit</h2>
                <p>Capturing the design, generating editable Elementor sections, and sending the import to WordPress.</p>
            </div>
        </div>
        <script>
            (function () {
                var form = document.querySelector('[data-ai-design-submit]');
                var overlay = document.querySelector('.ai-design-overlay');
                if (!form || !overlay) {
                    return;
                }
                form.addEventListener('submit', function () {
                    overlay.classList.add('is-visible');
                });
            })();
        </script>
        <?php
    }

    private static function render_progress_panel(array $last_job): void {
        $status = sanitize_text_field($last_job['status'] ?? 'unknown');
        $is_active = self::ai_design_is_active_job($last_job);
        $message = $is_active ? 'Working on your Elementor site kit...' : 'Latest job status: ' . $status;
        ?>
        <div class="notice notice-info ai-design-progress" style="display:flex;align-items:center;gap:10px;padding:12px;">
            <?php if ($is_active) : ?>
                <span class="spinner is-active" style="float:none;margin:0;"></span>
            <?php endif; ?>
            <div>
                <strong><?php echo esc_html($message); ?></strong>
                <?php if ($is_active) : ?>
                    <p style="margin:4px 0 0;">Capture and Elementor generation can take 30-90 seconds. This page will refresh job status automatically.</p>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    private static function render_auto_refresh_script(array $last_job): void {
        if (!self::ai_design_should_auto_refresh($last_job)) {
            return;
        }
        ?>
        <script>
            window.setTimeout(function () {
                var button = document.querySelector('[name="ai_design_refresh_submit"]');
                if (button && button.form) {
                    button.form.submit();
                }
            }, 7000);
        </script>
        <?php
    }

    private static function ai_design_should_auto_refresh(array $last_job): bool {
        $job_id = $last_job['id'] ?? $last_job['jobId'] ?? '';
        return $job_id !== '' && get_option(self::OPTION_API_BASE, '') !== '' && self::ai_design_is_active_job($last_job);
    }

    private static function ai_design_is_active_job(array $last_job): bool {
        $status = $last_job['status'] ?? '';
        return in_array($status, ['queued', 'running'], true);
    }

    private static function render_manual_refresh(): void {
        if (get_option(self::OPTION_API_BASE, '') === '') {
            return;
        }
        ?>
        <h2>Job Tools</h2>
        <form method="post" style="margin: 12px 0;">
            <?php wp_nonce_field('ai_design_to_elementor_refresh'); ?>
            <label for="ai_design_manual_job_id"><strong>Manual Job ID</strong></label>
            <input class="regular-text" id="ai_design_manual_job_id" name="ai_design_manual_job_id" placeholder="job_..." />
            <?php submit_button('Refresh Job Status', 'secondary', 'ai_design_refresh_submit', false); ?>
        </form>
        <?php
    }

    private static function render_job_actions(array $last_job): void {
        $job_id = $last_job['id'] ?? $last_job['jobId'] ?? '';
        if ($job_id !== '' && get_option(self::OPTION_API_BASE, '') !== '') {
            ?>
            <form method="post" style="margin: 12px 0;">
                <?php wp_nonce_field('ai_design_to_elementor_refresh'); ?>
                <input type="hidden" name="ai_design_refresh_job" value="<?php echo esc_attr($job_id); ?>" />
                <?php submit_button('Refresh Job Status', 'secondary', 'ai_design_refresh_submit', false); ?>
            </form>
            <?php
        }

        if (!empty($last_job['imported']) && is_array($last_job['imported'])) {
            echo '<ul>';
            foreach ($last_job['imported'] as $item) {
                $post_id = (int) ($item['postId'] ?? 0);
                if ($post_id <= 0) {
                    continue;
                }
                $edit_link = get_edit_post_link($post_id);
                $view_link = get_permalink($post_id);
                echo '<li>';
                echo esc_html($item['title'] ?? get_the_title($post_id));
                if ($edit_link) {
                    echo ' <a href="' . esc_url($edit_link) . '">Edit Page</a>';
                }
                if ($view_link) {
                    echo ' <a href="' . esc_url($view_link) . '">View Draft</a>';
                }
                echo '</li>';
            }
            echo '</ul>';
        }
    }

    public static function handle_settings_save(): void {
        if (!current_user_can('manage_options')) {
            return;
        }

        if (isset($_POST['ai_design_refresh_submit'])) {
            check_admin_referer('ai_design_to_elementor_refresh');
            $job_id = sanitize_text_field(wp_unslash($_POST['ai_design_refresh_job'] ?? ''));
            if ($job_id === '') {
                $job_id = sanitize_text_field(wp_unslash($_POST['ai_design_manual_job_id'] ?? ''));
            }
            self::refresh_last_job_status($job_id);
            return;
        }

        if (!isset($_POST['ai_design_submit_job'])) {
            return;
        }

        check_admin_referer('ai_design_to_elementor_settings');

        $api_base = esc_url_raw(wp_unslash($_POST['ai_design_api_base'] ?? ''));
        update_option(self::OPTION_API_BASE, $api_base);
        update_option(self::OPTION_LICENSE, sanitize_text_field(wp_unslash($_POST['ai_design_license_key'] ?? '')));

        $token = wp_generate_password(64, false, false);
        update_option(self::OPTION_CALLBACK_TOKEN, $token);

        $pages = self::parse_pages_text(wp_unslash($_POST['ai_design_pages'] ?? ''));
        if ($api_base === '') {
            self::run_direct_test_import($pages);
            return;
        }

        $payload = [
            'licenseKey' => get_option(self::OPTION_LICENSE, ''),
            'callbackUrl' => rest_url('ai-design/v1/import'),
            'callbackToken' => $token,
            'pages' => $pages,
        ];

        $response = wp_remote_post(trailingslashit(get_option(self::OPTION_API_BASE, '')) . 'jobs', [
            'timeout' => 20,
            'headers' => ['content-type' => 'application/json'],
            'body' => wp_json_encode($payload),
        ]);

        $body = is_wp_error($response) ? ['error' => $response->get_error_message()] : json_decode(wp_remote_retrieve_body($response), true);
        update_option(self::OPTION_LAST_JOB, is_array($body) ? $body : ['error' => 'Invalid API response']);
    }

    private static function refresh_last_job_status(string $job_id): void {
        if ($job_id === '') {
            update_option(self::OPTION_LAST_JOB, ['error' => 'Missing job ID.']);
            return;
        }

        $api_base = get_option(self::OPTION_API_BASE, '');
        if ($api_base === '') {
            update_option(self::OPTION_LAST_JOB, ['error' => 'Conversion API is not configured.']);
            return;
        }

        $response = wp_remote_get(trailingslashit($api_base) . 'jobs/' . rawurlencode($job_id), [
            'timeout' => 20,
            'headers' => ['accept' => 'application/json'],
        ]);

        $body = is_wp_error($response) ? ['error' => $response->get_error_message()] : json_decode(wp_remote_retrieve_body($response), true);
        update_option(self::OPTION_LAST_JOB, is_array($body) ? $body : ['error' => 'Invalid API response']);
    }

    private static function run_direct_test_import(array $pages): void {
        if (empty($pages)) {
            update_option(self::OPTION_LAST_JOB, ['error' => 'Add at least one page before running direct import.']);
            return;
        }

        $payload = self::create_local_site_kit($pages);
        $imported = [];
        foreach ($payload['pages'] as $page) {
            $post_id = self::import_elementor_page($page);
            $imported[] = ['title' => $page['title'], 'postId' => $post_id];
        }

        update_option(self::OPTION_LAST_JOB, [
            'status' => 'imported-direct',
            'message' => 'Direct WordPress import test completed without SaaS API.',
            'imported' => $imported,
            'warnings' => self::collect_warnings($payload),
        ]);
    }

    public static function register_rest_routes(): void {
        register_rest_route('ai-design/v1', '/import', [
            'methods' => 'POST',
            'callback' => [self::class, 'handle_import'],
            'permission_callback' => [self::class, 'can_import'],
        ]);
    }

    public static function can_import(WP_REST_Request $request): bool {
        $expected = (string) get_option(self::OPTION_CALLBACK_TOKEN, '');
        $provided = (string) $request->get_header('x-ai-design-token');

        if ($expected !== '' && hash_equals($expected, $provided)) {
            return true;
        }

        return current_user_can('manage_options');
    }

    public static function handle_import(WP_REST_Request $request): WP_REST_Response {
        $payload = $request->get_json_params();
        if (!is_array($payload) || ($payload['type'] ?? '') !== 'elementor-site-kit') {
            return new WP_REST_Response(['error' => 'Invalid Elementor site kit payload'], 400);
        }

        $imported = [];
        foreach (($payload['pages'] ?? []) as $page) {
            $post_id = self::import_elementor_page($page);
            $imported[] = ['title' => $page['title'] ?? '', 'postId' => $post_id];
        }

        update_option(self::OPTION_LAST_JOB, [
            'status' => 'imported',
            'jobId' => get_option(self::OPTION_LAST_JOB, [])['id'] ?? '',
            'imported' => $imported,
            'warnings' => self::collect_warnings($payload),
        ]);

        return new WP_REST_Response(['imported' => $imported], 200);
    }

    private static function import_elementor_page(array $page): int {
        $post_id = wp_insert_post([
            'post_title' => sanitize_text_field($page['title'] ?? 'Generated Page'),
            'post_name' => sanitize_title($page['slug'] ?? ($page['title'] ?? 'generated-page')),
            'post_type' => 'page',
            'post_status' => 'draft',
            'post_content' => '',
        ], true);

        if (is_wp_error($post_id)) {
            throw new RuntimeException($post_id->get_error_message());
        }

        $data = $page['elementorData']['content'] ?? [];
        update_post_meta($post_id, '_elementor_edit_mode', 'builder');
        update_post_meta($post_id, '_elementor_template_type', 'wp-page');
        update_post_meta($post_id, '_elementor_version', defined('ELEMENTOR_VERSION') ? ELEMENTOR_VERSION : 'unknown');
        update_post_meta($post_id, '_elementor_data', wp_slash(wp_json_encode($data)));
        update_post_meta($post_id, '_ai_design_source_url', esc_url_raw($page['sourceUrl'] ?? ''));
        update_post_meta($post_id, '_ai_design_warnings', array_map('sanitize_text_field', $page['warnings'] ?? []));

        return (int) $post_id;
    }

    private static function create_local_site_kit(array $pages): array {
        $kit_pages = [];
        foreach ($pages as $page) {
            $title = sanitize_text_field($page['title'] ?? 'Generated Page');
            $source_url = esc_url_raw($page['sourceUrl'] ?? '');
            $kit_pages[] = [
                'title' => $title,
                'slug' => sanitize_title($title),
                'sourceUrl' => $source_url,
                'warnings' => ['Direct test mode uses placeholder Elementor sections.'],
                'elementorData' => [
                    'content' => [
                        self::elementor_container([
                            self::elementor_widget('heading', [
                                'title' => $title,
                                'header_size' => 'h1',
                            ]),
                            self::elementor_widget('text-editor', [
                                'editor' => 'Imported from ' . esc_html($source_url) . '. This validates Elementor page creation before the SaaS renderer is deployed.',
                            ]),
                            self::elementor_widget('button', [
                                'text' => 'Review Source',
                                'link' => ['url' => $source_url],
                            ]),
                        ]),
                    ],
                ],
            ];
        }

        return [
            'type' => 'elementor-site-kit',
            'pages' => $kit_pages,
        ];
    }

    private static function elementor_container(array $elements): array {
        return [
            'id' => substr(md5(wp_json_encode($elements) . wp_rand()), 0, 8),
            'elType' => 'container',
            'isInner' => false,
            'settings' => [
                'content_width' => 'boxed',
                'html_tag' => 'section',
                'padding' => [
                    'unit' => 'px',
                    'top' => '80',
                    'right' => '24',
                    'bottom' => '80',
                    'left' => '24',
                    'isLinked' => false,
                ],
            ],
            'elements' => $elements,
        ];
    }

    private static function elementor_widget(string $widget_type, array $settings): array {
        return [
            'id' => substr(md5($widget_type . wp_json_encode($settings) . wp_rand()), 0, 8),
            'elType' => 'widget',
            'widgetType' => $widget_type,
            'isInner' => false,
            'settings' => $settings,
            'elements' => [],
        ];
    }

    private static function parse_pages_text(string $text): array {
        $pages = [];
        foreach (preg_split('/\r\n|\r|\n/', $text) as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            [$title, $url] = array_pad(array_map('trim', explode('|', $line, 2)), 2, '');
            if ($title !== '' && $url !== '') {
                $pages[] = ['title' => sanitize_text_field($title), 'sourceUrl' => esc_url_raw($url)];
            }
        }
        return $pages;
    }

    private static function collect_warnings(array $payload): array {
        $warnings = [];
        foreach (($payload['pages'] ?? []) as $page) {
            foreach (($page['warnings'] ?? []) as $warning) {
                $warnings[] = sanitize_text_field($warning);
            }
        }
        return $warnings;
    }

    private static function requirements_status(): array {
        $messages = [];
        if (!did_action('elementor/loaded') && !defined('ELEMENTOR_VERSION')) {
            $messages[] = 'Elementor must be active before conversion jobs can be created.';
        }
        $theme = wp_get_theme();
        if (strtolower($theme->get('Name')) !== 'hello elementor') {
            $messages[] = 'Hello Elementor theme is recommended for predictable imports.';
        }
        return ['ok' => empty($messages), 'messages' => $messages];
    }
}

AI_Design_To_Elementor_Plugin::boot();
