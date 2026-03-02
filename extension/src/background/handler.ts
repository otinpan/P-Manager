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

  protected normalizeNativeResponseBody(response: unknown): unknown{
    if(response==null) return null;

    const payload =
      typeof response === "object" &&
      response !== null &&
      "body" in response
        ? (response as { body?: unknown }).body
        : response;

    if(typeof payload!=="string") return payload ?? null;
    const trimmed = payload.trim();
    if(trimmed.length===0) return "";

    try{
      return JSON.parse(trimmed);
    }catch{
      return payload;
    }
  }

  protected setEnabled(enabled: boolean){
    chrome.contextMenus.update(this.pageId,{enabled},()=>void chrome.runtime.lastError);
  }
}
