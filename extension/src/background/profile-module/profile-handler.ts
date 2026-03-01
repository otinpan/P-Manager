import{
  NATIVE_HOST_NAME,
  PAGE_ID_PROFILE,
  COMMANDS,
  GenericEvent,
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
      this.onSendButtonClicked(request);
    });
  }

  private onSendButtonClicked(_request: unknown){
    // TODO: 送るボタンクリック時のイベント処理をここに実装
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
