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
