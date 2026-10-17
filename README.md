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

This is a Chromium Manifest V3 extension. To load it from source:

1. Download or clone this repository.
2. Open your browser's extensions page (`chrome://extensions` in Chrome or `edge://extensions` in Edge).
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose this repository's folder—the one containing `manifest.json`.
5. Open a Scribd document page you can access.

## Use

1. On a Scribd document page, click **Download RN** in the page toolbar. You can also open the extension popup and select **Prepare PDF**.
2. Wait while the extension loads the document pages.
3. In the print dialog, choose **Save as PDF**, review the print settings, and save.

If the PDF has missing or blank pages, open the popup and increase **Page load delay**, then try again. The page button uses the default delay.

## Privacy and permissions

The extension needs access to Scribd pages to add its button and prepare the document. It uses browser tab APIs to identify and navigate the active page, and local storage for a pseudonymous telemetry ID.

Usage telemetry is sent to `anytools.online`. It can include a pseudonymous installation ID, browser and extension version, event details, and document titles or URLs. The extension does not send document page contents or generated PDFs. Telemetry errors are logged locally; telemetry is not currently configurable from the popup.

## Development

The extension uses plain JavaScript, HTML, CSS, and a Manifest V3 manifest; there is no build step. Load the repository folder as an unpacked extension to test changes.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

Maintained by [sbp359](https://github.com/sbp359).  
[Source code](https://github.com/sbp359/scribd-pdf-downloader) · [Report an issue](https://github.com/sbp359/scribd-pdf-downloader/issues)
