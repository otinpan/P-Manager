import { MessageThread } from "./message-thread";

export class MessageListener{
  threads: Map<string,MessageThread> = new Map();
  activeThread: MessageThread | null=null;
  constructor(){
    this.init();
  }

  init(){
    this.listen();
  }

  listen(){
    chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
      if(!request||typeof request !=="object")return;
      if((request as any).kind==="MESSAGE_STOP_OBSERVE"){
        this.activeThread?.reset();
        this.activeThread=null;
        return;
      }

      if((request as any).kind==="MESSAGE_OPEN_PROFILE"){
        this.activeThread?.initMatchInfo();
        return;
      }
      if((request as any).kind!=="MESSAGE_START_OBSERVE")return;
      console.log("start message thread");
      const url=request.url;
      const title=request.title;

      if(!this.threads.has(url)){
        console.log("create new thread: url=",url);
        const newThread=new MessageThread(url,title);
        this.threads.set(url,newThread);
        this.activeThread?.reset();
        this.activeThread=newThread;
      }else{
        const thread=this.threads.get(url);
        console.log("use thread: url=",url);
        if(thread){
          this.activeThread?.reset();
          thread.initPageObserver();
          this.activeThread=thread;
        }
      }
    });
  }
}
