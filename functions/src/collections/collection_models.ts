import {Ref, subcollection} from "typesaurus"
import {gffftsCollection, gffftsMembersCollection} from "../gfffts/gffft_data"
import {Gffft, GffftMember} from "../gfffts/gffft_models"
import {Link} from "../link-sets/link_set_models"
import {HydratedUser, User} from "../users/user_models"
import {PostType} from "../posts/post_type";

export type CollectionCounters = {
  photos?: number
  videos?: number
  posts?: number
  audios?: number
  replies?: number
}

export enum CollectionType {
  FEED,
  BOARD,
  GALLERY,
  LINKSET,
  NOTEBOOK,
}
export type Collection = {
  id: string
  type: CollectionType
  allowedPostTypes: Array<PostType>
  key?: string
  name?: string
  description?: string
  whoCanView?: string
  whoCanPost?: string
  whoCanReply?: string
  latestPost?: Ref<HydratedUser>
  counts: CollectionCounters
  createdAt: Date
  updatedAt: Date
}

export interface HydratedCollection extends Collection {
  latestPostUser: HydratedUser | undefined
  items?: HydratedPost[]
}

export type CollectionUpdate = {
  photoCount?: number
  videoCount?: number
  audioCount?: number
  textCount?: number
  binaryCount?: number
  postCount?: number
  replyCount?: number
}

export type CollectionUpdatePhotoUpset = {
  photoCount: number
}
export type CollectionUpdateVideoUpset = {
  videoCount: number
}
export type CollectionUpdateAudioUpset = {
  audioCount: number
}
export type CollectionUpdateTextUpset = {
  textCount: number
}
export type CollectionUpdateBinaryUpset = {
  binaryCount: number
}
export type CollectionUpdatePostUpset = {
  postCount: number
}
export type CollectionUpdateReplyUpset = {
  replyCount: number
}

export type Post = {
  id: string
  parent: string
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
  replyCount: number
  createdAt: Date
  updatedAt: Date
  deleted: boolean
  deletedAt?: Date
}

export enum AttachmentType {
  PHOTO,
  VIDEO,
  AUDIO,
  TEXT,
  BINARY
}
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
  replies: HydratedPost[]
  link?: Link | undefined
  reaction?: PostReaction
}

export type PostReaction = {
  id: string
  author: Ref<User>
  reaction: string
  createdAt: Date
}

export const collectionCollection = subcollection<Collection, Gffft, User>("collections", gffftsCollection)
export const postCollection = subcollection<Post, Collection, Gffft, [string, string]>("posts", collectionCollection)
export const postReactionCollection = subcollection<PostReaction, Post, Collection,
  [string, string, string]>("reactions", postCollection)
export const postAttachmentCollection = subcollection<Attachment, Post, Collection,
  [string, string, string]>("replies", postCollection)
export const collUpdateCollection = subcollection<CollectionUpdate, GffftMember, Gffft,
  [string, string]>("updates", gffftsMembersCollection)
