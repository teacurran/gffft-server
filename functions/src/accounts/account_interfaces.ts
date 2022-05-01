import {Account} from "./account_models"

export interface IFingerLink {
  rel: string,
  type: string,
  href: string
}

export interface IFingerResponse {
  subject: string
  links: IFingerLink[]
}

export function accountToWebfinger(
  account: Account | null): IFingerResponse | null {
  if (account == null || account.id == null) {
    return null
  }

  const accountLink = `https://${process.env.DOMAIN_NAME}/users/${account.handle}`

  return {
    subject: `acct:${account.handle}@${process.env.DOMAIN_NAME}`,
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: accountLink,
      },
    ],
  }
}
