"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // content/message-module/message-thread.ts
  function safeText(el) {
    return (el?.textContent ?? "").trim();
  }
  function normalizeAge(value) {
    return value.replace(/歳$/, "").trim();
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
      return item.classList.contains(sel.mineClass);
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
      defaultSelectors = {
        container: "main#maincontent",
        messageItem: 'li[data-test^="message-sent-time-"]',
        messageText: ".css-m2d5md",
        messageIdAttr: "data-test",
        matchInfo: ".css-1yx6rxm",
        matchInfoRoot: "#dialog-root"
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
            if (!this.matchInfo) {
              const container = this.getThreadContainer();
              if (container) this.initMatchInfo(container);
            }
            console.log("threadItems: ", this.threadItems);
          };
          this.init();
        }
        init() {
          this.initPageObserver();
          this.initListener();
        }
        getThreadContainer() {
          return document.querySelector(this.selectors.container);
        }
        // backgroundからのメッセージを受信
        initListener() {
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
        initMatchInfo() {
          const container = this.getThreadContainer();
          if (!container) {
            setTimeout(() => this.initPageObserver(), 5e3);
            return;
          }
          const rootCandidates = [];
          if (this.selectors.matchInfoRoot) {
            const modalRoot = document.querySelector(this.selectors.matchInfoRoot);
            if (modalRoot) rootCandidates.push(modalRoot);
          }
          rootCandidates.push(container);
          rootCandidates.push(document);
          let matchProfile = null;
          for (const root of rootCandidates) {
            const found = root.querySelector(this.selectors.matchInfo);
            if (found) {
              matchProfile = found;
              break;
            }
          }
          if (!matchProfile) {
            console.log("failed to capture profile");
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
            name: kv["\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0"] ?? this.title,
            age: normalizeAge(kv["\u5E74\u9F62"] ?? ""),
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
            if (request.kind === "MESSAGE_STOP_OBSERVE") {
              this.activeThread?.reset();
              this.activeThread = null;
              return;
            }
            if (request.kind === "MESSAGE_OPEN_PROFILE") {
              this.activeThread?.initMatchInfo();
              return;
            }
            if (request.kind !== "MESSAGE_START_OBSERVE") return;
            console.log("start message thread");
            const url = request.url;
            const title = request.title;
            if (!this.threads.has(url)) {
              console.log("create new thread: url=", url);
              const newThread = new MessageThread(url, title);
              this.threads.set(url, newThread);
              this.activeThread?.reset();
              this.activeThread = newThread;
            } else {
              const thread = this.threads.get(url);
              console.log("use thread: url=", url);
              if (thread) {
                this.activeThread?.reset();
                thread.initPageObserver();
                this.activeThread = thread;
              }
            }
          });
        }
      };
    }
  });

  // content/profile-module/profile-listener.ts
  var ProfileListener;
  var init_profile_listener = __esm({
    "content/profile-module/profile-listener.ts"() {
      "use strict";
      ProfileListener = class {
        constructor() {
          this.init();
        }
        init() {
          this.listen();
        }
        listen() {
          chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (!request || typeof request !== "object") return;
            if (request.kind !== "PROFILE_START_OBSERVE") return;
            const url = request.url;
            const title = request.title;
            console.log("start profile: url,", url, "title,", title);
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
