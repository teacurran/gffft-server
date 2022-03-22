import {Ref} from "typesaurus"
import {Link} from "../link-sets/link_set_models"
import {HydratedUser, User} from "../users/user_models"

export type CollectionUpdateCounters = {
  photos?: number
  videos?: number
  posts?: number
  audios?: number
  replies?: number
}

export type CollectionType = "feed" | "board" | "gallery" | "linkSet" | "notebook"
export type Collection = {
    id: string
    type: CollectionType
    key?: string
    name?: string
    description?: string
    whoCanView?: string
    whoCanPost?: string
    whoCanReply?: string
    latestPost?: Ref<HydratedUser>
    updateCounters: CollectionUpdateCounters
    createdAt: Date
    updatedAt: Date
  }

export enum PostType {
    MEDIA,
    THREAD,
    LINK,
    PAGE
}

export type Post = {
  id: string
  type: PostType
  subject?: string
  author: Ref<User>
  content: string
  linkRef?: Ref<Link>
  fileName: string
  filePath: string
  thumbnail: boolean
  latestReply?: Ref<User>
  topReaction: string
  reactions?: Map<string, number>
  replyCount: number
  createdAt: Date
  updatedAt: Date
  deleted: boolean
  deletedAt?: Date
}

export type AttachmentType = "photo" | "video" | "audio" | "text" | "binary"
export type Attachment = {
  id: string
  type: AttachmentType
  fileName: string
  filePath: string
  thumbnail: boolean
  urls?: Array<string>
  height?: number
  width?: number
}

export interface HydratedPost extends Post {
  authorUser: HydratedUser | undefined
  latestReplyUser: HydratedUser | undefined
  body?: string
  attachments?: Attachment[]
  replies: HydratedReply[]
  link?: Link | undefined
  reaction?: PostReaction
}

export type PostReaction = {
  id: string
  author: Ref<User>
  reaction: string
  createdAt: Date
}

export type Reply = {
  id?: string
  body: string
  author: Ref<User>
  linkRef?: Ref<Link>
  fileName: string
  filePath: string
  thumbnail: boolean
  urls?: Array<string>
  topReaction: string
  reactions?: Map<string, number>
  createdAt: Date
  deleted: boolean
  deletedAt?: Date
}

export interface HydratedReply extends Reply {
  authorUser: HydratedUser | undefined
  link?: Link | undefined
  reaction?: PostReaction
  attachments?: Attachment[]
}

export type ThreadPostCounter = {
  postCount: number
}

export type ThreadPostCounterWithAuthor = {
  postCount: number
  latestPost: Ref<User>
  updatedAt: Date
}
