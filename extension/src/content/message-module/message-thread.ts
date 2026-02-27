export interface ThreadMessage{
  id: string;
  time: number;
  message: string;
  isMyMessage: boolean;
}

export interface MatchInfo{
  name: string;
  age: string;
  height?: string;
  figure?: string;
  bloodType?: string;
  brother?: string;
  residence?: string;
  hometown?: string;
  jobCategory?: string;
  educationalBackground?: string; //最終学歴
  annualIncom?: string;
  smoking?: string;
  schoolName?: string;
  jobName?: string;
  maritalStatus?: string; //結婚歴
  hasKids?: string; //子供の有無
  marriageIntention?: string; //結婚の意思
  kidsIntention?: string; //子供が欲しいか
  houseworkAndChildcare?: string; //家事・育児
  preferredPace?: string; //合うまでの希望
  costOfDate?: string; //デート費用
  character?: string; //性格
  sociality?: string; //社交性
  roommate?: string; //同居人
  holiday?: string; //休日
  alchole?: string; //お酒
  hobbies?: string; //趣味
}



export interface ThreadSelectors{
  container:string;
  messageItem: string;
  messageText: string;
  matchInfo: string;
  matchInfoRoot?: string;

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
  matchInfo: ".css-1yx6rxm",
  matchInfoRoot: "#dialog-root",
}

function safeText(el: Element | null):string{
  return (el?.textContent ?? "").trim();
}

function normalizeAge(value: string): string {
  return value.replace(/歳$/, "").trim();
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
    return item.classList.contains(sel.mineClass);
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
  private matchInfo: MatchInfo | null=null;

  constructor(
    readonly id:string, 
    readonly title:string,
    private selectors: ThreadSelectors=defaultSelectors,
  ){
    this.init();
  }

  init(){
    this.initPageObserver();
    this.initListener();
  }

  private getThreadContainer(): HTMLElement | null{
    return document.querySelector(this.selectors.container) as HTMLElement | null;
  }

  // backgroundからのメッセージを受信
  initListener(){

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

  initMatchInfo(){
    const container=this.getThreadContainer();
    if(!container){
      setTimeout(()=>this.initPageObserver(),5000);
      return;
    }

    const rootCandidates: Array<ParentNode> = [];
    if (this.selectors.matchInfoRoot) {
      const modalRoot = document.querySelector(this.selectors.matchInfoRoot);
      if (modalRoot) rootCandidates.push(modalRoot);
    }
    rootCandidates.push(container);
    rootCandidates.push(document);

    let matchProfile: Element | null = null;
    for (const root of rootCandidates) {
      const found = root.querySelector(this.selectors.matchInfo);
      if (found) {
        matchProfile = found;
        break;
      }
    }
    if(!matchProfile) {
      console.log("failed to capture profile");
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
      name: kv["ニックネーム"] ?? this.title,
      age: normalizeAge(kv["年齢"] ?? ""),
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
    if(!this.matchInfo){
      const container=this.getThreadContainer();
      if(container)this.initMatchInfo(container);
    }
    console.log("threadItems: ",this.threadItems);
  }


}
