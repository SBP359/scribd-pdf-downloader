/**
 * ===================================================
 * Scribd Downloader - Global Constants & Configuration
 * ===================================================
 * Shared configuration and document processing settings
 */

const APP_CONFIG = {
  // 0. Extension Version
  VERSION: "1.0.0",

  // 1. API Endpoints
  API_BASE_URL: "https://anytools.online",
  API_LOCAL_URL: "http://localhost:3000",

  // 2. Download processing
  DEFAULT_SCROLL_DELAY_MS: 150,   // Default delay between page scrolls (ms)
  RENDER_WAIT_MS: 2000,          // Wait for fonts and SVG layouts before printing (ms)

  // 3. External links
  PROJECT_URL: "https://github.com/sbp359/scribd-pdf-downloader",
};

// Expose the configuration to extension pages.
if (typeof window !== "undefined") {
  window.APP_CONFIG = APP_CONFIG;
}
