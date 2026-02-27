import{
  NATIVE_HOST_NAME,
  PAGE_ID_MESSAGE,
  COMMANDS,
  GenericEvent,
}from "../../types";

import { Handler } from "../handler";

export class MessageHandler extends Handler{
  constructor(){
    super(PAGE_ID_MESSAGE);
  }

  public onGenericEvent(ev: GenericEvent){
    if((ev.command===COMMANDS.MESSAGE_OPEN||ev.command===COMMANDS.PARTNER_OPEN)&&ev.url){
      console.log(ev.command===COMMANDS.PARTNER_OPEN?"partner page":"message page");
      if(!ev.url)return;

      this.setEnabled(true);

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
