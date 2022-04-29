import {Account} from "./account_models"

export interface IFingerResponse {
    subject: string
}


export function accountToWebfinger(
  account: Account | null): IFingerResponse | null {
  if (account == null || account.id == null) {
    return null
  }

  return {
    "subject": `acct:${account}@gffft.app`,
  }
}
