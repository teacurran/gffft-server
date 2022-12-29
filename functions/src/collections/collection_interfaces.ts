import {LoggedInUser} from "../accounts/auth"
import {notEmpty} from "../common/utils"
import {GffftMember, TYPE_OWNER} from "../gfffts/gffft_models"
import {ILink} from "../link-sets/link_set_interfaces"
import {IUserRef} from "../users/user_interfaces"
import {WHO_MEMBER, WHO_PUBLIC} from "./collection_data"
import {AttachmentType, Collection, CollectionType, HydratedCollection,
  HydratedPost} from "./collection_models"
import {PostType} from "../posts/post_type"

export interface ICollection {
  id: string
  type: CollectionType
  name?: string
  description?: string
  photoCount: number
  videoCount: number
  postCount: number
  audioCount: number
  replyCount: number
  createdAt: Date
  updatedAt: Date
  whoCanView: string
  whoCanPost: string
  whoCanReply: string
  posts?: IPost[]
}

export interface IAttachment {
  id: string
  type: AttachmentType
  thumbnail: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  urls?: any
  height?: number
  width?: number
}

export interface IPost {
  id: string
  type: PostType
  subject?: string
  author: IUserRef
  lastReply?: IUserRef
  createdAt: Date
  updatedAt: Date
  thumbnail: boolean
  domain?: string,
  url?: string,
  title?: string,
  canEdit: boolean
  deleted: boolean
  body?: string
  replyCount: number
  topReaction?: string
  reaction?: string
  reactions?: Map<string, number>
  replies?: IReply[]
  attachments?: IAttachment[]
}

export interface IPostResults {
  count: number
  items: IPost[]
}

export interface IReply extends IPost {
  link?: ILink
  fileName: string
  filePath: string
}

export interface IReplyResults {
  count: number
  items: IReply[]
}

export function postToJson(
  loggedInUser: LoggedInUser | null,
  gffftMembership: GffftMember | undefined,
  post: HydratedPost): IPost | null {
  if (post == null || post.id == null) {
    return null
  }

  let canEdit = false
  if (gffftMembership && gffftMembership.type == TYPE_OWNER) {
    canEdit = true
  }
  if (loggedInUser && post.author && post.author.id == loggedInUser.id) {
    canEdit = true
  }

  return {
    id: post.id,
    subject: post.deleted ? "(deleted)" : post.subject,
    createdAt: post.createdAt ?? new Date(),
    updatedAt: post.updatedAt ?? new Date(),
    author: post.authorUser ? {
      id: post.authorUser.id,
      handle: post.authorUser.handle,
    } : {
      id: "deleted",
      handle: "deleted",
    },
    lastReply: post.latestReplyUser ? {
      id: post.latestReplyUser.id,
      handle: post.latestReplyUser.handle,
    } : {
      id: "deleted",
      handle: "deleted",
    },
    replyCount: post.replyCount,
    deleted: post.deleted,
    canEdit: canEdit,
    type: post.type,
    thumbnail: post.thumbnail,
    reaction: post.reaction?.reaction,
  }
}

export function collectionToJson(
  collection: Collection,
): ICollection {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    type: collection.type,
    audioCount: collection.counts?.audios ?? 0,
    videoCount: collection.counts?.videos ?? 0,
    photoCount: collection.counts?.photos ?? 0,
    postCount: collection.counts?.posts ?? 0,
    replyCount: collection.counts?.replies ?? 0,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    whoCanView: collection.whoCanView ?? WHO_PUBLIC,
    whoCanPost: collection.whoCanPost ?? WHO_MEMBER,
    whoCanReply: collection.whoCanReply ?? WHO_MEMBER,
  }
}

export function collectionToJsonWithItems(
  collection: HydratedCollection,
  loggedInUser: LoggedInUser | null,
  gffftMembership: GffftMember | undefined,
): ICollection {
  const collectionType = collectionToJson(collection)

  collectionType.posts = collection.items.map((item) => postToJson(loggedInUser, gffftMembership, item)).filter(notEmpty)
  return collectionType
}

