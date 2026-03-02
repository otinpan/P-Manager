import {Profile} from "../../types"
import {RESPONSE_TYPE} from "../../types"
import {safeText} from "../message-module/message-thread"
import { ensureExtensionPanel, removeExtensionPanel, removeExtensionPanelLauncher } from "../shared/extension-panel-view";
import { buildSendButtonCss, buildSendButtonHtml } from "../shared/send-button-view";
export interface ThreadSelectors{
  container: string;
  selfIntroduction: string;
  myName: string;
  profileInfo: string;
}

export const defaultSelectors: ThreadSelectors={
  container: "main#maincontent",
  selfIntroduction: '.css-x9ly1l',
  myName: 'a[href="/myprofile/nickname"] .css-1dq49vp',
  profileInfo: ".css-8v88v5",
}

export class ProfileThread{
  private myProfile: Profile | null=null;
  private myName: string | null=null;
  private recommendedProfile: unknown = null;
  private isProfileLoading = false;
  private isProfilePaneVisible = false;
  private sendButton: HTMLButtonElement | null = null;
  private readonly sendProfileButtonId = "p-manager-profile-send-button";
  private readonly sendProfileButtonStyleId = "p-manager-profile-send-style";
  private readonly profilePanelId = "p-manager-profile-panel";
  private readonly profilePanelStyleId = "p-manager-profile-panel-style";
  private readonly profilePanelWidthStorageKey = "p-manager-profile-panel-width";

  constructor(
    readonly id:string,
    readonly title: string,
    private selectors: ThreadSelectors=defaultSelectors,
  ){
      this.init();
  }

  init(){
    this.initProfile();
  }

  reset(){
    this.myProfile=null;
    this.recommendedProfile = null;
    this.isProfileLoading = false;
    this.destroyProfilePane();
  }

  setNativeHostBody(body: unknown,source?: unknown,recommendedProfile?: unknown){
    if(source===RESPONSE_TYPE.MY_PROFILE){
      this.isProfileLoading = false;
      const direct =
        recommendedProfile ??
        (
          body &&
          typeof body === "object" &&
          "recommended_profile" in body
            ? (body as { recommended_profile?: unknown }).recommended_profile
            : null
        );
      if(direct!=null){
        this.recommendedProfile = direct;
      }
    }
    if(this.isProfilePaneVisible){
      this.initProfilePane();
    }
  }

  private getThreadContainer(){
    return document.querySelector(this.selectors.container) as HTMLElement | null;
  }

  initMessagePane(){
    // 互換用: 既存呼び出しが残っていても profile pane を表示する
    this.initProfilePane();
  }

  initProfilePane(){
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
      onClose: ()=>{
        this.sendButton = null;
        this.isProfilePaneVisible = false;
      },
      onReopen: ()=>{
        this.initProfilePane();
      },
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
    const button = panelBody.querySelector(`#${this.sendProfileButtonId}`) as HTMLButtonElement | null;
    if(!button) return;
    button.addEventListener("click",()=>this.onSendButtonClick());
    button.disabled = this.isProfileLoading;
    button.textContent = this.isProfileLoading ? "生成中..." : "生成";

    this.sendButton = button;
  }

