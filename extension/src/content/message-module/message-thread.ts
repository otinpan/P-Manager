import { Profile } from "../../types";
import { RESPONSE_TYPE } from "../../types";
import { ensureExtensionPanel, removeExtensionPanel, removeExtensionPanelLauncher } from "../shared/extension-panel-view";
import { buildSendButtonCss, buildSendButtonHtml } from "../shared/send-button-view";

export interface ThreadMessage{
  id: string;
  time: number;
  message: string;
  isMyMessage: boolean;
}

export interface ThreadSelectors{
  container:string;
  messageItem: string;
  messageText: string;
  matchInfo: string;
  matchInfoRoot?: string;
  selfIntroduction: string;
  matchName: string;

  messageIdAttr?: string;
  timeText?: string;

  mineAttr?: {name: string; value?:string};
  mineClass?: string;
}

export const defaultSelectors: ThreadSelectors = {
  container: "main#maincontent",
  messageItem: 'li[data-test^="message-sent-time-"]',
  messageText: ".css-m2d5md",
  messageIdAttr: "data-test",
  matchName: '[data-test="header-title"] .css-8n7an',
  matchInfo: ".css-1yx6rxm",
  selfIntroduction: ".css-1x1bqz1",
  matchInfoRoot: "#dialog-root",
  mineClass: "css-1y1ka7w",
}

export function safeText(el: Element | null):string{
  return (el?.textContent ?? "").trim();
}

function normalizeAge(value: string): string {
  return value.replace(/歳$/, "").trim();
}

function findProfileByHeading(root: ParentNode): Element | null {
  const headings = Array.from(root.querySelectorAll("h2"));
  for (const h2 of headings) {
    if (safeText(h2) !== "プロフィール") continue;
    const container = h2.closest("div");
    if (!container) continue;
    if (container.querySelector("dt") && container.querySelector("dd")) {
      return container;
    }
  }
  return null;
}

function extractSelfIntroductionText(container: Element | null): string {
  if (!container) return "";

  const p =
    container.querySelector("p.css-1ryh3zs") ??
    container.querySelector("p");
  const pText = safeText(p);
  if (pText) return pText;

  return safeText(container);
}

