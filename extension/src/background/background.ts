import {GenericListener} from "./generic-listener";
import { MessageHandler } from "./message-module/message-handler";
import { ProfileHandler } from "./profile-module/profile-handler";
import{
  PAGE_ID_MESSAGE,
  PAGE_ID_PROFILE,
  PAGE_ID_OTHER,
}from "../types";

const genericListener=new GenericListener();

const messageHandler=new MessageHandler();
genericListener.addHandler((ev)=>messageHandler.onGenericEvent(ev));

const profileHandler=new ProfileHandler();
genericListener.addHandler((ev)=>profileHandler.onGenericEvent(ev));


