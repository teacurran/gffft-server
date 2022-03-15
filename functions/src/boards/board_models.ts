import {Ref} from "typesaurus"
import {Link} from "../link-sets/link_set_models"
import {HydratedUser, User} from "../users/user_models"

export type Board = {
    id: string
    key?: string
    name?: string
    description?: string
    threadCount?: number
    postCount?: number
    whoCanView?: string
    whoCanPost?: string
    latestPost?: Ref<HydratedUser>
    createdAt: Date
    updatedAt: Date
  }

export type BoardThreadPostCounterNoAuthor = {
  threadCount: number
  postCount: number
}

export type BoardThreadCounter = {
  threadCount: number
  updatedAt: Date
}

export type BoardPostCounterWithAuthor = {
  postCount: number
  latestPost: Ref<User>
  updatedAt: Date
}

export type BoardPostCounter = {
  postCount: number
}

export type Thread = {
  id: string
  subject: string
  firstPost: Ref<User>
  latestPost: Ref<User>
  topReaction: string
  postCount: number
  createdAt: Date
  updatedAt: Date
  deleted?: boolean
  deletedAt?: Date
}

export interface HydratedThread extends Thread {
  firstPostUser: HydratedUser | undefined
  latestPostUser: HydratedUser | undefined
  posts: HydratedThreadPost[]
}

export type ThreadPost = {
  id?: string
  body: string
  author: Ref<User>
  linkRef?: Ref<Link>
  createdAt: Date
  deleted?: boolean
  deletedAt?: Date
}

export interface HydratedThreadPost extends ThreadPost {
  authorUser: HydratedUser | undefined
  link?: Link | undefined
}

export type ThreadPostCounter = {
  postCount: number
}

export type ThreadPostCounterWithAuthor = {
  postCount: number
  latestPost: Ref<User>
  updatedAt: Date
}
