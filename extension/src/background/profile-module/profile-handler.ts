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
    chrome.runtime.onMessage.addListener((request)=>{
      if(!request||typeof request!=="object") return;
      if((request as any).kind!=="PROFILE_SEND_BUTTON_CLICKED") return;
      this.onProfileSendButtonClicked(request);
    });
  }

  private async onProfileSendButtonClicked(request: unknown){
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
      await this.sendToNativeHost(payload);
    }catch(err){
      console.error("failed to send profile payload",err);
    }
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
