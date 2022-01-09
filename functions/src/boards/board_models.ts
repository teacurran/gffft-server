import {Ref} from "typesaurus"
import {User} from "../users/user_models"

export type Board = {
    id: string
    key?: string
    name?: string
    description?: string
  }

export type ThreadStats = {
  firstPost: Ref<User>
  latestPost: Ref<User>
  topReaction: string
}

export type Thread = {
  id: string
  subject: string
  quickStats: ThreadStats
  createdAt: Date
  updatedAt: Date
}

export type ThreadPost = {
  id: string
  body: string
  author: Ref<User>
  createdAt: Date
  updatedAt: Date
}

