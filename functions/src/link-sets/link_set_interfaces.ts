import {WHO_OWNER} from "../boards/board_data"
import {notEmpty} from "../common/utils"
import {IUserRef} from "../users/user_interfaces"
import {LinkSet, HydratedLinkSet, HydratedLinkSetItem} from "./link_set_models"

export const mapToObj = (m: Map<string, string>) => {
  return Array.from(m).reduce((obj: any, [key, value]) => {
    obj[key] = value
    return obj
  }, {})
}

export interface ILinkSetItem {
    id: string
    author: IUserRef
    url: any
    description: string
    createdAt: Date
}

export interface ILinkSet {
    id: string
    name?: string
    description?: string
    itemCount: number
    createdAt: Date
    updatedAt: Date
    whoCanView: string
    whoCanPost: string
    latestPost?: IUserRef
    items?: ILinkSetItem[]
}

export function linkSetToJson(
  linkSet: LinkSet
): ILinkSet {
  return {
    id: linkSet.id,
    name: linkSet.name,
    itemCount: linkSet.itemCount ?? 0,
    createdAt: linkSet.createdAt ?? new Date(),
    updatedAt: linkSet.updatedAt ?? new Date(),
    whoCanView: linkSet.whoCanView ?? WHO_OWNER,
    whoCanPost: linkSet.whoCanPost ?? WHO_OWNER,
  }
}


export function linkSetToJsonWithItems(
  linkSet: HydratedLinkSet
): ILinkSet {
  const itemsJson = linkSet.items?.map((item) => linkSetItemToJson(item)).filter(notEmpty)
  return {
    id: linkSet.id,
    name: linkSet.name,
    itemCount: linkSet.itemCount ?? 0,
    createdAt: linkSet.createdAt ?? new Date(),
    updatedAt: linkSet.updatedAt ?? new Date(),
    items: itemsJson ?? [],
    whoCanView: linkSet.whoCanView ?? WHO_OWNER,
    whoCanPost: linkSet.whoCanPost ?? WHO_OWNER,
  }
}

export function linkSetItemToJson(
  linkSetItem: HydratedLinkSetItem | null): ILinkSetItem | null {
  if (linkSetItem == null || linkSetItem.id == null) {
    return null
  }

  const item: ILinkSetItem = {
    id: linkSetItem.id,
    author: linkSetItem.authorUser ? {
      id: linkSetItem.authorUser.id,
      handle: linkSetItem.authorUser.username,
    } : {
      id: "deleted",
      handle: "deleted",
    },
    url: linkSetItem.url,
    description: linkSetItem.description,
    createdAt: linkSetItem.createdAt,
  }
  return item
}


