import {Ref} from "typesaurus"
import {User} from "../users/user_models"

export type Board = {
    id: string
    key?: string
    name?: string
    description?: string
  }

export type Thread = {
  id?: string
  subject: string
  firstPost: Ref<User>
  latestPost: Ref<User>
  topReaction: string
  createdAt: Date
  updatedAt: Date
}

export type ThreadReply = {
  id?: string
  body: string
  author: Ref<User>
  createdAt: Date
  updatedAt: Date
}

