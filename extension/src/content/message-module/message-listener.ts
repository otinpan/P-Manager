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
      if((request as any).kind==="MESSAGE_NATIVE_BODY_RECEIVED"){
        const targetUrl = String((request as any).url ?? "");
        const targetThread =
          (targetUrl ? this.threads.get(targetUrl) : undefined) ??
          this.activeThread;
        targetThread?.setNativeHostBody(
          (request as any).body ?? null,
          (request as any).source,
          (request as any).recommendedStrategy ?? null,
        );
        return;
      }
      if((request as any).kind==="MESSAGE_STOP_OBSERVE"){
        this.activeThread?.reset();
        this.activeThread=null;
        return;
      }

      if((request as any).kind==="MESSAGE_OPEN_PROFILE"){
        this.activeThread?.reset();
        this.activeThread?.initMatchProfile(0);
        this.activeThread?.initProfilePane();
        return;
      }
      if(
        (request as any).kind!=="MESSAGE_START_OBSERVE"&&
        (request as any).kind!=="MESSAGE_OPEN_PROFILE"
      )return;
      console.log("start message thread");
      const url=request.url;
      const title=request.title;


      if(!this.threads.has(url)){
        console.log("create new thread: url=",url);
        this.activeThread?.reset();
        const newThread=new MessageThread(url,title);
        newThread.initMessagePane();
        this.threads.set(url,newThread);
        this.activeThread=newThread;
      }else{
        const thread=this.threads.get(url);
        console.log("use thread: url=",url);
        if(thread){
          this.activeThread?.reset();
          thread.initPageObserver();
          thread.initMessagePane();
          this.activeThread=thread;
        }
      }
    });
  }
}
