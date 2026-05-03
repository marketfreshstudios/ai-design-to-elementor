import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from '../../scripts/test-harness.mjs';

const pluginFile = resolve('plugin/ai-design-to-elementor.php');

test('plugin declares WordPress metadata, admin menu, and REST import endpoint', () => {
  const source = readFileSync(pluginFile, 'utf8');

  assert.match(source, /Plugin Name:\s+AI Design to Elementor/);
  assert.match(source, /add_menu_page/);
  assert.match(source, /register_rest_route\(\s*'ai-design\/v1'/);
  assert.match(source, /\/import/);
});

test('plugin import endpoint verifies signed callback tokens and Elementor payloads', () => {
  const source = readFileSync(pluginFile, 'utf8');

  assert.match(source, /hash_equals/);
  assert.match(source, /current_user_can\(\s*'manage_options'\s*\)/);
  assert.match(source, /_elementor_data/);
  assert.match(source, /wp_insert_post/);
  assert.match(source, /update_post_meta/);
});

test('plugin supports direct local test imports when no Conversion API is configured', () => {
  const source = readFileSync(pluginFile, 'utf8');

  assert.match(source, /run_direct_test_import/);
  assert.match(source, /create_local_site_kit/);
  assert.match(source, /Leave blank to run a direct WordPress import test/);
});

test('plugin supports refreshing SaaS job status and linking imported pages', () => {
  const source = readFileSync(pluginFile, 'utf8');

  assert.match(source, /ai_design_refresh_job/);
  assert.match(source, /refresh_last_job_status/);
  assert.match(source, /get_edit_post_link/);
  assert.match(source, /View Draft/);
  assert.match(source, /Refresh Job Status/);
});

test('plugin can refresh jobs after callback stores the previous id as jobId', () => {
  const source = readFileSync(pluginFile, 'utf8');

  assert.match(source, /\$job_id = \$last_job\['id'\] \?\? \$last_job\['jobId'\] \?\? '';/);
  assert.match(source, /name="ai_design_refresh_job" value="<\?php echo esc_attr\(\$job_id\); \?>"/);
});

test('plugin exposes visible version and manual job id refresh field', () => {
  const source = readFileSync(pluginFile, 'utf8');

  assert.match(source, /private const VERSION = '0\.1\.5'/);
  assert.match(source, /Version <\?php echo esc_html\(self::VERSION\); \?>/);
  assert.match(source, /Manual Job ID/);
  assert.match(source, /ai_design_manual_job_id/);
});

test('plugin shows a loading progress state and auto-refreshes active jobs', () => {
  const source = readFileSync(pluginFile, 'utf8');

  assert.match(source, /ai-design-progress/);
  assert.match(source, /spinner is-active/);
  assert.match(source, /Working on your Elementor site kit/);
  assert.match(source, /ai_design_should_auto_refresh/);
  assert.match(source, /setTimeout/);
  assert.match(source, /document\.querySelector\('\[name="ai_design_refresh_submit"\]'\)/);
});
