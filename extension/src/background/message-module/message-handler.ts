import{
  PAGE_ID_MESSAGE,
  COMMANDS,
  GenericEvent,
  Profile,
  RESPONSE_TYPE,
  MatchMessages,
  MatchProfile,
}from "../../types";
import { ThreadMessage } from "../../content/message-module/message-thread";
import { Handler } from "../handler";

export class MessageHandler extends Handler{
  private mCommand:COMMANDS | null=null;
  constructor(){
    super(PAGE_ID_MESSAGE);
    this.initSendButtonListener();
  }

  private initSendButtonListener(){
    chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
      if(!request||typeof request!=="object") return;
      if((request as any).kind!=="MESSAGE_SEND_BUTTON_CLICKED") return;
      console.log("bg received MESSAGE_SEND_BUTTON_CLICKED");
      this.onMessageSendButtonClicked(request,sender.tab?.id)
        .then(()=>sendResponse({ok: true}))
        .catch((err)=>sendResponse({ok: false,error: String(err)}));
      return true;
    });

    chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
      if(!request||typeof request!=="object") return;
      if((request as any).kind!=="MESSAGE_PROFILE_SEND_BUTTON_CLICKED") return;
      console.log("bg received MESSAGE_PROFILE_SEND_BUTTON_CLICKED");
      this.onProfileSendButtonClicked(request,sender.tab?.id)
        .then(()=>sendResponse({ok: true}))
        .catch((err)=>sendResponse({ok: false,error: String(err)}));
      return true;
    });
  }

  private async onMessageSendButtonClicked(request: unknown,tabId?: number){
    if(!request||typeof request!=="object") return;
    if((request as any).kind!=="MESSAGE_SEND_BUTTON_CLICKED") return;

    const result=request as any;
    const partnerId = String(result.url ?? "");
    const items = Array.isArray(result.data) ? (result.data as ThreadMessage[]) : [];
    const updatedAt = new Date().toISOString();

    const payload: MatchMessages = {
      type: RESPONSE_TYPE.MATCH_MESSAGES,
      partner: {
        id: partnerId,
        updated_at: updatedAt,
      },
      messages: items.map((item)=>({
        id: item.id,
        partner_id: partnerId,
        sent_at: new Date(item.time).toISOString(),
        is_mine: item.isMyMessage,
        body: item.message,
      })),
    };

    console.log("send match messages payload to native host",payload);
    try{
      const resp=await this.sendToNativeHost(payload);
      if(typeof tabId==="number"){
        chrome.tabs.sendMessage(tabId,{
          kind: "MESSAGE_NATIVE_BODY_RECEIVED",
          url: partnerId,
          source: RESPONSE_TYPE.MATCH_MESSAGES,
          body: this.normalizeNativeResponseBody(resp),
        }).catch(()=>{

        });
      }
    }catch(err){
      console.error("failed to send messages payload",err);
      throw err;
    }
  }

  private async onProfileSendButtonClicked(request: unknown,tabId?: number){
    if(!request||typeof request!=="object") return;
    if((request as any).kind!=="MESSAGE_PROFILE_SEND_BUTTON_CLICKED") return;

    const result = request as any;
    const partnerId = String(result.url ?? "");
    const updatedAt = new Date().toISOString();
    const profile = (result.data ?? null) as Profile | null;

    const payload: MatchProfile = {
      type: RESPONSE_TYPE.MATCH_PROFILE,
      partner: {
        id: partnerId,
        updated_at: updatedAt,
      },
      partner_profile: profile
        ? {
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
            selfIntroduction: profile.selfIntroduction,
          }
        : null,
    };
    console.log("send match profile payload to native host",payload);
    try{
      const resp=await this.sendToNativeHost(payload);
      const normalizedBody = this.normalizeNativeResponseBody(resp);
      if(typeof tabId==="number"){
        chrome.tabs.sendMessage(tabId,{
          kind: "MESSAGE_NATIVE_BODY_RECEIVED",
          url: partnerId,
          source: RESPONSE_TYPE.MATCH_PROFILE,
          body: normalizedBody,
          recommendedStrategy: this.extractRecommendedStrategy(resp,normalizedBody),
        }).catch(()=>{

        });
      }
    }catch(err){
      console.error("failed to send partner profile payload",err);
      throw err;
    }
  }

  private extractRecommendedStrategy(rawResponse: unknown,normalizedBody: unknown): unknown{
    if(
      rawResponse &&
      typeof rawResponse === "object" &&
      "recommended_strategy" in rawResponse
    ){
      return (rawResponse as { recommended_strategy?: unknown }).recommended_strategy ?? null;
    }
    if(
      normalizedBody &&
      typeof normalizedBody === "object" &&
      "recommended_strategy" in normalizedBody
    ){
      return (normalizedBody as { recommended_strategy?: unknown }).recommended_strategy ?? null;
    }
    return null;
  }

  public onGenericEvent(ev: GenericEvent){
    if((ev.command===COMMANDS.MESSAGE_OPEN||ev.command===COMMANDS.PARTNER_OPEN)&&ev.url){
      console.log(ev.command===COMMANDS.PARTNER_OPEN?"partner page":"message page");
      if(!ev.url)return;

      this.setEnabled(true);

      this.mCommand=ev.command;

      const kind =
        ev.command === COMMANDS.MESSAGE_OPEN
          ? "MESSAGE_START_OBSERVE"
          : "MESSAGE_OPEN_PROFILE"; 
      chrome.tabs.sendMessage(ev.tabId,{
        kind,
        url: ev.url,
        title: ev.title ?? "",
        isPartner: ev.command===COMMANDS.PARTNER_OPEN,
      }).catch(()=>{

      });
      return;
    }else{
      chrome.tabs.sendMessage(ev.tabId,{
        kind: "MESSAGE_STOP_OBSERVE",
      }).catch(()=>{

      });
      this.setEnabled(false);
    }
  }

  

  
}
