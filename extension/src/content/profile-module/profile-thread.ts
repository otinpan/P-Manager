import {Profile} from "../../types"
import {safeText} from "../message-module/message-thread"
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

  constructor(
    readonly id:string,
    readonly title: string,
    private selectors: ThreadSelectors=defaultSelectors,
  ){
      this.init();
  }

  init(){
    this.initProfile();
    this.initListener();
  }

  reset(){
    this.myProfile=null;
  }

  private getThreadContainer(){
    return document.querySelector(this.selectors.container) as HTMLElement | null;
  }
  private initListener(){

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
