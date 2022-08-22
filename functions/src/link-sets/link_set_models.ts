import {Ref} from "typesaurus"
import {Thread} from "../boards/board_models"
import {HydratedUser, User} from "../users/user_models"

export type Link = {
    id: string
    domain: string
    url: string
    title?: string
    description?: string
    image?: string
    images?: string[]
    responseCode: number
    metadata?: string
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
    id: string
    domain: string
    url: string
    createdAt: Date
    responseCode: number
    title?: string
    description?: string
    image?: string
    images?: string[]
    body: string
    metadata: string
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
    latestPost?: Ref<User>
    createdAt: Date
    updatedAt: Date
}

export type LinkSetUpdateCounter = {
    itemCount: number
    updatedAt?: Date
  }

export interface HydratedLinkSet extends LinkSet {
    latestPostUser: HydratedUser | undefined
    items?: HydratedLinkSetItem[]
}

export type LinkSetItem = {
    id: string
    author: Ref<User>
    linkRef: Ref<Link>
    threadRef: Ref<Thread>
    url: string
    description: string
    createdAt: Date
}

export interface HydratedLinkSetItem extends LinkSetItem {
    authorUser?: HydratedUser
    link?: Link
    thread?: Thread
}

