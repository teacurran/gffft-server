import {Ref} from "typesaurus"
import {User} from "../users/user_models"

export type Link = {
    id: string
    domain: string
    url: string
    title?: string
    description?: string
    image?: string
    images?: string[]
    responseCode: number
    body?: string,
    metadata: string
    createdAt: Date
    updatedAt: Date
    queryCount: number
    saveCount: number
    clickCount: number
}

export type UpdateLink = {
    domain: string
    title?: string
    description?: string
    image?: string
    responseCode: number
    body?: string,
    metadata: string
    updatedAt: Date
    queryCount: number
}

export type LinkCache = {
    createdAt: Date
    responseCode: number
    body: string
    metadata: Map<string, string>
}

export type LinkStat = {
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
    linkRef: Ref<Link>
    url: string
    description: string
    createdAt: Date
}

export interface HydratedLinkSetItem extends LinkSetItem {
    authorUser: User | undefined
    link: Link | undefined
}

