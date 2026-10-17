let originalStyles = [];
let overlay = null;

function safeSendMessage(message) {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage(message);
    }
  } catch (error) {
    // Extension context is invalidated, ignore safely
  }
}

function createWebsiteDownloadButton() {
  if (document.getElementById("scribd-pdf-download-btn")) return true;

  const toolbar = document.querySelector('[data-e2e="doc-reader-toolbar"] .LWe5jC ._12sL1I')
    || document.querySelector('[data-e2e="doc-reader-toolbar"]');
  const documentId = window.location.pathname.match(/^\/(?:document|doc)\/(\d+)/)?.[1];
  if (!toolbar || !documentId) return false;

  const button = document.createElement("button");
  button.id = "scribd-pdf-download-btn";
  button.className = "ButtonCore-module_wrapper_MkTb9s ButtonShared-module_common_k3DYge AccentButton-module_wrapper_W6vQ8z AccentButton-module_default_4Uc-A6 ButtonShared-module_large_DzeAnG";
  button.type = "button";
  button.setAttribute("aria-label", "Prepare this Scribd document as a PDF");
  button.style.border = "2px solid #d32f2f";
  button.innerHTML = `
    <span class="ButtonCore-module_content_8zyAJv">
      <span class="Icon-module_wrapper_LUeQrI ButtonCore-module_leftIcon_UY4PTP ButtonCore-module_icon_L-8QAf">
        <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"
          role="img" aria-hidden="true" focusable="false">
          <path fill-rule="evenodd" clip-rule="evenodd"
            d="M7 7.586V1h2v6.586l2.293-2.293 1.414 1.414-4 4-.707.707-.707-.707-4-4 1.414-1.414L7 7.586ZM0 12v-2h2v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2h2v2a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3Z"
            fill="currentColor"></path>
        </svg>
      </span>
      <span class="ButtonCore-module_children_8a9B71 ButtonCore-module_leftAlignedText_hoMVqd ButtonCore-module_rightAlignedText_v4RKjN">Download RN</span>
    </span>
  `;
  button.addEventListener("click", () => {
    const currentUrl = window.location.href;
    const currentDocumentId = window.location.pathname.match(/^\/(?:document|doc)\/(\d+)/)?.[1];
    if (!currentDocumentId) {
      button.title = "Could not identify this Scribd document. Refresh the page and try again.";
      return;
    }

    if (typeof ExtensionTracker !== "undefined") {
      ExtensionTracker.track("DOWNLOAD_INITIATED_FROM_WEBSITE", {
        mode: "free",
        docUrl: currentUrl,
        docTitle: document.title,
      });
    }

    const delay = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.DEFAULT_SCROLL_DELAY_MS) || 150;
    const embedUrl = new URL(`/embeds/${currentDocumentId}/content`, window.location.origin);
    embedUrl.searchParams.set("start_download", "true");
    embedUrl.searchParams.set("scroll_delay", String(delay));
    embedUrl.searchParams.set("original_url", currentUrl);
    embedUrl.searchParams.set("doc_title", document.title);
    button.disabled = true;
    button.style.cursor = "wait";
    button.querySelector("span").textContent = "Opening PDF...";
    window.location.assign(embedUrl.href);
  });

  const firstToolbarItem = toolbar.querySelector("div");
  if (firstToolbarItem) {
    firstToolbarItem.after(button);
  } else {
    toolbar.appendChild(button);
  }
  return true;
}

function initializeWebsiteDownloadButton() {
  if (createWebsiteDownloadButton()) return;

  const observer = new MutationObserver(() => {
    if (createWebsiteDownloadButton()) {
      observer.disconnect();
      clearTimeout(timeoutId);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const timeoutId = setTimeout(() => observer.disconnect(), 15000);
}

if (/^\/(?:document|doc)\/\d+/.test(window.location.pathname)) {
  initializeWebsiteDownloadButton();
}

// Listener for messages from extension popup (when manually run on an embed page)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_DOWNLOAD") {
    const defaultDelay = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.DEFAULT_SCROLL_DELAY_MS) || 150;
    runDownloader(request.scrollDelay || defaultDelay);
    sendResponse({ started: true });
  }
  return true;
});



