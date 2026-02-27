export class ProfileListener{
  constructor(){
    this.init();
  }

  init(){
    this.listen();
  }

  listen(){
    chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
      if(!request||typeof request !=="object")return;
      if((request as any).kind!=="PROFILE_START_OBSERVE")return;
      const url=request.url;
      const title=request.title;
      console.log("start profile: url,",url,"title,",title);
    });
  }
}
