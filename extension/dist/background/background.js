var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// types.ts
var NATIVE_HOST_NAME, PAGE_ID_MESSAGE, PAGE_ID_PROFILE;
var init_types = __esm({
  "types.ts"() {
    "use strict";
    NATIVE_HOST_NAME = "p_manager_host_chrome";
    PAGE_ID_MESSAGE = "MESSAGE_PAGE";
    PAGE_ID_PROFILE = "PROFILE_PAGE";
  }
});

// background/generic-listener.ts
var GenericListener;
var init_generic_listener = __esm({
  "background/generic-listener.ts"() {
    "use strict";
    init_types();
    GenericListener = class {
      constructor(onEvent) {
        this.handlers = /* @__PURE__ */ new Set();
        if (onEvent) this.handlers.add(onEvent);
        this.init();
      }
      init() {
        this.listen();
      }
      addHandler(handler) {
        this.handlers.add(handler);
        return () => this.removeHandler(handler);
      }
      removeHandler(handler) {
        this.handlers.delete(handler);
      }
      emit(ev) {
        for (const h of this.handlers) {
          try {
            h(ev);
          } catch (e) {
            console.error("GenericListener handler error: ", e, "event ", ev);
          }
        }
      }
      listen() {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          const url = tab.url;
          if (!url || changeInfo.status !== "complete") return;
          let command = "otherOpen" /* OTHER_OPEN */;
          if (url.includes("pairs.lv/message/detail") && url.includes("/partner/")) {
            command = "partnerOpen" /* PARTNER_OPEN */;
            console.log("partner profile page");
          } else if (url.includes("pairs.lv/message/detail")) {
            command = "messageOpen" /* MESSAGE_OPEN */;
            console.log("message page");
          } else if (url.includes("pairs.lv/other")) {
            command = "profileOpen" /* PROFILE_OPEN */;
          }
          this.emit({ command, tabId, url, title: tab.title });
        });
      }
    };
  }
});

// background/handler.ts
var Handler;
var init_handler = __esm({
  "background/handler.ts"() {
    "use strict";
    init_types();
    Handler = class _Handler {
      constructor(pageId) {
        this.pageId = pageId;
        _Handler.registry.set(pageId, this);
        this.init();
      }
      static {
        this.installed = false;
      }
      static {
        this.registry = /* @__PURE__ */ new Map();
      }
      init() {
        if (_Handler.installed) return;
        _Handler.installed = true;
      }
      async sendToNativeHost(message) {
        return new Promise((resolve, reject) => {
          console.log("send message to native host: ", message);
          chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, message, (res) => {
            const err = chrome.runtime.lastError;
            if (err) return reject(err.message || String(err));
            console.log("success", res);
            resolve(res);
          });
        });
      }
      setEnabled(enabled) {
        chrome.contextMenus.update(this.pageId, { enabled }, () => void chrome.runtime.lastError);
      }
    };
  }
});

// background/message-module/message-handler.ts
var MessageHandler;
var init_message_handler = __esm({
  "background/message-module/message-handler.ts"() {
    "use strict";
    init_types();
    init_handler();
    MessageHandler = class extends Handler {
      constructor() {
        super(PAGE_ID_MESSAGE);
      }
      onGenericEvent(ev) {
        if ((ev.command === "messageOpen" /* MESSAGE_OPEN */ || ev.command === "partnerOpen" /* PARTNER_OPEN */) && ev.url) {
          console.log(ev.command === "partnerOpen" /* PARTNER_OPEN */ ? "partner page" : "message page");
          if (!ev.url) return;
          this.setEnabled(true);
          chrome.tabs.sendMessage(ev.tabId, {
            kind: "MESSAGE_START_OBSERVE",
            url: ev.url,
            title: ev.title ?? "",
            isPartner: ev.command === "partnerOpen" /* PARTNER_OPEN */
          }).catch(() => {
          });
          return;
        } else {
          chrome.tabs.sendMessage(ev.tabId, {
            kind: "MESSAGE_STOP_OBSERVE"
          }).catch(() => {
          });
          this.setEnabled(false);
        }
      }
    };
  }
});

// background/profile-module/profile-handler.ts
var ProfileHandler;
var init_profile_handler = __esm({
  "background/profile-module/profile-handler.ts"() {
    "use strict";
    init_types();
    init_handler();
    ProfileHandler = class extends Handler {
      constructor() {
        super(PAGE_ID_PROFILE);
      }
      onGenericEvent(ev) {
        if (ev.command === "profileOpen" /* PROFILE_OPEN */ && ev.url) {
          console.log("profile page");
          if (!ev.url) return;
          this.setEnabled(true);
          chrome.tabs.sendMessage(ev.tabId, {
            kind: "PROFILE_START_OBSERVE",
            url: ev.url
          }).catch(() => {
          });
          return;
        } else {
          this.setEnabled(false);
        }
      }
    };
  }
});

// background/background.ts
var require_background = __commonJS({
  "background/background.ts"() {
    init_generic_listener();
    init_message_handler();
    init_profile_handler();
    var genericListener = new GenericListener();
    var messageHandler = new MessageHandler();
    genericListener.addHandler((ev) => messageHandler.onGenericEvent(ev));
    var profileHandler = new ProfileHandler();
    genericListener.addHandler((ev) => profileHandler.onGenericEvent(ev));
  }
});
export default require_background();
