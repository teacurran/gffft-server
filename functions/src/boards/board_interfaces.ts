import {notEmpty} from "../common/utils"
import {IUserRef} from "../users/user_interfaces"
import {Board, Thread} from "./board_models"

export interface IBoardStats {
  label: string
  threads: number
  posts: number
  members: number
  firstActivity: Date | null
  updatedAt: Date | null
}

export interface IBoardType {
    id: string
    name?: string
    description?: string
    stats: IBoardStats
  }

export interface IThread {
  id: string
  subject: string
  createdAt: Date
  updatedAt: Date
  firstPost: IUserRef
  latestPost: IUserRef,
  topReaction?: string
}

export interface IThreadResults {
  count: number
  items: IThread[]
}

export function threadsToJson(
  items: Thread[]
): IThreadResults {
  const itemsJson = items.map((item) => threadToJson(item)).filter(notEmpty)
  return {
    count: items.length,
    items: itemsJson,
  }
}

export function threadToJson(
  thread: Thread): IThread | null {
  console.log(`threadToJson called: ${JSON.stringify(thread)}`)
  if (thread == null || thread.id == null) {
    return null
  }
  const item: IThread = {
    id: thread.id,
    subject: thread.subject,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    firstPost: {
      id: "stub-id",
      handle: "Poster Name",
    },
    latestPost: {
      id: "stub-id",
      handle: "Poster Name",
    },
  }
  return item
}


/**
   * to Json
   * @param {Board} board object to serialize
   * @param {User} user
   * @return {IIAMUserType}
   */
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
    stats: {
      label: "total",
      threads: 693,
      posts: 98087,
      members: 324,
      firstActivity: new Date(),
      updatedAt: new Date(),
    },
  }
  return item
}

