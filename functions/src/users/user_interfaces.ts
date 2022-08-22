import {notEmpty} from "../common/utils"
import {gffftToJsonMinimal, IGffftMinimalType} from "../gfffts/gffft_interfaces"
import {TYPE_OWNER} from "../gfffts/gffft_models"
import {HydratedUserBookmark, User, UserBookmark} from "./user_models"

export interface IUserType {
    id: string
    createdAt: Date
}

export interface IUserRef {
    id: string,
    handle: string
}

export interface IUserBookmark {
    id: string,
    name: string,
    gffft?: IGffftMinimalType
    createdAt: Date
}

export interface IBookmarkResults {
    count: number
    isHosting: boolean
    items: IUserBookmark[]
}

/**
 * Serialized iam user to json
 * @param {User} user
 * @param {Board} board
 * @return {IIAMUserType}
 */
export function iamUserToJson(
  user: User
): IUserType {
  const item: IUserType = {
    id: user.id,
    createdAt: user.createdAt ?? new Date(),
  }
  return item
}

export function bookmarkToJson(
  item: UserBookmark | undefined
): IUserBookmark | undefined {
  if (!item) {
    return undefined
  }
  return {
    id: item.id,
    name: item.name,
    createdAt: item.createdAt,
  }
}

export function hydratedBookmarkToJson(
  item: HydratedUserBookmark
): IUserBookmark {
  return {
    id: item.id,
    name: item.name,
    gffft: gffftToJsonMinimal(item.gffft),
    createdAt: item.createdAt,
  }
}

export function bookmarksToJson(
  items: HydratedUserBookmark[]
): IBookmarkResults {
  const itemsJson = items.map((item) => hydratedBookmarkToJson(item)).filter(notEmpty)
  return {
    count: items.length,
    items: itemsJson,
    isHosting: items.some((item) => {
      return item.gffft?.membership?.type == TYPE_OWNER
    }),
  }
}

