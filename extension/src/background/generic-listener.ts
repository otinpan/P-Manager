import {
  GenericEvent,
  COMMANDS,
}from "../types";


type GenericEventHandler= (ev: GenericEvent)=>void;

export class GenericListener{
  private handlers : Set<GenericEventHandler> = new Set();
  constructor(onEvent?: GenericEventHandler){
    if(onEvent)this.handlers.add(onEvent);
    this.init();
  }

  init(){
    this.listen();
  }

  addHandler(handler: GenericEventHandler):()=>void{
    this.handlers.add(handler);
    return ()=>this.removeHandler(handler);
  }

  removeHandler(handler:GenericEventHandler):void{
    this.handlers.delete(handler);
  }

  private emit(ev:GenericEvent):void{
    for(const h of this.handlers){
      try{
        h(ev);
      }catch(e){
        console.error("GenericListener handler error: ",e,"event ",ev);
      }
    }
  }

  listen(){
    chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab)=>{
      const url=tab.url;
      if(!url||changeInfo.status!=="complete")return;

      let command:COMMANDS=COMMANDS.OTHER_OPEN;
      if(url.includes("pairs.lv/message/detail")&&url.includes("/partner/")){
        command=COMMANDS.PARTNER_OPEN;
        console.log("partner profile page");
      }else if(url.includes("pairs.lv/message/detail")){
        command=COMMANDS.MESSAGE_OPEN;
        console.log("message page");
      }else if(url.includes("pairs.lv/other")){
        command=COMMANDS.PROFILE_OPEN;
      }

      this.emit({command,tabId,url,title:tab.title});
    });
  }
}

export default GenericListener;
