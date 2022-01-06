import {notEmpty} from "../common/utils"
import {Gffft} from "./gffft_models"

export interface IGffftType {
    uid?: string
    gid?: string
    key?: string
    name: string
    fruitCode?: string
    description: string
    intro?: string
    tags?: string[]
    enabled: boolean
    allowMembers: boolean
    requireApproval: boolean
    enableAltHandles: boolean
    pagesEnabled: boolean
    pagesWhoCanView?: string
    pagesWhoCanEdit?: string
    boardEnabled: boolean
    boardWhoCanView?: string
    boardWhoCanPost?: string
    galleryEnabled: boolean
    galleryWhoCanView?: string
    galleryWhoCanPost?: string
    createdAt?: Date;
    updatedAt?: Date;
  }

export interface IGffftMinimalType {
    uid?: string
    gid?: string
    name: string
    description: string
    allowMembers: boolean
    requireApproval: boolean
    pagesEnabled: boolean
    boardEnabled: boolean
    galleryEnabled: boolean
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
   * @param {uid} uid that owns this gffft
   * @param {Gffft[]} items to serialize
   * @return {IIAMUserType}
   */
export function gffftsToJson(
  uid: string,
  items: Gffft[]
): IGffftResultsType {
  const itemsJson = items.map((item) => gffftToJsonMinimal(uid, item)).filter(notEmpty)
  return {
    count: items.length,
    items: itemsJson,
  }
}

/**
   * to Json
   * @param {uid} uid that owns this gffft
   * @param {Gffft} gffft to serialize
   * @return {IIAMUserType}
   */
export function gffftToJson(
  uid: string,
  gffft: Gffft,
): IGffftType | null {
  if (gffft == null) {
    return null
  }
  const item: IGffftType = {
    uid: uid,
    gid: gffft.id,
    key: gffft.key,
    name: gffft.name,
    description: gffft.description,
    intro: gffft.intro,
    tags: gffft.tags,
    enabled: gffft.enabled,
    allowMembers: gffft.allowMembers,
    requireApproval: gffft.requireApproval,
    enableAltHandles: gffft.enableAltHandles,
    pagesEnabled: gffft.pagesEnabled,
    pagesWhoCanView: gffft.pagesWhoCanView,
    pagesWhoCanEdit: gffft.pagesWhoCanEdit,
    boardEnabled: gffft.boardEnabled,
    boardWhoCanPost: gffft.boardWhoCanPost,
    boardWhoCanView: gffft.boardWhoCanView,
    galleryEnabled: gffft.galleryEnabled,
    galleryWhoCanView: gffft.boardWhoCanView,
    galleryWhoCanPost: gffft.galleryWhoCanPost,
  }
  return item
}

/**
   * to Json
   * @param {uid} uid that owns this gffft
   * @param {Gffft} gffft to serialize
   * @return {IIAMUserType}
   */
export function gffftToJsonMinimal(
  uid: string,
  gffft: Gffft,
): IGffftMinimalType | null {
  if (gffft == null) {
    return null
  }
  const item: IGffftMinimalType = {
    uid: uid,
    gid: gffft.id,
    name: gffft.name,
    description: gffft.description,
    allowMembers: gffft.allowMembers,
    requireApproval: gffft.requireApproval,
    pagesEnabled: gffft.pagesEnabled,
    boardEnabled: gffft.boardEnabled,
    galleryEnabled: gffft.galleryEnabled,
  }
  return item
}

