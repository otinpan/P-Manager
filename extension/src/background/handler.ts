import{
  NATIVE_HOST_NAME,
}from "../types";

export abstract class Handler{
  private static installed=false;
  private static registry=new Map<string,Handler>();
  constructor(
    protected readonly pageId: string,
  ){
    Handler.registry.set(pageId,this);
    this.init();
  }

  init(){
    if(Handler.installed)return;
    Handler.installed=true;
  }

  protected async sendToNativeHost(message: any):Promise<any>{
    return new Promise((resolve,reject)=>{
      console.log("send message to native host: ",message);
      chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME,message,(res)=>{
        const err=chrome.runtime.lastError;
        if(err)return reject(err.message||String(err));
        console.log("success",res);
        resolve(res);
      });
    })
  }

  protected setEnabled(enabled: boolean){
    chrome.contextMenus.update(this.pageId,{enabled},()=>void chrome.runtime.lastError);
  }
}
