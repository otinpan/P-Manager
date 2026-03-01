import { ProfileThread } from "./profile-thread";
export class ProfileListener{
  threads: Map<string,ProfileThread> = new Map();
  activeThread: ProfileThread | null=null;
  constructor(){
    this.init();
  }

  init(){
    this.listen();
  }

  listen(){
    chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
      if(!request||typeof request !=="object")return;
      if((request as any).kind!=="PROFILE_START_OBSERVE"){
        this.activeThread?.reset();
        this.activeThread=null;
        return;
      }
      const url=request.url;
      const title=request.title;
      
      if(!this.threads.has(url)){
        console.log("create new thread: url=",url);
        this.activeThread?.reset();
        const newThread=new ProfileThread(url,title);
        newThread.initProfilePane();
        this.threads.set(url,newThread);
        this.activeThread=newThread;
      }else{
        const thread=this.threads.get(url);
        console.log("use thread: url=",url);
        if(thread){
          this.activeThread?.reset();
          thread.initProfile();
          thread.initProfilePane();
          this.activeThread=thread;
        }
      }
    });
  }
}
