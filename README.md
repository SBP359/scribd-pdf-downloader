<p align="center">
  <img src="assets/logo.png" alt="Scribd Downloader logo" width="128">
</p>

<h1 align="center">Scribd Downloader</h1>

<p align="center">
  <strong>Prepare accessible Scribd documents for PDF export directly in your browser.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#privacy">Privacy</a> •
  <a href="#development">Development</a>
</p>

<p align="center">
  <a href="https://github.com/sbp359/scribd-pdf-downloader/releases">
    <img alt="GitHub release" src="https://img.shields.io/github/v/release/sbp359/scribd-pdf-downloader?style=for-the-badge">
  </a>
  <a href="LICENSE">
    <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge">
  </a>
  <a href="https://addons.mozilla.org/addon/scribd-downloader/">
    <img alt="Firefox Add-on" src="https://img.shields.io/badge/Firefox-Add-on-orange?style=for-the-badge&logo=firefox">
  </a>
</p>

> [!IMPORTANT]
> Scribd Downloader only prepares documents you already have permission to access. It does not bypass Scribd login, subscriptions, paywalls, or any other access controls.

## Features

- **One-click preparation** — Start directly from the Scribd document toolbar or extension popup.
- **Lazy-page loading** — Scrolls through the document so rendered pages can finish loading.
- **Adjustable delay** — Tune page loading from 50 ms to 500 ms for slower connections.
- **Print-to-PDF workflow** — Uses the browser's familiar print dialog and **Save as PDF** destination.
- **Local processing** — Document preparation and printing happen in your browser.
- **Cross-browser manifest** — Supports Firefox 140+ and Chromium-based browsers.
- **No build step** — Built with plain JavaScript, HTML, and CSS.

## Installation

### Firefox and Firefox-based browsers

Install the published extension from [Mozilla Add-ons](https://addons.mozilla.org/addon/scribd-downloader/).

Compatible Firefox-based browsers include Firefox 140 or later and compatible versions of Zen Browser.

### Chrome, Edge, and Chromium browsers

A Chrome Web Store release is not published yet. To install for development:

1. Download or clone this repository.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository folder containing `manifest.json`.

### Load locally in Firefox

Build the temporary Firefox package from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package-firefox.ps1
```

Then:

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Choose `dist/scribd-downloader-firefox.xpi`.

Temporary add-ons are removed when the browser closes or restarts.

## Usage

1. Open a Scribd document you can access.
2. Click **Download RN** in the document toolbar.

   Alternatively, open the extension popup and select **Prepare PDF**.
3. Wait while the extension loads and scans the document pages.
4. In the print dialog, choose **Save as PDF** and save the file.

### Improve missing or blank pages

Open the extension popup and increase **Page load delay**. The default is 150 ms, while supported values range from 50 ms to 500 ms.

- Use a higher delay for slower pages or unreliable connections.
- Use a lower delay for fast, fully loaded documents.
- Reload the document if a result is incomplete, then try again.

## Privacy

- Scribd pages are processed locally in the browser.
- The extension does not upload document page contents or generated PDFs.
- The extension does not send usage telemetry.
- No credentials or subscription information are collected.

The extension requests only the permissions needed for document preparation:

| Permission | Purpose |
| --- | --- |
| `activeTab` | Interact with the current Scribd tab |
| `tabs` | Detect the active page and support popup navigation |
| `scripting` | Load the content script when needed |

Host access is limited to `*.scribd.com`.

## Project structure

```text
.
├── assets/logo.png     # Project logo
├── constants.js        # Shared configuration
├── content.js          # Document loading and print preparation
├── manifest.json       # Browser extension configuration
├── icons/              # Extension icons
├── popup/
│   ├── popup.html      # Popup interface
│   ├── popup.css       # Popup styles
│   └── popup.js        # Popup actions and progress updates
├── scripts/
│   └── package-firefox.ps1
└── dist/
    └── *.xpi           # Packaged Firefox extension
```

## Development

No package installation or build step is required for source changes.

1. Clone or download the repository.
2. Make changes to the HTML, CSS, JavaScript, or manifest files.
3. Reload the unpacked extension in your browser.
4. Test using an accessible Scribd document.

For Firefox packaging:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package-firefox.ps1
```

## Troubleshooting

**Missing or blank pages**

- Increase **Page load delay** in the popup.
- Reload the document and repeat the preparation.

**Refresh required**

- Reload the active Scribd tab.
- Reopen the popup and select **Prepare PDF** again.

**Unsupported page**

- Open a Scribd document, embed, or accessible document page rather than a search or account page.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a focused feature or bug-fix branch.
3. Test with Chrome, Edge, or Firefox where applicable.
4. Open a pull request with clear testing steps.

## Support

If Scribd Downloader has been useful, you can support development on Ko-fi:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20me-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/sbp359)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

Maintained by [sbp359](https://github.com/sbp359).

[Source code](https://github.com/sbp359/scribd-pdf-downloader) · [Report an issue](https://github.com/sbp359/scribd-pdf-downloader/issues)
