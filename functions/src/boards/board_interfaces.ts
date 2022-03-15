import {LoggedInUser} from "../auth"
import {notEmpty} from "../common/utils"
import {GffftMember, TYPE_OWNER} from "../gfffts/gffft_models"
import {ILink, linkToJson} from "../link-sets/link_set_interfaces"
import {IUserRef} from "../users/user_interfaces"
import {WHO_OWNER} from "./board_data"
import {Board, HydratedThread, HydratedThreadPost} from "./board_models"

export interface IBoardType {
    id: string
    name?: string
    description?: string
    threads: number
    posts: number
    firstActivity: Date | null
    updatedAt: Date | null
    whoCanView: string
    whoCanPost: string
  }

export interface IThread {
  id: string
  subject: string
  createdAt: Date
  updatedAt: Date
  firstPost: IUserRef
  latestPost: IUserRef
  postCount: number
  topReaction?: string
  posts: IThreadPost[]
  canEdit: boolean
}

export interface IThreadResults {
  count: number
  items: IThread[]
}

export interface IThreadPost {
  id: string
  body: string
  createdAt: Date
  author: IUserRef
  link?: ILink
  canEdit: boolean
  deleted: boolean
}

export interface IThreadPostResults {
  count: number
  items: IThreadPost[]
}


export function threadsToJson(
  loggedInUser: LoggedInUser | null,
  gffftMembership: GffftMember | undefined,
  items: HydratedThread[]
): IThreadResults {
  const itemsJson = items.map((item) => threadToJson(loggedInUser, gffftMembership, item)).filter(notEmpty)
  return {
    count: items.length,
    items: itemsJson,
  }
}

export function threadToJson(
  loggedInUser: LoggedInUser | null,
  gffftMembership: GffftMember | undefined,
  thread: HydratedThread): IThread | null {
  if (thread == null || thread.id == null) {
    return null
  }

  let canEdit = false
  if (gffftMembership && gffftMembership.type == TYPE_OWNER) {
    canEdit = true
  }
  if (loggedInUser && thread.firstPost && thread.firstPost.id == loggedInUser.id) {
    canEdit = true
  }

  const item: IThread = {
    id: thread.id,
    subject: thread.subject,
    createdAt: thread.createdAt ?? new Date(),
    updatedAt: thread.updatedAt ?? new Date(),
    firstPost: thread.firstPostUser ? {
      id: thread.firstPostUser.id,
      handle: thread.firstPostUser.handle ?? thread.firstPostUser.username,
    } : {
      id: "deleted",
      handle: "deleted",
    },
    latestPost: thread.latestPostUser ? {
      id: thread.latestPostUser.id,
      handle: thread.latestPostUser.handle ?? thread.latestPostUser.username,
    } : {
      id: "deleted",
      handle: "deleted",
    },
    postCount: thread.postCount,
    posts: threadPostsToJson(loggedInUser, gffftMembership, thread.posts),
    canEdit: canEdit,
  }
  return item
}


export function boardToJson(
  board: Board,
): IBoardType | null {
  if (board == null || board.id == null) {
    return null
  }
  const item: IBoardType = {
    id: board.id,
    name: board.name,
    description: board.description,
    threads: board.threadCount ? board.threadCount : 0,
    posts: board.postCount ? board.postCount : 0,
    firstActivity: board.createdAt ?? new Date(),
    updatedAt: board.updatedAt ?? new Date(),
    whoCanView: board.whoCanView ?? WHO_OWNER,
    whoCanPost: board.whoCanPost ?? WHO_OWNER,
  }
  return item
}

export function threadPostsToJson(
  loggedInUser: LoggedInUser | null,
  gffftMembership: GffftMember | undefined,
  items: HydratedThreadPost[]
): IThreadPost[] {
  return items.map((item) => threadPostToJson(loggedInUser, gffftMembership, item)).filter(notEmpty)
}

export function threadPostToJson(
  loggedInUser: LoggedInUser | null,
  gffftMembership: GffftMember | undefined,
  post: HydratedThreadPost): IThreadPost | null {
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


  const item: IThreadPost = {
    id: post.id,
    body: post.body,
    createdAt: post.createdAt,
    author: post.authorUser ? {
      id: post.authorUser.id,
      handle: post.authorUser.handle ?? post.authorUser.username,
    } : {
      id: "deleted",
      handle: "deleted",
    },
    link: post.link ? linkToJson(post.link) : undefined,
    canEdit: canEdit,
    deleted: post.deleted ?? false,
  }
  return item
}
