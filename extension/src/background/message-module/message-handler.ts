import{
  NATIVE_HOST_NAME,
  PAGE_ID_MESSAGE,
  COMMANDS,
  GenericEvent,
}from "../../types";

import { Handler } from "../handler";

export class MessageHandler extends Handler{
  private mCommand:COMMANDS | null=null;
  constructor(){
    super(PAGE_ID_MESSAGE);
    this.initSendButtonListener();
  }

  private initSendButtonListener(){
    chrome.runtime.onMessage.addListener((request)=>{
      if(!request||typeof request!=="object") return;
      if((request as any).kind!=="MESSAGE_SEND_BUTTON_CLICKED") return;
      this.onSendButtonClicked(request);
    });
  }

  private onSendButtonClicked(_request: unknown){
    // TODO: 送るボタンクリック時のイベント処理をここに実装
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
