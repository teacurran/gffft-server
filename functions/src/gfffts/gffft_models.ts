import {Ref} from "typesaurus"
import {User, UserBookmark} from "../users/user_models"
import {IGffftFeatureRef} from "./gffft_interfaces"
import {Board} from "../boards/board_models"
import {Gallery} from "../galleries/gallery_models"
import {Notebook} from "../notebooks/notebook_models"
import {LinkSet} from "../link-sets/link_set_models"

export type Gffft = {
    id: string
    uid?: string
    key: string
    name: string
    fruitCode?: string
    rareFruits?: number
    ultraRareFruits?: number
    nameLower: string
    description?: string
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

export interface HydratedGffft extends Gffft {
  me: User | undefined
  membership: GffftMember | undefined
  bookmark: UserBookmark | undefined
  featureSet: IGffftFeatureRef[]
  boards: Board[],
  galleries: Gallery[],
  notebooks: Notebook[],
  linkSets: LinkSet[],
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
  id?: string
  user: Ref<User>
  type: string
  updateCounters: GffftMemberUpdateCounters
  updateCount: number
  handle?: string
  createdAt?: Date
  updatedAt?: Date
}

export type GffftStats = {
  id: string
  ownerCount: number
  adminCount: number
  memberCount: number
  anonCount: number
}

export type GffftOwnerCountUpset = {
  ownerCount: number
}

export type GffftAdminCountUpset = {
  adminCount: number
}

export type GffftMemberCountUpset = {
  memberCount: number
}

export type GffftAnonCountUpset = {
  anonCount: number
}

export const TYPE_OWNER = "owner"
export const TYPE_ADMIN = "admin"
export const TYPE_MEMBER = "member"
export const TYPE_ANON = "anon"
export const TYPE_PENDING = "pending"
export const TYPE_REJECTED = "rejected"
