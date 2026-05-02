# AI Design to WordPress

Greenfield MVP scaffold for a product that converts public design URLs into an Elementor-first WordPress site kit.

## What Is Included

- `plugin/ai-design-to-elementor.php`: WordPress admin UI, job submission, signed REST import endpoint, and Elementor page metadata import.
- `saas/src`: dependency-light Node service core for jobs, credit estimates, site model validation, deterministic conversion, and Elementor JSON mapping.
- `saas/test` and `plugin/test`: executable tests for the core conversion and plugin surface.

## Local Verification

```bash
npm test
```

## MVP Boundaries

- Public URL input only; private Base44/Replit APIs are out of scope for v1.
- Elementor-first output for the Hello theme.
- Unknown sections use an Elementor HTML widget with a warning.
- The current renderer is a deterministic placeholder. A production deployment should replace `renderPublicDesignUrl` with a Playwright capture and AI normalization pipeline.
