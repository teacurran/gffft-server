import {Ref} from "typesaurus"
import {User} from "../users/user_models"

export type Board = {
    id: string
    key?: string
    name?: string
    description?: string
  }

export type BoardThreadPostCounterNoAuthor = {
  threadCount: number
  postCount: number
}

export type BoardThreadCounter = {
  threadCount: number
}

export type BoardPostCounterWithAuthor = {
  postCount: number
  latestPost: Ref<User>
}

export type BoardPostCounter = {
  postCount: number
}

export type Thread = {
  id?: string
  subject: string
  firstPost: Ref<User>
  latestPost: Ref<User>
  topReaction: string
  postCount: number
  createdAt: Date
  updatedAt: Date
}

export interface HydratedThread extends Thread {
  firstPostUser: User | undefined
  latestPostUser: User | undefined
  posts: HydratedThreadPost[]
}

export type ThreadPost = {
  id?: string
  body: string
  author: Ref<User>
  createdAt: Date
}

export interface HydratedThreadPost extends ThreadPost {
  authorUser: User | undefined
}

export type ThreadPostCounter = {
  postCount: number
}

export type ThreadPostCounterWithAuthor = {
  postCount: number
  latestPost: Ref<User>
}
