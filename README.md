# Scribd Downloader

A free, open-source browser extension that prepares Scribd documents you can access for saving as PDFs through your browser's print dialog.

The extension does not provide access to restricted documents or bypass Scribd's login, subscription, or other access controls.

## What it does

- Adds a **Download RN** button to Scribd document pages.
- Scrolls through the document to let lazily loaded pages render.
- Opens the browser's print dialog so you can choose **Save as PDF**.
- Lets you adjust the page-loading delay from the extension popup.
- Processes and prints the document in your browser; it does not upload the generated PDF.

## Install

This is a Manifest V3 extension for Chromium browsers and Firefox-based browsers with Firefox 140 or later, including compatible versions of Zen Browser.

### Chrome, Edge, and other Chromium browsers

1. Download or clone this repository.
2. Open your browser's extensions page (`chrome://extensions` in Chrome or `edge://extensions` in Edge).
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose this repository's folder—the one containing `manifest.json`.
5. Open a Scribd document page you can access.

### Firefox and Zen Browser

For local testing, build the Firefox-compatible package from the repository root in PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package-firefox.ps1
```

This creates `dist/scribd-downloader-zen.xpi`. In Zen:

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on…**.
3. Select `scribd-downloader-zen.xpi`.
4. Open a Scribd document page you can access.

Temporary add-ons are removed when Zen closes. For regular installation, submit the XPI to Mozilla Add-ons (AMO) for review and signing.

## Use

1. On a Scribd document page, click **Download RN** in the page toolbar. You can also open the extension popup and select **Prepare PDF**.
2. Wait while the extension loads the document pages.
3. In the print dialog, choose **Save as PDF**, review the print settings, and save.

If the PDF has missing or blank pages, open the popup and increase **Page load delay**, then try again. The page button uses the default delay.

## Privacy and permissions

The extension accesses Scribd pages to add its button and prepare documents, and uses browser tab APIs for popup navigation. Document preparation and printing run locally in your browser. The extension does not send usage telemetry or upload document contents or generated PDFs.

## Development

The extension uses plain JavaScript, HTML, CSS, and a Manifest V3 manifest; there is no build step. Load the repository folder as an unpacked extension to test changes.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

Maintained by [sbp359](https://github.com/sbp359).  
[Source code](https://github.com/sbp359/scribd-pdf-downloader) · [Report an issue](https://github.com/sbp359/scribd-pdf-downloader/issues)
