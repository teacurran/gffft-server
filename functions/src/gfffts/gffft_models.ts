import {Ref} from "typesaurus"
import {User} from "../users/user_models"

export type Gffft = {
    id: string
    uid?: string,
    key: string
    name: string
    fruitCode?: string
    nameLower: string
    description: string
    intro?: string
    tags?: string[]
    features?: Array<string>
    enabled: boolean
    allowMembers: boolean
    requireApproval: boolean
    enableAltHandles: boolean
    pagesEnabled: boolean
    pagesWhoCanView?: string
    pagesWhoCanEdit?: string
    boardEnabled: boolean
    boardWhoCanView?: string
    boardWhoCanPost?: string
    galleryEnabled: boolean
    galleryWhoCanView?: string
    galleryWhoCanPost?: string
    createdAt?: Date
    updatedAt?: Date
  }

export interface GffftMemberParams {
    uid: string
    gid: string
    mid: string
  }

export interface GffftMember {
    user: Ref<User>
    type: string
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