  private ensureProfilePaneStyle(){
    if(document.getElementById(this.sendProfileButtonStyleId)) return;

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
      ${buildSendButtonCss(this.sendProfileButtonId,"#0ea5e9","#0284c7")}
    `;

    document.head.appendChild(style);
  }

  private renderMyProfile(panelBody: HTMLElement){
    const root = panelBody.querySelector(".p-manager-profile-rows") as HTMLElement | null;
    if(!root) return;

    if(this.myProfile==null){
      const empty = document.createElement("p");
      empty.textContent = "自己紹介文を提案します";
      root.appendChild(empty);
      return;
    }

    const rows = Object.entries(this.myProfile)
      .filter(([,value])=>value!=null && String(value).trim().length>0);

    if(rows.length===0){
      const empty = document.createElement("p");
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

  private renderRecommendedProfile(panelBody: HTMLElement){
    const body = panelBody.querySelector(".p-manager-recommended-profile-body") as HTMLElement | null;
    if(!body) return;

    if(this.recommendedProfile==null){
      body.textContent = this.isProfileLoading
        ? "recommended_profile を生成中です..."
        : "プロフィールを提案します";
      return;
    }

    if(typeof this.recommendedProfile==="string"){
      body.textContent = this.recommendedProfile;
      return;
    }

    body.textContent = JSON.stringify(this.recommendedProfile,null,2);
  }

  private destroyProfilePane(){
    this.sendButton?.remove();
    this.sendButton = null;
    this.isProfilePaneVisible = false;
    removeExtensionPanel(this.profilePanelId);
    removeExtensionPanelLauncher(this.profilePanelId);
  }

  private onSendButtonClick(){
    if(this.isProfileLoading) return;
    this.isProfileLoading = true;
    if(this.isProfilePaneVisible){
      this.initProfilePane();
    }
    chrome.runtime.sendMessage({
      kind: "PROFILE_SEND_BUTTON_CLICKED",
      url: this.id,
      title: this.title,
      data: this.myProfile,
    }).then((res: any)=>{
      if(res?.ok) return;
      this.isProfileLoading = false;
      if(this.isProfilePaneVisible){
        this.initProfilePane();
      }
    }).catch(()=>{
      this.isProfileLoading = false;
      if(this.isProfilePaneVisible){
        this.initProfilePane();
      }
    });
  }

  initProfile(){
    const targetNode=this.getThreadContainer();
    if(!targetNode){
      setTimeout(()=>this.initProfile(),5000);
      return;
    }

    (targetNode as HTMLElement).dataset.threadId=this.id;

    this.initMyName(targetNode,0);
    this.initMyProfile(targetNode,0);
  }

  private initMyName(container: HTMLElement,attempt: number){
    if(attempt>2){
      return;
    }

    const el = container.querySelector(this.selectors.myName);
    const name = safeText(el);
    if(!name){
      console.log("failed to find myName in container");
      setTimeout(()=>this.initMyName(container,attempt+1),1000);
      return;
    }

    this.myName=name;
  }

  private initMyProfile(container: HTMLElement, attempt: number){
    if(attempt>2){
      return;
    }
    const selfIntroductionEl =container.querySelector(this.selectors.selfIntroduction);
    if(!selfIntroductionEl){
      console.log("failed to find selfIntroduction in container");
      setTimeout(()=>this.initMyProfile(container,attempt+1),1000);
      return;
    }

    const profileEl=container.querySelector(this.selectors.profileInfo);
    if(!profileEl){
      console.log("failed to find profile in container");
      setTimeout(()=>this.initMyProfile(container,attempt+1),1000);
      return;
    }

    const myName = this.myName ?? safeText(container.querySelector(this.selectors.myName));
    const age = this.normalizeAge(this.findLabeledValue(container,"年齢") ?? "");

    this.myProfile={
      name: myName || this.title,
      age,
      selfIntroduction: safeText(selfIntroductionEl) || undefined,
      height: this.findLabeledValue(container,"身長"),
      figure: this.findLabeledValue(container,"体型"),
      bloodType: this.findLabeledValue(container,"血液型"),
      brother: this.findLabeledValue(container,"兄弟姉妹"),
      residence: this.findLabeledValue(container,"居住地"),
      hometown: this.findLabeledValue(container,"出身地"),
      jobCategory: this.findLabeledValue(container,"職種"),
      educationalBackground: this.findLabeledValue(container,"学歴"),
      annualIncom: this.findLabeledValue(container,"年収"),
      smoking: this.findLabeledValue(container,"タバコ"),
      schoolName: this.findLabeledValue(container,"学校名"),
      jobName: this.findLabeledValue(container,"職業名"),
      maritalStatus: this.findLabeledValue(container,"結婚歴"),
      hasKids: this.findLabeledValue(container,"子供の有無"),
      marriageIntention: this.findLabeledValue(container,"結婚に対する意思"),
      kidsIntention: this.findLabeledValue(container,"子供が欲しいか"),
      houseworkAndChildcare: this.findLabeledValue(container,"家事・育児"),
      preferredPace: this.findLabeledValue(container,"出会うまでの希望"),
      costOfDate: this.findLabeledValue(container,"デート費用"),
      character: this.findLabeledValue(container,"性格・タイプ"),
      sociality: this.findLabeledValue(container,"社交性"),
      roommate: this.findLabeledValue(container,"同居人"),
      holiday: this.findLabeledValue(container,"休日"),
      alchole: this.findLabeledValue(container,"お酒"),
      hobbies: this.findLabeledValue(container,"好きなこと・趣味"),
    };

    console.log("myProfile: ",this.myProfile);
    if(this.isProfilePaneVisible){
      this.initProfilePane();
    }
    
  }


  private normalizeAge(value: string): string {
    return value.replace(/歳$/, "").trim();
  }

  private findLabeledValue(container: ParentNode,label: string): string | undefined{
    const keys = Array.from(container.querySelectorAll(".css-14zkggk span"));
    for(const keyEl of keys){
      if(safeText(keyEl)!==label) continue;

      const row =
        keyEl.closest("li") ??
        keyEl.closest("fieldset") ??
        keyEl.closest("div.css-1d4mlll") ??
        keyEl.closest("a.css-o3ujyi");
      if(!row) continue;

      const candidates = Array.from(
        row.querySelectorAll(
          ".css-1l9toz1 .css-1czygor, .css-1l9toz1 .css-1dq49vp, .css-1l9toz1 .css-14zkggk span",
        ),
      )
        .map((el)=>safeText(el))
        .filter((v)=>v.length>0 && v!==label);

      if(candidates.length===0) continue;
      return candidates[candidates.length-1];
    }

    return undefined;
  }

}