let isCancelled = false;

/**
 * @param {number} scrollDelayMs
 */
async function runDownloader(scrollDelayMs) {
  try {
    isCancelled = false;

    if (typeof ExtensionTracker !== "undefined") {
      ExtensionTracker.track("DOWNLOAD_STARTED", {
        mode: "free",
        scrollDelayMs,
        docTitle: document.title,
      });
    }


    // Show visual status overlay in the page
    updateOverlay("Getting things ready...", "Connecting to the Scribd document.", 0, 100, false);

    // 2. Detect the page size before applying layout fixes
    const paperSize = detectDocumentPaperSize();

    // 3. Start scrolling through pages to trigger lazy loading
    const totalPages = await scrollThroughPages(scrollDelayMs);
    if (totalPages === 0 || isCancelled) {
      removeOverlay();
      return;
    }

    removeOverlay();
    proceedToPrint(paperSize);

  } catch (error) {
    if (!isCancelled) {
      safeSendMessage({ action: "ERROR", message: error.message });
      showOverlayError(error.message);
    }
  }
}

async function proceedToPrint(paperSize) {
  // Prepare print
  updateOverlay("Preparing the layout...", "Adjusting the page layout for printing.", 100, 100, false);
  prepareForPrint(paperSize);

  updateOverlay("Finishing page setup...", "Allowing images and fonts to finish loading.", 100, 100, false);
  const renderWaitMs = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.RENDER_WAIT_MS) || 2000;
  await new Promise((resolve) => setTimeout(resolve, renderWaitMs));

  window.scrollTo(0, 0);

  updateOverlay("Print dialog is ready", "Choose “Save as PDF” as the destination to save your document.", 100, 100, false);
  safeSendMessage({ action: "PROGRESS", status: "printing" });

  setTimeout(() => {
    const titleParam = new URLSearchParams(window.location.search).get("doc_title");
    if (titleParam) {
      document.title = decodeURIComponent(titleParam);
    }
    window.print();

    restorePage();
    safeSendMessage({ action: "PROGRESS", status: "completed" });
    if (typeof ExtensionTracker !== "undefined") {
      ExtensionTracker.track("DOWNLOAD_SUCCESS", {
        downloadType: "free",
        docTitle: document.title,
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const originalUrl = urlParams.get("original_url");
    if (originalUrl) {
      updateOverlay("PDF is ready", "Your document is ready. Return to its Scribd page below.");
      const btnContainer = document.getElementById("sd-btn-container");
      if (btnContainer && btnContainer.children.length === 0) {
        const backBtn = document.createElement("button");
        backBtn.innerText = "Return to Scribd";
        backBtn.style.cssText = `
          margin-top: 18px;
          width: 100%;
          background: linear-gradient(135deg, #1a9856 0%, #147a49 100%);
          border: none;
          border-radius: 8px;
          color: #ffffff;
          padding: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(22, 131, 74, 0.24);
        `;
        backBtn.onclick = () => {
          removeOverlay();
          window.location.href = decodeURIComponent(originalUrl);
        };
        btnContainer.appendChild(backBtn);
      }
    } else {
      updateOverlay("PDF is ready", "Restoring the Scribd page...");
      setTimeout(() => {
        removeOverlay();
      }, 3000);
    }
  }, 500);
}

function getPageSelector() {
  if (document.querySelector('.outer_page')) return '.outer_page';
  if (document.querySelector('.newpage')) return '.newpage';
  if (document.querySelector('.outer_page_container')) return '.outer_page_container';
  return "[class*='page']";
}

async function scrollThroughPages(scrollDelayMs) {
  let scrolledCount = 0;
  let stableRounds = 0;
  let lastTotalPages = -1;
  const pageSelector = getPageSelector();

  while (stableRounds < 2) {
    const pageElements = document.querySelectorAll(pageSelector);
    const totalPages = pageElements.length;

    if (totalPages === 0) {
      throw new Error("No page elements detected. Are you on a Scribd document page?");
    }

    if (totalPages === lastTotalPages) {
      stableRounds++;
    } else {
      stableRounds = 0;
      lastTotalPages = totalPages;
    }

    updateOverlay(
      "Loading pages...",
      "Loading images and text as you move through the document.",
      scrolledCount,
      totalPages
    );
    safeSendMessage({ action: "PROGRESS", status: "scrolling", current: scrolledCount, total: totalPages });

    for (let i = scrolledCount; i < totalPages; i++) {
      if (isCancelled) return 0;
      pageElements[i].scrollIntoView({ behavior: 'instant', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, scrollDelayMs));
      if (isCancelled) return 0;

      if ((i + 1) % 5 === 0 || i === totalPages - 1) {
        updateOverlay(
          "Loading pages...",
          "Loading images and text as you move through the document.",
          i + 1,
          totalPages
        );
        safeSendMessage({ action: "PROGRESS", status: "scrolling", current: i + 1, total: totalPages });
      }
    }

    scrolledCount = totalPages;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return scrolledCount;
}

function detectDocumentPaperSize() {
  const candidates = [
    '.outer_page',
    '.newpage',
    '.outer_page_container',
    "[class*='page']"
  ];

  for (const selector of candidates) {
    const element = document.querySelector(selector);
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        widthInches: rect.width / 96,
        heightInches: (rect.height / 96) + 0.04,
        selector
      };
    }
  }
  return null;
}

function prepareForPrint(paperSize) {
  originalStyles = [];

  // Hide toolbars
  const toolbars = document.querySelectorAll('.toolbar_top, .toolbar_bottom');
  toolbars.forEach(el => {
    originalStyles.push({ element: el, display: el.style.display });
    el.style.display = 'none';
  });

  // Clean container layouts
  const scrollers = document.querySelectorAll('.document_scroller');
  scrollers.forEach(element => {
    originalStyles.push({
      element,
      position: element.style.position,
      top: element.style.top,
      bottom: element.style.bottom,
      left: element.style.left,
      right: element.style.right,
      overflow: element.style.overflow,
      maxHeight: element.style.maxHeight,
      height: element.style.height,
      margin: element.style.margin,
      padding: element.style.padding
    });

    element.setAttribute('data-scribd-print-root', 'true');
    element.style.position = 'static';
    element.style.top = 'auto';
    element.style.bottom = 'auto';
    element.style.left = 'auto';
    element.style.right = 'auto';
    element.style.overflow = 'visible';
    element.style.maxHeight = 'none';
    element.style.height = 'auto';
    element.style.margin = '0';
    element.style.padding = '0';
  });

  // Inject print CSS with dynamically measured paper dimensions
  const existing = document.getElementById('scribd-print-styles');
  if (existing) existing.remove();

  const widthVal = paperSize ? `${paperSize.widthInches.toFixed(3)}in` : 'auto';
  const heightVal = paperSize ? `${paperSize.heightInches.toFixed(3)}in` : 'auto';

  const style = document.createElement('style');
  style.id = 'scribd-print-styles';
  style.textContent = `
    [class*="cookie"], [class*="Cookie"], [class*="consent"],
    [class*="Consent"], [class*="gdpr"], [class*="privacy-notice"],
    [class*="notice-banner"], [id*="cookie"], [id*="consent"],
    [class*="osano-cm"], [id*="osano"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
    }

    [data-scribd-print-root="true"],
    .document_scroller {
      position: static !important;
      top: auto !important;
      right: auto !important;
      bottom: auto !important;
      left: auto !important;
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    @media print {
      #scribd-downloader-overlay {
        display: none !important;
      }

      @page {
        size: ${widthVal} ${heightVal};
        margin: 0;
      }

      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .toolbar_top,
      .toolbar_bottom {
        display: none !important;
      }

      [data-scribd-print-root="true"],
      .document_scroller {
        position: static !important;
        top: auto !important;
        right: auto !important;
        bottom: auto !important;
        left: auto !important;
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .outer_page_container,
      .newpage_container {
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
        min-height: 0 !important;
      }

      .outer_page_container > *:not(.outer_page),
      .newpage_container > *:not(.newpage) {
        display: none !important;
      }

      .outer_page {
        margin: 0 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        break-after: page !important;
        page-break-after: always !important;
      }

      .outer_page:last-of-type,
      .outer_page:last-child,
      .newpage:last-of-type,
      .newpage:last-child {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }

      mjx-container,
      .MathJax,
      .katex,
      math,
      svg {
        visibility: visible !important;
        overflow: visible !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function restorePage() {
  const existing = document.getElementById('scribd-print-styles');
  if (existing) existing.remove();

  originalStyles.forEach(item => {
    const el = item.element;
    if (!el) return;

    if (item.display !== undefined) {
      el.style.display = item.display;
    } else {
      el.removeAttribute('data-scribd-print-root');
      el.style.position = item.position;
      el.style.top = item.top;
      el.style.bottom = item.bottom;
      el.style.left = item.left;
      el.style.right = item.right;
      el.style.overflow = item.overflow;
      el.style.maxHeight = item.maxHeight;
      el.style.height = item.height;
      el.style.margin = item.margin;
      el.style.padding = item.padding;
    }
  });
  originalStyles = [];
}

/* Download progress overlay */
function createOverlay() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'scribd-downloader-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(20, 45, 29, 0.42);
    backdrop-filter: blur(8px);
    z-index: 9999999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #173323;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="background: #ffffff; border: 1px solid #dce9df; border-radius: 18px; padding: 32px 28px; width: 380px; max-width: 90vw; box-shadow: 0 25px 50px -12px rgba(20, 55, 32, 0.24); display: flex; flex-direction: column; align-items: center; text-align: center;">
      <!-- Progress Icon matching Popup Logo -->
      <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #1a9856 0%, #147a49 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; box-shadow: 0 4px 14px rgba(22, 131, 74, 0.24);">
        <svg style="width: 22px; height: 22px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>
      <div style="font-size: 17px; font-weight: 700; margin-bottom: 6px; color: #173323;">Preparing your PDF</div>
      <div id="sd-overlay-status" style="font-size: 13.5px; font-weight: 600; margin-bottom: 4px; color: #277849;">Getting things ready...</div>
      <div id="sd-overlay-detail" style="font-size: 12px; color: #607969; margin-bottom: 20px; line-height: 1.4;">Connecting to the Scribd document.</div>
      
      <!-- Progress Bar matching Popup -->
      <div style="width: 100%; height: 8px; background: #e7f0e9; border: 1px solid #dce9df; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
        <div id="sd-overlay-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #21a65b 0%, #73c98e 100%); border-radius: 6px; transition: width 0.2s; box-shadow: 0 0 10px rgba(33, 166, 91, 0.25);"></div>
      </div>
      <div style="width: 100%; display: flex; justify-content: space-between; font-size: 11px; font-weight: 600;">
        <span id="sd-overlay-percent" style="color: #16834a;">0%</span>
        <span id="sd-overlay-count" style="color: #607969; font-weight: 500;">0 / 0 pages</span>
      </div>
      <div id="sd-btn-container" style="width: 100%;">
        <button id="sd-btn-cancel-scan" style="
          margin-top: 18px;
          width: 100%;
          background: #f2f8f3;
          border: 1px solid #dce9df;
          border-radius: 8px;
          color: #365442;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        ">Cancel preparation</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const cancelScanBtn = document.getElementById("sd-btn-cancel-scan");
  if (cancelScanBtn) {
    cancelScanBtn.onmouseenter = () => {
      cancelScanBtn.style.background = "#e7f3e9";
      cancelScanBtn.style.color = "#14532d";
      cancelScanBtn.style.borderColor = "#a8d5b4";
    };
    cancelScanBtn.onmouseleave = () => {
      cancelScanBtn.style.background = "#f2f8f3";
      cancelScanBtn.style.color = "#365442";
      cancelScanBtn.style.borderColor = "#dce9df";
    };
    cancelScanBtn.onclick = () => {
      if (typeof ExtensionTracker !== "undefined") {
        ExtensionTracker.track("DOWNLOAD_SCAN_CANCELLED", {
          docTitle: document.title,
        });
      }
      isCancelled = true;
      removeOverlay();
      restorePage();
      safeSendMessage({ action: "CANCELLED" });
      const urlParams = new URLSearchParams(window.location.search);
      const originalUrl = urlParams.get('original_url');
      if (originalUrl) {
        window.location.href = decodeURIComponent(originalUrl);
      }
    };
  }
}

function updateOverlay(status, detail, current, total, showPageCount = true) {
  createOverlay();
  const statusEl = document.getElementById('sd-overlay-status');
  const detailEl = document.getElementById('sd-overlay-detail');
  const fillEl = document.getElementById('sd-overlay-fill');
  const percentEl = document.getElementById('sd-overlay-percent');
  const countEl = document.getElementById('sd-overlay-count');

  if (status) statusEl.innerText = status;
  if (detail) detailEl.innerText = detail;

  if (current !== undefined && total !== undefined) {
    const percent = Math.round((current / total) * 100) || 0;
    fillEl.style.width = `${percent}%`;
    percentEl.innerText = `${percent}%`;
    if (showPageCount) {
      countEl.innerText = `Page ${current} / ${total}`;
    } else {
      countEl.innerText = "";
    }
  }
}

function showOverlayError(errMessage) {
  if (typeof ExtensionTracker !== "undefined") {
    ExtensionTracker.track("DOWNLOAD_FAILED", {
      errorMessage: errMessage || "Something went wrong while preparing the PDF.",
      docTitle: document.title,
    });
  }
  createOverlay();
  const statusEl = document.getElementById('sd-overlay-status');
  const detailEl = document.getElementById('sd-overlay-detail');
  const fillEl = document.getElementById('sd-overlay-fill');
  const btnContainer = document.getElementById('sd-btn-container');

  statusEl.innerText = "Could not prepare the PDF";
  detailEl.innerText = errMessage || "Something went wrong. Please try again.";
  fillEl.style.background = "#ef4444";
  fillEl.style.boxShadow = "0 0 8px rgba(239, 68, 68, 0.4)";

  // Add a button to return to the original document.
  if (btnContainer && btnContainer.children.length === 0) {
    const backBtn = document.createElement("button");
    backBtn.innerText = "Return to Scribd";
    backBtn.style.cssText = `
      margin-top: 18px;
      width: 100%;
      background: linear-gradient(135deg, #1a9856 0%, #147a49 100%);
      border: none;
      border-radius: 8px;
      color: #ffffff;
      padding: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(22, 131, 74, 0.24);
    `;
    backBtn.onclick = () => {
      removeOverlay();
      const urlParams = new URLSearchParams(window.location.search);
      const originalUrl = urlParams.get('original_url');
      if (originalUrl) {
        window.location.href = decodeURIComponent(originalUrl);
      }
    };
    btnContainer.appendChild(backBtn);
  }
}

function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

// Auto-start check when script loads in embed context
(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('start_download') === 'true') {
    const scrollDelay = parseInt(urlParams.get('scroll_delay'), 10) || 150;
    const start = () => {
      runDownloader(scrollDelay);
    };

    if (document.readyState === "complete") {
      setTimeout(start, 500);
    } else {
      window.addEventListener("load", () => setTimeout(start, 500));
    }
  }
})();
