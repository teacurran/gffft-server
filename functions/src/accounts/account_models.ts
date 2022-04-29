import {collection} from "typesaurus"

export type Account = {
    id: string
    createdAt: Date
    updatedAt: Date
    handle: string
    name: string
    icon: string
    header: string
}

export const accountsCollection = collection<Account>("accounts")

