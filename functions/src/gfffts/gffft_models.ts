import {Ref} from "typesaurus"
import {User} from "../users/user_models"

export type Gffft = {
    id: string
    key: string
    name: string
    fruitCode?: string
    nameLower: string
    description: string
    intro?: string
    tags?: string[]
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

export type GffftMember = {
    user: Ref<User>
    type: string
    createdAt?: Date
    updatedAt?: Date
  }

export const TYPE_OWNER = "owner"
export const TYPE_ADMIN = "admin"
export const TYPE_MEMBER = "member"
export const TYPE_ANON = "anon"
