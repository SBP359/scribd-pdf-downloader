/**
 * Scribd Downloader - Telemetry & Analytics Client Tracker
 * Records anonymous usage events to help improve the extension experience.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ExtensionTracker = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const EXTENSION_ID = "scribd-downloader";
  const DEFAULT_VERSION = "1.0.0";
  const USER_ID_KEY = "scribd_user_id";

  let cachedUserId = null;

  function getApiEndpoint() {
    const baseUrl = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.API_BASE_URL) || "https://anytools.online";
    return `${baseUrl}/api/telemetry/event`;
  }

  function getLocalEndpoint() {
    const localUrl = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.API_LOCAL_URL) || "http://localhost:3000";
    return `${localUrl}/api/telemetry/event`;
  }

  function getVersion() {
    if (typeof APP_CONFIG !== "undefined" && APP_CONFIG.VERSION) {
      return APP_CONFIG.VERSION;
    }
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
      try {
        return chrome.runtime.getManifest().version;
      } catch (_) {}
    }
    return DEFAULT_VERSION;
  }

  function detectBrowser() {
    if (typeof navigator === "undefined") return "chrome";
    const ua = navigator.userAgent || "";
    if (ua.includes("Edg/")) return "edge";
    if (ua.includes("Brave") || (navigator.brave && typeof navigator.brave.isBrave === "function")) return "brave";
    if (ua.includes("OPR/") || ua.includes("Opera")) return "opera";
    if (ua.includes("Chrome")) return "chrome";
    return "other";
  }

  async function getAnonymousUserId() {
    if (cachedUserId) return cachedUserId;

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([USER_ID_KEY, "anytools_uid"], (res) => {
          if (res && res[USER_ID_KEY]) {
            cachedUserId = res[USER_ID_KEY];
            resolve(cachedUserId);
          } else if (res && res["anytools_uid"]) {
            cachedUserId = res["anytools_uid"];
            chrome.storage.local.set({ [USER_ID_KEY]: cachedUserId });
            resolve(cachedUserId);
          } else {
            const newUid = `usr_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
            chrome.storage.local.set({ [USER_ID_KEY]: newUid });
            cachedUserId = newUid;
            resolve(newUid);
          }
        });
      });
    }

    if (typeof localStorage !== "undefined") {
      let localId = localStorage.getItem(USER_ID_KEY);
      if (!localId) {
        localId = `usr_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
        localStorage.setItem(USER_ID_KEY, localId);
      }
      cachedUserId = localId;
      return localId;
    }

    cachedUserId = `usr_${Math.random().toString(36).substring(2, 10)}`;
    return cachedUserId;
  }

  /**
   * Send a usage event to the telemetry service.
   * @param {string} action Event name, such as POPUP_OPENED.
   * @param {object} properties Additional event metadata.
   */
  async function track(action, properties = {}) {
    try {
      if (!action) return;
      const userId = await getAnonymousUserId();
      const endpoint = getApiEndpoint();

      const docIdHash = properties.docIdHash || properties.docId || properties.documentId || "unknown_doc";
      const docTitle = properties.docTitle || properties.documentTitle || (typeof document !== "undefined" ? document.title : "");

      const payload = {
        extensionId: EXTENSION_ID,
        extensionVersion: getVersion(),
        action: String(action).toUpperCase(),
        clientUserId: userId,
        docIdHash: String(docIdHash).slice(0, 100),
        docTitle: String(docTitle).slice(0, 300),
        elapsedSeconds: typeof properties.elapsedSeconds === "number" ? properties.elapsedSeconds : undefined,
        browser: detectBrowser(),
        downloadType: properties.downloadType || "free",
        meta: {
          ...properties,
          clientTime: new Date().toISOString(),
          pageUrl: typeof location !== "undefined" ? location.pathname : "",
        },
      };

      const jsonStr = JSON.stringify(payload);

      // Prefer navigator.sendBeacon when supported.
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        try {
          const blob = new Blob([jsonStr], { type: "application/json" });
          const sent = navigator.sendBeacon(endpoint, blob);
          if (sent) return;
        } catch (_) {}
      }

      // Fall back to fetch with keepalive.
      const fetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonStr,
        keepalive: true,
      };

      fetch(endpoint, fetchOptions).catch(() => {
        // Fallback local dev server if on http or dev
        if (typeof location !== "undefined" && location.protocol !== "https:") {
          fetch(getLocalEndpoint(), fetchOptions).catch(() => {});
        }
      });
    } catch (err) {
      // Telemetry failures must not interrupt the extension.
      console.debug("[Scribd Tracker] Ignored telemetry error:", err);
    }
  }

  return {
    track,
    getAnonymousUserId,
    detectBrowser,
  };
});
