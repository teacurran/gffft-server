import {Ref} from "typesaurus"
import {User} from "../users/user_models"

export type Calendar = {
    id: string,
    createdAt: Date
    updatedAt: Date
    key?: string,
    name?: string,
    description?: string
    whoCanView?: string
    whoCanPost?: string
    latestPost?: Ref<User>
    events: number
  }

