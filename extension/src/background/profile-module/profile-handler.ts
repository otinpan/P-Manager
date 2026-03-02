import{
  PAGE_ID_PROFILE,
  COMMANDS,
  GenericEvent,
  Profile,
  RESPONSE_TYPE,
  MyProfile,
}from "../../types";

import { Handler } from "../handler";

export class ProfileHandler extends Handler{
  constructor(){
    super(PAGE_ID_PROFILE);
    this.initSendButtonListener();
  }

  private initSendButtonListener(){
    chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
      if(!request||typeof request!=="object") return;
      if((request as any).kind!=="PROFILE_SEND_BUTTON_CLICKED") return;
      console.log("bg received PROFILE_SEND_BUTTON_CLICKED");
      this.onProfileSendButtonClicked(request,sender.tab?.id)
        .then(()=>sendResponse({ok: true}))
        .catch((err)=>sendResponse({ok: false,error: String(err)}));
      return true;
    });
  }

  private async onProfileSendButtonClicked(request: unknown,tabId?: number){
    if(!request||typeof request!=="object") return;
    if((request as any).kind!=="PROFILE_SEND_BUTTON_CLICKED") return;

    const result = request as any;
    const profileId = String(result.url ?? "");
    const updatedAt = new Date().toISOString();
    const profile = (result.data ?? null) as Profile | null;

    const payload: MyProfile = {
      type: RESPONSE_TYPE.MY_PROFILE,
      my_profile: profile
        ? {
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
            selfIntroduction: profile.selfIntroduction,
          }
        : null,
    };

    console.log("sent my profile to native-host: ",payload);

    try{
      const resp=await this.sendToNativeHost(payload);
      const normalizedBody = this.normalizeNativeResponseBody(resp);
      if(typeof tabId==="number"){
        chrome.tabs.sendMessage(tabId,{
          kind: "PROFILE_NATIVE_BODY_RECEIVED",
          url: profileId,
          source: RESPONSE_TYPE.MY_PROFILE,
          body: normalizedBody,
          recommendedProfile: this.extractRecommendedProfile(resp,normalizedBody),
        }).catch(()=>{

        });
      }
    }catch(err){
      console.error("failed to send profile payload",err);
      throw err;
    }
  }

  private extractRecommendedProfile(rawResponse: unknown,normalizedBody: unknown): unknown{
    if(
      rawResponse &&
      typeof rawResponse === "object" &&
      "recommended_profile" in rawResponse
    ){
      return (rawResponse as { recommended_profile?: unknown }).recommended_profile ?? null;
    }
    if(
      normalizedBody &&
      typeof normalizedBody === "object" &&
      "recommended_profile" in normalizedBody
    ){
      return (normalizedBody as { recommended_profile?: unknown }).recommended_profile ?? null;
    }
    return null;
  }

  public onGenericEvent(ev: GenericEvent){
    if(ev.command===COMMANDS.PROFILE_OPEN&&ev.url){
      console.log("profile page");
      if(!ev.url)return;

      this.setEnabled(true);

      chrome.tabs.sendMessage(ev.tabId,{
        kind: "PROFILE_START_OBSERVE",
        url: ev.url,
      }).catch(()=>{

      });
      return;
    }else{
      this.setEnabled(false);
    }
  }
}
