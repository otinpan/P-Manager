"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // types.ts
  var init_types = __esm({
    "types.ts"() {
      "use strict";
    }
  });

  // content/shared/extension-panel-view.ts
  function ensureExtensionPanel(options) {
    ensureExtensionPanelStyle(options);
    hideReopenButton(options.sidebarId);
    let sidebar = document.getElementById(options.sidebarId);
    if (!sidebar) {
      sidebar = document.createElement("aside");
      sidebar.id = options.sidebarId;
      sidebar.innerHTML = `
      <div class="${RESIZE_HANDLE_CLASS}" aria-hidden="true"></div>
      <header>
        <h2>${options.title}</h2>
        <button class="${CLOSE_BUTTON_CLASS}" type="button" aria-label="Close panel">\xD7</button>
      </header>
      <section class="${PANEL_BODY_CLASS}"></section>
    `;
      document.body.appendChild(sidebar);
    }
    const width = getSavedWidth(options.storageKey, options.defaultWidth ?? 320);
    const minWidth = options.minWidth ?? 260;
    const maxWidth = options.maxWidth ?? 700;
    sidebar.style.width = `${clamp(width, minWidth, maxWidth)}px`;
    initResizeBehavior(sidebar, options);
    initCloseBehavior(sidebar, options);
    const body = sidebar.querySelector(`.${PANEL_BODY_CLASS}`);
    if (!body) {
      throw new Error("failed to initialize extension panel body");
    }
    return body;
  }
  function removeExtensionPanel(sidebarId) {
    const sidebar = document.getElementById(sidebarId);
    sidebar?.remove();
  }
  function removeExtensionPanelLauncher(sidebarId) {
    const reopenButton = document.getElementById(getReopenButtonId(sidebarId));
    reopenButton?.remove();
  }
  function ensureExtensionPanelStyle(options) {
    if (document.getElementById(options.styleId)) return;
    const style = document.createElement("style");
    style.id = options.styleId;
    style.textContent = `
    #${options.sidebarId} {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 999998;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      border-left: 1px solid #cbd5e1;
      box-shadow: -8px 0 20px rgba(15, 23, 42, 0.18);
      font-family: "Segoe UI", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
    }

    #${options.sidebarId} > header {
      border-bottom: 1px solid #e2e8f0;
      background: #f1f5f9;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    #${options.sidebarId} > header > h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    #${options.sidebarId} .${CLOSE_BUTTON_CLASS} {
      border: 1px solid #cbd5e1;
      border-radius: 9999px;
      width: 24px;
      height: 24px;
      padding: 0;
      line-height: 1;
      font-size: 16px;
      color: #334155;
      background: #ffffff;
      cursor: pointer;
    }

    #${options.sidebarId} .${CLOSE_BUTTON_CLASS}:hover {
      background: #e2e8f0;
    }

    .${REOPEN_BUTTON_CLASS} {
      position: fixed;
      right: 10px;
      top: 10%;
      transform: translateY(-50%);
      z-index: 999997;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
      cursor: pointer;
    }

    .${REOPEN_BUTTON_CLASS}:hover {
      background: #f1f5f9;
    }

    #${options.sidebarId} .${PANEL_BODY_CLASS} {
      flex: 1;
      overflow: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    #${options.sidebarId} .${RESIZE_HANDLE_CLASS} {
      position: absolute;
      top: 0;
      left: -5px;
      width: 10px;
      height: 100%;
      cursor: ew-resize;
      user-select: none;
      touch-action: none;
    }

    #${options.sidebarId} .${RESIZE_HANDLE_CLASS}:hover::after {
      content: "";
      position: absolute;
      top: 0;
      left: 4px;
      width: 2px;
      height: 100%;
      background: #0ea5e9;
      opacity: 0.6;
    }
  `;
    document.head.appendChild(style);
  }
  function initResizeBehavior(sidebar, options) {
    if (sidebar.dataset.resizeReady === "1") return;
    const handle = sidebar.querySelector(`.${RESIZE_HANDLE_CLASS}`);
    if (!handle) return;
    const minWidth = options.minWidth ?? 260;
    const maxWidth = options.maxWidth ?? 700;
    let dragging = false;
    const onMouseMove = (event) => {
      if (!dragging) return;
      const width = clamp(window.innerWidth - event.clientX, minWidth, maxWidth);
      sidebar.style.width = `${width}px`;
    };
    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const currentWidth = Math.round(sidebar.getBoundingClientRect().width);
      saveWidth(options.storageKey, currentWidth);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    handle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      dragging = true;
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
    sidebar.dataset.resizeReady = "1";
  }
  function initCloseBehavior(sidebar, options) {
    if (sidebar.dataset.closeReady === "1") return;
    const closeButton = sidebar.querySelector(`.${CLOSE_BUTTON_CLASS}`);
    if (!closeButton) return;
    closeButton.addEventListener("click", () => {
      removeExtensionPanel(options.sidebarId);
      ensureReopenButton(options);
      options.onClose?.();
    });
    sidebar.dataset.closeReady = "1";
  }
  function ensureReopenButton(options) {
    if (!options.onReopen) return;
    const buttonId = getReopenButtonId(options.sidebarId);
    let button = document.getElementById(buttonId);
    if (!button) {
      button = document.createElement("button");
      button.id = buttonId;
      button.type = "button";
      button.className = REOPEN_BUTTON_CLASS;
      button.textContent = `${options.title} \u3092\u518D\u8868\u793A`;
      document.body.appendChild(button);
    }
    button.style.display = "block";
    button.onclick = () => {
      options.onReopen?.();
    };
  }
  function hideReopenButton(sidebarId) {
    const button = document.getElementById(getReopenButtonId(sidebarId));
    if (!button) return;
    button.style.display = "none";
  }
  function getReopenButtonId(sidebarId) {
    return `${sidebarId}-reopen`;
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function getSavedWidth(storageKey, fallback) {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return fallback;
      const width = Number(raw);
      if (!Number.isFinite(width)) return fallback;
      return width;
    } catch {
      return fallback;
    }
  }
  function saveWidth(storageKey, width) {
    try {
      window.localStorage.setItem(storageKey, String(width));
    } catch {
    }
  }
  var PANEL_BODY_CLASS, RESIZE_HANDLE_CLASS, CLOSE_BUTTON_CLASS, REOPEN_BUTTON_CLASS;
  var init_extension_panel_view = __esm({
    "content/shared/extension-panel-view.ts"() {
      "use strict";
      PANEL_BODY_CLASS = "p-manager-extension-panel-body";
      RESIZE_HANDLE_CLASS = "p-manager-extension-panel-resize";
      CLOSE_BUTTON_CLASS = "p-manager-extension-panel-close";
      REOPEN_BUTTON_CLASS = "p-manager-extension-panel-reopen";
    }
  });

  // content/shared/send-button-view.ts
  function buildSendButtonHtml(buttonId) {
    return `<button id="${buttonId}" type="button">\u81EA\u52D5\u751F\u6210</button>`;
  }
  function buildSendButtonCss(buttonId, baseColor, hoverColor) {
    return `
    #${buttonId} {
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      background: ${baseColor};
      cursor: pointer;
      width: 100%;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    }

    #${buttonId}:hover {
      background: ${hoverColor};
    }
  `;
  }
  var init_send_button_view = __esm({
    "content/shared/send-button-view.ts"() {
      "use strict";
    }
  });

  // content/message-module/message-thread.ts
  function safeText(el) {
    return (el?.textContent ?? "").trim();
  }
  function normalizeAge(value) {
    return value.replace(/歳$/, "").trim();
  }
  function findProfileByHeading(root) {
    const headings = Array.from(root.querySelectorAll("h2"));
    for (const h2 of headings) {
      if (safeText(h2) !== "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB") continue;
      const container = h2.closest("div");
      if (!container) continue;
      if (container.querySelector("dt") && container.querySelector("dd")) {
        return container;
      }
    }
    return null;
  }
  function extractSelfIntroductionText(container) {
    if (!container) return "";
    const p = container.querySelector("p.css-1ryh3zs") ?? container.querySelector("p");
    const pText = safeText(p);
    if (pText) return pText;
    return safeText(container);
  }
  function parseSectionMD(item) {
    const section = item.closest("section");
    if (!section) return null;
    const t = (section.querySelector("h3 time")?.textContent ?? "").trim();
    const m = t.match(/^(\d{1,2})\/(\d{1,2})/);
    if (!m) return null;
    const month = Number(m[1]);
    const day = Number(m[2]);
    if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
    return { month, day };
  }
  function inferYear(month, day) {
    const now = /* @__PURE__ */ new Date();
    const y = now.getFullYear();
    const d = new Date(y, month - 1, day, 0, 0, 0, 0);
    if (d.getTime() > now.getTime() + 12 * 60 * 60 * 1e3) {
      return y - 1;
    }
    return y;
  }
  function toEpochFromSectionAndHHMM(item, hhmm) {
    const md = parseSectionMD(item);
    if (!md) return null;
    const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const year = inferYear(md.month, md.day);
    const d = new Date(year, md.month - 1, md.day, hh, mm, 0, 0);
    return d.getTime();
  }
  function getDomId(item, idAttr) {
    if (!idAttr) return null;
    const v = item.getAttribute(idAttr);
    if (v && v.trim().length > 0) return v.trim();
    return null;
  }
  function isMine(item, sel) {
    if (sel.mineAttr?.name) {
      const v = item.getAttribute(sel.mineAttr.name);
      if (sel.mineAttr.value == null) return v != null;
      return v === sel.mineAttr.value;
    }
    if (sel.mineClass) {
      const cls = sel.mineClass.startsWith(".") ? sel.mineClass : `.${sel.mineClass}`;
      if (item.matches(cls)) return true;
      return item.querySelector(cls) != null;
    }
    return false;
  }
  function extractTimeText(item, sel) {
    if (sel.timeText) {
      const t = safeText(item.querySelector(sel.timeText));
      if (t) return t;
    }
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (walker.nextNode()) {
      const s = (walker.currentNode.nodeValue ?? "").trim();
      if (/^\d{1,2}:\d{2}$/.test(s)) hits.push(s);
    }
    if (hits.length === 0) return null;
    return hits[hits.length - 1] ?? null;
  }
  var defaultSelectors, MessageThread;
  var init_message_thread = __esm({
    "content/message-module/message-thread.ts"() {
      "use strict";
      init_types();
      init_extension_panel_view();
      init_send_button_view();
      defaultSelectors = {
        container: "main#maincontent",
        messageItem: 'li[data-test^="message-sent-time-"]',
        messageText: ".css-m2d5md",
        messageIdAttr: "data-test",
        matchName: '[data-test="header-title"] .css-8n7an',
        matchInfo: ".css-1yx6rxm",
        selfIntroduction: ".css-1x1bqz1",
        matchInfoRoot: "#dialog-root",
        mineClass: "css-1y1ka7w"
      };
      MessageThread = class {
        constructor(id, title, selectors = defaultSelectors) {
          this.id = id;
          this.title = title;
          this.selectors = selectors;
          this.observer = null;
          this.threadItems = [];
          this.seenIds = /* @__PURE__ */ new Set();
          this.matchInfo = null;
          this.matchName = null;
          this.nativeHostBody = [];
          this.recommendedStrategy = null;
          this.isMessageLoading = false;
          this.isProfileLoading = false;
          this.activePane = null;
          this.lastClosedPane = null;
          this.sendButton = null;
          this.sendMessageButtonId = "p-manager-message-send-button";
          this.sendMessageButtonStyleId = "p-manager-message-send-style";
          this.messagePanelId = "p-manager-message-panel";
          this.messagePanelStyleId = "p-manager-message-panel-style";
          this.messagePanelWidthStorageKey = "p-manager-message-panel-width";
          this.handleMutations = (mutations) => {
            for (const m of mutations) {
              for (const node of Array.from(m.addedNodes)) {
                if (!(node instanceof Element)) continue;
                const direct = node.matches?.(this.selectors.messageItem) ? [node] : [];
                const nested = Array.from(node.querySelectorAll?.(this.selectors.messageItem) ?? []);
                const candidates = [...direct, ...nested];
                for (const item of candidates) {
                  const msg = this.parseMessageItem(item);
                  if (!msg) continue;
                  if (this.seenIds.has(msg.id)) continue;
                  this.seenIds.add(msg.id);
                  this.threadItems.push(msg);
                }
              }
            }
            console.log("threadItems: ", this.threadItems);
            if (this.activePane === "message") {
              this.initMessagePane();
            }
          };
          this.init();
        }
        init() {
          this.initPageObserver();
        }
        getThreadContainer() {
          return document.querySelector(this.selectors.container);
        }
        // PageObserverの作成
        initPageObserver() {
          const targetNode = this.getThreadContainer();
          if (!targetNode) {
            setTimeout(() => this.initPageObserver(), 5e3);
            return;
          }
          targetNode.dataset.threadId = this.id;
          this.initThreadItems(targetNode);
          this.initMatchName(targetNode, 0);
          this.observer?.disconnect();
          this.observer = new MutationObserver(this.handleMutations);
          this.observer.observe(targetNode, { childList: true, subtree: true });
        }
        destroyPageObserver() {
          this.observer?.disconnect();
        }
        destroyThreadItems() {
          this.threadItems = [];
          this.seenIds.clear();
        }
        reset() {
          this.destroyPageObserver();
          this.destroyThreadItems();
          this.matchInfo = null;
          this.nativeHostBody = [];
          this.recommendedStrategy = null;
          this.isMessageLoading = false;
          this.isProfileLoading = false;
          this.destroyPane();
        }
        setNativeHostBody(body, source, recommendedStrategy) {
          if (source === "MATCH_MESSAGES" /* MATCH_MESSAGES */) {
            this.nativeHostBody.push(body);
            this.isMessageLoading = false;
          }
          if (source === "MATCH_PROFILE" /* MATCH_PROFILE */) {
            this.isProfileLoading = false;
            const direct = recommendedStrategy ?? (body && typeof body === "object" && "recommended_strategy" in body ? body.recommended_strategy : null);
            if (direct != null) {
              this.recommendedStrategy = direct;
            }
          }
          if (this.activePane === "message") {
            this.initMessagePane();
          }
          if (this.activePane === "profile") {
            this.initProfilePane();
          }
        }
        initMessagePane() {
          this.ensurePaneStyle();
          this.activePane = "message";
          const panelBody = ensureExtensionPanel({
            sidebarId: this.messagePanelId,
            styleId: this.messagePanelStyleId,
            title: "P-Manager Message",
            storageKey: this.messagePanelWidthStorageKey,
            defaultWidth: 320,
            minWidth: 260,
            maxWidth: 700,
            onClose: () => {
              this.lastClosedPane = this.activePane;
              this.sendButton = null;
              this.activePane = null;
            },
            onReopen: () => {
              if (this.lastClosedPane === "profile") {
                this.initProfilePane();
                return;
              }
              this.initMessagePane();
            }
          });
          panelBody.innerHTML = `
      <div>Message Page</div>
      <div class="p-manager-response-list"></div>
      ${buildSendButtonHtml(this.sendMessageButtonId)}
    `;
          this.renderMessageResponseCards(panelBody);
          const button = panelBody.querySelector(`#${this.sendMessageButtonId}`);
          if (!button) return;
          button.addEventListener("click", () => this.onMessageSendButtonClick());
          button.disabled = this.isMessageLoading;
          button.textContent = this.isMessageLoading ? "\u751F\u6210\u4E2D..." : "\u751F\u6210";
          this.sendButton = button;
        }
        initProfilePane() {
          this.ensurePaneStyle();
          this.activePane = "profile";
          const panelBody = ensureExtensionPanel({
            sidebarId: this.messagePanelId,
            styleId: this.messagePanelStyleId,
            title: "P-Manager Message",
            storageKey: this.messagePanelWidthStorageKey,
            defaultWidth: 320,
            minWidth: 260,
            maxWidth: 700,
            onClose: () => {
              this.lastClosedPane = this.activePane;
              this.sendButton = null;
              this.activePane = null;
            },
            onReopen: () => {
              if (this.lastClosedPane === "profile") {
                this.initProfilePane();
                return;
              }
              this.initMessagePane();
            }
          });
          panelBody.innerHTML = `
      <div>Profile Page</div>
      <div class="p-manager-response-list">
        <article class="p-manager-response-card p-manager-profile-card">
          <p class="p-manager-response-card-title">Profile</p>
          <div class="p-manager-profile-rows"></div>
        </article>
        <article class="p-manager-response-card">
          <p class="p-manager-response-card-title">Recommended Strategy</p>
          <p class="p-manager-response-card-body p-manager-strategy-body"></p>
        </article>
      </div>
      ${buildSendButtonHtml(this.sendMessageButtonId)}
    `;
          this.renderProfileSummary(panelBody);
          this.renderRecommendedStrategy(panelBody);
          const button = panelBody.querySelector(`#${this.sendMessageButtonId}`);
          if (!button) return;
          button.addEventListener("click", () => this.onProfileSendButtonClick());
          button.disabled = this.isProfileLoading;
          button.textContent = this.isProfileLoading ? "\u751F\u6210\u4E2D..." : "\u751F\u6210";
          this.sendButton = button;
        }
        ensurePaneStyle() {
          if (document.getElementById(this.sendMessageButtonStyleId)) return;
          const style = document.createElement("style");
          style.id = this.sendMessageButtonStyleId;
          style.textContent = `
      #${this.messagePanelId} pre {
        margin: 0;
        padding: 10px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        color: #0f172a;
        font-size: 12px;
        line-height: 1.4;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      #${this.messagePanelId} .p-manager-response-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #${this.messagePanelId} .p-manager-response-card {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #ffffff;
        padding: 10px;
        box-shadow: 0 1px 2px rgba(15,23,42,0.08);
      }
      #${this.messagePanelId} .p-manager-response-card-title {
        margin: 0 0 6px;
        font-size: 12px;
        font-weight: 700;
        color: #334155;
      }
      #${this.messagePanelId} .p-manager-response-card-body {
        margin: 0;
        color: #0f172a;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      #${this.messagePanelId} .p-manager-profile-rows {
        display: grid;
        gap: 6px;
      }
      #${this.messagePanelId} .p-manager-profile-row {
        display: grid;
        grid-template-columns: 170px 1fr;
        gap: 8px;
        align-items: start;
        font-size: 12px;
        line-height: 1.4;
      }
      #${this.messagePanelId} .p-manager-profile-row-label {
        color: #475569;
        font-weight: 700;
      }
      #${this.messagePanelId} .p-manager-profile-row-value {
        color: #0f172a;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      #${this.messagePanelId} .p-manager-response-card pre {
        margin: 0;
        padding: 8px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        color: #0f172a;
        font-size: 12px;
        line-height: 1.4;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      ${buildSendButtonCss(this.sendMessageButtonId, "#0d9488", "#0f766e")}
    `;
          document.head.appendChild(style);
        }
        renderMessageResponseCards(panelBody) {
          const list = panelBody.querySelector(".p-manager-response-list");
          if (!list) return;
          const cards = [];
          this.nativeHostBody.forEach((response, index) => {
            const messages = this.extractRecommendedMessages(response);
            messages.forEach((text, messageIndex) => {
              cards.push({
                title: messages.length === 1 ? `Recommended Message ${index + 1}` : `Recommended Message ${index + 1}-${messageIndex + 1}`,
                text
              });
            });
          });
          if (cards.length === 0) {
            const card = document.createElement("article");
            card.className = "p-manager-response-card";
            card.innerHTML = `
        <p class="p-manager-response-card-title">Recommended Message</p>
        <p class="p-manager-response-card-body">${this.isMessageLoading ? "recommended_message \u3092\u751F\u6210\u4E2D\u3067\u3059..." : "\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u4F5C\u3063\u3066\u3082\u3089\u3044\u307E\u3057\u3087\u3046"}</p>
      `;
            list.appendChild(card);
            return;
          }
          cards.forEach((cardData) => {
            const card = document.createElement("article");
            card.className = "p-manager-response-card";
            const title = document.createElement("p");
            title.className = "p-manager-response-card-title";
            title.textContent = cardData.title;
            const body = document.createElement("p");
            body.className = "p-manager-response-card-body";
            body.textContent = cardData.text;
            card.appendChild(title);
            card.appendChild(body);
            list.appendChild(card);
          });
        }
        renderProfileSummary(panelBody) {
          const root = panelBody.querySelector(".p-manager-profile-rows");
          if (!root) return;
          if (this.matchInfo == null) {
            const empty = document.createElement("p");
            empty.className = "p-manager-response-card-body";
            empty.textContent = "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u304C\u307E\u3060\u53D6\u5F97\u3067\u304D\u3066\u3044\u307E\u305B\u3093\u3002";
            root.appendChild(empty);
            return;
          }
          const rows = Object.entries(this.matchInfo).filter(([, value]) => value != null && String(value).trim().length > 0);
          if (rows.length === 0) {
            const empty = document.createElement("p");
            empty.className = "p-manager-response-card-body";
            empty.textContent = "\u8868\u793A\u3067\u304D\u308B\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u9805\u76EE\u304C\u3042\u308A\u307E\u305B\u3093\u3002";
            root.appendChild(empty);
            return;
          }
          rows.forEach(([key, value]) => {
            const row = document.createElement("div");
            row.className = "p-manager-profile-row";
            const label = document.createElement("div");
            label.className = "p-manager-profile-row-label";
            label.textContent = key;
            const body = document.createElement("div");
            body.className = "p-manager-profile-row-value";
            body.textContent = String(value);
            row.appendChild(label);
            row.appendChild(body);
            root.appendChild(row);
          });
        }
        renderRecommendedStrategy(panelBody) {
          const body = panelBody.querySelector(".p-manager-strategy-body");
          if (!body) return;
          if (this.recommendedStrategy == null) {
            body.textContent = this.isProfileLoading ? "recommended_strategy \u3092\u751F\u6210\u4E2D\u3067\u3059..." : "\u76F8\u624B\u306B\u3042\u3063\u305F\u6226\u7565\u3092\u8003\u3048\u307E\u3059";
            return;
          }
          if (typeof this.recommendedStrategy === "string") {
            body.textContent = this.recommendedStrategy;
            return;
          }
          body.textContent = JSON.stringify(this.recommendedStrategy, null, 2);
        }
        extractRecommendedMessages(response) {
          const source = response && typeof response === "object" && "recommended_message" in response ? response.recommended_message : null;
          if (source == null) return [];
          const flatten = (value) => {
            if (value == null) return [];
            if (typeof value === "string") {
              const trimmed = value.trim();
              return trimmed.length === 0 ? [] : [trimmed];
            }
            if (Array.isArray(value)) {
              return value.flatMap((entry) => flatten(entry));
            }
            if (typeof value === "object") {
              if ("body" in value) {
                return flatten(value.body);
              }
              return [JSON.stringify(value, null, 2)];
            }
            return [String(value)];
          };
          return flatten(source);
        }
        destroyPane() {
          this.sendButton?.remove();
          this.sendButton = null;
          this.activePane = null;
          this.lastClosedPane = null;
          removeExtensionPanel(this.messagePanelId);
          removeExtensionPanelLauncher(this.messagePanelId);
        }
        onMessageSendButtonClick() {
          if (this.isMessageLoading) return;
          this.isMessageLoading = true;
          if (this.activePane === "message") {
            this.initMessagePane();
          }
          chrome.runtime.sendMessage({
            kind: "MESSAGE_SEND_BUTTON_CLICKED",
            url: this.id,
            title: this.title,
            data: this.threadItems
          }).then((res) => {
            if (res?.ok) return;
            this.isMessageLoading = false;
            if (this.activePane === "message") {
              this.initMessagePane();
            }
          }).catch(() => {
            this.isMessageLoading = false;
            if (this.activePane === "message") {
              this.initMessagePane();
            }
          });
        }
        onProfileSendButtonClick() {
          if (this.isProfileLoading) return;
          this.isProfileLoading = true;
          if (this.activePane === "profile") {
            this.initProfilePane();
          }
          chrome.runtime.sendMessage({
            kind: "MESSAGE_PROFILE_SEND_BUTTON_CLICKED",
            url: this.id,
            title: this.title,
            data: this.matchInfo
          }).then((res) => {
            if (res?.ok) return;
            this.isProfileLoading = false;
            if (this.activePane === "profile") {
              this.initProfilePane();
            }
          }).catch(() => {
            this.isProfileLoading = false;
            if (this.activePane === "profile") {
              this.initProfilePane();
            }
          });
        }
        initThreadItems(container) {
          const items = Array.from(container.querySelectorAll(this.selectors.messageItem));
          for (const item of items) {
            const msg = this.parseMessageItem(item);
            if (!msg) continue;
            if (this.seenIds.has(msg.id)) continue;
            this.seenIds.add(msg.id);
            this.threadItems.push(msg);
          }
          console.log("threadItems: ", this.threadItems);
        }
        initMatchName(container, attempt) {
          const selector = this.selectors.matchName.startsWith(".") || this.selectors.matchName.startsWith("#") || this.selectors.matchName.includes("[") || this.selectors.matchName.includes(" ") ? this.selectors.matchName : `.${this.selectors.matchName}`;
          const item = container.querySelector(selector) ?? document.querySelector(selector);
          const name = safeText(item);
          if (!name) {
            console.log("failed to find name, attempt=", attempt);
            setTimeout(() => this.initMatchName(container, attempt + 1), 1e3);
            return;
          }
          this.matchName = name;
          console.log("matchName: ", this.matchName);
        }
        initMatchProfile(attempt) {
          if (attempt > 2) return;
          const container = this.getThreadContainer();
          console.log("start init match info");
          if (!container) {
            setTimeout(() => this.initMatchProfile(attempt + 1), 1e3);
            return;
          }
          const rootCandidates = [];
          if (this.selectors.matchInfoRoot) {
            const modalRoot = document.querySelector(this.selectors.matchInfoRoot);
            if (modalRoot) rootCandidates.push(modalRoot);
          }
          rootCandidates.push(container);
          rootCandidates.push(document);
          let selfIntroductionEl = null;
          for (const root of rootCandidates) {
            const found = root.querySelector(this.selectors.selfIntroduction);
            if (found) {
              selfIntroductionEl = found;
              break;
            }
          }
          let matchProfile = null;
          for (const root of rootCandidates) {
            const found = root.querySelector(this.selectors.matchInfo) ?? findProfileByHeading(root);
            if (found) {
              matchProfile = found;
              break;
            }
          }
          if (!matchProfile) {
            console.log("failed to capture profile");
            setTimeout(() => this.initMatchProfile(attempt + 1), 1e3);
            return;
          }
          const rows = Array.from(matchProfile.querySelectorAll("dt"));
          const kv = {};
          for (const dt of rows) {
            const dd = dt.nextElementSibling;
            if (!(dd instanceof HTMLElement) || dd.tagName !== "DD") continue;
            const key = safeText(dt);
            const value = safeText(dd);
            if (!key || !value) continue;
            kv[key] = value;
          }
          this.matchInfo = {
            name: kv["\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0"] ?? this.matchName ?? this.title,
            age: normalizeAge(kv["\u5E74\u9F62"] ?? ""),
            selfIntroduction: extractSelfIntroductionText(selfIntroductionEl),
            height: kv["\u8EAB\u9577"],
            figure: kv["\u4F53\u578B"],
            residence: kv["\u5C45\u4F4F\u5730"],
            hometown: kv["\u51FA\u8EAB\u5730"],
            educationalBackground: kv["\u5B66\u6B74"],
            maritalStatus: kv["\u7D50\u5A5A\u6B74"],
            hasKids: kv["\u5B50\u4F9B\u306E\u6709\u7121"],
            marriageIntention: kv["\u7D50\u5A5A\u306B\u5BFE\u3059\u308B\u610F\u601D"],
            kidsIntention: kv["\u5B50\u4F9B\u304C\u6B32\u3057\u3044\u304B"],
            houseworkAndChildcare: kv["\u5BB6\u4E8B\u30FB\u80B2\u5150"],
            preferredPace: kv["\u51FA\u4F1A\u3046\u307E\u3067\u306E\u5E0C\u671B"],
            character: kv["\u6027\u683C\u30FB\u30BF\u30A4\u30D7"],
            sociality: kv["\u793E\u4EA4\u6027"],
            roommate: kv["\u540C\u5C45\u4EBA"],
            holiday: kv["\u4F11\u65E5"],
            alchole: kv["\u304A\u9152"],
            smoking: kv["\u30BF\u30D0\u30B3"],
            hobbies: kv["\u8DA3\u5473"],
            schoolName: kv["\u5B66\u6821\u540D"],
            jobName: kv["\u8077\u7A2E"],
            jobCategory: kv["\u8077\u696D"],
            bloodType: kv["\u8840\u6DB2\u578B"],
            brother: kv["\u5144\u5F1F\u59C9\u59B9"],
            annualIncom: kv["\u5E74\u53CE"],
            costOfDate: kv["\u30C7\u30FC\u30C8\u8CBB\u7528"]
          };
          console.log("matchInfo: ", this.matchInfo);
          if (this.activePane === "profile") {
            this.initProfilePane();
          }
        }
        // backward compatibility
        initMatchInfo(attempt) {
          this.initMatchProfile(attempt);
        }
        parseMessageItem(item) {
          const textEl = item.querySelector(this.selectors.messageText);
          const message = safeText(textEl);
          if (!message) return null;
          const domId = getDomId(item, this.selectors.messageIdAttr);
          const id = domId ?? `${Date.now()}-${message.slice(0, 32)}`;
          let time = Date.now();
          const t = extractTimeText(item, this.selectors);
          if (t) {
            const epoch = toEpochFromSectionAndHHMM(item, t);
            if (epoch != null) time = epoch;
          }
          const mine = isMine(item, this.selectors);
          return {
            id,
            time,
            message,
            isMyMessage: mine
          };
        }
      };
    }
  });

  // content/message-module/message-listener.ts
  var MessageListener;
  var init_message_listener = __esm({
    "content/message-module/message-listener.ts"() {
      "use strict";
      init_message_thread();
      MessageListener = class {
        constructor() {
          this.threads = /* @__PURE__ */ new Map();
          this.activeThread = null;
          this.init();
        }
        init() {
          this.listen();
        }
        listen() {
          chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (!request || typeof request !== "object") return;
            if (request.kind === "MESSAGE_NATIVE_BODY_RECEIVED") {
              const targetUrl = String(request.url ?? "");
              const targetThread = (targetUrl ? this.threads.get(targetUrl) : void 0) ?? this.activeThread;
              targetThread?.setNativeHostBody(
                request.body ?? null,
                request.source,
                request.recommendedStrategy ?? null
              );
              return;
            }
            if (request.kind === "MESSAGE_STOP_OBSERVE") {
              this.activeThread?.reset();
              this.activeThread = null;
              return;
            }
            if (request.kind === "MESSAGE_OPEN_PROFILE") {
              this.activeThread?.reset();
              this.activeThread?.initMatchProfile(0);
              this.activeThread?.initProfilePane();
              return;
            }
            if (request.kind !== "MESSAGE_START_OBSERVE" && request.kind !== "MESSAGE_OPEN_PROFILE") return;
            console.log("start message thread");
            const url = request.url;
            const title = request.title;
            if (!this.threads.has(url)) {
              console.log("create new thread: url=", url);
              this.activeThread?.reset();
              const newThread = new MessageThread(url, title);
              newThread.initMessagePane();
              this.threads.set(url, newThread);
              this.activeThread = newThread;
            } else {
              const thread = this.threads.get(url);
              console.log("use thread: url=", url);
              if (thread) {
                this.activeThread?.reset();
                thread.initPageObserver();
                thread.initMessagePane();
                this.activeThread = thread;
              }
            }
          });
        }
      };
    }
  });

  // content/profile-module/profile-thread.ts
  var defaultSelectors2, ProfileThread;
  var init_profile_thread = __esm({
    "content/profile-module/profile-thread.ts"() {
      "use strict";
      init_types();
      init_message_thread();
      init_extension_panel_view();
      init_send_button_view();
      defaultSelectors2 = {
        container: "main#maincontent",
        selfIntroduction: ".css-x9ly1l",
        myName: 'a[href="/myprofile/nickname"] .css-1dq49vp',
        profileInfo: ".css-8v88v5"
      };
      ProfileThread = class {
        constructor(id, title, selectors = defaultSelectors2) {
          this.id = id;
          this.title = title;
          this.selectors = selectors;
          this.myProfile = null;
          this.myName = null;
          this.recommendedProfile = null;
          this.isProfileLoading = false;
          this.isProfilePaneVisible = false;
          this.sendButton = null;
          this.sendProfileButtonId = "p-manager-profile-send-button";
          this.sendProfileButtonStyleId = "p-manager-profile-send-style";
          this.profilePanelId = "p-manager-profile-panel";
          this.profilePanelStyleId = "p-manager-profile-panel-style";
          this.profilePanelWidthStorageKey = "p-manager-profile-panel-width";
          this.init();
        }
        init() {
          this.initProfile();
        }
        reset() {
          this.myProfile = null;
          this.recommendedProfile = null;
          this.isProfileLoading = false;
          this.destroyProfilePane();
        }
        setNativeHostBody(body, source, recommendedProfile) {
          if (source === "MY_PROFILE" /* MY_PROFILE */) {
            this.isProfileLoading = false;
            const direct = recommendedProfile ?? (body && typeof body === "object" && "recommended_profile" in body ? body.recommended_profile : null);
            if (direct != null) {
              this.recommendedProfile = direct;
            }
          }
          if (this.isProfilePaneVisible) {
            this.initProfilePane();
          }
        }
        getThreadContainer() {
          return document.querySelector(this.selectors.container);
        }
        initMessagePane() {
          this.initProfilePane();
        }
        initProfilePane() {
          this.ensureProfilePaneStyle();
          this.isProfilePaneVisible = true;
          const panelBody = ensureExtensionPanel({
            sidebarId: this.profilePanelId,
            styleId: this.profilePanelStyleId,
            title: "P-Manager Profile",
            storageKey: this.profilePanelWidthStorageKey,
            defaultWidth: 320,
            minWidth: 260,
            maxWidth: 700,
            onClose: () => {
              this.sendButton = null;
              this.isProfilePaneVisible = false;
            },
            onReopen: () => {
              this.initProfilePane();
            }
          });
          panelBody.innerHTML = `
      <div>Profile Page</div>
      <div class="p-manager-profile-list">
        <article class="p-manager-profile-card">
          <p class="p-manager-profile-card-title">My Profile</p>
          <div class="p-manager-profile-rows"></div>
        </article>
        <article class="p-manager-profile-card">
          <p class="p-manager-profile-card-title">Recommended Profile</p>
          <div class="p-manager-recommended-profile-body"></div>
        </article>
      </div>
      ${buildSendButtonHtml(this.sendProfileButtonId)}
    `;
          this.renderMyProfile(panelBody);
          this.renderRecommendedProfile(panelBody);
          const button = panelBody.querySelector(`#${this.sendProfileButtonId}`);
          if (!button) return;
          button.addEventListener("click", () => this.onSendButtonClick());
          button.disabled = this.isProfileLoading;
          button.textContent = this.isProfileLoading ? "\u751F\u6210\u4E2D..." : "\u751F\u6210";
          this.sendButton = button;
        }
        ensureProfilePaneStyle() {
          if (document.getElementById(this.sendProfileButtonStyleId)) return;
          const style = document.createElement("style");
          style.id = this.sendProfileButtonStyleId;
          style.textContent = `
      #${this.profilePanelId} .p-manager-profile-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #${this.profilePanelId} .p-manager-profile-card {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #ffffff;
        padding: 10px;
        box-shadow: 0 1px 2px rgba(15,23,42,0.08);
      }
      #${this.profilePanelId} .p-manager-profile-card-title {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 700;
        color: #334155;
      }
      #${this.profilePanelId} .p-manager-profile-rows {
        display: grid;
        gap: 6px;
      }
      #${this.profilePanelId} .p-manager-profile-row {
        display: grid;
        grid-template-columns: 170px 1fr;
        gap: 8px;
        align-items: start;
        font-size: 12px;
        line-height: 1.4;
      }
      #${this.profilePanelId} .p-manager-profile-row-label {
        color: #475569;
        font-weight: 700;
      }
      #${this.profilePanelId} .p-manager-profile-row-value {
        color: #0f172a;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      #${this.profilePanelId} .p-manager-recommended-profile-body {
        margin: 0;
        padding: 8px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #f8fafc;
        color: #0f172a;
        font-size: 12px;
        line-height: 1.4;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      ${buildSendButtonCss(this.sendProfileButtonId, "#0ea5e9", "#0284c7")}
    `;
          document.head.appendChild(style);
        }
        renderMyProfile(panelBody) {
          const root = panelBody.querySelector(".p-manager-profile-rows");
          if (!root) return;
          if (this.myProfile == null) {
            const empty = document.createElement("p");
            empty.textContent = "\u81EA\u5DF1\u7D39\u4ECB\u6587\u3092\u63D0\u6848\u3057\u307E\u3059";
            root.appendChild(empty);
            return;
          }
          const rows = Object.entries(this.myProfile).filter(([, value]) => value != null && String(value).trim().length > 0);
          if (rows.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "\u8868\u793A\u3067\u304D\u308B\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u9805\u76EE\u304C\u3042\u308A\u307E\u305B\u3093\u3002";
            root.appendChild(empty);
            return;
          }
          rows.forEach(([key, value]) => {
            const row = document.createElement("div");
            row.className = "p-manager-profile-row";
            const label = document.createElement("div");
            label.className = "p-manager-profile-row-label";
            label.textContent = key;
            const body = document.createElement("div");
            body.className = "p-manager-profile-row-value";
            body.textContent = String(value);
            row.appendChild(label);
            row.appendChild(body);
            root.appendChild(row);
          });
        }
        renderRecommendedProfile(panelBody) {
          const body = panelBody.querySelector(".p-manager-recommended-profile-body");
          if (!body) return;
          if (this.recommendedProfile == null) {
            body.textContent = this.isProfileLoading ? "recommended_profile \u3092\u751F\u6210\u4E2D\u3067\u3059..." : "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u3092\u63D0\u6848\u3057\u307E\u3059";
            return;
          }
          if (typeof this.recommendedProfile === "string") {
            body.textContent = this.recommendedProfile;
            return;
          }
          body.textContent = JSON.stringify(this.recommendedProfile, null, 2);
        }
        destroyProfilePane() {
          this.sendButton?.remove();
          this.sendButton = null;
          this.isProfilePaneVisible = false;
          removeExtensionPanel(this.profilePanelId);
          removeExtensionPanelLauncher(this.profilePanelId);
        }
        onSendButtonClick() {
          if (this.isProfileLoading) return;
          this.isProfileLoading = true;
          if (this.isProfilePaneVisible) {
            this.initProfilePane();
          }
          chrome.runtime.sendMessage({
            kind: "PROFILE_SEND_BUTTON_CLICKED",
            url: this.id,
            title: this.title,
            data: this.myProfile
          }).then((res) => {
            if (res?.ok) return;
            this.isProfileLoading = false;
            if (this.isProfilePaneVisible) {
              this.initProfilePane();
            }
          }).catch(() => {
            this.isProfileLoading = false;
            if (this.isProfilePaneVisible) {
              this.initProfilePane();
            }
          });
        }
        initProfile() {
          const targetNode = this.getThreadContainer();
          if (!targetNode) {
            setTimeout(() => this.initProfile(), 5e3);
            return;
          }
          targetNode.dataset.threadId = this.id;
          this.initMyName(targetNode, 0);
          this.initMyProfile(targetNode, 0);
        }
        initMyName(container, attempt) {
          if (attempt > 2) {
            return;
          }
          const el = container.querySelector(this.selectors.myName);
          const name = safeText(el);
          if (!name) {
            console.log("failed to find myName in container");
            setTimeout(() => this.initMyName(container, attempt + 1), 1e3);
            return;
          }
          this.myName = name;
        }
        initMyProfile(container, attempt) {
          if (attempt > 2) {
            return;
          }
          const selfIntroductionEl = container.querySelector(this.selectors.selfIntroduction);
          if (!selfIntroductionEl) {
            console.log("failed to find selfIntroduction in container");
            setTimeout(() => this.initMyProfile(container, attempt + 1), 1e3);
            return;
          }
          const profileEl = container.querySelector(this.selectors.profileInfo);
          if (!profileEl) {
            console.log("failed to find profile in container");
            setTimeout(() => this.initMyProfile(container, attempt + 1), 1e3);
            return;
          }
          const myName = this.myName ?? safeText(container.querySelector(this.selectors.myName));
          const age = this.normalizeAge(this.findLabeledValue(container, "\u5E74\u9F62") ?? "");
          this.myProfile = {
            name: myName || this.title,
            age,
            selfIntroduction: safeText(selfIntroductionEl) || void 0,
            height: this.findLabeledValue(container, "\u8EAB\u9577"),
            figure: this.findLabeledValue(container, "\u4F53\u578B"),
            bloodType: this.findLabeledValue(container, "\u8840\u6DB2\u578B"),
            brother: this.findLabeledValue(container, "\u5144\u5F1F\u59C9\u59B9"),
            residence: this.findLabeledValue(container, "\u5C45\u4F4F\u5730"),
            hometown: this.findLabeledValue(container, "\u51FA\u8EAB\u5730"),
            jobCategory: this.findLabeledValue(container, "\u8077\u7A2E"),
            educationalBackground: this.findLabeledValue(container, "\u5B66\u6B74"),
            annualIncom: this.findLabeledValue(container, "\u5E74\u53CE"),
            smoking: this.findLabeledValue(container, "\u30BF\u30D0\u30B3"),
            schoolName: this.findLabeledValue(container, "\u5B66\u6821\u540D"),
            jobName: this.findLabeledValue(container, "\u8077\u696D\u540D"),
            maritalStatus: this.findLabeledValue(container, "\u7D50\u5A5A\u6B74"),
            hasKids: this.findLabeledValue(container, "\u5B50\u4F9B\u306E\u6709\u7121"),
            marriageIntention: this.findLabeledValue(container, "\u7D50\u5A5A\u306B\u5BFE\u3059\u308B\u610F\u601D"),
            kidsIntention: this.findLabeledValue(container, "\u5B50\u4F9B\u304C\u6B32\u3057\u3044\u304B"),
            houseworkAndChildcare: this.findLabeledValue(container, "\u5BB6\u4E8B\u30FB\u80B2\u5150"),
            preferredPace: this.findLabeledValue(container, "\u51FA\u4F1A\u3046\u307E\u3067\u306E\u5E0C\u671B"),
            costOfDate: this.findLabeledValue(container, "\u30C7\u30FC\u30C8\u8CBB\u7528"),
            character: this.findLabeledValue(container, "\u6027\u683C\u30FB\u30BF\u30A4\u30D7"),
            sociality: this.findLabeledValue(container, "\u793E\u4EA4\u6027"),
            roommate: this.findLabeledValue(container, "\u540C\u5C45\u4EBA"),
            holiday: this.findLabeledValue(container, "\u4F11\u65E5"),
            alchole: this.findLabeledValue(container, "\u304A\u9152"),
            hobbies: this.findLabeledValue(container, "\u597D\u304D\u306A\u3053\u3068\u30FB\u8DA3\u5473")
          };
          console.log("myProfile: ", this.myProfile);
          if (this.isProfilePaneVisible) {
            this.initProfilePane();
          }
        }
        normalizeAge(value) {
          return value.replace(/歳$/, "").trim();
        }
        findLabeledValue(container, label) {
          const keys = Array.from(container.querySelectorAll(".css-14zkggk span"));
          for (const keyEl of keys) {
            if (safeText(keyEl) !== label) continue;
            const row = keyEl.closest("li") ?? keyEl.closest("fieldset") ?? keyEl.closest("div.css-1d4mlll") ?? keyEl.closest("a.css-o3ujyi");
            if (!row) continue;
            const candidates = Array.from(
              row.querySelectorAll(
                ".css-1l9toz1 .css-1czygor, .css-1l9toz1 .css-1dq49vp, .css-1l9toz1 .css-14zkggk span"
              )
            ).map((el) => safeText(el)).filter((v) => v.length > 0 && v !== label);
            if (candidates.length === 0) continue;
            return candidates[candidates.length - 1];
          }
          return void 0;
        }
      };
    }
  });

  // content/profile-module/profile-listener.ts
  var ProfileListener;
  var init_profile_listener = __esm({
    "content/profile-module/profile-listener.ts"() {
      "use strict";
      init_profile_thread();
      ProfileListener = class {
        constructor() {
          this.threads = /* @__PURE__ */ new Map();
          this.activeThread = null;
          this.init();
        }
        init() {
          this.listen();
        }
        listen() {
          chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (!request || typeof request !== "object") return;
            if (request.kind === "PROFILE_NATIVE_BODY_RECEIVED") {
              const targetUrl = String(request.url ?? "");
              const targetThread = (targetUrl ? this.threads.get(targetUrl) : void 0) ?? this.activeThread;
              targetThread?.setNativeHostBody(
                request.body ?? null,
                request.source,
                request.recommendedProfile ?? null
              );
              return;
            }
            if (request.kind !== "PROFILE_START_OBSERVE") {
              this.activeThread?.reset();
              this.activeThread = null;
              return;
            }
            const url = request.url;
            const title = request.title;
            if (!this.threads.has(url)) {
              console.log("create new thread: url=", url);
              this.activeThread?.reset();
              const newThread = new ProfileThread(url, title);
              newThread.initProfilePane();
              this.threads.set(url, newThread);
              this.activeThread = newThread;
            } else {
              const thread = this.threads.get(url);
              console.log("use thread: url=", url);
              if (thread) {
                this.activeThread?.reset();
                thread.initProfile();
                thread.initProfilePane();
                this.activeThread = thread;
              }
            }
          });
        }
      };
    }
  });

  // content/content.ts
  var require_content = __commonJS({
    "content/content.ts"() {
      init_message_listener();
      init_profile_listener();
      var messageListener = new MessageListener();
      var profileListener = new ProfileListener();
    }
  });
  require_content();
})();
