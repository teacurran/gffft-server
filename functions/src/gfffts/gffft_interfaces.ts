import {boardsToJson, IBoardType} from "../boards/board_interfaces"
import {notEmpty} from "../common/utils"
import {galleriesToJson, IGalleryType} from "../galleries/gallery_interfaces"
import {ILinkSet, linkSetsToJson} from "../link-sets/link_set_interfaces"
import {INotebookType, notebooksToJson} from "../notebooks/notebook_interfaces"
import {bookmarkToJson, iamUserToJson, IUserBookmark, IUserType} from "../users/user_interfaces"
import {Gffft, GffftMember, GffftMemberUpdateCounters, HydratedGffft} from "./gffft_models"

export interface IGffftId {
  uid: string
  gid: string
}

export interface IGffftFeatureRef {
  type: string
  id: string
}

export type IGffftMemberUpdateCounters = {
  galleryPhotos?: number
  galleryVideos?: number
  boardThreads?: number
  boardPosts?: number
  linkSetItems?: number
}

export interface IGffftMember {
  type: string
  createdAt?: Date
  updateCounters?: IGffftMemberUpdateCounters
  updateCount: number
}

export interface IGffftType {
    uid: string
    gid: string
    me?: IUserType
    membership?: IGffftMember
    bookmark?: IUserBookmark
    name: string
    fruitCode: string[]
    rareFruits: number
    ultraRareFruits: number
    description?: string
    intro?: string
    tags?: string[]
    enabled: boolean
    allowMembers: boolean
    requireApproval: boolean
    enableAltHandles: boolean
    features?: IGffftFeatureRef[]
    boards: IBoardType[]
    galleries: IGalleryType[]
    notebooks: INotebookType[]
    linkSets: ILinkSet[]
    createdAt?: Date
    updatedAt?: Date
  }

export interface IGffftPutType {
    name: string
    description: string
    intro?: string
    tags?: string[]
    enabled: boolean
    allowMembers: boolean
    requireApproval: boolean
    enableAltHandles: boolean
    boardEnabled: boolean
    galleryEnabled: boolean
    notebookEnabled: boolean
  }

export interface IGffftMinimalType {
    uid?: string
    gid?: string
    name: string
    membership?: IGffftMember
    description?: string
    allowMembers: boolean
    requireApproval: boolean
    createdAt: Date
    updatedAt: Date
  }

export interface IGffftFruitCode {
  fruitCode: string[]
}

/**
   * to Json
   * @param {string} fruitCode fc serialize
   * @return {IGffftFruitCode}
   */
export function fruitCodeToJson(
  fruitCode: string,
): IGffftFruitCode {
  return {
    fruitCode: [...fruitCode],
  }
}

/**
 * @swagger
 * definitions:
 *   IUserTypeMinimal:
 *     type: object
 *     properties:
 *       total:
 *         type: number
 *       offset:
 *         type: number
 *       count:
 *         type: number
 *       items:
 *         type: array
 *         required: false
 *         items:
 *           $ref: '#/definitions/IGffftType'
 */
export interface IGffftResultsType {
  count: number
  items: IGffftMinimalType[]
}

/**
   * converts a list of gfffts to json
   * @param {Gffft[]} items to serialize
   * @return {IIAMUserType}
   */
export function gffftsToJson(
  items: Gffft[]
): IGffftResultsType {
  const itemsJson = items.map((item) => gffftToJsonMinimal(item)).filter(notEmpty)
  return {
    count: items.length,
    items: itemsJson,
  }
}

export function gffftMemberCountersToJson(counters?: GffftMemberUpdateCounters):
 IGffftMemberUpdateCounters | undefined {
  if (!counters) {
    return undefined
  }
  return {
    galleryPhotos: counters.galleryPhotos,
    galleryVideos: counters.galleryVideos,
    boardThreads: counters.boardThreads,
    boardPosts: counters.boardPosts,
    linkSetItems: counters.linkSetItems,
  }
}

export function gffftMemberToJson(
  membership?: GffftMember
): IGffftMember | undefined {
  if (!membership) {
    return undefined
  }
  return {
    type: membership.type,
    handle: membership.handle,
    createdAt: membership.createdAt,
    updateCounters: gffftMemberCountersToJson(membership.updateCounters),
    updateCount: membership.updateCount ?? 0,
  } as IGffftMember
}

export function gffftToJson(
  gffft: HydratedGffft,
): IGffftType | null {
  if (gffft == null || gffft.uid == null || gffft.id == null) {
    return null
  }
  const item: IGffftType = {
    uid: gffft.uid,
    gid: gffft.id,
    membership: gffftMemberToJson(gffft.membership),
    bookmark: bookmarkToJson(gffft.bookmark),
    name: gffft.name,
    fruitCode: gffft.fruitCode ? [...gffft.fruitCode] : [],
    rareFruits: gffft.rareFruits ?? 0,
    ultraRareFruits: gffft.ultraRareFruits ?? 0,
    description: gffft.description,
    intro: gffft.intro,
    tags: gffft.tags,
    enabled: gffft.enabled,
    allowMembers: gffft.allowMembers,
    requireApproval: gffft.requireApproval,
    enableAltHandles: gffft.enableAltHandles,
    features: gffft.featureSet,
    boards: boardsToJson(gffft.boards),
    galleries: galleriesToJson(gffft.galleries),
    notebooks: notebooksToJson(gffft.notebooks),
    linkSets: linkSetsToJson(gffft. linkSets),
    createdAt: gffft.createdAt,
    updatedAt: gffft.updatedAt,
  }

  if (gffft.me) {
    item.me = iamUserToJson(gffft.me)
  }
  return item
}

/**
   * to Json
   * @param {Gffft} gffft to serialize
   * @return {IIAMUserType}
   */
export function gffftToJsonMinimal(
  gffft: Gffft | undefined,
): IGffftMinimalType | undefined {
  if (!gffft) {
    return undefined
  }
  const item: IGffftMinimalType = {
    uid: gffft.uid,
    gid: gffft.id,
    membership: gffft.membership ? gffftMemberToJson(gffft.membership) : undefined,
    name: gffft.name,
    description: gffft.description,
    allowMembers: gffft.allowMembers,
    requireApproval: gffft.requireApproval,
    createdAt: gffft.createdAt ?? new Date(),
    updatedAt: gffft.updatedAt ?? new Date(),
  }
  return item
}
