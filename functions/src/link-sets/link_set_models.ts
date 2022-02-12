import {Ref} from "typesaurus"
import {User} from "../users/user_models"

export type Link = {
    id: string
    domain: string
    url: string
    createdAt: Date
    updatedAt: Date
    queryCount: number
    saveCount: number
    clickCount: number
}

export type LinkStats = {
    queryCount: number
    saveCount: number
    clickCount: number
}

export type LinkSet = {
    id: string
    key: string
    name?: string
    description?: string
    itemCount: number
    whoCanView?: string
    whoCanPost?: string
    latestPost: Ref<User>
    createdAt: Date
    updatedAt: Date
}

export interface HydratedLinkSet extends LinkSet {
    latestPostUser: User | undefined
    items?: HydratedLinkSetItem[]
}

export type LinkSetItem = {
    id: string
    author: Ref<User>
    url: string
    description: string
    createdAt: Date
}

export interface HydratedLinkSetItem extends LinkSetItem {
    authorUser: User | undefined
}

