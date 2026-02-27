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
