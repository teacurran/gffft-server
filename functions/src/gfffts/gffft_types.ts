import {notEmpty} from "../common/utils"
import {Gffft} from "./gffft_models"

export interface IGffftType {
    id?: string
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
    id?: string
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

export function gffftsToJson(
  items: Gffft[]
): IGffftResultsType {
  const itemsJson = items.map((item) => gffftToJsonMinimal(item)).filter(notEmpty)
  return {
    count: items.length,
    items: itemsJson,
  }
}

/**
   * to Json
   * @param {Gffft} gffft to serialize
   * @param {User} user
   * @return {IIAMUserType}
   */
export function gffftToJson(
  gffft: Gffft,
): IGffftType | null {
  if (gffft == null) {
    return null
  }
  const item: IGffftType = {
    id: gffft.id,
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
   * @param {Gffft} gffft to serialize
   * @param {User} user
   * @return {IIAMUserType}
   */
export function gffftToJsonMinimal(
  gffft: Gffft,
): IGffftMinimalType | null {
  if (gffft == null) {
    return null
  }
  const item: IGffftMinimalType = {
    id: gffft.id,
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

