<p align="center">
  <img src="assets/logo.png" alt="Scribd & SlideShare Downloader logo" width="128">
</p>

<h1 align="center">Scribd & SlideShare Downloader</h1>

<p align="center">
  <strong>Prepare accessible Scribd documents and SlideShare presentations for PDF export directly in your browser.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#privacy">Privacy</a> •
  <a href="#development">Development</a>
</p>

<p align="center">
  <a href="LICENSE">
    <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge">
  </a>
  <a href="https://addons.mozilla.org/addon/scribd-downloader/">
    <img alt="Firefox Add-on" src="https://img.shields.io/badge/Firefox-Add-on-orange?style=for-the-badge&logo=firefox">
  </a>
</p>

> [!IMPORTANT]
> This extension prepares content that you already have permission to access. It does not bypass Scribd or SlideShare authentication, subscriptions, paywalls, or any other access controls.

## Features

- **Scribd support** — Loads accessible Scribd documents, scrolls through their pages, and opens the print dialog.
- **SlideShare support** — Discovers presentation slides and preloads high-resolution slide images.
- **One-click preparation** — Start from the supported website toolbar or the extension popup.
- **Adjustable loading** — Tune page or slide loading from 50 ms to 500 ms for slower connections.
- **Print-to-PDF workflow** — Uses the browser print dialog and **Save as PDF** destination.
- **Local processing** — Document and presentation preparation happen in your browser.
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

### Scribd

1. Open a Scribd document at `scribd.com/document/...`, `scribd.com/doc/...`, or a Scribd embed page.
2. Click **Download RN** in the document toolbar, or open the extension popup and select **Prepare PDF**.
3. Wait while the pages load.
4. In the print dialog, choose **Save as PDF** and save the file.

### SlideShare

1. Open a presentation on `slideshare.net`.
2. Click **Download RN** beside the presentation metadata, or open the extension popup and select **Prepare PDF**.
3. Wait while the slides are discovered and high-resolution images are preloaded.
4. In the print dialog, choose **Save as PDF** and save the file.

### Improve missing or blank pages

Open the extension popup and increase **Page load delay**. The default is 150 ms, while supported values range from 50 ms to 500 ms.

- Use a higher delay for slower pages or unreliable connections.
- Use a lower delay for fast, fully loaded documents.
- Reload the document or presentation if a result is incomplete, then try again.

## Privacy

- Scribd and SlideShare pages are processed locally in the browser.
- The extension does not upload document or slide contents or generated PDFs.
- The extension does not send usage telemetry.
- No credentials or subscription information are collected.

The extension requests only the permissions needed for preparation:

| Permission | Purpose |
| --- | --- |
| `activeTab` | Interact with the current Scribd or SlideShare tab |
| `tabs` | Detect the active page and support popup navigation |
| `scripting` | Load the content script when needed |

Host access is limited to `*.scribd.com` and `*.slideshare.net`.

## Project structure

```text
.
├── assets/logo.png     # Project logo
├── constants.js        # Shared configuration
├── content.js          # Scribd and SlideShare loading and print preparation
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
4. Test with an accessible Scribd document and SlideShare presentation.

For Firefox packaging:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package-firefox.ps1
```

## Troubleshooting

**Missing or blank pages or slides**

- Increase **Page load delay** in the popup.
- Reload the document or presentation and repeat the preparation.

**Refresh required**

- Reload the active Scribd or SlideShare tab.
- Reopen the popup and select **Prepare PDF** again.

**Unsupported page**

- Open a Scribd document or SlideShare presentation rather than a search, account, category, or login page.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a focused feature or bug-fix branch.
3. Test with Chromium browsers and Firefox where applicable.
4. Open a pull request with clear testing steps.

## Support

If this extension is useful, you can support development on Ko-fi:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20me-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/sbp359)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

Maintained by [sbp359](https://github.com/sbp359).

[Source code](https://github.com/sbp359/scribd-pdf-downloader) · [Report an issue](https://github.com/sbp359/scribd-pdf-downloader/issues)
