export interface Profile{
  name: string;
  age: string;
  selfIntroduction?: string;
  height?: string;
  figure?: string;
  bloodType?: string;
  brother?: string;
  residence?: string;
  hometown?: string;
  jobCategory?: string;
  educationalBackground?: string; //最終学歴
  annualIncom?: string;
  smoking?: string;
  schoolName?: string;
  jobName?: string;
  maritalStatus?: string; //結婚歴
  hasKids?: string; //子供の有無
  marriageIntention?: string; //結婚の意思
  kidsIntention?: string; //子供が欲しいか
  houseworkAndChildcare?: string; //家事・育児
  preferredPace?: string; //会うまでの希望
  costOfDate?: string; //デート費用
  character?: string; //性格
  sociality?: string; //社交性
  roommate?: string; //同居人
  holiday?: string; //休日
  alchole?: string; //お酒
  hobbies?: string; //趣味
}

export const NATIVE_HOST_NAME="p_manager_host_chrome";

export const PAGE_ID_MESSAGE="MESSAGE_PAGE"
export const PAGE_ID_PROFILE="PROFILE_PAGE"
export const PAGE_ID_OTHER="OTHER_PAGE"

export enum COMMANDS{
  MESSAGE_OPEN="messageOpen",
  PARTNER_OPEN="partnerOpen",
  PROFILE_OPEN="profileOpen",
  OTHER_OPEN="otherOpen",
}

export type GenericEvent={
  command: COMMANDS;
  tabId: number;
  url: string;
  title?: string;
}

export enum RESPONSE_TYPE{
  
}
