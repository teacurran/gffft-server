import {LoggedInUser} from "../auth"
import {boardToJson, IBoardType} from "../boards/board_interfaces"
import {Board} from "../boards/board_models"
import {notEmpty} from "../common/utils"
import {gffftToJsonMinimal, IGffftMinimalType} from "../gfffts/gffft_interfaces"
import {HydratedUserBookmark, User} from "./user_models"

export interface IUserType {
    id: string
    username: string
    board: IBoardType | null
}

export interface IUserRef {
    id: string,
    handle: string
}

export interface IUserBookmark {
    id: string,
    name: string,
    gid: string,
    gffft: IGffftMinimalType | null
    createdAt: Date
}

export interface IBookmarkResults {
    count: number
    items: IUserBookmark[]
}

/**
 * Serialized iam user to json
 * @param {UserRecord} iamUser user to serialize
 * @param {User} user
 * @param {Board} board
 * @return {IIAMUserType}
 */
export function iamUserToJson(
  iamUser: LoggedInUser,
  user: User,
  board: Board
): IUserType {
  const item: IUserType = {
    id: iamUser.id,
    username: user.username,
    board: boardToJson(board),
  }
  return item
}

export function bookmarkToJson(
  item: HydratedUserBookmark
): IUserBookmark {
  return {
    id: item.id,
    gid: item.gffftRef.id,
    name: item.name,
    gffft: gffftToJsonMinimal(item.gffft),
    createdAt: item.createdAt,
  }
}

export function bookmarksToJson(
  items: HydratedUserBookmark[]
): IBookmarkResults {
  const itemsJson = items.map((item) => bookmarkToJson(item)).filter(notEmpty)
  return {
    count: items.length,
    items: itemsJson,
  }
}

