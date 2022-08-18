import {getRefPath} from "typesaurus"
import {WHO_OWNER} from "../boards/board_data"
import {notEmpty} from "../common/utils"
import {IUserRef} from "../users/user_interfaces"
import {LinkSet, HydratedLinkSet, HydratedLinkSetItem, Link} from "./link_set_models"

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const mapToObj = (m: Map<string, string>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Array.from(m).reduce((obj: any, [key, value]) => {
    obj[key] = value
    return obj
  }, {})
}

export interface ILink {
  id: string,
  domain: string,
  url: string,
  title?: string,
  description?: string,
  image?: string,
  responseCode: number,
  createdAt: Date
  updatedAt: Date
}

export function linkToJson(
  link: Link
): ILink {
  return {
    id: link.id ?? "",
    domain: link.domain,
    url: link.url,
    title: link.title,
    description: link.description,
    image: link.image,
    responseCode: link.responseCode,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  }
}

export interface ILinkSetItem {
    id: string
    url: string
    author: IUserRef
    description: string
    domain?: string
    blurb?: string
    title?: string
    image?: string
    thread?: string
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
      handle: linkSetItem.authorUser.handle ?? linkSetItem.authorUser.id,
    } : {
      id: "deleted",
      handle: "deleted",
    },
    url: linkSetItem.url,
    description: linkSetItem.description,
    createdAt: linkSetItem.createdAt,
    domain: linkSetItem?.link?.domain,
    title: linkSetItem?.link?.title,
    blurb: linkSetItem?.link?.description,
    image: linkSetItem?.link?.image,
    thread: (linkSetItem.threadRef != null) ? getRefPath(linkSetItem.threadRef) : undefined,
  }
  return item
}

export function linkSetsToJson(linkSets: LinkSet[]) {
  return linkSets.map((linkSet) => linkSetToJson(linkSet))
    .filter(notEmpty)
}
