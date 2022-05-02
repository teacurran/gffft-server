import {collection} from "typesaurus"

export type Account = {
  createdAt: Date
  updatedAt: Date
  handle: string
  name: string
  note?: string
  icon?: string
  header?: string
}

export const accountsCollection = collection<Account>("accounts")

