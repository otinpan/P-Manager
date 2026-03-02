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
          } else if (url.includes("pairs.lv/message/detail")) {
            command = "messageOpen" /* MESSAGE_OPEN */;
          } else if (url.includes("pairs.lv/myprofile")) {
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
      normalizeNativeResponseBody(response) {
        if (response == null) return null;
        const payload = typeof response === "object" && response !== null && "body" in response ? response.body : response;
        if (typeof payload !== "string") return payload ?? null;
        const trimmed = payload.trim();
        if (trimmed.length === 0) return "";
        try {
          return JSON.parse(trimmed);
        } catch {
          return payload;
        }
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
        this.mCommand = null;
        this.initSendButtonListener();
      }
      initSendButtonListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          if (!request || typeof request !== "object") return;
          if (request.kind !== "MESSAGE_SEND_BUTTON_CLICKED") return;
          console.log("bg received MESSAGE_SEND_BUTTON_CLICKED");
          this.onMessageSendButtonClicked(request, sender.tab?.id).then(() => sendResponse({ ok: true })).catch((err) => sendResponse({ ok: false, error: String(err) }));
          return true;
        });
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          if (!request || typeof request !== "object") return;
          if (request.kind !== "MESSAGE_PROFILE_SEND_BUTTON_CLICKED") return;
          console.log("bg received MESSAGE_PROFILE_SEND_BUTTON_CLICKED");
          this.onProfileSendButtonClicked(request, sender.tab?.id).then(() => sendResponse({ ok: true })).catch((err) => sendResponse({ ok: false, error: String(err) }));
          return true;
        });
      }
      async onMessageSendButtonClicked(request, tabId) {
        if (!request || typeof request !== "object") return;
        if (request.kind !== "MESSAGE_SEND_BUTTON_CLICKED") return;
        const result = request;
        const partnerId = String(result.url ?? "");
        const items = Array.isArray(result.data) ? result.data : [];
        const userPrompt = String(result.userPrompt ?? "\u6B21\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044");
        const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        const payload = {
          type: "MATCH_MESSAGES" /* MATCH_MESSAGES */,
          partner: {
            id: partnerId,
            updated_at: updatedAt
          },
          user_prompt: userPrompt,
          messages: items.map((item) => ({
            id: item.id,
            partner_id: partnerId,
            sent_at: new Date(item.time).toISOString(),
            is_mine: item.isMyMessage,
            body: item.message
          }))
        };
        console.log("send match messages payload to native host", payload);
        try {
          const resp = await this.sendToNativeHost(payload);
          if (typeof tabId === "number") {
            chrome.tabs.sendMessage(tabId, {
              kind: "MESSAGE_NATIVE_BODY_RECEIVED",
              url: partnerId,
              source: "MATCH_MESSAGES" /* MATCH_MESSAGES */,
              body: this.normalizeNativeResponseBody(resp)
            }).catch(() => {
            });
          }
        } catch (err) {
          console.error("failed to send messages payload", err);
          throw err;
        }
      }
      async onProfileSendButtonClicked(request, tabId) {
        if (!request || typeof request !== "object") return;
        if (request.kind !== "MESSAGE_PROFILE_SEND_BUTTON_CLICKED") return;
        const result = request;
        const partnerId = String(result.url ?? "");
        const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        const profile = result.data ?? null;
        const payload = {
          type: "MATCH_PROFILE" /* MATCH_PROFILE */,
          partner: {
            id: partnerId,
            updated_at: updatedAt
          },
          partner_profile: profile ? {
            partner_id: partnerId,
            name: profile.name,
            age: profile.age,
            height: profile.height,
            figure: profile.figure,
            bloodType: profile.bloodType,
            brother: profile.brother,
            residence: profile.residence,
            hometown: profile.hometown,
            jobCategory: profile.jobCategory,
            educationalBackground: profile.educationalBackground,
            annualIncom: profile.annualIncom,
            smoking: profile.smoking,
            schoolName: profile.schoolName,
            jobName: profile.jobName,
            maritalStatus: profile.maritalStatus,
            hasKids: profile.hasKids,
            marriageIntention: profile.marriageIntention,
            kidsIntention: profile.kidsIntention,
            houseworkAndChildcare: profile.houseworkAndChildcare,
            preferredPace: profile.preferredPace,
            costOfDate: profile.costOfDate,
            character: profile.character,
            sociality: profile.sociality,
            roommate: profile.roommate,
            holiday: profile.holiday,
            alchole: profile.alchole,
            hobbies: profile.hobbies,
            selfIntroduction: profile.selfIntroduction
          } : null
        };
        console.log("send match profile payload to native host", payload);
        try {
          const resp = await this.sendToNativeHost(payload);
          const normalizedBody = this.normalizeNativeResponseBody(resp);
          if (typeof tabId === "number") {
            chrome.tabs.sendMessage(tabId, {
              kind: "MESSAGE_NATIVE_BODY_RECEIVED",
              url: partnerId,
              source: "MATCH_PROFILE" /* MATCH_PROFILE */,
              body: normalizedBody,
              recommendedStrategy: this.extractRecommendedStrategy(resp, normalizedBody)
            }).catch(() => {
            });
          }
        } catch (err) {
          console.error("failed to send partner profile payload", err);
          throw err;
        }
      }
      extractRecommendedStrategy(rawResponse, normalizedBody) {
        if (rawResponse && typeof rawResponse === "object" && "recommended_strategy" in rawResponse) {
          return rawResponse.recommended_strategy ?? null;
        }
        if (normalizedBody && typeof normalizedBody === "object" && "recommended_strategy" in normalizedBody) {
          return normalizedBody.recommended_strategy ?? null;
        }
        return null;
      }
      onGenericEvent(ev) {
        if ((ev.command === "messageOpen" /* MESSAGE_OPEN */ || ev.command === "partnerOpen" /* PARTNER_OPEN */) && ev.url) {
          console.log(ev.command === "partnerOpen" /* PARTNER_OPEN */ ? "partner page" : "message page");
          if (!ev.url) return;
          this.setEnabled(true);
          this.mCommand = ev.command;
          const kind = ev.command === "messageOpen" /* MESSAGE_OPEN */ ? "MESSAGE_START_OBSERVE" : "MESSAGE_OPEN_PROFILE";
          chrome.tabs.sendMessage(ev.tabId, {
            kind,
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
        this.initSendButtonListener();
      }
      initSendButtonListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          if (!request || typeof request !== "object") return;
          if (request.kind !== "PROFILE_SEND_BUTTON_CLICKED") return;
          console.log("bg received PROFILE_SEND_BUTTON_CLICKED");
          this.onProfileSendButtonClicked(request, sender.tab?.id).then(() => sendResponse({ ok: true })).catch((err) => sendResponse({ ok: false, error: String(err) }));
          return true;
        });
      }
      async onProfileSendButtonClicked(request, tabId) {
        if (!request || typeof request !== "object") return;
        if (request.kind !== "PROFILE_SEND_BUTTON_CLICKED") return;
        const result = request;
        const profileId = String(result.url ?? "");
        const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        const profile = result.data ?? null;
        const payload = {
          type: "MY_PROFILE" /* MY_PROFILE */,
          my_profile: profile ? {
            id: profileId,
            updated_at: updatedAt,
            name: profile.name,
            age: profile.age,
            height: profile.height,
            figure: profile.figure,
            bloodType: profile.bloodType,
            brother: profile.brother,
            residence: profile.residence,
            hometown: profile.hometown,
            jobCategory: profile.jobCategory,
            educationalBackground: profile.educationalBackground,
            annualIncom: profile.annualIncom,
            smoking: profile.smoking,
            schoolName: profile.schoolName,
            jobName: profile.jobName,
            maritalStatus: profile.maritalStatus,
            hasKids: profile.hasKids,
            marriageIntention: profile.marriageIntention,
            kidsIntention: profile.kidsIntention,
            houseworkAndChildcare: profile.houseworkAndChildcare,
            preferredPace: profile.preferredPace,
            costOfDate: profile.costOfDate,
            character: profile.character,
            sociality: profile.sociality,
            roommate: profile.roommate,
            holiday: profile.holiday,
            alchole: profile.alchole,
            hobbies: profile.hobbies,
            selfIntroduction: profile.selfIntroduction
          } : null
        };
        console.log("sent my profile to native-host: ", payload);
        try {
          const resp = await this.sendToNativeHost(payload);
          const normalizedBody = this.normalizeNativeResponseBody(resp);
          if (typeof tabId === "number") {
            chrome.tabs.sendMessage(tabId, {
              kind: "PROFILE_NATIVE_BODY_RECEIVED",
              url: profileId,
              source: "MY_PROFILE" /* MY_PROFILE */,
              body: normalizedBody,
              recommendedProfile: this.extractRecommendedProfile(resp, normalizedBody)
            }).catch(() => {
            });
          }
        } catch (err) {
          console.error("failed to send profile payload", err);
          throw err;
        }
      }
      extractRecommendedProfile(rawResponse, normalizedBody) {
        if (rawResponse && typeof rawResponse === "object" && "recommended_profile" in rawResponse) {
          return rawResponse.recommended_profile ?? null;
        }
        if (normalizedBody && typeof normalizedBody === "object" && "recommended_profile" in normalizedBody) {
          return normalizedBody.recommended_profile ?? null;
        }
        return null;
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