function parseSectionMD(item: Element): { month: number; day: number } | null {
  const section = item.closest("section");
  if (!section) return null;

  const t = (section.querySelector("h3 time")?.textContent ?? "").trim(); // 例 "5/26(月)"
  const m = t.match(/^(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;

  const month = Number(m[1]);
  const day = Number(m[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;

  return { month, day };
}

function inferYear(month: number, day: number): number {
  const now = new Date();
  const y = now.getFullYear();

  // 今年の month/day で作ってみる
  const d = new Date(y, month - 1, day, 0, 0, 0, 0);

  // もし「今日より未来に見えてしまう」(= 実際は去年のログ) なら去年扱いにする
  // ※閾値は運用に合わせて調整OK（ここは単純に未来なら去年）
  if (d.getTime() > now.getTime() + 12 * 60 * 60 * 1000) {
    return y - 1;
  }
  return y;
}

function toEpochFromSectionAndHHMM(item: Element, hhmm: string): number | null {
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

/** message id をDOMから取り出す */
function getDomId(item: Element, idAttr?: string): string | null {
  if (!idAttr) return null;
  const v = item.getAttribute(idAttr);
  if (v && v.trim().length > 0) return v.trim();
  return null;
}

function isMine(item: Element, sel: ThreadSelectors): boolean {
  if (sel.mineAttr?.name) {
    const v = item.getAttribute(sel.mineAttr.name);
    if (sel.mineAttr.value == null) return v != null;
    return v === sel.mineAttr.value;
  }
  if (sel.mineClass) {
    const cls = sel.mineClass.startsWith(".")
      ? sel.mineClass
      : `.${sel.mineClass}`;

    // messageItem(li) ではなく、その子要素に自分側のクラスが付くケースを許容する
    if (item.matches(cls)) return true;
    return item.querySelector(cls) != null;
  }
  return false;
}

function extractTimeText(item: Element, sel: ThreadSelectors): string | null {
  if (sel.timeText) {
    const t = safeText(item.querySelector(sel.timeText));
    if (t) return t;
  }

  // フォールバック: 配下のテキストのうち HH:MM に一致するものを探す
  // 例: <div>22:29</div> みたいなのを拾う
  const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
  const hits: string[] = [];
  while (walker.nextNode()) {
    const s = (walker.currentNode.nodeValue ?? "").trim();
    if (/^\d{1,2}:\d{2}$/.test(s)) hits.push(s);
  }
  if (hits.length === 0) return null;

  // 候補が複数ある場合は「最後に出てきた時刻」を採用（DOM構造的に末尾が時刻のことが多い）
  return hits[hits.length - 1] ?? null;
}



export class MessageThread{
  private observer: MutationObserver | null=null;
  private threadItems: ThreadMessage[]=[];
  private seenIds=new Set<string>();
  private matchInfo: Profile | null=null;
  private matchName: string | null=null;
  private nativeHostBody: unknown[] = [];
  private recommendedStrategy: unknown = null;
  private isMessageLoading = false;
  private isProfileLoading = false;
  private activePane: "message" | "profile" | null = null;
  private lastClosedPane: "message" | "profile" | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private readonly sendMessageButtonId = "p-manager-message-send-button";
  private readonly sendMessageButtonStyleId = "p-manager-message-send-style";
  private readonly messagePanelId = "p-manager-message-panel";
  private readonly messagePanelStyleId = "p-manager-message-panel-style";
  private readonly messagePanelWidthStorageKey = "p-manager-message-panel-width";

  constructor(
    readonly id:string, 
    readonly title:string,
    private selectors: ThreadSelectors=defaultSelectors,
  ){
    this.init();
  }

  init(){
    this.initPageObserver();
  }

  private getThreadContainer(): HTMLElement | null{
    return document.querySelector(this.selectors.container) as HTMLElement | null;
  }


  // PageObserverの作成
  initPageObserver(){
    const targetNode=this.getThreadContainer();
    if(!targetNode){
      setTimeout(()=>this.initPageObserver(),5000);
      return;
    }

    (targetNode as HTMLElement).dataset.threadId=this.id;

    // 会話内容の取得
    this.initThreadItems(targetNode);
    this.initMatchName(targetNode,0);
    
    this.observer?.disconnect();
    this.observer = new MutationObserver(this.handleMutations);
    this.observer.observe(targetNode,{childList:true, subtree: true});
  }

  destroyPageObserver(){
    this.observer?.disconnect();
  }

  destroyThreadItems(){
    this.threadItems=[];
    this.seenIds.clear();
  }

  reset(){
    this.destroyPageObserver();
    this.destroyThreadItems();
    this.matchInfo=null;
    this.nativeHostBody = [];
    this.recommendedStrategy = null;
    this.isMessageLoading = false;
    this.isProfileLoading = false;
    this.destroyPane();
  }

  setNativeHostBody(body: unknown,source?: unknown,recommendedStrategy?: unknown){
    if(source===RESPONSE_TYPE.MATCH_MESSAGES){
      this.nativeHostBody.push(body);
      this.isMessageLoading = false;
    }
    if(source===RESPONSE_TYPE.MATCH_PROFILE){
      this.isProfileLoading = false;
      const direct =
        recommendedStrategy ??
        (
          body &&
          typeof body === "object" &&
          "recommended_strategy" in body
            ? (body as { recommended_strategy?: unknown }).recommended_strategy
            : null
        );
      if(direct!=null){
        this.recommendedStrategy = direct;
      }
    }
    if(this.activePane==="message"){
      this.initMessagePane();
    }
    if(this.activePane==="profile"){
      this.initProfilePane();
    }
  }

  initMessagePane(){
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
      onClose: ()=>{
        this.lastClosedPane = this.activePane;
        this.sendButton = null;
        this.activePane = null;
      },
      onReopen: ()=>{
        if(this.lastClosedPane==="profile"){
          this.initProfilePane();
          return;
        }
        this.initMessagePane();
      },
    });

    panelBody.innerHTML = `
      <div>Message Page</div>
      <div class="p-manager-response-list"></div>
      ${buildSendButtonHtml(this.sendMessageButtonId)}
    `;
    this.renderMessageResponseCards(panelBody);
    const button = panelBody.querySelector(`#${this.sendMessageButtonId}`) as HTMLButtonElement | null;
    if(!button) return;
    button.addEventListener("click",()=>this.onMessageSendButtonClick());
    button.disabled = this.isMessageLoading;
    button.textContent = this.isMessageLoading ? "生成中..." : "生成";

    this.sendButton = button;
  }

  initProfilePane(){
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
      onClose: ()=>{
        this.lastClosedPane = this.activePane;
        this.sendButton = null;
        this.activePane = null;
      },
      onReopen: ()=>{
        if(this.lastClosedPane==="profile"){
          this.initProfilePane();
          return;
        }
        this.initMessagePane();
      },
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
    const button = panelBody.querySelector(`#${this.sendMessageButtonId}`) as HTMLButtonElement | null;
    if(!button) return;
    button.addEventListener("click",()=>this.onProfileSendButtonClick());
    button.disabled = this.isProfileLoading;
    button.textContent = this.isProfileLoading ? "生成中..." : "生成";

    this.sendButton = button;
  }

  private ensurePaneStyle(){
    if(document.getElementById(this.sendMessageButtonStyleId)) return;

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
      ${buildSendButtonCss(this.sendMessageButtonId,"#0d9488","#0f766e")}
    `;

    document.head.appendChild(style);
  }

  private renderMessageResponseCards(panelBody: HTMLElement){
    const list = panelBody.querySelector(".p-manager-response-list") as HTMLElement | null;
    if(!list) return;

    const cards: Array<{ title: string; text: string }> = [];
    this.nativeHostBody.forEach((response,index)=>{
      const messages = this.extractRecommendedMessages(response);
      messages.forEach((text,messageIndex)=>{
        cards.push({
          title:
            messages.length === 1
              ? `Recommended Message ${index + 1}`
              : `Recommended Message ${index + 1}-${messageIndex + 1}`,
          text,
        });
      });
    });

    if(cards.length===0){
      const card = document.createElement("article");
      card.className = "p-manager-response-card";
      card.innerHTML = `
        <p class="p-manager-response-card-title">Recommended Message</p>
        <p class="p-manager-response-card-body">${
          this.isMessageLoading
            ? "recommended_message を生成中です..."
            : "メッセージを作ってもらいましょう"
        }</p>
      `;
      list.appendChild(card);
      return;
    }

    cards.forEach((cardData)=>{
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

  private renderProfileSummary(panelBody: HTMLElement){
    const root = panelBody.querySelector(".p-manager-profile-rows") as HTMLElement | null;
    if(!root) return;

    if(this.matchInfo==null){
      const empty = document.createElement("p");
      empty.className = "p-manager-response-card-body";
      empty.textContent = "プロフィールがまだ取得できていません。";
      root.appendChild(empty);
      return;
    }

    const rows = Object.entries(this.matchInfo)
      .filter(([,value])=>value!=null && String(value).trim().length>0);

    if(rows.length===0){
      const empty = document.createElement("p");
      empty.className = "p-manager-response-card-body";
      empty.textContent = "表示できるプロフィール項目がありません。";
      root.appendChild(empty);
      return;
    }

    rows.forEach(([key,value])=>{
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

  private renderRecommendedStrategy(panelBody: HTMLElement){
    const body = panelBody.querySelector(".p-manager-strategy-body") as HTMLElement | null;
    if(!body) return;

    if(this.recommendedStrategy==null){
      body.textContent = this.isProfileLoading
        ? "recommended_strategy を生成中です..."
        : "相手にあった戦略を考えます";
      return;
    }

    if(typeof this.recommendedStrategy==="string"){
      body.textContent = this.recommendedStrategy;
      return;
    }

    body.textContent = JSON.stringify(this.recommendedStrategy,null,2);
  }

  private extractRecommendedMessages(response: unknown): string[]{
    const source =
      response &&
      typeof response === "object" &&
      "recommended_message" in response
        ? (response as { recommended_message?: unknown }).recommended_message
        : null;
    if(source == null) return [];

    const flatten = (value: unknown): string[] => {
      if(value == null) return [];
      if(typeof value === "string"){
        const trimmed = value.trim();
        return trimmed.length === 0 ? [] : [trimmed];
      }
      if(Array.isArray(value)){
        return value.flatMap((entry)=>flatten(entry));
      }
      if(typeof value === "object"){
        if("body" in value){
          return flatten((value as { body?: unknown }).body);
        }
        return [JSON.stringify(value,null,2)];
      }
      return [String(value)];
    };

    return flatten(source);
  }

  private destroyPane(){
    this.sendButton?.remove();
    this.sendButton = null;
    this.activePane = null;
    this.lastClosedPane = null;
    removeExtensionPanel(this.messagePanelId);
    removeExtensionPanelLauncher(this.messagePanelId);
  }

  private onMessageSendButtonClick(){
    if(this.isMessageLoading) return;
    this.isMessageLoading = true;
    if(this.activePane==="message"){
      this.initMessagePane();
    }
    chrome.runtime.sendMessage({
      kind: "MESSAGE_SEND_BUTTON_CLICKED",
      url: this.id,
      title: this.title,
      data: this.threadItems,
    }).then((res: any)=>{
      if(res?.ok) return;
      this.isMessageLoading = false;
      if(this.activePane==="message"){
        this.initMessagePane();
      }
    }).catch(()=>{
      this.isMessageLoading = false;
      if(this.activePane==="message"){
        this.initMessagePane();
      }
    });
  }

  private onProfileSendButtonClick(){
    if(this.isProfileLoading) return;
    this.isProfileLoading = true;
    if(this.activePane==="profile"){
      this.initProfilePane();
    }
    chrome.runtime.sendMessage({
      kind: "MESSAGE_PROFILE_SEND_BUTTON_CLICKED",
      url: this.id,
      title: this.title,
      data: this.matchInfo,
    }).then((res: any)=>{
      if(res?.ok) return;
      this.isProfileLoading = false;
      if(this.activePane==="profile"){
        this.initProfilePane();
      }
    }).catch(()=>{
      this.isProfileLoading = false;
      if(this.activePane==="profile"){
        this.initProfilePane();
      }
    });
  }

  private initThreadItems(container: HTMLElement){
    const items=Array.from(container.querySelectorAll(this.selectors.messageItem));
    for(const item of items){
      const msg=this.parseMessageItem(item);
      if(!msg) continue;
      if(this.seenIds.has(msg.id))continue;
      this.seenIds.add(msg.id);
      this.threadItems.push(msg);
    }

    console.log("threadItems: ",this.threadItems);
  }
  
  private initMatchName(container: HTMLElement,attempt: number){
    const selector = this.selectors.matchName.startsWith(".")
      || this.selectors.matchName.startsWith("#")
      || this.selectors.matchName.includes("[")
      || this.selectors.matchName.includes(" ")
      ? this.selectors.matchName
      : `.${this.selectors.matchName}`;

    const item=container.querySelector(selector) ?? document.querySelector(selector);
    const name=safeText(item);
    if(!name){
      console.log("failed to find name, attempt=",attempt);
      setTimeout(()=>this.initMatchName(container,attempt+1),1000);
      return;
    }

    this.matchName=name;
    console.log("matchName: ", this.matchName);
  }

  initMatchProfile(attempt:number){
    if(attempt>2)return;
    const container=this.getThreadContainer();
    console.log("start init match info");
    if(!container){
      setTimeout(()=>this.initMatchProfile(attempt+1),1000);
      return;
    }

    const rootCandidates: Array<ParentNode> = [];
    if (this.selectors.matchInfoRoot) {
      const modalRoot = document.querySelector(this.selectors.matchInfoRoot);
      if (modalRoot) rootCandidates.push(modalRoot);
    }
    rootCandidates.push(container);
    rootCandidates.push(document);

    // self introduction
    let selfIntroductionEl: Element | null=null;
    for (const root of rootCandidates){
      const found=
        root.querySelector(this.selectors.selfIntroduction);
      if(found){
        selfIntroductionEl=found;
        break;
      }
    }

    let matchProfile: Element | null = null;
    for (const root of rootCandidates) {
      const found =
        root.querySelector(this.selectors.matchInfo) ??
        findProfileByHeading(root);
      if (found) {
        matchProfile = found;
        break;
      }
    }
    // DOMが反映されていない場合はもう一度
    if(!matchProfile) {
      console.log("failed to capture profile");
      setTimeout(()=>this.initMatchProfile(attempt+1),1000);
      return;
    }

    const rows=Array.from(matchProfile.querySelectorAll("dt"));
    const kv: Record<string,string>={};
    for(const dt of rows){
      const dd=dt.nextElementSibling;
      if(!(dd instanceof HTMLElement) || dd.tagName !== "DD")continue;
      const key=safeText(dt);
      const value=safeText(dd);
      if(!key || !value)continue;
      kv[key]=value;
    }

    this.matchInfo={
      name: kv["ニックネーム"] ?? this.matchName ?? this.title,
      age: normalizeAge(kv["年齢"] ?? ""),
      selfIntroduction: extractSelfIntroductionText(selfIntroductionEl),
      height: kv["身長"],
      figure: kv["体型"],
      residence: kv["居住地"],
      hometown: kv["出身地"],
      educationalBackground: kv["学歴"],
      maritalStatus: kv["結婚歴"],
      hasKids: kv["子供の有無"],
      marriageIntention: kv["結婚に対する意思"],
      kidsIntention: kv["子供が欲しいか"],
      houseworkAndChildcare: kv["家事・育児"],
      preferredPace: kv["出会うまでの希望"],
      character: kv["性格・タイプ"],
      sociality: kv["社交性"],
      roommate: kv["同居人"],
      holiday: kv["休日"],
      alchole: kv["お酒"],
      smoking: kv["タバコ"],
      hobbies: kv["趣味"],
      schoolName: kv["学校名"],
      jobName: kv["職種"],
      jobCategory: kv["職業"],
      bloodType: kv["血液型"],
      brother: kv["兄弟姉妹"],
      annualIncom: kv["年収"],
      costOfDate: kv["デート費用"],
    };
    console.log("matchInfo: ",this.matchInfo);
    if(this.activePane==="profile"){
      this.initProfilePane();
    }
  }

  // backward compatibility
  initMatchInfo(attempt:number){
    this.initMatchProfile(attempt);
  }

  private parseMessageItem(item: Element):ThreadMessage | null{
    const textEl=item.querySelector(this.selectors.messageText);
    const message=safeText(textEl);
    if(!message)return null;

    const domId=getDomId(item,this.selectors.messageIdAttr);
    const id=
      domId??
      `${Date.now()}-${message.slice(0,32)}`;

    let time=Date.now();
    const t=extractTimeText(item,this.selectors);
    if(t){
      const epoch=toEpochFromSectionAndHHMM(item,t);
      if(epoch!=null)time=epoch;
    }

    const mine=isMine(item,this.selectors);

    return{
      id,
      time,
      message,
      isMyMessage: mine,
    };
  }

  private handleMutations: MutationCallback =(mutations)=>{
    for(const m of mutations){
      for(const node of Array.from(m.addedNodes)){
        if(!(node instanceof Element))continue;

        const direct=node.matches?.(this.selectors.messageItem) ? [node]:[];
        const nested=Array.from(node.querySelectorAll?.(this.selectors.messageItem) ?? []);
        const candidates=[...direct,...nested];
        
        for(const item of candidates){
          const msg=this.parseMessageItem(item);
          if(!msg)continue;
          if(this.seenIds.has(msg.id))continue;
          this.seenIds.add(msg.id);
          this.threadItems.push(msg);
        }
      }
    }
    console.log("threadItems: ",this.threadItems);
    if(this.activePane==="message"){
      this.initMessagePane();
    }
  }


}
