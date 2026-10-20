document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-btn");
  const delayRange = document.getElementById("delay-range");
  const delayValue = document.getElementById("delay-value");
  const pulseDot = document.getElementById("pulse-dot");
  const statusText = document.getElementById("status-text");
  const statusDetail = document.getElementById("status-detail");
  const progressContainer = document.getElementById("progress-container");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const progressPercent = document.getElementById("progress-percent");
  const progressCount = document.getElementById("progress-count");

  // Domain warning elements
  const domainWarningBox = document.getElementById("domain-warning-box");
  const downloadControls = document.getElementById("download-controls");
  const currentDomainBadge = document.getElementById("current-domain-badge");
  const openScribdBtn = document.getElementById("open-scribd-btn");

  let activeTabId = null;

  // Helper functions for domain checking
  function getHostname(urlString) {
    try {
      return new URL(urlString).hostname;
    } catch (e) {
      return "";
    }
  }

  function isScribdDomain(urlString) {
    try {
      const hostname = new URL(urlString).hostname.toLowerCase();
      return hostname === "scribd.com" || hostname.endsWith(".scribd.com");
    } catch (e) {
      return false;
    }
  }

  function isScribdDocument(urlString) {
    return isScribdDomain(urlString) && (
      urlString.includes("/document/") || 
      urlString.includes("/doc/") || 
      urlString.includes("/embed")
    );
  }

  // 1. Sync delay slider with displayed text value
  delayRange.addEventListener("input", (e) => {
    delayValue.innerText = `${e.target.value}ms`;
  });
  // 2. Check if active tab is on Scribd domain and document page
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) return;
      
      activeTabId = activeTab.id;
      const url = activeTab.url || "";
      const hostname = getHostname(url);
      const isScribd = isScribdDomain(url);
      const isDoc = isScribdDocument(url);

      if (!isScribd) {
        // Current domain does NOT match Scribd -> show dedicated navigation UI
        domainWarningBox.classList.remove("hidden");
        downloadControls.classList.add("hidden");

        if (hostname) {
          currentDomainBadge.innerText = hostname;
        } else if (url.startsWith("chrome://") || url.startsWith("edge://")) {
          currentDomainBadge.innerText = "Browser Internal Page";
        } else {
          currentDomainBadge.innerText = "Non-Scribd Site";
        }
        return;
      }

      // On Scribd domain! Show download controls
      domainWarningBox.classList.add("hidden");
      downloadControls.classList.remove("hidden");

      if (!isDoc) {
        // On Scribd, but not a document page yet
        startButton.disabled = true;
        startButton.querySelector(".btn-text").innerText = "Open a document";
        statusText.innerText = "Choose a Scribd document";
        statusDetail.innerText = "Open a document or presentation on Scribd to prepare a PDF.";
        pulseDot.className = "pulse-dot active";
      } else {
        // On valid document page!
        startButton.disabled = false;
        startButton.querySelector(".btn-text").innerText = "Prepare PDF";
        statusText.innerText = "Ready when you are";
        statusDetail.innerText = "Your Scribd document is ready to be prepared as a PDF.";
        pulseDot.className = "pulse-dot idle";
      }
    });
  }

  // 3. Handle navigation to Scribd when user is on unsupported domain
  if (openScribdBtn) {
    openScribdBtn.addEventListener("click", () => {
      const targetUrl = "https://www.scribd.com";
      if (typeof chrome !== "undefined" && chrome.tabs) {
        if (activeTabId) {
          chrome.tabs.get(activeTabId, (tab) => {
            const currentUrl = tab ? (tab.url || "") : "";
            if (currentUrl.startsWith("chrome://") || currentUrl.startsWith("edge://") || currentUrl.startsWith("about:")) {
              chrome.tabs.create({ url: targetUrl });
            } else {
              chrome.tabs.update(activeTabId, { url: targetUrl });
            }
            window.close();
          });
        } else {
          chrome.tabs.create({ url: targetUrl });
          window.close();
        }
      } else {
        window.open(targetUrl, "_blank");
      }
    });
  }

  // 4. Handle free download action
  function startDownload(tabOrId) {
    const handleTab = async (tab) => {
      if (!tab) return;
      const tabId = tab.id;
      const url = tab.url || "";
      const match = url.match(/https?:\/\/(?:[^/]+\.)?scribd\.com\/(?:document|doc)\/(\d+)/);

      if (match) {
        // Redirect to embed view and start the free download automatically.
        const docId = match[1];
        const scrollDelay = parseInt(delayRange.value, 10);
        const embedUrl = `https://www.scribd.com/embeds/${docId}/content?start_download=true&scroll_delay=${scrollDelay}&original_url=${encodeURIComponent(url)}&doc_title=${encodeURIComponent(tab.title || "")}`;
        chrome.tabs.update(tabId, { url: embedUrl });
        window.close();
        return;
      }

      // If it's already an embed page, run the normal communication flow
      startButton.disabled = true;
      startButton.querySelector(".btn-text").innerText = "Preparing...";
      progressContainer.classList.remove("hidden");
      progressBarFill.style.width = "0%";
      progressPercent.innerText = "0%";
      progressCount.innerText = "Getting started...";

      pulseDot.className = "pulse-dot active";
      statusText.innerText = "Starting preparation";
      statusDetail.innerText = "Connecting to the Scribd document...";

      const scrollDelay = parseInt(delayRange.value, 10);

      chrome.tabs.sendMessage(tabId, { action: "START_DOWNLOAD", scrollDelay }, (response) => {
        if (chrome.runtime.lastError) {
          statusText.innerText = "Refresh required";
          statusDetail.innerText = "Refresh this Scribd tab, then click Prepare PDF again.";
          pulseDot.className = "pulse-dot error";

          startButton.disabled = false;
          startButton.querySelector(".btn-text").innerText = "Prepare PDF";
          progressContainer.classList.add("hidden");
        }
      });
    };

    if (tabOrId && typeof tabOrId === "object" && tabOrId.id) {
      return handleTab(tabOrId);
    } else if (tabOrId) {
      return new Promise((resolve) => chrome.tabs.get(tabOrId, (t) => resolve(handleTab(t))));
    } else {
      return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]) resolve(handleTab(tabs[0]));
          else resolve();
        });
      });
    }
  }

  startButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        startDownload(tabs[0]);
      } else if (activeTabId) {
        startDownload(activeTabId);
      }
    });
  });

  // 5. Listen for progress updates from the content script (used if popup stays open on embed pages)
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // ONLY process progress updates for the active tab currently viewed in this popup!
      // This prevents downloads running in other tabs from displaying their progress in Tab 2's popup.
      if (sender && sender.tab && sender.tab.id && activeTabId && sender.tab.id !== activeTabId) {
        return;
      }
      if (message.action === "PROGRESS") {
        updateUI(message);
      } else if (message.action === "ERROR") {
        handleError(message.message);
      }
    });
  }

  function updateUI(msg) {
    if (msg.status === "scrolling") {
      pulseDot.className = "pulse-dot active";
      statusText.innerText = "Loading document pages...";
      statusDetail.innerText = "Moving through the document so each page can finish loading.";
      
      const percent = Math.round((msg.current / msg.total) * 100) || 0;
      progressBarFill.style.width = `${percent}%`;
      progressPercent.innerText = `${percent}%`;
      progressCount.innerText = `Page ${msg.current} / ${msg.total}`;
    } 
    else if (msg.status === "rendering") {
      pulseDot.className = "pulse-dot active";
      statusText.innerText = "Preparing the layout...";
      statusDetail.innerText = "Making sure text, diagrams, and page layouts are ready to print.";
      
      progressBarFill.style.width = "95%";
      progressPercent.innerText = "95%";
      progressCount.innerText = "Setting up page layout...";
    } 
    else if (msg.status === "printing") {
      pulseDot.className = "pulse-dot active";
      statusText.innerText = "Print dialog is ready";
      statusDetail.innerText = "Choose “Save as PDF” as the destination to save your document.";
      
      progressBarFill.style.width = "100%";
      progressPercent.innerText = "100%";
      progressCount.innerText = "Print dialog opened";
    } 
    else if (msg.status === "completed") {
      pulseDot.className = "pulse-dot success";
      statusText.innerText = "PDF is ready";
      statusDetail.innerText = "Page layout restored. You can start another document whenever you like.";
      
      startButton.disabled = false;
      startButton.querySelector(".btn-text").innerText = "Prepare PDF";
    }
  }

  function handleError(errMessage) {
    pulseDot.className = "pulse-dot error";
    statusText.innerText = "Could not prepare the PDF";
    statusDetail.innerText = errMessage || "Something went wrong. Please try again.";
    
    startButton.disabled = false;
    startButton.querySelector(".btn-text").innerText = "Try again";
  }

  // 6. Bind APP_CONFIG dynamically to HTML elements
  if (typeof APP_CONFIG !== "undefined") {
    const versionEl = document.getElementById("app-version");
    if (versionEl && APP_CONFIG.VERSION) versionEl.innerText = `v${APP_CONFIG.VERSION}`;

    if (APP_CONFIG.DEFAULT_SCROLL_DELAY_MS && delayRange && delayValue) {
      delayRange.value = APP_CONFIG.DEFAULT_SCROLL_DELAY_MS;
      delayValue.innerText = `${APP_CONFIG.DEFAULT_SCROLL_DELAY_MS}ms`;
    }

    const projectLink = document.getElementById("btn-rate");
    if (projectLink && APP_CONFIG.PROJECT_URL) {
      projectLink.setAttribute("href", APP_CONFIG.PROJECT_URL);
    }

  }

  // 7. Open footer links safely in a new tab
  document.querySelectorAll(".footer-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const url = link.getAttribute("href");
      if (url && url !== "#") {
        if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url });
        } else {
          window.open(url, "_blank");
        }
      }
    });
  });

});
