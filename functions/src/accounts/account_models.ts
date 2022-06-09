import {collection} from "typesaurus"

export type Account = {
  id: string
  createdAt: Date
  updatedAt: Date
  handle: string
  domain: string
  name: string
  note?: string
  icon?: string
  header?: string
}

export const accountsCollection = collection<Account>("accounts")

