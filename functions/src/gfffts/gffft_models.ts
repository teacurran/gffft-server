import {Ref} from "typesaurus"
import {User} from "../users/user_models"

export type Gffft = {
    id: string
    uid?: string,
    key: string
    name: string
    fruitCode?: string
    rareFruits?: number
    ultraRareFruits?: number
    nameLower: string
    description: string
    intro?: string
    tags?: string[]
    features?: Array<string>
    enabled: boolean
    allowMembers: boolean
    requireApproval: boolean
    enableAltHandles: boolean
    createdAt?: Date
    updatedAt?: Date
    membership?: GffftMember
  }

export type GffftMemberParams = {
    uid: string
    gid: string
    mid: string
  }

export type GffftMemberUpdateCounters = {
  galleryPhotos?: number
  galleryVideos?: number
  boardThreads?: number
  boardPosts?: number
  linkSetItems?: number
}

export type GffftMember = {
    user: Ref<User>
    type: string
    updateCounters: GffftMemberUpdateCounters
    handle?: string
    createdAt?: Date
    updatedAt?: Date
  }

export type GffftStats = {
  ownerCount: number,
  adminCount: number,
  memberCount: number,
  anonCount: number,
}

export type GffftOwnerCounter = {
  ownerCount: number
}

export type GffftAdminCounter = {
  adminCount: number
}

export type GffftMemberCounter = {
  memberCount: number
}

export type GffftAnonCounter = {
  anonCount: number
}

export const TYPE_OWNER = "owner"
export const TYPE_ADMIN = "admin"
export const TYPE_MEMBER = "member"
export const TYPE_ANON = "anon"
export const TYPE_PENDING = "pending"
export const TYPE_REJECTED = "rejected"
