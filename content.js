(() => {
  if (window.__SCRIBD_SLIDESHARE_DOWNLOADER_LOADED__) return;
  window.__SCRIBD_SLIDESHARE_DOWNLOADER_LOADED__ = true;

  let originalStyles = [];
  let overlay = null;
  let isCancelled = false;

  const SLIDESHARE_NON_DECK_PREFIXES = [
    "/category/",
    "/explore",
    "/search",
    "/upload",
    "/login",
    "/signup",
    "/saved",
    "/about",
    "/popular",
    "/featured",
    "/settings",
    "/notifications",
    "/dashboard",
    "/top",
    "/developers",
    "/privacy",
    "/terms"
  ];

  function isScribdHost() {
    const host = window.location.hostname.toLowerCase();
    return host === "scribd.com" || host.endsWith(".scribd.com");
  }

  function isSlideShareHost() {
    const host = window.location.hostname.toLowerCase();
    return host === "slideshare.net" || host.endsWith(".slideshare.net");
  }

  function isSlideSharePresentationPage() {
    if (!isSlideShareHost()) return false;
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith("/slideshow/") || path.startsWith("/embed_code/")) {
      return true;
    }
    if (SLIDESHARE_NON_DECK_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) {
      return false;
    }
    if (document.querySelector('[data-cy="vertical-player"], [data-cy="slide-container"], .slide-item')) {
      return true;
    }
    const segments = path.split("/").filter(Boolean);
    return segments.length >= 2;
  }

  function safeSendMessage(message) {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage(message);
      }
    } catch (error) {
      // Extension context is invalidated, ignore safely
    }
  }

  /* ============================================================
     1. On-Page Download Buttons (Scribd & SlideShare)
     ============================================================ */

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

  function createSlideShareDownloadButton() {
    if (!isSlideSharePresentationPage()) return false;
    if (document.getElementById("slideshare-pdf-download-btn")) return true;

    const metadata = document.querySelector('[data-cy="metadata"]');
    const tagsRow = metadata ? metadata.querySelector('[class*="_tags"]') : null;
    const anchorTarget = tagsRow || metadata;
    if (!anchorTarget) return false;

    const button = document.createElement("button");
    button.id = "slideshare-pdf-download-btn";
    button.type = "button";
    button.setAttribute("aria-label", "Prepare this SlideShare presentation as a PDF");
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 12px;
      border-radius: 6px;
      border: 1.5px solid #147a49;
      background: linear-gradient(135deg, #1a9856 0%, #147a49 100%);
      color: #ffffff;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(22, 131, 74, 0.24);
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      white-space: nowrap;
    `;
    button.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Download RN</span>
    `;
    button.addEventListener("mouseenter", () => {
      if (!button.disabled) {
        button.style.transform = "translateY(-1px)";
        button.style.boxShadow = "0 4px 12px rgba(22, 131, 74, 0.34)";
      }
    });
    button.addEventListener("mouseleave", () => {
      button.style.transform = "none";
      button.style.boxShadow = "0 2px 8px rgba(22, 131, 74, 0.24)";
    });
    button.addEventListener("click", async () => {
      const defaultDelay = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.DEFAULT_SCROLL_DELAY_MS) || 150;
      button.disabled = true;
      button.style.opacity = "0.7";
      button.style.cursor = "wait";
      try {
        await runSlideShareDownloader(defaultDelay);
      } finally {
        button.disabled = false;
        button.style.opacity = "1";
        button.style.cursor = "pointer";
      }
    });

    if (tagsRow) {
      tagsRow.appendChild(button);
    } else {
      button.style.marginBottom = "12px";
      metadata.prepend(button);
    }
    return true;
  }

  function initializeSlideShareDownloadButton() {
    createSlideShareDownloadButton();

    // SlideShare uses Next.js client-side navigation, so keep watching briefly and on URL changes
    const observer = new MutationObserver(() => {
      if (isSlideSharePresentationPage() && !document.getElementById("slideshare-pdf-download-btn")) {
        createSlideShareDownloadButton();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (isScribdHost() && /^\/(?:document|doc)\/\d+/.test(window.location.pathname)) {
    initializeWebsiteDownloadButton();
  } else if (isSlideShareHost()) {
    initializeSlideShareDownloadButton();
  }

  /* ============================================================
     2. Message Listener from Extension Popup
     ============================================================ */

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_DOWNLOAD") {
      const defaultDelay = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.DEFAULT_SCROLL_DELAY_MS) || 150;
      const delay = request.scrollDelay || defaultDelay;
      if (isSlideShareHost()) {
        runSlideShareDownloader(delay);
      } else {
        runDownloader(delay);
      }
      sendResponse({ started: true });
    }
    return true;
  });

  /* ============================================================
     3. Scribd Download Flow
     ============================================================ */

  /**
   * @param {number} scrollDelayMs
   */
  async function runDownloader(scrollDelayMs) {
    try {
      isCancelled = false;

      updateOverlay("Getting things ready...", "Connecting to the Scribd document.", 0, 100, false);

      const paperSize = detectDocumentPaperSize();

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
      const urlParams = new URLSearchParams(window.location.search);
      const originalUrl = urlParams.get("original_url");
      if (originalUrl) {
        updateOverlay("PDF is ready", "Your document is ready. Return to its Scribd page below.");
        const btnContainer = document.getElementById("sd-btn-container");
        if (btnContainer) {
          btnContainer.innerHTML = "";
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
    if (document.querySelector(".outer_page")) return ".outer_page";
    if (document.querySelector(".newpage")) return ".newpage";
    if (document.querySelector(".outer_page_container")) return ".outer_page_container";
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
        totalPages,
        true,
        "Page"
      );
      safeSendMessage({ action: "PROGRESS", status: "scrolling", current: scrolledCount, total: totalPages, unit: "Page" });

      for (let i = scrolledCount; i < totalPages; i++) {
        if (isCancelled) return 0;
        pageElements[i].scrollIntoView({ behavior: "instant", block: "center" });
        await new Promise((resolve) => setTimeout(resolve, scrollDelayMs));
        if (isCancelled) return 0;

        if ((i + 1) % 5 === 0 || i === totalPages - 1) {
          updateOverlay(
            "Loading pages...",
            "Loading images and text as you move through the document.",
            i + 1,
            totalPages,
            true,
            "Page"
          );
          safeSendMessage({ action: "PROGRESS", status: "scrolling", current: i + 1, total: totalPages, unit: "Page" });
        }
      }

      scrolledCount = totalPages;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return scrolledCount;
  }

  function detectDocumentPaperSize() {
    const candidates = [
      ".outer_page",
      ".newpage",
      ".outer_page_container",
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

    const toolbars = document.querySelectorAll(".toolbar_top, .toolbar_bottom");
    toolbars.forEach((el) => {
      originalStyles.push({ element: el, display: el.style.display });
      el.style.display = "none";
    });

    const scrollers = document.querySelectorAll(".document_scroller");
    scrollers.forEach((element) => {
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

      element.setAttribute("data-scribd-print-root", "true");
      element.style.position = "static";
      element.style.top = "auto";
      element.style.bottom = "auto";
      element.style.left = "auto";
      element.style.right = "auto";
      element.style.overflow = "visible";
      element.style.maxHeight = "none";
      element.style.height = "auto";
      element.style.margin = "0";
      element.style.padding = "0";
    });

    const existing = document.getElementById("scribd-print-styles");
    if (existing) existing.remove();

    const widthVal = paperSize ? `${paperSize.widthInches.toFixed(3)}in` : "auto";
    const heightVal = paperSize ? `${paperSize.heightInches.toFixed(3)}in` : "auto";

    const style = document.createElement("style");
    style.id = "scribd-print-styles";
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
    const existing = document.getElementById("scribd-print-styles");
    if (existing) existing.remove();

    const slideShareStyle = document.getElementById("sd-slideshare-print-styles");
    if (slideShareStyle) slideShareStyle.remove();

    const slideShareContainer = document.getElementById("sd-slideshare-print-container");
    if (slideShareContainer) slideShareContainer.remove();

    originalStyles.forEach((item) => {
      const el = item.element;
      if (!el) return;

      if (item.display !== undefined) {
        el.style.display = item.display;
      } else {
        el.removeAttribute("data-scribd-print-root");
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

  /* ============================================================
     4. SlideShare Download Flow
     ============================================================ */

  const SLIDESHARE_CDN_RE = /^(https:\/\/image\.slidesharecdn\.com\/[^/]+)\/(\d+)\/(.+)-(\d+)-(\d+)\.([a-zA-Z0-9]+)(\?.*)?$/;

  function getSlideSharePreloadInfo() {
    const preloadLinks = document.querySelectorAll('link[rel="preload"][as="image"][href*="image.slidesharecdn.com"]');
    let best = null;
    preloadLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const match = href.match(SLIDESHARE_CDN_RE);
      if (!match) return;
      const width = parseInt(match[5], 10) || 0;
      if (!best || width > best.width) {
        best = {
          base: match[1],
          quality: match[2],
          width,
          ext: match[6]
        };
      }
    });
    return best;
  }

  function parseSrcsetDescending(srcsetValue) {
    if (!srcsetValue) return [];
    return srcsetValue
      .split(",")
      .map((entry) => {
        const parts = entry.trim().split(/\s+/);
        const url = parts[0];
        const descriptor = parts[1] || "";
        const widthMatch = descriptor.match(/^(\d+)w$/i);
        const width = widthMatch ? parseInt(widthMatch[1], 10) : 0;
        return { url, width };
      })
      .filter((item) => item.url && item.url.startsWith("http"))
      .sort((a, b) => b.width - a.width)
      .map((item) => item.url);
  }

  function getSlideShareContainers() {
    const selectors = [
      '[data-cy="vertical-player"] [data-cy="slide-container"]',
      'main [data-cy="slide-container"]',
      '[data-cy="slide-container"]',
      'main .slide-item',
      '.slide-item'
    ];

    for (const selector of selectors) {
      const found = Array.from(document.querySelectorAll(selector)).filter(
        (el) => !el.closest(".related-content, .slideshow-card, .slideshow-thumbnail, aside")
      );
      if (found.length > 0) return found;
    }

    // Fallback: direct slide images inside <main>
    return Array.from(document.querySelectorAll('main img[src*="image.slidesharecdn.com"]')).filter(
      (img) => !img.closest(".related-content, .slideshow-card, .slideshow-thumbnail, aside")
    );
  }

  function getSlideShareImageCandidates(container, preloadInfo) {
    const candidates = [];
    const addCandidate = (url) => {
      if (url && typeof url === "string" && url.startsWith("http") && !candidates.includes(url)) {
        candidates.push(url);
      }
    };

    const img = container.tagName === "IMG" ? container : container.querySelector("img");
    const sources = container.tagName === "IMG" ? [] : Array.from(container.querySelectorAll("source"));

    // 1. Collect all srcset URLs (highest width first)
    const srcsetUrls = [];
    sources.forEach((source) => {
      srcsetUrls.push(...parseSrcsetDescending(source.getAttribute("srcset")));
    });
    if (img) {
      srcsetUrls.push(...parseSrcsetDescending(img.getAttribute("srcset")));
      srcsetUrls.push(...parseSrcsetDescending(img.getAttribute("data-srcset")));
    }

    // Determine primary raw URL to derive HD CDN variants
    const rawUrl = srcsetUrls[0]
      || (img && (img.currentSrc || img.getAttribute("data-full") || img.getAttribute("data-src") || img.getAttribute("src")))
      || "";

    // 2. If it matches SlideShare's CDN pattern, prioritize 2048px HD (matching preload quality first)
    const match = rawUrl.match(SLIDESHARE_CDN_RE);
    if (match) {
      const [, base, quality, prefix, slideNum, , ext, query = ""] = match;
      if (preloadInfo && preloadInfo.quality && preloadInfo.width >= 1024) {
        addCandidate(`${base}/${preloadInfo.quality}/${prefix}-${slideNum}-${preloadInfo.width}.${preloadInfo.ext || ext}${query}`);
      }
      addCandidate(`${base}/75/${prefix}-${slideNum}-2048.${ext}${query}`);
      addCandidate(`${base}/${quality}/${prefix}-${slideNum}-2048.${ext}${query}`);
      addCandidate(`${base}/75/${prefix}-${slideNum}-1024.${ext}${query}`);
      addCandidate(`${base}/${quality}/${prefix}-${slideNum}-1024.${ext}${query}`);
      addCandidate(`${base}/85/${prefix}-${slideNum}-638.${ext}${query}`);
      addCandidate(`${base}/${quality}/${prefix}-${slideNum}-638.${ext}${query}`);
    }

    // 3. Add parsed srcset URLs and original src as guaranteed fallbacks
    srcsetUrls.forEach(addCandidate);
    if (img) {
      addCandidate(img.currentSrc);
      addCandidate(img.getAttribute("data-full"));
      addCandidate(img.getAttribute("data-src"));
      addCandidate(img.getAttribute("src"));
    }

    return candidates;
  }

  function parseContainerAspectRatio(container) {
    if (!container) return null;
    const inlineRatio = container.style && container.style.aspectRatio;
    if (inlineRatio && inlineRatio.includes("/")) {
      const parts = inlineRatio.split("/").map((n) => parseFloat(n.trim()));
      if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
        return { width: parts[0], height: parts[1] };
      }
    }
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { width: rect.width, height: rect.height };
    }
    return null;
  }

  function loadImageWithTimeout(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const testImg = new Image();
      let settled = false;

      const finish = (fn, val) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        testImg.onload = null;
        testImg.onerror = null;
        fn(val);
      };

      const timer = setTimeout(() => {
        finish(reject, new Error("Image load timeout"));
      }, timeoutMs);

      testImg.onload = () => {
        if (testImg.naturalWidth > 0 && testImg.naturalHeight > 0) {
          finish(resolve, {
            url,
            width: testImg.naturalWidth,
            height: testImg.naturalHeight
          });
        } else {
          finish(reject, new Error("Empty image dimensions"));
        }
      };

      testImg.onerror = () => {
        finish(reject, new Error("Image failed to load"));
      };

      testImg.decoding = "async";
      testImg.src = url;
    });
  }

  async function loadBestSlideImage(candidates, timeoutMs) {
    for (const url of candidates) {
      if (isCancelled) return null;
      try {
        return await loadImageWithTimeout(url, timeoutMs);
      } catch (err) {
        // Try next lower resolution fallback
      }
    }
    return null;
  }

  async function scrollThroughSlideShareSlides(scrollDelayMs) {
    let scrolledCount = 0;
    let stableRounds = 0;
    let lastTotalSlides = -1;

    while (stableRounds < 2) {
      const slideElements = getSlideShareContainers();
      const totalSlides = slideElements.length;

      if (totalSlides === 0) {
        throw new Error("No slides detected. Open a SlideShare presentation page and try again.");
      }

      if (totalSlides === lastTotalSlides) {
        stableRounds++;
      } else {
        stableRounds = 0;
        lastTotalSlides = totalSlides;
      }

      updateOverlay(
        "Scanning slides...",
        "Discovering all slides in this SlideShare presentation.",
        scrolledCount,
        totalSlides,
        true,
        "Slide"
      );
      safeSendMessage({ action: "PROGRESS", status: "scrolling", current: scrolledCount, total: totalSlides, unit: "Slide" });

      for (let i = scrolledCount; i < totalSlides; i++) {
        if (isCancelled) return [];
        slideElements[i].scrollIntoView({ behavior: "instant", block: "center" });
        await new Promise((resolve) => setTimeout(resolve, scrollDelayMs));
        if (isCancelled) return [];

        if ((i + 1) % 4 === 0 || i === totalSlides - 1) {
          updateOverlay(
            "Scanning slides...",
            "Discovering all slides in this SlideShare presentation.",
            i + 1,
            totalSlides,
            true,
            "Slide"
          );
          safeSendMessage({ action: "PROGRESS", status: "scrolling", current: i + 1, total: totalSlides, unit: "Slide" });
        }
      }

      scrolledCount = totalSlides;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    return getSlideShareContainers();
  }

  function getSlideShareTitle() {
    const heading = document.querySelector('[data-cy="metadata"] h1, main h1, h1');
    if (heading && heading.textContent && heading.textContent.trim()) {
      return heading.textContent.trim();
    }
    const metaTitle = document.querySelector('meta[name="title"]');
    if (metaTitle && metaTitle.content && metaTitle.content.trim()) {
      return metaTitle.content.trim();
    }
    return document.title.replace(/\s*\|\s*(?:PPTX?|PDF|DOCX?|Slideshare).*$/i, "").trim() || "SlideShare Presentation";
  }

  function computeSlideSharePaperSize(slides) {
    let refWidth = 720;
    let refHeight = 540;

    for (const slide of slides) {
      if (slide && slide.width > 0 && slide.height > 0) {
        refWidth = slide.width;
        refHeight = slide.height;
        break;
      }
    }

    const ratio = refWidth / refHeight;
    if (ratio >= 1) {
      // Landscape presentation (e.g., 4:3 -> 10in x 7.5in, 16:9 -> 10in x 5.625in)
      const widthInches = 10;
      const heightInches = widthInches / ratio;
      return { widthInches, heightInches };
    } else {
      // Portrait document/infographic (e.g., A4 -> 8.27in x 11.69in)
      const widthInches = 8.27;
      const heightInches = widthInches / ratio;
      return { widthInches, heightInches };
    }
  }

  async function runSlideShareDownloader(scrollDelayMs) {
    const initialScrollY = window.scrollY;
    const originalTitle = document.title;

    try {
      isCancelled = false;
      updateOverlay("Getting things ready...", "Connecting to the SlideShare presentation.", 0, 100, false);

      // 1. Scroll through the presentation to ensure all lazy-loaded slides appear
      const containers = await scrollThroughSlideShareSlides(scrollDelayMs);
      if (!containers || containers.length === 0 || isCancelled) {
        removeOverlay();
        window.scrollTo(0, initialScrollY);
        return;
      }

      // 2. Build high-resolution image candidate lists for every slide
      const preloadInfo = getSlideSharePreloadInfo();
      const slideTasks = containers.map((container, index) => ({
        index,
        candidates: getSlideShareImageCandidates(container, preloadInfo),
        fallbackRatio: parseContainerAspectRatio(container)
      }));

      // 3. Load HD slide images in concurrent batches
      const totalSlides = slideTasks.length;
      const results = new Array(totalSlides).fill(null);
      let loadedCount = 0;
      const concurrency = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.SLIDESHARE_LOAD_CONCURRENCY) || 6;
      const timeoutMs = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.SLIDESHARE_IMAGE_LOAD_TIMEOUT_MS) || 12000;

      updateOverlay(
        "Loading high-res slides...",
        "Fetching crisp slide images for PDF export.",
        0,
        totalSlides,
        true,
        "Slide"
      );
      safeSendMessage({ action: "PROGRESS", status: "loading_slides", current: 0, total: totalSlides, unit: "Slide" });

      let cursor = 0;
      const worker = async () => {
        while (cursor < totalSlides && !isCancelled) {
          const taskIndex = cursor++;
          const task = slideTasks[taskIndex];
          const loaded = await loadBestSlideImage(task.candidates, timeoutMs);
          if (isCancelled) return;

          if (loaded) {
            results[taskIndex] = loaded;
          } else if (task.candidates.length > 0) {
            results[taskIndex] = {
              url: task.candidates[task.candidates.length - 1],
              width: task.fallbackRatio ? task.fallbackRatio.width : 720,
              height: task.fallbackRatio ? task.fallbackRatio.height : 540
            };
          }

          loadedCount++;
          updateOverlay(
            "Loading high-res slides...",
            "Fetching crisp slide images for PDF export.",
            loadedCount,
            totalSlides,
            true,
            "Slide"
          );
          safeSendMessage({ action: "PROGRESS", status: "loading_slides", current: loadedCount, total: totalSlides, unit: "Slide" });
        }
      };

      const workers = Array.from({ length: Math.min(concurrency, totalSlides) }, () => worker());
      await Promise.all(workers);

      if (isCancelled) {
        removeOverlay();
        window.scrollTo(0, initialScrollY);
        return;
      }

      const validSlides = results.filter(Boolean);
      if (validSlides.length === 0) {
        throw new Error("Could not load any slide images from this presentation.");
      }

      // 4. Build dedicated print-only container and print CSS
      updateOverlay("Preparing the layout...", "Formatting slides for clean full-bleed PDF pages.", 100, 100, false);
      safeSendMessage({ action: "PROGRESS", status: "rendering" });

      const paperSize = computeSlideSharePaperSize(validSlides);
      const printContainer = buildSlideSharePrintContainer(validSlides, paperSize);

      // Ensure every DOM <img> inside the print container is decoded before printing
      const domImages = Array.from(printContainer.querySelectorAll("img"));
      await Promise.all(
        domImages.map((imgEl) => {
          if (typeof imgEl.decode === "function") {
            return imgEl.decode().catch(() => {});
          }
          return Promise.resolve();
        })
      );

      if (isCancelled) {
        restorePage();
        removeOverlay();
        window.scrollTo(0, initialScrollY);
        return;
      }

      window.scrollTo(0, 0);

      updateOverlay("Print dialog is ready", "Choose “Save as PDF” as the destination to save your presentation.", 100, 100, false);
      safeSendMessage({ action: "PROGRESS", status: "printing" });

      setTimeout(() => {
        if (isCancelled) {
          restorePage();
          removeOverlay();
          window.scrollTo(0, initialScrollY);
          return;
        }

        document.title = getSlideShareTitle();
        window.print();

        // Restore page state after print dialog closes
        document.title = originalTitle;
        restorePage();
        window.scrollTo(0, initialScrollY);
        safeSendMessage({ action: "PROGRESS", status: "completed" });

        updateOverlay("PDF is ready", "Restoring the SlideShare page...", 100, 100, false);
        const btnContainer = document.getElementById("sd-btn-container");
        if (btnContainer) btnContainer.innerHTML = "";
        setTimeout(() => {
          removeOverlay();
        }, 2200);
      }, 450);

    } catch (error) {
      document.title = originalTitle;
      restorePage();
      if (!isCancelled) {
        safeSendMessage({ action: "ERROR", message: error.message });
        showOverlayError(error.message);
      }
    }
  }

  function buildSlideSharePrintContainer(slides, paperSize) {
    const existingContainer = document.getElementById("sd-slideshare-print-container");
    if (existingContainer) existingContainer.remove();

    const existingStyle = document.getElementById("sd-slideshare-print-styles");
    if (existingStyle) existingStyle.remove();

    const widthIn = `${paperSize.widthInches.toFixed(3)}in`;
    const heightIn = `${paperSize.heightInches.toFixed(3)}in`;

    const style = document.createElement("style");
    style.id = "sd-slideshare-print-styles";
    style.textContent = `
      #sd-slideshare-print-container {
        display: none;
      }

      @media print {
        @page {
          size: ${widthIn} ${heightIn};
          margin: 0;
        }

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          overflow: visible !important;
          height: auto !important;
          min-height: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body > *:not(#sd-slideshare-print-container) {
          display: none !important;
          visibility: hidden !important;
        }

        #sd-slideshare-print-container {
          display: block !important;
          visibility: visible !important;
          position: static !important;
          margin: 0 !important;
          padding: 0 !important;
          width: ${widthIn} !important;
          background: #ffffff !important;
        }

        .sd-ss-print-slide {
          width: ${widthIn} !important;
          height: ${heightIn} !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          background: #ffffff !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          break-after: page !important;
          page-break-after: always !important;
        }

        .sd-ss-print-slide:last-child {
          break-after: avoid !important;
          page-break-after: avoid !important;
        }

        .sd-ss-print-slide img {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          object-fit: contain !important;
          display: block !important;
          opacity: 1 !important;
          visibility: visible !important;
          position: static !important;
        }
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement("div");
    container.id = "sd-slideshare-print-container";

    slides.forEach((slide, idx) => {
      const page = document.createElement("div");
      page.className = "sd-ss-print-slide";

      const img = document.createElement("img");
      img.src = slide.url;
      img.alt = `Slide ${idx + 1}`;
      img.decoding = "sync";
      img.loading = "eager";

      page.appendChild(img);
      container.appendChild(page);
    });

    document.body.appendChild(container);
    return container;
  }

  /* ============================================================
     5. Download Progress Overlay
     ============================================================ */

  function createOverlay() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "scribd-downloader-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(20, 45, 29, 0.42);
      backdrop-filter: blur(8px);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #173323;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #dce9df; border-radius: 18px; padding: 32px 28px; width: 380px; max-width: 90vw; box-shadow: 0 25px 50px -12px rgba(20, 55, 32, 0.24); display: flex; flex-direction: column; align-items: center; text-align: center;">
        <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #1a9856 0%, #147a49 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; box-shadow: 0 4px 14px rgba(22, 131, 74, 0.24);">
          <svg style="width: 22px; height: 22px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div style="font-size: 17px; font-weight: 700; margin-bottom: 6px; color: #173323;">Preparing your PDF</div>
        <div id="sd-overlay-status" style="font-size: 13.5px; font-weight: 600; margin-bottom: 4px; color: #277849;">Getting things ready...</div>
        <div id="sd-overlay-detail" style="font-size: 12px; color: #607969; margin-bottom: 20px; line-height: 1.4;">Connecting to the document.</div>

        <div style="width: 100%; height: 8px; background: #e7f0e9; border: 1px solid #dce9df; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
          <div id="sd-overlay-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #21a65b 0%, #73c98e 100%); border-radius: 6px; transition: width 0.2s; box-shadow: 0 0 10px rgba(33, 166, 91, 0.25);"></div>
        </div>
        <div style="width: 100%; display: flex; justify-content: space-between; font-size: 11px; font-weight: 600;">
          <span id="sd-overlay-percent" style="color: #16834a;">0%</span>
          <span id="sd-overlay-count" style="color: #607969; font-weight: 500;">0 / 0</span>
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
        isCancelled = true;
        removeOverlay();
        restorePage();
        safeSendMessage({ action: "CANCELLED" });
        const urlParams = new URLSearchParams(window.location.search);
        const originalUrl = urlParams.get("original_url");
        if (originalUrl) {
          window.location.href = decodeURIComponent(originalUrl);
        }
      };
    }
  }

  function updateOverlay(status, detail, current, total, showCount = true, unit = "Page") {
    createOverlay();
    const statusEl = document.getElementById("sd-overlay-status");
    const detailEl = document.getElementById("sd-overlay-detail");
    const fillEl = document.getElementById("sd-overlay-fill");
    const percentEl = document.getElementById("sd-overlay-percent");
    const countEl = document.getElementById("sd-overlay-count");

    if (status) statusEl.innerText = status;
    if (detail) detailEl.innerText = detail;

    if (current !== undefined && total !== undefined) {
      const percent = Math.round((current / total) * 100) || 0;
      fillEl.style.width = `${percent}%`;
      percentEl.innerText = `${percent}%`;
      if (showCount) {
        countEl.innerText = `${unit} ${current} / ${total}`;
      } else {
        countEl.innerText = "";
      }
    }
  }

  function showOverlayError(errMessage) {
    createOverlay();
    const statusEl = document.getElementById("sd-overlay-status");
    const detailEl = document.getElementById("sd-overlay-detail");
    const fillEl = document.getElementById("sd-overlay-fill");
    const btnContainer = document.getElementById("sd-btn-container");

    statusEl.innerText = "Could not prepare the PDF";
    detailEl.innerText = errMessage || "Something went wrong. Please try again.";
    fillEl.style.background = "#ef4444";
    fillEl.style.boxShadow = "0 0 8px rgba(239, 68, 68, 0.4)";

    if (btnContainer) {
      btnContainer.innerHTML = "";
      const actionBtn = document.createElement("button");
      const urlParams = new URLSearchParams(window.location.search);
      const originalUrl = urlParams.get("original_url");
      actionBtn.innerText = originalUrl ? "Return to Scribd" : "Close";
      actionBtn.style.cssText = `
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
      actionBtn.onclick = () => {
        removeOverlay();
        if (originalUrl) {
          window.location.href = decodeURIComponent(originalUrl);
        }
      };
      btnContainer.appendChild(actionBtn);
    }
  }

  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  // Auto-start check when script loads in Scribd embed context
  const urlParams = new URLSearchParams(window.location.search);
  if (isScribdHost() && urlParams.get("start_download") === "true") {
    const scrollDelay = parseInt(urlParams.get("scroll_delay"), 10) || 150;
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
